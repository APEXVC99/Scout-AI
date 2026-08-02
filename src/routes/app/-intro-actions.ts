import { createServerFn } from "@tanstack/react-start";
import {
  generateIntroStrategy,
  getIntroStrategyForMatch,
  matchHasIntroStrategy,
  type IntroStrategy,
} from "~/lib/intro";

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
 * generateIntroStrategy — creates a warm intro strategy for a match.
 * Only the owner of the thesis the match belongs to can generate.
 */
export const generateIntroStrategyFn = createServerFn({
  method: "POST",
}).handler(async ({ data }: { data: { matchId: string } }) => {
  const userId = await getCurrentUserId();
  await verifyMatchOwnership(data.matchId, userId);

  const strategy = await generateIntroStrategy(data.matchId);
  return { strategy };
});

/**
 * getIntroStrategy — fetch an existing intro strategy for a match.
 */
export const getIntroStrategy = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const strategy = await getIntroStrategyForMatch(data.matchId);
    return { strategy };
  },
);

/**
 * hasIntroStrategy — check whether a match already has an intro strategy.
 */
export const hasIntroStrategy = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const exists = await matchHasIntroStrategy(data.matchId);
    return { hasStrategy: exists };
  },
);

/**
 * getAllIntroStrategies — list all intro strategies for the current user's matches.
 * Used by the outreach page to render strategies without per-row calls.
 */
export const getAllIntroStrategies = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = await getCurrentUserId();

    const { sql } = await import("~/db");
    const rows = await sql()`
      SELECT
        istr.id, istr.match_id, istr.target_persona, istr.target_title,
        istr.rationale, istr.conversation_starters, istr.mutual_context, istr.generated_at
      FROM intro_strategies istr
      JOIN matches m ON m.id = istr.match_id
      JOIN theses t ON t.id = m.thesis_id
      WHERE t.user_id = ${userId}::uuid
      ORDER BY istr.generated_at DESC
    `;

    const strategies = rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      matchId: String(r.match_id),
      targetPersona: String(r.target_persona || ""),
      targetTitle: r.target_title ? String(r.target_title) : null,
      rationale: String(r.rationale || ""),
      conversationStarters: Array.isArray(r.conversation_starters)
        ? (r.conversation_starters as unknown[]).map((s) => String(s))
        : [],
      mutualContext: r.mutual_context ? String(r.mutual_context) : null,
      generatedAt: String(r.generated_at || ""),
    })) as IntroStrategy[];

    return { strategies };
  },
);
