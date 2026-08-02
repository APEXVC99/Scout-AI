import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import OpenAI from "openai";
import { embeddingToVectorString } from "~/lib/embeddings";

// ── Auth helper ──────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  const { getEvent } = await import("vinxi/http");

  const event = getEvent();
  if (!event?.request) throw new Error("Not in request context");

  const auth = await getAuth(event.request);
  const clerkId = auth.userId;
  if (!clerkId) throw new Error("Not authenticated");

  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;
  if (rows.length === 0) throw new Error("User not found in database");
  return rows[0].id as string;
}

// ── Check onboarding status ──────────────────────────────────────────────

export const checkOnboarding = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();

  // Ensure column exists (idempotent)
  await sql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false`;

  const rows = await sql()`
    SELECT onboarding_complete FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  return { onboardingComplete: rows[0]?.onboarding_complete ?? false };
});

// ── Complete onboarding ──────────────────────────────────────────────────

export const completeOnboarding = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await getCurrentUserId();

  await sql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false`;

  await sql()`
    UPDATE users SET onboarding_complete = true, updated_at = now()
    WHERE id = ${userId}::uuid
  `;
  return { success: true };
});

// ── Tier (plan) ──────────────────────────────────────────────────────────

export type Tier = "solo" | "studio" | "firm";

const VALID_TIERS: Tier[] = ["solo", "studio", "firm"];

/** Ensure the users.tier column exists (idempotent). */
async function ensureTierColumn() {
  await sql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'solo'`;
}

/**
 * Save the plan tier picked on the /welcome page (localStorage "scout_tier")
 * to the authenticated user's record. Call from the onboarding completion flow.
 */
export const saveTier = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { tier: string } }) => {
    const userId = await getCurrentUserId();

    const tier = data.tier as Tier;
    if (!VALID_TIERS.includes(tier)) {
      throw new Error("Invalid tier");
    }

    await ensureTierColumn();

    await sql()`
      UPDATE users SET tier = ${tier}, updated_at = now()
      WHERE id = ${userId}::uuid
    `;
    return { success: true, tier };
  });

/** Fetch the current user's tier (used to display the plan in the app shell). */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();

  await ensureTierColumn();

  const rows = await sql()`
    SELECT tier, email, fund_name FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const row = rows[0] as { tier?: string; email?: string; fund_name?: string | null } | undefined;
  return {
    tier: (row?.tier as Tier) ?? "solo",
    email: row?.email ?? "",
    fundName: row?.fund_name ?? null,
  };
});

// ── Create thesis from free text via GPT-4o ─────────────────────────────

export const createThesisFromText = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { text: string } }) => {
    const userId = await getCurrentUserId();

    if (!data.text || !data.text.trim()) {
      throw new Error("Please describe what you invest in.");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key not configured");

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a venture capital analyst. Given a free-text description of what an investor is looking for, extract structured fields for an investment thesis. Return ONLY a JSON object with these fields:
- name: a short, punchy thesis name (max 60 chars)
- description: 1–2 sentence thesis description
- sectors: array of 2–5 sector tags (lowercase, hyphenated like "ai-ml", "climate-tech", "fintech")
- stages: array from: ["pre-seed", "seed", "series-a", "series-b", "growth"]
- geo_focus: array from: ["US", "Europe", "Asia", "LATAM", "Africa", "Global"]
- check_size: a reasonable check size range string like "$500K–$2M" or "$1M–$5M"

Be specific and reasonable. Don't invent sectors that don't exist.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: data.text.trim() },
      ],
      temperature: 0.5,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    let parsed: {
      name?: string;
      description?: string;
      sectors?: string[];
      stages?: string[];
      geo_focus?: string[];
      check_size?: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("Failed to parse AI response. Try again with a clearer description.");
    }

    const name = parsed.name || "My Thesis";
    const description = parsed.description || data.text.trim();
    const sectors = (parsed.sectors || []).filter((s: string) => typeof s === "string");
    const stages = (parsed.stages || []).filter((s: string) =>
      ["pre-seed", "seed", "series-a", "series-b", "growth"].includes(s),
    );
    const geo = (parsed.geo_focus || []).filter((g: string) =>
      ["US", "Europe", "Asia", "LATAM", "Africa", "Global"].includes(g),
    );
    const check = parsed.check_size || "";

    // Ensure theses table
    await sql()`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql()`CREATE TABLE IF NOT EXISTS theses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sectors TEXT[] NOT NULL DEFAULT '{}',
      stages TEXT[] NOT NULL DEFAULT '{}',
      geo_focus TEXT[] NOT NULL DEFAULT '{}',
      check_size VARCHAR(50),
      criteria_json JSONB,
      embedding VECTOR(1536),
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_demo BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql()`ALTER TABLE theses ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
    await sql()`ALTER TABLE theses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false`;

    // Generate embedding
    const embedText = [name, description, `Sectors: ${sectors.join(", ")}`, `Stages: ${stages.join(", ")}`]
      .filter(Boolean)
      .join(" | ");

    let vectorStr = "";
    try {
      const { generateEmbedding } = await import("~/lib/embeddings");
      const emb = await generateEmbedding(embedText);
      vectorStr = embeddingToVectorString(emb);
    } catch (embedErr) {
      console.error("Failed to embed onboarding thesis:", embedErr);
    }

    const inserted = await sql()`
      INSERT INTO theses (user_id, name, description, sectors, stages, geo_focus, check_size, is_active, embedding)
      VALUES (
        ${userId}::uuid,
        ${name},
        ${description},
        ${sectors},
        ${stages},
        ${geo},
        ${check},
        true,
        ${vectorStr ? sql`${vectorStr}::vector` : sql`NULL`}
      )
      RETURNING id, name, sectors, stages
    `;

    return inserted[0] as { id: string; name: string; sectors: string[]; stages: string[] };
  });
