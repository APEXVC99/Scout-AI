import { createServerFn } from "@tanstack/react-start";
import {
  generateOutreachEmail,
  getOutreachForMatch,
  getOutreachList,
  updateOutreachStatus,
  updateOutreachContent,
  deleteOutreach,
  matchHasOutreach,
  type OutreachCampaign,
} from "~/lib/outreach";

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
 * generateOutreach — creates a new outreach email draft for a match.
 */
export const generateOutreach = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const campaign = await generateOutreachEmail(data.matchId);
    return campaign;
  });

/**
 * getOutreachForMatch — fetch an existing outreach draft for a match.
 */
export const getOutreachForMatchFn = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const campaign = await getOutreachForMatch(data.matchId);
    return { campaign };
  });

/**
 * checkMatchHasOutreach — check whether a match already has an outreach draft.
 */
export const checkMatchHasOutreach = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { matchId: string } }) => {
    const userId = await getCurrentUserId();
    await verifyMatchOwnership(data.matchId, userId);

    const hasOutreach = await matchHasOutreach(data.matchId);
    return { hasOutreach };
  });

/**
 * getAllOutreach — list all outreach campaigns for the current user.
 */
export const getAllOutreach = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data?: { limit?: number; status?: string } } = {}) => {
    const userId = await getCurrentUserId();
    const campaigns = await getOutreachList(userId, {
      limit: data?.limit ?? 50,
      status: data?.status,
    });
    return { campaigns };
  });

/**
 * updateOutreachStatusFn — change an outreach campaign's status.
 */
export const updateOutreachStatusFn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string; status: string } }) => {
    const userId = await getCurrentUserId();

    await updateOutreachStatus(data.id, userId, data.status);
    return { success: true };
  });

/**
 * updateOutreachFn — edit an outreach campaign's subject and body.
 */
export const updateOutreachFn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string; subject: string; body: string } }) => {
    const userId = await getCurrentUserId();

    await updateOutreachContent(data.id, userId, data.subject, data.body);
    return { success: true };
  });

/**
 * deleteOutreachFn — delete an outreach campaign.
 */
export const deleteOutreachFn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string } }) => {
    const userId = await getCurrentUserId();

    await deleteOutreach(data.id, userId);
    return { success: true };
  });
