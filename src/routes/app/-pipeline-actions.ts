import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import type { NormalizedCompany } from "~/sources/scraper";

// ── Types ────────────────────────────────────────────────────────────

export interface ScanLogEntry {
  id: string;
  user_id: string;
  action: string;
  status: string;
  detail: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}

export interface CompanyEntry {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  sector: string | null;
  stage: string | null;
  location: string | null;
  founded_year: number | null;
  employee_count: number | null;
  total_funding: string | null;
  last_funding: string | null;
  source: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
  discovered_at: string;
  updated_at: string;
}

export interface ScanResult {
  companiesFound: number;
  newCompanies: number;
}

// ── Auth helper (same pattern as thesis actions) ─────────────────────

async function getCurrentUserId(): Promise<string> {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  const { getEvent } = await import("vinxi/http");

  const event = getEvent();
  if (!event?.request) {
    throw new Error("Not in request context");
  }

  const auth = await getAuth(event.request);
  const clerkId = auth.userId;
  if (!clerkId) {
    throw new Error("Not authenticated");
  }

  // Ensure users table exists
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

  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("User not found in database — try signing out and back in");
  }

  return rows[0].id as string;
}

// ── Table creation helpers (idempotent) ──────────────────────────────

async function ensureCompaniesTable() {
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
    metadata JSONB,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

async function ensureAgentLogsTable() {
  await sql()`CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    detail JSONB,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

// ── Server Functions ─────────────────────────────────────────────────

/**
 * scanSources — scrapes all RSS feeds, dedupes by company name,
 * inserts new companies into the DB, logs the scan, and returns stats.
 */
export const scanSources = createServerFn({ method: "POST" }).handler(async (): Promise<ScanResult> => {
  const userId = await getCurrentUserId();
  await ensureCompaniesTable();
  await ensureAgentLogsTable();

  const startTime = Date.now();
  let companiesFound = 0;
  let newCompanies = 0;
  let feedErrors: string[] = [];

  try {
    // Dynamic import to keep scraper code out of client bundles
    const { scrapeAllSources } = await import("~/sources/scraper");
    const results = await scrapeAllSources();

    for (const result of results) {
      if (result.error) {
        feedErrors.push(`${result.source}: ${result.error}`);
        continue;
      }

      for (const company of result.companies) {
        companiesFound++;

        // Simple dedupe by name (case-insensitive)
        const existing = await sql()`
          SELECT id FROM companies
          WHERE LOWER(name) = LOWER(${company.name})
          LIMIT 1
        `;

        if (existing.length === 0) {
          await sql()`
            INSERT INTO companies (name, description, source, source_url, metadata)
            VALUES (
              ${company.name},
              ${company.description ?? null},
              ${company.source},
              ${company.source_url},
              ${JSON.stringify(company.metadata ?? {})}::jsonb
            )
          `;
          newCompanies++;
        }
      }
    }

    // Log the scan
    const durationMs = Date.now() - startTime;
    await sql()`
      INSERT INTO agent_logs (user_id, action, status, detail, duration_ms)
      VALUES (
        ${userId}::uuid,
        'scan_sources',
        ${feedErrors.length > 0 ? 'completed_with_errors' : 'completed'},
        ${JSON.stringify({
          companiesFound,
          newCompanies,
          sourcesScanned: results.length,
          feedErrors: feedErrors.length > 0 ? feedErrors : undefined,
        })}::jsonb,
        ${durationMs}
      )
    `;

    return { companiesFound, newCompanies };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    await sql()`
      INSERT INTO agent_logs (user_id, action, status, detail, duration_ms)
      VALUES (
        ${userId}::uuid,
        'scan_sources',
        'failed',
        ${JSON.stringify({ error: errorMsg })}::jsonb,
        ${durationMs}
      )
    `;

    throw new Error(`Scan failed: ${errorMsg}`);
  }
});

/**
 * getRecentCompanies — fetch the last 20 discovered companies (not user-scoped for MVP).
 */
export const getRecentCompanies = createServerFn({ method: "GET" }).handler(async (): Promise<CompanyEntry[]> => {
  const userId = await getCurrentUserId();
  await ensureCompaniesTable();

  const rows = await sql()`
    SELECT id, name, website, description, sector, stage, location,
           founded_year, employee_count, total_funding, last_funding,
           source, source_url, metadata, discovered_at, updated_at
    FROM companies
    ORDER BY discovered_at DESC
    LIMIT 20
  `;

  return rows.map((r) => ({
    ...r,
    discovered_at: String(r.discovered_at),
    updated_at: String(r.updated_at),
  })) as CompanyEntry[];
});

/**
 * getAllCompanies — fetch all discovered companies (not user-scoped for MVP).
 */
export const getAllCompanies = createServerFn({ method: "GET" }).handler(async (): Promise<CompanyEntry[]> => {
  const userId = await getCurrentUserId();
  await ensureCompaniesTable();

  const rows = await sql()`
    SELECT id, name, website, description, sector, stage, location,
           founded_year, employee_count, total_funding, last_funding,
           source, source_url, metadata, discovered_at, updated_at
    FROM companies
    ORDER BY discovered_at DESC
  `;

  return rows.map((r) => ({
    ...r,
    discovered_at: String(r.discovered_at),
    updated_at: String(r.updated_at),
  })) as CompanyEntry[];
});

/**
 * getRecentScans — fetch recent scan logs for the current user.
 */
export const getRecentScans = createServerFn({ method: "GET" }).handler(async (): Promise<ScanLogEntry[]> => {
  const userId = await getCurrentUserId();
  await ensureAgentLogsTable();

  const rows = await sql()`
    SELECT id, user_id, action, status, detail, duration_ms, created_at
    FROM agent_logs
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return rows.map((r) => ({
    ...r,
    created_at: String(r.created_at),
  })) as ScanLogEntry[];
});
