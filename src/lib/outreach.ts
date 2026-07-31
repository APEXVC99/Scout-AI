import { sql } from "~/db";

// ── Lazy OpenAI client (same pattern as src/lib/embeddings.ts and src/lib/memos.ts) ─

let _openaiPromise: Promise<import("openai").OpenAI> | null = null;

async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = (async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set — connect an OpenAI API key before generating outreach emails.",
      );
    }
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  })();
  return _openaiPromise;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface OutreachCampaign {
  id: string;
  userId: string;
  matchId: string | null;
  companyId: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  companyName?: string | null;
  thesisName?: string | null;
  matchScore?: number | null;
}

// ── Table creation (idempotent) ─────────────────────────────────────────

async function ensureOutreachTable() {
  await sql()`CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    body TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

// ── Prompt builder ──────────────────────────────────────────────────────

interface OutreachGenerationData {
  company_name: string;
  company_description: string | null;
  thesis_name: string;
  thesis_description: string | null;
  recommendation: string | null;
  strengths: string[];
  fund_name: string | null;
}

function buildOutreachPrompt(data: OutreachGenerationData): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a venture capital associate writing a cold outreach email to a startup founder. Be concise, genuine, and specific. Reference something real about their company. Don't use generic flattery. The tone should be respectful, professional, and direct.`;

  const fundName = data.fund_name || "my fund";
  const strengths = data.strengths.length > 0 ? data.strengths.join(", ") : "Not available";
  const recommendation = data.recommendation || "Hold";

  const userPrompt = `My fund: ${fundName}
My thesis: ${data.thesis_name} — ${data.thesis_description || "No description provided"}

Company: ${data.company_name}
Description: ${data.company_description || "No description available"}

Deal Memo Recommendation: ${recommendation}
Key Strengths: ${strengths}

Write a short cold email introducing myself and my fund, showing I've done my homework on their company, and asking for a brief call or meeting. Keep under 150 words.

Respond with JSON:
{ "subject": "...", "body": "..." }`;

  return { systemPrompt, userPrompt };
}

// ── Main: Generate Outreach Email ───────────────────────────────────────

/**
 * Generate an outreach email for a given match.
 * Loads match + company + thesis + memo data, calls GPT-4o, stores the result.
 */
export async function generateOutreachEmail(matchId: string): Promise<OutreachCampaign> {
  await ensureOutreachTable();

  const openai = await getOpenAI();

  // Load match with joined company + thesis data
  const matchRows = await sql()`
    SELECT
      m.id AS match_id, m.thesis_id, m.company_id, m.score,
      c.name AS company_name, c.description AS company_description,
      t.name AS thesis_name, t.description AS thesis_description,
      t.user_id
    FROM matches m
    JOIN companies c ON c.id = m.company_id
    JOIN theses t ON t.id = m.thesis_id
    WHERE m.id = ${matchId}::uuid
    LIMIT 1
  `;

  if (matchRows.length === 0) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const match = matchRows[0] as {
    match_id: string;
    thesis_id: string;
    company_id: string;
    score: number;
    company_name: string;
    company_description: string | null;
    thesis_name: string;
    thesis_description: string | null;
    user_id: string;
  };

  // Load memo if it exists (for recommendation + strengths)
  const memoRows = await sql()`
    SELECT recommendation, swot_json
    FROM memos
    WHERE match_id = ${matchId}::uuid
    ORDER BY generated_at DESC
    LIMIT 1
  `;

  let recommendation: string | null = null;
  let strengths: string[] = [];

  if (memoRows.length > 0) {
    const memo = memoRows[0] as { recommendation: string | null; swot_json: { strengths?: string[] } | null };
    recommendation = memo.recommendation || null;
    if (memo.swot_json?.strengths) {
      strengths = memo.swot_json.strengths;
    }
  }

  // Load user's fund name
  const userRows = await sql()`
    SELECT fund_name FROM users WHERE id = ${match.user_id}::uuid LIMIT 1
  `;
  const fundName = userRows.length > 0 ? (userRows[0] as { fund_name: string | null }).fund_name : null;

  // Build prompts
  const { systemPrompt, userPrompt } = buildOutreachPrompt({
    company_name: match.company_name,
    company_description: match.company_description,
    thesis_name: match.thesis_name,
    thesis_description: match.thesis_description,
    recommendation,
    strengths,
    fund_name: fundName,
  });

  // Call GPT-4o
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";

  // Parse the JSON response
  let subject = "";
  let body = "";
  try {
    const parsed = JSON.parse(rawContent);
    subject = String(parsed.subject || "").slice(0, 500);
    body = String(parsed.body || "");
  } catch {
    // If JSON parse fails, use raw content as body
    body = rawContent;
    subject = "Introduction from Scout AI";
  }

  // Store in database
  const inserted = await sql()`
    INSERT INTO outreach_campaigns (user_id, match_id, company_id, subject, body, status)
    VALUES (
      ${match.user_id}::uuid,
      ${matchId}::uuid,
      ${match.company_id}::uuid,
      ${subject},
      ${body},
      'draft'
    )
    RETURNING id, created_at, updated_at, status
  `;

  const row = inserted[0] as {
    id: string;
    created_at: string;
    updated_at: string;
    status: string;
  } | undefined;

  return {
    id: row?.id || "",
    userId: match.user_id,
    matchId,
    companyId: match.company_id,
    subject,
    body,
    status: row?.status || "draft",
    createdAt: row?.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row?.updated_at ? String(row.updated_at) : new Date().toISOString(),
    companyName: match.company_name,
    thesisName: match.thesis_name,
    matchScore: match.score,
  };
}

/**
 * Fetch an existing outreach campaign for a match, or null if none exists.
 */
export async function getOutreachForMatch(matchId: string): Promise<OutreachCampaign | null> {
  await ensureOutreachTable();

  const rows = await sql()`
    SELECT
      oc.id, oc.user_id, oc.match_id, oc.company_id,
      oc.subject, oc.body, oc.status,
      oc.created_at, oc.updated_at,
      c.name AS company_name,
      t.name AS thesis_name,
      m.score AS match_score
    FROM outreach_campaigns oc
    LEFT JOIN matches m ON m.id = oc.match_id
    LEFT JOIN companies c ON c.id = oc.company_id
    LEFT JOIN theses t ON t.id = m.thesis_id
    WHERE oc.match_id = ${matchId}::uuid
    ORDER BY oc.created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;

  return {
    id: String(r.id),
    userId: String(r.user_id),
    matchId: r.match_id ? String(r.match_id) : null,
    companyId: r.company_id ? String(r.company_id) : null,
    subject: r.subject ? String(r.subject) : null,
    body: r.body ? String(r.body) : null,
    status: String(r.status),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    companyName: r.company_name ? String(r.company_name) : null,
    thesisName: r.thesis_name ? String(r.thesis_name) : null,
    matchScore: r.match_score ? Number(r.match_score) : null,
  };
}

/**
 * List all outreach campaigns for the current user.
 */
export async function getOutreachList(
  userId: string,
  options?: { limit?: number; status?: string },
): Promise<OutreachCampaign[]> {
  await ensureOutreachTable();

  const limit = options?.limit ?? 50;
  const statusFilter = options?.status;

  const rows = statusFilter
    ? await sql()`
        SELECT
          oc.id, oc.user_id, oc.match_id, oc.company_id,
          oc.subject, oc.body, oc.status,
          oc.created_at, oc.updated_at,
          c.name AS company_name,
          t.name AS thesis_name,
          m.score AS match_score
        FROM outreach_campaigns oc
        LEFT JOIN matches m ON m.id = oc.match_id
        LEFT JOIN companies c ON c.id = oc.company_id
        LEFT JOIN theses t ON t.id = m.thesis_id
        WHERE oc.user_id = ${userId}::uuid AND oc.status = ${statusFilter}
        ORDER BY oc.created_at DESC
        LIMIT ${limit}
      `
    : await sql()`
        SELECT
          oc.id, oc.user_id, oc.match_id, oc.company_id,
          oc.subject, oc.body, oc.status,
          oc.created_at, oc.updated_at,
          c.name AS company_name,
          t.name AS thesis_name,
          m.score AS match_score
        FROM outreach_campaigns oc
        LEFT JOIN matches m ON m.id = oc.match_id
        LEFT JOIN companies c ON c.id = oc.company_id
        LEFT JOIN theses t ON t.id = m.thesis_id
        WHERE oc.user_id = ${userId}::uuid
        ORDER BY oc.created_at DESC
        LIMIT ${limit}
      `;

  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    userId: String(r.user_id),
    matchId: r.match_id ? String(r.match_id) : null,
    companyId: r.company_id ? String(r.company_id) : null,
    subject: r.subject ? String(r.subject) : null,
    body: r.body ? String(r.body) : null,
    status: String(r.status),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    companyName: r.company_name ? String(r.company_name) : null,
    thesisName: r.thesis_name ? String(r.thesis_name) : null,
    matchScore: r.match_score ? Number(r.match_score) : null,
  })) as OutreachCampaign[];
}

/**
 * Update an outreach campaign's status.
 */
export async function updateOutreachStatus(
  campaignId: string,
  userId: string,
  newStatus: string,
): Promise<void> {
  await ensureOutreachTable();

  await sql()`
    UPDATE outreach_campaigns
    SET status = ${newStatus}, updated_at = now()
    WHERE id = ${campaignId}::uuid AND user_id = ${userId}::uuid
  `;
}

/**
 * Update an outreach campaign's subject and body.
 */
export async function updateOutreachContent(
  campaignId: string,
  userId: string,
  subject: string,
  body: string,
): Promise<void> {
  await ensureOutreachTable();

  await sql()`
    UPDATE outreach_campaigns
    SET subject = ${subject}, body = ${body}, updated_at = now()
    WHERE id = ${campaignId}::uuid AND user_id = ${userId}::uuid
  `;
}

/**
 * Delete an outreach campaign.
 */
export async function deleteOutreach(campaignId: string, userId: string): Promise<void> {
  await ensureOutreachTable();

  await sql()`
    DELETE FROM outreach_campaigns
    WHERE id = ${campaignId}::uuid AND user_id = ${userId}::uuid
  `;
}

/**
 * Check if a match already has an outreach campaign.
 */
export async function matchHasOutreach(matchId: string): Promise<boolean> {
  await ensureOutreachTable();

  const rows = await sql()`
    SELECT id FROM outreach_campaigns WHERE match_id = ${matchId}::uuid LIMIT 1
  `;

  return rows.length > 0;
}
