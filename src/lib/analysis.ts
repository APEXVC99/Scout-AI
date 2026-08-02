import { sql } from "~/db";

// ── Lazy OpenAI client (same pattern as src/lib/embeddings.ts / memos.ts) ─

let _openaiPromise: Promise<import("openai").OpenAI> | null = null;

async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = (async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set — connect an OpenAI API key before generating thesis fit analyses.",
      );
    }
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  })();
  return _openaiPromise;
}

// ── Types ───────────────────────────────────────────────────────────────

export type AnalysisVerdict = "strong_fit" | "fit" | "watch" | "pass";

export interface ThesisAnalysis {
  id: string;
  matchId: string;
  fitScore: number;
  fitSummary: string;
  strengths: string[];
  concerns: string[];
  missingSignals: string[];
  verdict: AnalysisVerdict;
  generatedAt: string;
}

// ── Table creation (idempotent) ─────────────────────────────────────────

async function ensureAnalysisTable() {
  await sql()`CREATE TABLE IF NOT EXISTS thesis_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
    fit_score FLOAT NOT NULL,
    fit_summary TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]',
    concerns JSONB NOT NULL DEFAULT '[]',
    missing_signals JSONB NOT NULL DEFAULT '[]',
    verdict VARCHAR(20) NOT NULL,
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
}

interface MemoContext {
  recommendation: string | null;
  scores: {
    team: number;
    market: number;
    traction: number;
    overall: number;
  } | null;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } | null;
}

export async function generateThesisAnalysis(
  matchId: string,
): Promise<ThesisAnalysis> {
  await ensureAnalysisTable();

  const openai = await getOpenAI();

  // Load match with joined company + thesis data
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

  // Load memo context if it exists (recommendation, scores, SWOT)
  const memoRows = await sql()`
    SELECT recommendation, score_json, swot_json
    FROM memos
    WHERE match_id = ${matchId}::uuid
    ORDER BY generated_at DESC
    LIMIT 1
  `;

  let memoContext: MemoContext | null = null;
  if (memoRows.length > 0) {
    const memo = memoRows[0] as {
      recommendation: string | null;
      score_json: MemoContext["scores"] | null;
      swot_json: MemoContext["swot"] | null;
    };
    memoContext = {
      recommendation: memo.recommendation || null,
      scores: memo.score_json,
      swot: memo.swot_json,
    };
  }

  const { systemPrompt, userPrompt } = buildAnalysisPrompt(match, memoContext);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const parsed = parseAnalysisResponse(rawContent);

  // Store in database (upsert — one analysis per match)
  const inserted = await sql()`
    INSERT INTO thesis_analyses (match_id, fit_score, fit_summary, strengths, concerns, missing_signals, verdict)
    VALUES (
      ${matchId}::uuid,
      ${parsed.fitScore},
      ${parsed.fitSummary},
      ${JSON.stringify(parsed.strengths)}::jsonb,
      ${JSON.stringify(parsed.concerns)}::jsonb,
      ${JSON.stringify(parsed.missingSignals)}::jsonb,
      ${parsed.verdict}
    )
    ON CONFLICT (match_id) DO UPDATE SET
      fit_score = EXCLUDED.fit_score,
      fit_summary = EXCLUDED.fit_summary,
      strengths = EXCLUDED.strengths,
      concerns = EXCLUDED.concerns,
      missing_signals = EXCLUDED.missing_signals,
      verdict = EXCLUDED.verdict,
      generated_at = now()
    RETURNING id, generated_at
  `;

  const row = inserted[0] as { id: string; generated_at: string } | undefined;

  return {
    id: row?.id || "",
    matchId,
    fitScore: parsed.fitScore,
    fitSummary: parsed.fitSummary,
    strengths: parsed.strengths,
    concerns: parsed.concerns,
    missingSignals: parsed.missingSignals,
    verdict: parsed.verdict,
    generatedAt: row?.generated_at
      ? String(row.generated_at)
      : new Date().toISOString(),
  };
}

// ── Prompt builder ──────────────────────────────────────────────────────

function buildAnalysisPrompt(
  match: MatchData,
  memo: MemoContext | null,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a venture capital analyst at a top-tier fund. Your job is to produce a
"Why This Deal" thesis-fit analysis: explain specifically WHY a company matches (or
doesn't match) an investment thesis, and flag what to watch for.

Analyze these dimensions:
1. Sector alignment — does the company operate in the thesis's target sectors?
2. Stage fit — is the company's stage compatible with the thesis's target stages?
3. Geo fit — is the company's location inside the thesis's geographic focus?
4. Check size alignment — does the company's funding history / likely round size fit the thesis's check size?
5. Team strength — what can you infer about the team from available data (description, metadata)?
6. Traction signals — revenue, funding raised, employee growth, any traction hints.
7. Competitive position — moat, differentiation, positioning implied by the description.
8. Red flags — anything that looks risky or inconsistent with the thesis.
9. Missing data — what we couldn't determine from available information.

Respond ONLY with JSON in exactly this shape:
{
  "fit_score": 75,
  "fit_summary": "2-3 sentences on why this company fits the thesis and the key watch item.",
  "strengths": ["Specific strength tied to this thesis", "..."],
  "concerns": ["Specific concern to watch", "..."],
  "missing_signals": ["Revenue figure", "Founder background", "..."],
  "verdict": "strong_fit"
}

Rules:
- fit_score is an integer 0-100.
- verdict is exactly one of: "strong_fit", "fit", "watch", "pass".
- Strengths and concerns must be concrete and tied to the specific company + thesis, not generic filler.
- missing_signals lists specific data points we lack (e.g. "Revenue", "Round size", "Founder background").
- Be honest: if the company is a poor fit, say so. Never invent data.`;

  const sectors = match.thesis_sectors?.join(", ") || "Not specified";
  const stages = match.thesis_stages?.join(", ") || "Not specified";
  const geo = match.thesis_geo_focus?.join(", ") || "Not specified";
  const check = match.thesis_check_size || "Not specified";

  const metadataStr = match.company_metadata
    ? JSON.stringify(match.company_metadata, null, 2)
    : "No additional metadata available";

  let memoStr = "No memo generated yet for this match.";
  if (memo) {
    memoStr = JSON.stringify(memo, null, 2);
  }

  const userPrompt = `Thesis: ${match.thesis_name} — ${match.thesis_description || "No description provided"}
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
Source: ${match.company_source || "Unknown"} (${match.company_source_url || "N/A"})
Vector Match Score: ${(match.score * 100).toFixed(0)}%

Additional Metadata:
${metadataStr}

Existing Deal Memo Data:
${memoStr}

Respond with the JSON analysis as specified.`;

  return { systemPrompt, userPrompt };
}

// ── Response parser ─────────────────────────────────────────────────────

const VALID_VERDICTS = ["strong_fit", "fit", "watch", "pass"] as const;

function parseAnalysisResponse(content: string): {
  fitScore: number;
  fitSummary: string;
  strengths: string[];
  concerns: string[];
  missingSignals: string[];
  verdict: AnalysisVerdict;
} {
  let raw: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") raw = parsed;
  } catch {
    // Fall back to extracting a JSON block
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

  const fitScore = Math.max(
    0,
    Math.min(100, Math.round(Number(raw.fit_score) || 0)),
  );
  const fitSummary = String(raw.fit_summary || "No summary generated.");
  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths.map((s) => String(s))
    : [];
  const concerns = Array.isArray(raw.concerns)
    ? raw.concerns.map((s) => String(s))
    : [];
  const missingSignals = Array.isArray(raw.missing_signals)
    ? raw.missing_signals.map((s) => String(s))
    : [];

  let verdict: AnalysisVerdict = "watch";
  if (VALID_VERDICTS.includes(raw.verdict as AnalysisVerdict)) {
    verdict = raw.verdict as AnalysisVerdict;
  }

  return { fitScore, fitSummary, strengths, concerns, missingSignals, verdict };
}

// ── Read helpers ────────────────────────────────────────────────────────

/**
 * Fetch an existing thesis analysis for a match, or null if none exists.
 */
export async function getAnalysisForMatch(
  matchId: string,
): Promise<ThesisAnalysis | null> {
  await ensureAnalysisTable();

  const rows = await sql()`
    SELECT id, match_id, fit_score, fit_summary, strengths, concerns, missing_signals, verdict, generated_at
    FROM thesis_analyses
    WHERE match_id = ${matchId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const r = rows[0] as Record<string, unknown>;

  return {
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
    verdict: (VALID_VERDICTS.includes(r.verdict as AnalysisVerdict)
      ? r.verdict
      : "watch") as AnalysisVerdict,
    generatedAt: String(r.generated_at || ""),
  };
}

/**
 * Check if a match already has a thesis analysis.
 */
export async function matchHasAnalysis(matchId: string): Promise<boolean> {
  await ensureAnalysisTable();

  const rows = await sql()`
    SELECT id FROM thesis_analyses WHERE match_id = ${matchId}::uuid LIMIT 1
  `;

  return rows.length > 0;
}
