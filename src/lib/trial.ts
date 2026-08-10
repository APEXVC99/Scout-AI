// ── Public trial pipeline ────────────────────────────────────────────────
// Powers /trial and /trial/results: a visitor submits an investment thesis,
// Scout AI scrapes today's startup news, embeds + matches companies against
// the thesis (pgvector cosine similarity), and writes GPT-4o deal memos for
// the strongest matches — no auth required.
//
// This module is intentionally server-only (imported by serve.ts and test
// scripts, never by client code). It reuses the existing schema and pipeline
// pieces: theses/matches/memos tables, the RSS scraper, embeddings, and
// generateDealMemo from src/lib/memos.ts.
import { sql } from "~/db";
import { embedAndStoreThesis } from "~/lib/embeddings";
import { generateDealMemo, getMemoForMatch } from "~/lib/memos";

// ── Constants ─────────────────────────────────────────────────────────────

export const TRIAL_CLERK_ID = "trial_public";
export const TRIAL_EMAIL = "trial@getscoutai.app";
export const TRIAL_FUND_NAME = "Public Trial";
export const MAX_MEMO_MATCHES = 8; // memos are generated for the top N matches
export const RESULTS_LIMIT = 12; // matches shown on the results page

// ── Types ─────────────────────────────────────────────────────────────────

export interface TrialInput {
  name: string;
  description: string;
  sectors: string[];
  stages: string[];
}

export interface TrialRunResult {
  thesisId: string;
  companiesScanned: number;
  newCompanies: number;
  matchCount: number;
  feedErrors: string[];
}

export interface TrialMemoResult {
  recommendation: string;
  scores: { team: number; market: number; traction: number; overall: number };
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  content: string;
  generatedAt: string;
}

export interface TrialMatchResult {
  matchId: string;
  companyId: string;
  companyName: string;
  score: number;
  sector: string | null;
  stage: string | null;
  description: string | null;
  source: string | null;
  sourceUrl: string | null;
  memo: TrialMemoResult | null;
}

export interface TrialResults {
  thesis: {
    id: string;
    name: string;
    description: string | null;
    sectors: string[];
    stages: string[];
    createdAt: string;
  };
  companiesScanned: number;
  matchesTotal: number;
  memoCount: number;
  matches: TrialMatchResult[];
}

// ── Table creation (idempotent, same schema as the app pipeline) ─────────

async function ensureTables() {
  await sql()`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql()`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    fund_name VARCHAR(255),
    tier VARCHAR(20) NOT NULL DEFAULT 'solo',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await sql()`CREATE TABLE IF NOT EXISTS theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    stages TEXT[] NOT NULL DEFAULT '{}',
    geo_focus TEXT[] NOT NULL DEFAULT '{}',
    check_size VARCHAR(50),
    criteria_json JSONB,
    embedding VECTOR(1536),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql()`ALTER TABLE theses ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
  await sql()`ALTER TABLE theses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false`;
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_theses_embedding ON theses USING hnsw (embedding vector_cosine_ops)`;
  } catch {
    // Index may already exist
  }

  await sql()`CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    website VARCHAR(500),
    description TEXT,
    sector VARCHAR(100),
    stage VARCHAR(50),
    location VARCHAR(200),
    founded_year INT,
    employee_count INT,
    total_funding VARCHAR(50),
    last_funding VARCHAR(50),
    source VARCHAR(100),
    source_url TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql()`ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
  await sql()`ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false`;
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_companies_embedding ON companies USING hnsw (embedding vector_cosine_ops)`;
  } catch {
    // Index may already exist
  }

  await sql()`CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(thesis_id, company_id)
  )`;

  await sql()`CREATE TABLE IF NOT EXISTS memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    swot_json JSONB,
    score_json JSONB,
    recommendation VARCHAR(50),
    ai_model VARCHAR(100),
    ai_tokens INT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

async function getOrCreateTrialUser(): Promise<string> {
  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${TRIAL_CLERK_ID} LIMIT 1
  `;
  if (rows.length > 0) return rows[0].id as string;
  const inserted = await sql()`
    INSERT INTO users (clerk_id, email, fund_name)
    VALUES (${TRIAL_CLERK_ID}, ${TRIAL_EMAIL}, ${TRIAL_FUND_NAME})
    RETURNING id
  `;
  return inserted[0].id as string;
}

// ── Pipeline: create thesis + scrape + embed + match ─────────────────────

/**
 * Full trial run: create the thesis, embed it, scrape live feeds, ingest new
 * companies (with embeddings), then score every embedded company against the
 * thesis with pgvector cosine similarity. Returns the thesis id for the
 * results page.
 */
export async function runTrial(input: TrialInput): Promise<TrialRunResult> {
  await ensureTables();
  const userId = await getOrCreateTrialUser();

  const inserted = await sql()`
    INSERT INTO theses (user_id, name, description, sectors, stages, is_demo, is_active)
    VALUES (
      ${userId}::uuid,
      ${input.name},
      ${input.description ?? null},
      ${input.sectors},
      ${input.stages},
      true,
      true
    )
    RETURNING id
  `;
  const thesisId = inserted[0].id as string;

  // Embed the thesis (needed before matching)
  await embedAndStoreThesis(thesisId);

  // Scrape live feeds + ingest new companies
  const { companiesScanned, newCompanies, feedErrors } = await scrapeAndIngest();

  // Match: score every embedded company against the thesis in one query
  const matchCount = await matchThesisToAllCompanies(thesisId);

  return { thesisId, companiesScanned, newCompanies, matchCount, feedErrors };
}

async function scrapeAndIngest(): Promise<{
  companiesScanned: number;
  newCompanies: number;
  feedErrors: string[];
}> {
  const { scrapeAllSources } = await import("~/sources/scraper");
  const { embedAndStoreCompany } = await import("~/lib/embeddings");

  const results = await scrapeAllSources();
  const feedErrors: string[] = [];
  let companiesScanned = 0;
  let newCompanies = 0;

  for (const result of results) {
    if (result.error) {
      feedErrors.push(`${result.source}: ${result.error}`);
      continue;
    }
    for (const company of result.companies) {
      companiesScanned++;
      const existing = await sql()`
        SELECT id FROM companies
        WHERE LOWER(name) = LOWER(${company.name})
        LIMIT 1
      `;
      if (existing.length > 0) continue;
      const inserted = await sql()`
        INSERT INTO companies (name, description, source, source_url, metadata)
        VALUES (
          ${company.name},
          ${company.description ?? null},
          ${company.source},
          ${company.source_url},
          ${JSON.stringify(company.metadata ?? {})}::jsonb
        )
        RETURNING id
      `;
      const newId = inserted[0]?.id as string | undefined;
      if (newId) newCompanies++;
    }
  }

  // Embed new companies (parallel, bounded) — failures are logged but don't
  // block the run; unembedded companies simply won't match.
  const newRows = await sql()`
    SELECT id FROM companies WHERE embedding IS NULL
  `;
  const ids = newRows.map((r) => r.id as string);
  const CONCURRENCY = 5;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (id) => {
        try {
          await embedAndStoreCompany(id);
        } catch (err) {
          console.error(`[trial] failed to embed company ${id}:`, err);
        }
      }),
    );
  }

  return { companiesScanned, newCompanies, feedErrors };
}

async function matchThesisToAllCompanies(thesisId: string): Promise<number> {
  await sql()`
    INSERT INTO matches (thesis_id, company_id, score)
    SELECT ${thesisId}::uuid, c.id, 1 - (c.embedding <=> t.embedding)
    FROM companies c
    JOIN theses t ON t.id = ${thesisId}::uuid
    WHERE c.embedding IS NOT NULL AND t.embedding IS NOT NULL
    ON CONFLICT (thesis_id, company_id) DO UPDATE
    SET score = EXCLUDED.score, created_at = now()
  `;
  const rows = await sql()`
    SELECT COUNT(*)::int AS c FROM matches WHERE thesis_id = ${thesisId}::uuid
  `;
  return rows[0]?.c ?? 0;
}

// ── Results ───────────────────────────────────────────────────────────────

/**
 * Fetch a trial thesis and its top matches (with memos, when generated).
 * Returns null if the thesis id doesn't belong to the trial user.
 */
export async function getTrialResults(thesisId: string): Promise<TrialResults | null> {
  await ensureTables();
  const userId = await getOrCreateTrialUser();

  const thesisRows = await sql()`
    SELECT id, name, description, sectors, stages, created_at
    FROM theses
    WHERE id = ${thesisId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `;
  if (thesisRows.length === 0) return null;
  const thesis = thesisRows[0] as {
    id: string;
    name: string;
    description: string | null;
    sectors: string[] | null;
    stages: string[] | null;
    created_at: unknown;
  };

  const matchRows = await sql()`
    SELECT
      m.id AS match_id, m.score,
      c.id AS company_id, c.name AS company_name,
      c.sector, c.stage, c.description, c.source, c.source_url
    FROM matches m
    JOIN companies c ON c.id = m.company_id
    WHERE m.thesis_id = ${thesisId}::uuid
    ORDER BY m.score DESC
    LIMIT ${RESULTS_LIMIT}
  `;

  const matches: TrialMatchResult[] = [];
  let memoCount = 0;
  for (const r of matchRows) {
    const memoRow = await getMemoForMatch(r.match_id as string);
    const memo = memoRow ? toTrialMemo(memoRow) : null;
    if (memo) memoCount++;
    matches.push({
      matchId: String(r.match_id),
      companyId: String(r.company_id),
      companyName: String(r.company_name),
      score: Number(r.score),
      sector: r.sector ? String(r.sector) : null,
      stage: r.stage ? String(r.stage) : null,
      description: r.description ? String(r.description) : null,
      source: r.source ? String(r.source) : null,
      sourceUrl: r.source_url ? String(r.source_url) : null,
      memo,
    });
  }

  const totalRows = await sql()`
    SELECT COUNT(*)::int AS c FROM matches WHERE thesis_id = ${thesisId}::uuid
  `;
  const scannedRows = await sql()`
    SELECT COUNT(*)::int AS c FROM companies
  `;

  return {
    thesis: {
      id: String(thesis.id),
      name: thesis.name,
      description: thesis.description,
      sectors: thesis.sectors ?? [],
      stages: thesis.stages ?? [],
      createdAt: String(thesis.created_at),
    },
    companiesScanned: scannedRows[0]?.c ?? 0,
    matchesTotal: totalRows[0]?.c ?? 0,
    memoCount,
    matches,
  };
}

// ── Memo generation (one at a time, so requests stay short) ──────────────

/**
 * Generate the next memo for a trial thesis's top matches. Returns
 * { generated: true, matchId, memo } when one was written, or
 * { generated: false, done: true } when all top matches have memos.
 */
export async function generateNextTrialMemo(thesisId: string): Promise<{
  generated: boolean;
  done: boolean;
  matchId?: string;
  memo?: TrialMemoResult;
}> {
  await ensureTables();
  const userId = await getOrCreateTrialUser();

  const owned = await sql()`
    SELECT id FROM theses
    WHERE id = ${thesisId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `;
  if (owned.length === 0) {
    throw new Error("Trial not found");
  }

  const rows = await sql()`
    SELECT id FROM matches
    WHERE thesis_id = ${thesisId}::uuid
    ORDER BY score DESC
    LIMIT ${MAX_MEMO_MATCHES}
  `;

  for (const r of rows) {
    const matchId = String(r.id);
    const existing = await getMemoForMatch(matchId);
    if (existing) continue;
    const created = await generateDealMemo(matchId);
    return { generated: true, done: false, matchId, memo: toTrialMemo(created) };
  }

  return { generated: false, done: true };
}

// ── Mapping helpers ───────────────────────────────────────────────────────

function toTrialMemo(
  m: {
    recommendation: string;
    scores: { team: number; market: number; traction: number; overall: number };
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    content: string;
    generatedAt: string;
  },
): TrialMemoResult {
  return {
    recommendation: m.recommendation,
    scores: m.scores,
    swot: m.swot,
    content: m.content,
    generatedAt: m.generatedAt,
  };
}

/** Human-readable verdict for a stored recommendation value. */
export function recommendationLabel(value: string): string {
  switch (value) {
    case "strong_buy":
      return "Strong Buy";
    case "buy":
      return "Buy";
    case "hold":
      return "Hold";
    case "pass":
      return "Pass";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
