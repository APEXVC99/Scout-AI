import { sql } from "~/db";

// ── Lazy OpenAI client (same pattern as src/lib/embeddings.ts / memos.ts) ─

let _openaiPromise: Promise<import("openai").OpenAI> | null = null;

async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = (async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set — connect an OpenAI API key before generating intro strategies.",
      );
    }
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  })();
  return _openaiPromise;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface IntroStrategy {
  id: string;
  matchId: string;
  targetPersona: string;
  targetTitle: string | null;
  rationale: string;
  conversationStarters: string[];
  mutualContext: string | null;
  generatedAt: string;
}

// ── Table creation (idempotent) ─────────────────────────────────────────

async function ensureIntroTable() {
  await sql()`CREATE TABLE IF NOT EXISTS intro_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
    target_persona TEXT NOT NULL,
    target_title TEXT,
    rationale TEXT NOT NULL,
    conversation_starters JSONB NOT NULL DEFAULT '[]',
    mutual_context TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

// ── Prompt builder ──────────────────────────────────────────────────────

interface MatchData {
  match_id: string;
  thesis_id: string;
  company_id: string;
  score: number;
  company_name: string;
  company_description: string | null;
  company_website: string | null;
  company_source: string | null;
  company_source_url: string | null;
  company_sector: string | null;
  company_stage: string | null;
  company_location: string | null;
  company_founded_year: number | null;
  company_employee_count: number | null;
  company_total_funding: string | null;
  company_last_funding: string | null;
  company_metadata: Record<string, unknown> | null;
  thesis_name: string;
  thesis_description: string | null;
  thesis_sectors: string[] | null;
  thesis_stages: string[] | null;
  thesis_geo_focus: string[] | null;
  thesis_check_size: string | null;
  user_fund_name: string | null;
}

interface ContextData {
  memoRecommendation: string | null;
  memoStrengths: string[];
  outreachSubject: string | null;
  outreachBody: string | null;
  analysis: { fit_score: number; verdict: string } | null;
}

export async function generateIntroStrategy(
  matchId: string,
): Promise<IntroStrategy> {
  await ensureIntroTable();

  const openai = await getOpenAI();

  // Load match with joined company + thesis + fund data
  const rows = await sql()`
    SELECT
      m.id AS match_id, m.thesis_id, m.company_id, m.score,
      c.name AS company_name, c.description AS company_description,
      c.website AS company_website,
      c.source AS company_source, c.source_url AS company_source_url,
      c.sector AS company_sector, c.stage AS company_stage,
      c.location AS company_location, c.founded_year AS company_founded_year,
      c.employee_count AS company_employee_count,
      c.total_funding AS company_total_funding, c.last_funding AS company_last_funding,
      c.metadata AS company_metadata,
      t.name AS thesis_name, t.description AS thesis_description,
      t.sectors AS thesis_sectors, t.stages AS thesis_stages,
      t.geo_focus AS thesis_geo_focus, t.check_size AS thesis_check_size,
      u.fund_name AS user_fund_name
    FROM matches m
    JOIN companies c ON c.id = m.company_id
    JOIN theses t ON t.id = m.thesis_id
    JOIN users u ON u.id = t.user_id
    WHERE m.id = ${matchId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const match = rows[0] as MatchData;

  // Load memo context (recommendation + strengths)
  const memoRows = await sql()`
    SELECT recommendation, swot_json
    FROM memos
    WHERE match_id = ${matchId}::uuid
    ORDER BY generated_at DESC
    LIMIT 1
  `;

  let memoRecommendation: string | null = null;
  let memoStrengths: string[] = [];
  if (memoRows.length > 0) {
    const memo = memoRows[0] as {
      recommendation: string | null;
      swot_json: { strengths?: string[] } | null;
    };
    memoRecommendation = memo.recommendation || null;
    if (memo.swot_json?.strengths) {
      memoStrengths = memo.swot_json.strengths;
    }
  }

  // Load outreach context if it exists
  const outreachRows = await sql()`
    SELECT subject, body
    FROM outreach_campaigns
    WHERE match_id = ${matchId}::uuid
    ORDER BY created_at DESC
    LIMIT 1
  `;

  let outreachSubject: string | null = null;
  let outreachBody: string | null = null;
  if (outreachRows.length > 0) {
    const oc = outreachRows[0] as {
      subject: string | null;
      body: string | null;
    };
    outreachSubject = oc.subject || null;
    outreachBody = oc.body || null;
  }

  // Load analysis context if it exists
  const analysisRows = await sql()`
    SELECT fit_score, verdict
    FROM thesis_analyses
    WHERE match_id = ${matchId}::uuid
    LIMIT 1
  `;

  let analysis: ContextData["analysis"] = null;
  if (analysisRows.length > 0) {
    const a = analysisRows[0] as { fit_score: number; verdict: string };
    analysis = { fit_score: Number(a.fit_score), verdict: String(a.verdict) };
  }

  const { systemPrompt, userPrompt } = buildIntroPrompt(match, {
    memoRecommendation,
    memoStrengths,
    outreachSubject,
    outreachBody,
    analysis,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const parsed = parseIntroResponse(rawContent);

  // Store in database (upsert — one strategy per match)
  const inserted = await sql()`
    INSERT INTO intro_strategies (match_id, target_persona, target_title, rationale, conversation_starters, mutual_context)
    VALUES (
      ${matchId}::uuid,
      ${parsed.targetPersona},
      ${parsed.targetTitle},
      ${parsed.rationale},
      ${JSON.stringify(parsed.conversationStarters)}::jsonb,
      ${parsed.mutualContext}
    )
    ON CONFLICT (match_id) DO UPDATE SET
      target_persona = EXCLUDED.target_persona,
      target_title = EXCLUDED.target_title,
      rationale = EXCLUDED.rationale,
      conversation_starters = EXCLUDED.conversation_starters,
      mutual_context = EXCLUDED.mutual_context,
      generated_at = now()
    RETURNING id, generated_at
  `;

  const row = inserted[0] as { id: string; generated_at: string } | undefined;

  return {
    id: row?.id || "",
    matchId,
    targetPersona: parsed.targetPersona,
    targetTitle: parsed.targetTitle,
    rationale: parsed.rationale,
    conversationStarters: parsed.conversationStarters,
    mutualContext: parsed.mutualContext,
    generatedAt: row?.generated_at
      ? String(row.generated_at)
      : new Date().toISOString(),
  };
}

// ── Prompt builder ──────────────────────────────────────────────────────

function buildIntroPrompt(
  match: MatchData,
  ctx: ContextData,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a venture capital associate who is an expert at warm introductions.
Given a company that matches an investment thesis, identify the BEST person to
contact at that company and craft an intro strategy.

Analyze:
1. Who to contact — CEO, CTO, Head of Growth, COO, Founder, etc. — based on the
   company's stage, sector, and what we know from the description/metadata.
2. Why they're the right person — what they likely care about and control.
3. 3 conversation starters — specific, credible hooks based on the company's
   actual description, sector, funding, location, and the thesis.
4. Mutual context — what might exist between the fund and the company: industry
   events, shared investors, tech stack overlap, same city, common networks.
5. The best angle for the intro — why this fund is worth the founder's time.

Respond ONLY with JSON in exactly this shape:
{
  "target_persona": "CEO",
  "target_title": "Co-founder & CEO (inferred)",
  "rationale": "2-3 sentences on why this person is the right contact.",
  "conversation_starters": ["Starter 1", "Starter 2", "Starter 3"],
  "mutual_context": "What shared context likely exists, or null if nothing plausible."
}

Rules:
- target_persona is a role label: CEO, CTO, Head of Growth, COO, Founder, etc.
- target_title should be prefixed with "(inferred)" when the exact title is not
  confirmed by data — never fabricate a real person's name.
- conversation_starters must reference the company's actual data (description,
  sector, funding, location) — not generic lines.
- mutual_context may be null if nothing plausible; be honest about uncertainty.
- Never invent names, people, investors, or events.`;

  const sectors = match.thesis_sectors?.join(", ") || "Not specified";
  const stages = match.thesis_stages?.join(", ") || "Not specified";
  const geo = match.thesis_geo_focus?.join(", ") || "Not specified";
  const check = match.thesis_check_size || "Not specified";

  const metadataStr = match.company_metadata
    ? JSON.stringify(match.company_metadata, null, 2)
    : "No additional metadata available";

  const strengthsStr =
    ctx.memoStrengths.length > 0
      ? ctx.memoStrengths.join("; ")
      : "Not available";

  const userPrompt = `My fund: ${match.user_fund_name || "Unnamed fund"}
My thesis: ${match.thesis_name} — ${match.thesis_description || "No description provided"}
Sectors: ${sectors}, Stages: ${stages}, Geo: ${geo}, Check Size: ${check}

Company: ${match.company_name}
Description: ${match.company_description || "No description available"}
Website: ${match.company_website || "Unknown"}
Sector: ${match.company_sector || "Unknown"}
Stage: ${match.company_stage || "Unknown"}
Location: ${match.company_location || "Unknown"}
Founded: ${match.company_founded_year || "Unknown"}
Employees: ${match.company_employee_count || "Unknown"}
Total Funding: ${match.company_total_funding || "Unknown"}
Last Funding: ${match.company_last_funding || "Unknown"}
Vector Match Score: ${(match.score * 100).toFixed(0)}%

Additional Metadata:
${metadataStr}

Deal Memo Recommendation: ${ctx.memoRecommendation || "No memo yet"}
Key Strengths: ${strengthsStr}
Thesis Fit Analysis: ${ctx.analysis ? `score ${ctx.analysis.fit_score}/100, verdict: ${ctx.analysis.verdict}` : "Not generated yet"}
Outreach Draft: ${ctx.outreachSubject ? `Subject: ${ctx.outreachSubject}` : "Not generated yet"}${ctx.outreachBody ? `\nBody: ${ctx.outreachBody.slice(0, 500)}` : ""}

Respond with the JSON intro strategy as specified.`;

  return { systemPrompt, userPrompt };
}

// ── Response parser ─────────────────────────────────────────────────────

function parseIntroResponse(content: string): {
  targetPersona: string;
  targetTitle: string | null;
  rationale: string;
  conversationStarters: string[];
  mutualContext: string | null;
} {
  let raw: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") raw = parsed;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]!);
        if (parsed && typeof parsed === "object") raw = parsed;
      } catch {
        // give up — use defaults
      }
    }
  }

  const targetPersona = String(
    raw.target_persona || raw.targetPersona || "CEO",
  ).slice(0, 200);
  const targetTitle = raw.target_title
    ? String(raw.target_title).slice(0, 300)
    : raw.targetTitle
      ? String(raw.targetTitle).slice(0, 300)
      : null;
  const rationale = String(raw.rationale || "No rationale generated.");

  const starters = Array.isArray(raw.conversation_starters)
    ? raw.conversation_starters.map((s) => String(s))
    : Array.isArray(raw.conversationStarters)
      ? raw.conversationStarters.map((s) => String(s))
      : [];

  const mutualContext =
    raw.mutual_context != null && raw.mutual_context !== ""
      ? String(raw.mutual_context)
      : null;

  return {
    targetPersona,
    targetTitle,
    rationale,
    conversationStarters: starters,
    mutualContext,
  };
}

// ── Read helpers ────────────────────────────────────────────────────────

/**
 * Fetch an existing intro strategy for a match, or null if none exists.
 */
export async function getIntroStrategyForMatch(
  matchId: string,
): Promise<IntroStrategy | null> {
  await ensureIntroTable();

  const rows = await sql()`
    SELECT id, match_id, target_persona, target_title, rationale, conversation_starters, mutual_context, generated_at
    FROM intro_strategies
    WHERE match_id = ${matchId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;

  return {
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
  };
}

/**
 * Check if a match already has an intro strategy.
 */
export async function matchHasIntroStrategy(matchId: string): Promise<boolean> {
  await ensureIntroTable();

  const rows = await sql()`
    SELECT id FROM intro_strategies WHERE match_id = ${matchId}::uuid LIMIT 1
  `;

  return rows.length > 0;
}
