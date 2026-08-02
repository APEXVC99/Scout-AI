import { createServerFn } from "@tanstack/react-start";
import {
  generateThesisAnalysis,
  getAnalysisForMatch,
  matchHasAnalysis,
  type ThesisAnalysis,
} from "~/lib/analysis";

// ── Auth helper ─────────────────────────────────────────────────────────

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

  const { sql } = await import("~/db");

  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("User not found in database — try signing out and back in");
  }

  return rows[0].id as string;
}

// ── Verify match ownership ──────────────────────────────────────────────

async function verifyMatchOwnership(
  matchId: string,
  userId: string,
): Promise<void> {
  const { sql } = await import("~/db");

  const rows = await sql()`
    SELECT m.id FROM matches m
    JOIN theses t ON t.id = m.thesis_id
    WHERE m.id = ${matchId}::uuid AND t.user_id = ${userId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("Match not found or not authorized");
  }
}

// ── Server Functions ────────────────────────────────────────────────────

/**
 * generateAnalysis — creates a "Why This Deal" thesis fit analysis for a match.
 * Only the owner of the thesis the match belongs to can generate.
 */
export const generateAnalysis = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const analysis = await generateThesisAnalysis(data.matchId);
    return { analysis };
  },
);

/**
 * getAnalysis — fetch an existing thesis fit analysis for a match.
 */
export const getAnalysis = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const analysis = await getAnalysisForMatch(data.matchId);
    return { analysis };
  },
);

/**
 * hasAnalysis — check whether a match already has a thesis fit analysis.
 */
export const hasAnalysis = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const exists = await matchHasAnalysis(data.matchId);
    return { hasAnalysis: exists };
  },
);

/**
 * getAllAnalyses — list all thesis fit analyses for the current user's matches.
 * Used so the outreach page can show analysis-derived context without per-row calls.
 */
export const getAllAnalyses = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = await getCurrentUserId();

    const { sql } = await import("~/db");
    const rows = await sql()`
      SELECT
        ta.id, ta.match_id, ta.fit_score, ta.fit_summary,
        ta.strengths, ta.concerns, ta.missing_signals, ta.verdict, ta.generated_at
      FROM thesis_analyses ta
      JOIN matches m ON m.id = ta.match_id
      JOIN theses t ON t.id = m.thesis_id
      WHERE t.user_id = ${userId}::uuid
      ORDER BY ta.generated_at DESC
    `;

    const analyses = rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      matchId: String(r.match_id),
      fitScore: Number(r.fit_score),
      fitSummary: String(r.fit_summary || ""),
      strengths: Array.isArray(r.strengths)
        ? (r.strengths as unknown[]).map((s) => String(s))
        : [],
      concerns: Array.isArray(r.concerns)
        ? (r.concerns as unknown[]).map((s) => String(s))
        : [],
      missingSignals: Array.isArray(r.missing_signals)
        ? (r.missing_signals as unknown[]).map((s) => String(s))
        : [],
      verdict: String(r.verdict || "watch"),
      generatedAt: String(r.generated_at || ""),
    })) as ThesisAnalysis[];

    return { analyses };
  },
);
