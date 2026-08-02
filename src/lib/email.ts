import { sql } from "~/db";

let resendPromise: Promise<import("resend").Resend> | null = null;

async function getResend(): Promise<import("resend").Resend> {
  if (resendPromise) return resendPromise;
  resendPromise = (async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set — connect a Resend API key before sending outreach emails.",
      );
    }
    const { Resend } = await import("resend");
    return new Resend(apiKey);
  })();
  return resendPromise;
}

export interface SendOutreachResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

/** Send an approved outreach campaign through Resend. Errors are returned so callers can retry safely. */
export async function sendOutreachEmail(outreachId: string): Promise<SendOutreachResult> {
  try {
    const rows = await sql()`
      SELECT oc.id, oc.subject, oc.body, oc.status,
        c.name AS company_name, c.metadata AS company_metadata,
        u.fund_name
      FROM outreach_campaigns oc
      LEFT JOIN companies c ON c.id = oc.company_id
      JOIN users u ON u.id = oc.user_id
      WHERE oc.id = ${outreachId}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) return { success: false, error: "Outreach campaign not found" };

    const row = rows[0] as Record<string, unknown>;
    if (row.status !== "approved") {
      return { success: false, error: "Only approved outreach emails can be sent" };
    }
    const metadata = (row.company_metadata || {}) as Record<string, unknown>;
    const to = [metadata.founder_email, metadata.contact_email, metadata.email]
      .find((value): value is string => typeof value === "string" && value.includes("@"));
    if (!to) {
      return { success: false, error: "No founder email address is available for this company" };
    }
    if (!row.subject || !row.body) {
      return { success: false, error: "Outreach email must have a subject and body" };
    }

    const fundName = typeof row.fund_name === "string" && row.fund_name.trim()
      ? row.fund_name.trim()
      : "Scout AI";
    const from = process.env.RESEND_EMAIL_FROM || `Scout AI <deals@getscoutai.app>`;
    const resend = await getResend();
    const result = await resend.emails.send({
      from: fundName === "Scout AI" ? from : `${fundName} via Scout AI <${from.match(/<([^>]+)>/)?.[1] || from}>`,
      to: [to],
      subject: String(row.subject),
      text: String(row.body),
    });
    if (result.error) return { success: false, error: result.error.message };

    await sql()`
      UPDATE outreach_campaigns SET status = 'sent', updated_at = now()
      WHERE id = ${outreachId}::uuid AND status = 'approved'
    `;
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send outreach email" };
  }
}
