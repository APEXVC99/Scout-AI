import { createServerFn } from "@tanstack/react-start";
import {
  generateDealMemo,
  getMemoForMatch,
  getMemosList,
  getMemosCount,
  matchHasMemo,
  type DealMemoData,
} from "~/lib/memos";

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

async function verifyMatchOwnership(matchId: string, userId: string): Promise<void> {
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
 * generateMemo — creates a new deal memo for a match.
 * Only the owner of the thesis the match belongs to can generate.
 */
export const generateMemo = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const memo = await generateDealMemo(data.matchId);
    return memo;
  });

/**
 * getExistingMemo — fetch an existing memo for a match.
 */
export const getExistingMemo = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const memo = await getMemoForMatch(data.matchId);
    return { memo };
  });

/**
 * checkMatchHasMemo — check whether a match already has a memo.
 */
export const checkMatchHasMemo = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const hasMemo = await matchHasMemo(data.matchId);
    return { hasMemo };
  });

/**
 * getAllMemos — list all memos for the current user's matches.
 */
export const getAllMemos = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data?: { limit?: number } } = {}) => {
    const userId = await getCurrentUserId();
    const memos = await getMemosList(userId, { limit: data?.limit ?? 50 });
    return { memos };
  });

/**
 * getMemoCount — return the total number of memos for the current user.
 */
export const getMemoCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = await getCurrentUserId();
    const count = await getMemosCount(userId);
    return { count };
  });
