import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { embedAndStoreCompany, embedAndStoreThesis } from "~/lib/embeddings";

// ── Types ────────────────────────────────────────────────────────────

export interface MatchEntry {
  id: string;
  thesis_id: string;
  company_id: string;
  score: number;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  // Joined fields
  company_name: string;
  company_description: string | null;
  company_source: string | null;
  thesis_name: string;
  thesis_description: string | null;
}

// ── Auth helper ──────────────────────────────────────────────────────

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

  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("User not found in database — try signing out and back in");
  }

  return rows[0].id as string;
}

// ── Table creation helpers (idempotent) ──────────────────────────────

async function ensureMatchesTable() {
  await sql()`CREATE EXTENSION IF NOT EXISTS vector`;

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

  // Add embedding columns if they don't exist yet
  await sql()`ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
  await sql()`ALTER TABLE theses ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;

  // Create HNSW indexes (idempotent — IF NOT EXISTS added in PG 9.5+)
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_companies_embedding ON companies USING hnsw (embedding vector_cosine_ops)`;
  } catch {
    // Index may already exist under a different name or type; that's fine
  }
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_theses_embedding ON theses USING hnsw (embedding vector_cosine_ops)`;
  } catch {
    // Index may already exist; that's fine
  }
}

// ── Server Functions ─────────────────────────────────────────────────

/**
 * matchCompanyToTheses — embed a company (if needed), then run cosine
 * similarity against all of the current user's active theses, inserting
 * matches with scores.
 */
export const matchCompanyToTheses = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { companyId: string } }) => {
    const userId = await getCurrentUserId();
    await ensureMatchesTable();

    // Ensure company is embedded
    await embedAndStoreCompany(data.companyId);

    // Get all active theses for this user
    const theses = await sql()`
      SELECT id FROM theses
      WHERE user_id = ${userId}::uuid AND is_active = true
    `;

    let matchCount = 0;

    for (const thesis of theses) {
      // Ensure thesis is embedded
      await embedAndStoreThesis(thesis.id as string);

      // Compute similarity and insert/update match
      const rows = await sql()`
        SELECT 1 - (c.embedding <=> t.embedding) AS score
        FROM companies c, theses t
        WHERE c.id = ${data.companyId}::uuid
          AND t.id = ${thesis.id}::uuid
          AND c.embedding IS NOT NULL
          AND t.embedding IS NOT NULL
        LIMIT 1
      `;

      if (rows.length > 0 && rows[0].score != null) {
        const score = Number(rows[0].score);

        // Upsert match
        await sql()`
          INSERT INTO matches (thesis_id, company_id, score)
          VALUES (${thesis.id}::uuid, ${data.companyId}::uuid, ${score})
          ON CONFLICT (thesis_id, company_id) DO UPDATE
          SET score = ${score}, created_at = now()
        `;
        matchCount++;
      }
    }

    return { matchCount };
  });

/**
 * matchThesisToCompanies — embed a thesis (if needed), then run cosine
 * similarity against all companies, inserting matches.
 */
export const matchThesisToCompanies = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { thesisId: string } }) => {
    const userId = await getCurrentUserId();
    await ensureMatchesTable();

    // Verify ownership
    const owned = await sql()`
      SELECT id FROM theses WHERE id = ${data.thesisId}::uuid AND user_id = ${userId}::uuid LIMIT 1
    `;
    if (owned.length === 0) {
      throw new Error("Thesis not found or not authorized");
    }

    // Ensure thesis is embedded
    await embedAndStoreThesis(data.thesisId);

    // Find all companies and compute similarity
    const companyRows = await sql()`
      SELECT c.id
      FROM companies c, theses t
      WHERE t.id = ${data.thesisId}::uuid
        AND c.embedding IS NOT NULL
        AND t.embedding IS NOT NULL
    `;

    let matchCount = 0;

    for (const company of companyRows) {
      const rows = await sql()`
        SELECT 1 - (c.embedding <=> t.embedding) AS score
        FROM companies c, theses t
        WHERE c.id = ${company.id}::uuid
          AND t.id = ${data.thesisId}::uuid
          AND c.embedding IS NOT NULL
          AND t.embedding IS NOT NULL
        LIMIT 1
      `;

      if (rows.length > 0 && rows[0].score != null) {
        const score = Number(rows[0].score);

        await sql()`
          INSERT INTO matches (thesis_id, company_id, score)
          VALUES (${data.thesisId}::uuid, ${company.id}::uuid, ${score})
          ON CONFLICT (thesis_id, company_id) DO UPDATE
          SET score = ${score}, created_at = now()
        `;
        matchCount++;
      }
    }

    return { matchCount };
  });

/**
 * getMatches — returns matches for the current user's theses, joined with
 * company + thesis data, ordered by score DESC.
 */
export const getMatches = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data?: { status?: string; limit?: number } } = {}) => {
    const userId = await getCurrentUserId();
    await ensureMatchesTable();

    const limit = data?.limit ?? 50;
    const statusFilter = data?.status;

    const rows = statusFilter
      ? await sql()`
          SELECT
            m.id, m.thesis_id, m.company_id, m.score, m.status,
            m.reviewed_at, m.created_at,
            c.name AS company_name, c.description AS company_description, c.source AS company_source,
            t.name AS thesis_name, t.description AS thesis_description
          FROM matches m
          JOIN companies c ON c.id = m.company_id
          JOIN theses t ON t.id = m.thesis_id
          WHERE t.user_id = ${userId}::uuid AND m.status = ${statusFilter}
          ORDER BY m.score DESC
          LIMIT ${limit}
        `
      : await sql()`
          SELECT
            m.id, m.thesis_id, m.company_id, m.score, m.status,
            m.reviewed_at, m.created_at,
            c.name AS company_name, c.description AS company_description, c.source AS company_source,
            t.name AS thesis_name, t.description AS thesis_description
          FROM matches m
          JOIN companies c ON c.id = m.company_id
          JOIN theses t ON t.id = m.thesis_id
          WHERE t.user_id = ${userId}::uuid
          ORDER BY m.score DESC
          LIMIT ${limit}
        `;

    return rows.map((r) => ({
      ...r,
      reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null,
      created_at: String(r.created_at),
    })) as MatchEntry[];
  });

/**
 * getMatchCount — return the total number of matches for the current user.
 */
export const getMatchCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getCurrentUserId();
    await ensureMatchesTable();

    const rows = await sql()`
      SELECT COUNT(*)::int AS count
      FROM matches m
      JOIN theses t ON t.id = m.thesis_id
      WHERE t.user_id = ${userId}::uuid
    `;
    return { count: rows[0]?.count ?? 0 };
  });

/**
 * updateMatchStatus — update a match's status.
 */
export const updateMatchStatus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { matchId: string; status: string } }) => {
    const userId = await getCurrentUserId();
    await ensureMatchesTable();

    // Verify the match belongs to one of the user's theses
    const rows = await sql()`
      SELECT m.id FROM matches m
      JOIN theses t ON t.id = m.thesis_id
      WHERE m.id = ${data.matchId}::uuid AND t.user_id = ${userId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      throw new Error("Match not found or not authorized");
    }

    const reviewedAt = data.status !== "new" ? "now()" : "NULL";

    await sql()`
      UPDATE matches
      SET
        status = ${data.status},
        reviewed_at = CASE WHEN ${data.status} != 'new' THEN now() ELSE reviewed_at END
      WHERE id = ${data.matchId}::uuid
    `;

    return { success: true };
  });
