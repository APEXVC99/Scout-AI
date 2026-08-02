import { createServerFn } from "@tanstack/react-start";
import { sendOutreachEmail } from "~/lib/email";

async function getCurrentUserId(): Promise<string> {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  const { getEvent } = await import("vinxi/http");
  const event = getEvent();
  if (!event?.request) throw new Error("Not in request context");
  const auth = await getAuth(event.request);
  if (!auth.userId) throw new Error("Not authenticated");
  const { sql } = await import("~/db");
  const rows = await sql()`SELECT id FROM users WHERE clerk_id = ${auth.userId} LIMIT 1`;
  if (!rows.length) throw new Error("User not found in database — try signing out and back in");
  return String(rows[0].id);
}

export const sendOutreach = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { outreachId: string } }) => {
    const userId = await getCurrentUserId();
    const { sql } = await import("~/db");
    const rows = await sql()`
      SELECT id, status FROM outreach_campaigns
      WHERE id = ${data.outreachId}::uuid AND user_id = ${userId}::uuid LIMIT 1
    `;
    if (!rows.length) return { success: false, error: "Outreach campaign not found or not authorized" };
    if (rows[0].status !== "approved") return { success: false, error: "Only approved outreach emails can be sent" };
    return sendOutreachEmail(data.outreachId);
  });
