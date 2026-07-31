import { sql } from "~/db";

// ── Lazy OpenAI client (same pattern as src/lib/embeddings.ts) ─────────

let _openaiPromise: Promise<import("openai").OpenAI> | null = null;

async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = (async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set — connect an OpenAI API key before generating memos.",
      );
    }
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  })();
  return _openaiPromise;
}

// ── Types ───────────────────────────────────────────────────────────────

export interface DealMemoData {
  matchId: string;
  companyName: string;
  thesisName: string;
  recommendation: string;
  scores: {
    team: number;
    market: number;
    traction: number;
    overall: number;
  };
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  content: string;
  aiModel: string;
  aiTokens: number;
  generatedAt: string;
}

// ── Table creation (idempotent) ─────────────────────────────────────────

async function ensureMemosTable() {
  await sql()`CREATE TABLE IF NOT EXISTS memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    swot_json JSONB,
    score_json JSONB,
    recommendation VARCHAR(50),
    ai_model VARCHAR(100),
    ai_tokens INT,
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
  company_source: string | null;
  company_source_url: string | null;
  company_sector: string | null;
  company_stage: string | null;
  company_location: string | null;
  company_total_funding: string | null;
  company_metadata: Record<string, unknown> | null;
  thesis_name: string;
  thesis_description: string | null;
  thesis_sectors: string[] | null;
  thesis_stages: string[] | null;
  thesis_geo_focus: string[] | null;
  thesis_check_size: string | null;
}

function buildMemoPrompt(match: MatchData): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a venture capital analyst at a top-tier fund. Given a company profile and an
investment thesis, produce a deal memo with these sections in Markdown:

## 1. Executive Summary
2-3 sentences on what the company does and the investment case.

## 2. Company Overview
What they do, founding story context, and key differentiators.

## 3. Market Analysis
TAM, market dynamics, tailwinds. Use available data; flag gaps.

## 4. Team Assessment
Founder background, key hires, team strengths and gaps.

## 5. Traction & Metrics
Revenue signals, growth indicators, funding history if available.

## 6. Competitive Landscape
Key competitors, the company's moat or defensibility.

## 7. Risks & Mitigations
Key risks and potential mitigations. Be honest — don't sugarcoat.

## 8. Recommendation
One of: Strong Buy, Buy, Hold, or Pass — with a brief rationale.

Be direct, data-driven, and honest. Flag missing information rather than
inventing it. If a section lacks data, say so explicitly.

After the Markdown sections, append a JSON block exactly like this:

\`\`\`json
{
  "recommendation": "Strong Buy",
  "scores": {
    "team": 7,
    "market": 8,
    "traction": 6,
    "overall": 7
  },
  "swot": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "opportunities": ["...", "..."],
    "threats": ["...", "..."]
  }
}
\`\`\`

Scores are 0-10 integers. Overall should reflect the weighted judgment, not just an average.`;

  const sectors = match.thesis_sectors?.join(", ") || "Not specified";
  const stages = match.thesis_stages?.join(", ") || "Not specified";
  const geo = match.thesis_geo_focus?.join(", ") || "Not specified";
  const check = match.thesis_check_size || "Not specified";

  const metadataStr = match.company_metadata
    ? JSON.stringify(match.company_metadata, null, 2)
    : "No additional metadata available";

  const userPrompt = `Thesis: ${match.thesis_name} — ${match.thesis_description || "No description provided"}
Sectors: ${sectors}, Stages: ${stages}, Geo: ${geo}, Check Size: ${check}

Company: ${match.company_name}
Description: ${match.company_description || "No description available"}
Sector: ${match.company_sector || "Unknown"}
Stage: ${match.company_stage || "Unknown"}
Location: ${match.company_location || "Unknown"}
Total Funding: ${match.company_total_funding || "Unknown"}
Source: ${match.company_source || "Unknown"} (${match.company_source_url || "N/A"})
Vector Match Score: ${(match.score * 100).toFixed(0)}%

Additional Metadata:
${metadataStr}

Respond with the full memo in Markdown followed by the JSON block as specified.`;

  return { systemPrompt, userPrompt };
}

// ── Response parser ─────────────────────────────────────────────────────

function parseMemoResponse(content: string): {
  markdown: string;
  recommendation: string;
  scores: { team: number; market: number; traction: number; overall: number };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
} {
  // Defaults
  let recommendation = "Hold";
  let scores = { team: 5, market: 5, traction: 5, overall: 5 };
  let swot = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
  };

  // Try to extract JSON block from the response
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]!);
      if (parsed.recommendation) recommendation = String(parsed.recommendation);
      if (parsed.scores) {
        scores = {
          team: typeof parsed.scores.team === "number" ? parsed.scores.team : 5,
          market: typeof parsed.scores.market === "number" ? parsed.scores.market : 5,
          traction: typeof parsed.scores.traction === "number" ? parsed.scores.traction : 5,
          overall: typeof parsed.scores.overall === "number" ? parsed.scores.overall : 5,
        };
      }
      if (parsed.swot) {
        swot = {
          strengths: Array.isArray(parsed.swot.strengths) ? parsed.swot.strengths : [],
          weaknesses: Array.isArray(parsed.swot.weaknesses) ? parsed.swot.weaknesses : [],
          opportunities: Array.isArray(parsed.swot.opportunities) ? parsed.swot.opportunities : [],
          threats: Array.isArray(parsed.swot.threats) ? parsed.swot.threats : [],
        };
      }
    } catch {
      // JSON parse failed; keep defaults, use full content as markdown
    }
  }

  // Try to extract recommendation from free text as fallback
  if (!jsonMatch || recommendation === "Hold") {
    const recMatch = content.match(/recommendation[:\s]*["']?(strong buy|buy|hold|pass)["']?/i);
    if (recMatch) {
      const raw = recMatch[1]!.toLowerCase();
      if (raw === "strong buy") recommendation = "Strong Buy";
      else if (raw === "buy") recommendation = "Buy";
      else if (raw === "hold") recommendation = "Hold";
      else if (raw === "pass") recommendation = "Pass";
    }
  }

  return { markdown: content, recommendation, scores, swot };
}

// ── Main: Generate Deal Memo ────────────────────────────────────────────

/**
 * Generate a deal memo for a given match.
 * Loads match + company + thesis data, calls GPT-4o, stores the result,
 * and updates the match status to 'reviewing'.
 */
export async function generateDealMemo(matchId: string): Promise<DealMemoData> {
  await ensureMemosTable();

  const openai = await getOpenAI();

  // Load the match with joined company + thesis data
  const rows = await sql()`
    SELECT
      m.id AS match_id, m.thesis_id, m.company_id, m.score,
      c.name AS company_name, c.description AS company_description,
      c.source AS company_source, c.source_url AS company_source_url,
      c.sector AS company_sector, c.stage AS company_stage,
      c.location AS company_location, c.total_funding AS company_total_funding,
      c.metadata AS company_metadata,
      t.name AS thesis_name, t.description AS thesis_description,
      t.sectors AS thesis_sectors, t.stages AS thesis_stages,
      t.geo_focus AS thesis_geo_focus, t.check_size AS thesis_check_size
    FROM matches m
    JOIN companies c ON c.id = m.company_id
    JOIN theses t ON t.id = m.thesis_id
    WHERE m.id = ${matchId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error(`Match not found: ${matchId}`);
  }

  const match = rows[0] as MatchData;

  // Build prompts
  const { systemPrompt, userPrompt } = buildMemoPrompt(match);

  // Call GPT-4o
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 4000,
  });

  const rawContent = response.choices[0]?.message?.content || "";
  const model = response.model || "gpt-4o";
  const tokens = response.usage?.total_tokens || 0;

  // Parse the response
  const parsed = parseMemoResponse(rawContent);

  // Store in database
  const normalizedRecommendation = parsed.recommendation.toLowerCase().replace(/\s+/g, "_");
  const recColumn = ["strong_buy", "buy", "hold", "pass"].includes(normalizedRecommendation)
    ? normalizedRecommendation
    : "hold";

  const inserted = await sql()`
    INSERT INTO memos (match_id, content, swot_json, score_json, recommendation, ai_model, ai_tokens)
    VALUES (
      ${matchId}::uuid,
      ${parsed.markdown},
      ${JSON.stringify(parsed.swot)}::jsonb,
      ${JSON.stringify(parsed.scores)}::jsonb,
      ${recColumn},
      ${model},
      ${tokens}
    )
    RETURNING id, generated_at
  `;

  const memoRow = inserted[0] as { id: string; generated_at: string } | undefined;

  // Update match status to 'reviewing'
  await sql()`
    UPDATE matches
    SET status = 'reviewing', reviewed_at = now()
    WHERE id = ${matchId}::uuid
  `;

  return {
    matchId,
    companyName: match.company_name,
    thesisName: match.thesis_name,
    recommendation: parsed.recommendation,
    scores: parsed.scores,
    swot: parsed.swot,
    content: parsed.markdown,
    aiModel: model,
    aiTokens: tokens,
    generatedAt: memoRow?.generated_at ? String(memoRow.generated_at) : new Date().toISOString(),
  };
}

/**
 * Fetch an existing memo for a match, or null if none exists.
 */
export async function getMemoForMatch(matchId: string): Promise<DealMemoData | null> {
  await ensureMemosTable();

  const rows = await sql()`
    SELECT
      m.id, m.match_id, m.content, m.swot_json, m.score_json,
      m.recommendation, m.ai_model, m.ai_tokens, m.generated_at,
      c.name AS company_name,
      t.name AS thesis_name
    FROM memos m
    JOIN matches mt ON mt.id = m.match_id
    JOIN companies c ON c.id = mt.company_id
    JOIN theses t ON t.id = mt.thesis_id
    WHERE m.match_id = ${matchId}::uuid
    ORDER BY m.generated_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;

  return {
    matchId: String(r.match_id),
    companyName: String(r.company_name || ""),
    thesisName: String(r.thesis_name || ""),
    recommendation: String(r.recommendation || "hold"),
    scores: (r.score_json as { team: number; market: number; traction: number; overall: number }) || {
      team: 0,
      market: 0,
      traction: 0,
      overall: 0,
    },
    swot: (r.swot_json as {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    }) || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    content: String(r.content || ""),
    aiModel: String(r.ai_model || ""),
    aiTokens: Number(r.ai_tokens || 0),
    generatedAt: String(r.generated_at || ""),
  };
}

/**
 * List all memos for the current user's matches.
 */
export async function getMemosList(userId: string, options?: { limit?: number }): Promise<DealMemoData[]> {
  await ensureMemosTable();

  const limit = options?.limit ?? 50;

  const rows = await sql()`
    SELECT
      m.id, m.match_id, m.content, m.swot_json, m.score_json,
      m.recommendation, m.ai_model, m.ai_tokens, m.generated_at,
      c.name AS company_name,
      t.name AS thesis_name
    FROM memos m
    JOIN matches mt ON mt.id = m.match_id
    JOIN companies c ON c.id = mt.company_id
    JOIN theses t ON t.id = mt.thesis_id
    WHERE t.user_id = ${userId}::uuid
    ORDER BY m.generated_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r: Record<string, unknown>) => ({
    matchId: String(r.match_id),
    companyName: String(r.company_name || ""),
    thesisName: String(r.thesis_name || ""),
    recommendation: String(r.recommendation || "hold"),
    scores: (r.score_json as { team: number; market: number; traction: number; overall: number }) || {
      team: 0,
      market: 0,
      traction: 0,
      overall: 0,
    },
    swot: (r.swot_json as {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    }) || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    content: String(r.content || ""),
    aiModel: String(r.ai_model || ""),
    aiTokens: Number(r.ai_tokens || 0),
    generatedAt: String(r.generated_at || ""),
  })) as DealMemoData[];
}

/**
 * Count memos for the current user.
 */
export async function getMemosCount(userId: string): Promise<number> {
  await ensureMemosTable();

  const rows = await sql()`
    SELECT COUNT(*)::int AS count
    FROM memos m
    JOIN matches mt ON mt.id = m.match_id
    JOIN theses t ON t.id = mt.thesis_id
    WHERE t.user_id = ${userId}::uuid
  `;

  return rows[0]?.count ?? 0;
}

/**
 * Check if a match already has a memo.
 */
export async function matchHasMemo(matchId: string): Promise<boolean> {
  await ensureMemosTable();

  const rows = await sql()`
    SELECT id FROM memos WHERE match_id = ${matchId}::uuid LIMIT 1
  `;

  return rows.length > 0;
}
