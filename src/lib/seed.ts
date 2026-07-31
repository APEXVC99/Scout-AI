import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { generateEmbedding, embeddingToVectorString } from "~/lib/embeddings";

// ── Types ────────────────────────────────────────────────────────────

export interface SeedResult {
  thesisCount: number;
  companyCount: number;
  matchCount: number;
}

// ── Auth helper ──────────────────────────────────────────────────────

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

// ── Helper: ensure tables ─────────────────────────────────────────────

async function ensureTables() {
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
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_theses_embedding ON theses USING hnsw (embedding vector_cosine_ops)`;
  } catch { /* ok */ }

  await sql()`CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    website VARCHAR(500),
    description TEXT,
    sector VARCHAR(100),
    stage VARCHAR(50),
    location VARCHAR(200),
    founded_year INT,
    employee_count INT,
    total_funding VARCHAR(50),
    last_funding VARCHAR(50),
    source VARCHAR(100),
    source_url TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql()`ALTER TABLE companies ADD COLUMN IF NOT EXISTS embedding VECTOR(1536)`;
  await sql()`ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false`;
  try {
    await sql()`CREATE INDEX IF NOT EXISTS idx_companies_embedding ON companies USING hnsw (embedding vector_cosine_ops)`;
  } catch { /* ok */ }

  await sql()`CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(thesis_id, company_id)
  )`;
}

// ── Demo data definitions ─────────────────────────────────────────────

const DEMO_THESIS = {
  name: "AI Infrastructure",
  description:
    "We invest in foundational AI infrastructure companies — the picks and shovels of the AI revolution. This includes compute platforms, model deployment and orchestration tools, data pipelines, vector databases, AI observability, and developer tools that make AI more accessible. We look for strong technical teams building for real enterprise pain points, with a focus on open-source-friendly business models.",
  sectors: ["ai-ml", "infrastructure", "developer-tools", "open-source"],
  stages: ["seed", "series-a"],
  geo_focus: ["US", "Europe"],
  check_size: "$1M–$5M",
};

const DEMO_COMPANIES: Array<{
  name: string;
  description: string;
  sector: string;
  stage: string;
  location: string;
  total_funding: string;
}> = [
  {
    name: "Modal Labs",
    description:
      "Serverless GPU compute for AI workloads. Modal provides a Python-native platform for running ML inference, fine-tuning, and batch processing on elastic GPU clusters with cold-start times under 1 second.",
    sector: "ai-ml",
    stage: "series-a",
    location: "New York, US",
    total_funding: "$23M",
  },
  {
    name: "Baseten",
    description:
      "ML model deployment and serving platform. Baseten helps companies deploy, manage, and scale ML models in production with automatic GPU provisioning, version management, and observability built in.",
    sector: "ai-ml",
    stage: "series-b",
    location: "San Francisco, US",
    total_funding: "$60M",
  },
  {
    name: "Weights & Biases",
    description:
      "MLOps platform for experiment tracking, dataset versioning, and model evaluation. Used by OpenAI, NVIDIA, and thousands of ML teams to track experiments and collaborate on model development.",
    sector: "developer-tools",
    stage: "growth",
    location: "San Francisco, US",
    total_funding: "$250M",
  },
  {
    name: "Chroma",
    description:
      "Open-source vector database purpose-built for AI embeddings. Chroma makes it simple to store, search, and manage vector embeddings with a developer-friendly API and strong Python ecosystem integration.",
    sector: "infrastructure",
    stage: "seed",
    location: "San Francisco, US",
    total_funding: "$18M",
  },
  {
    name: "LangChain",
    description:
      "Framework for building LLM-powered applications. LangChain provides the standard toolkit for chaining LLM calls, managing prompts, connecting to data sources, and building autonomous agent workflows.",
    sector: "developer-tools",
    stage: "series-a",
    location: "San Francisco, US",
    total_funding: "$35M",
  },
  {
    name: "Replicate",
    description:
      "Cloud platform for running and sharing ML models. Replicate lets developers run open-source models with one line of code, handling GPU provisioning, scaling, and billing automatically.",
    sector: "ai-ml",
    stage: "series-a",
    location: "San Francisco, US",
    total_funding: "$20M",
  },
  {
    name: "Qdrant",
    description:
      "High-performance vector search engine written in Rust. Qdrant powers semantic search and recommendation systems with best-in-class query performance and a rich filtering API.",
    sector: "infrastructure",
    stage: "series-a",
    location: "Berlin, Germany",
    total_funding: "$37M",
  },
  {
    name: "Together AI",
    description:
      "Decentralized cloud for open-source generative AI. Together AI provides inference, fine-tuning, and training infrastructure for open-source models, aiming to reduce the dominance of closed-source AI.",
    sector: "ai-ml",
    stage: "series-a",
    location: "San Francisco, US",
    total_funding: "$128M",
  },
  {
    name: "Helicone",
    description:
      "Observability and cost management for LLM applications. Helicone provides logging, analytics, caching, and rate-limiting for OpenAI and other LLM APIs in a developer-friendly dashboard.",
    sector: "developer-tools",
    stage: "seed",
    location: "London, UK",
    total_funding: "$4M",
  },
  {
    name: "Anyscale",
    description:
      "Distributed AI computing platform based on Ray. Anyscale makes it easy to scale Python ML workloads from a laptop to a cluster with minimal code changes, powering training and serving for many AI-native companies.",
    sector: "ai-ml",
    stage: "series-c",
    location: "San Francisco, US",
    total_funding: "$259M",
  },
];

// ── Main seeder ───────────────────────────────────────────────────────

export const seedDemoData = createServerFn({ method: "POST" }).handler(async (): Promise<SeedResult> => {
  const userId = await getCurrentUserId();
  await ensureTables();

  let thesisCount = 0;
  let companyCount = 0;
  let matchCount = 0;

  // 1. Create demo thesis
  const existingTheses = await sql()`
    SELECT id FROM theses WHERE user_id = ${userId}::uuid AND is_demo = true
  `;
  let thesisId: string;
  if (existingTheses.length === 0) {
    const text = [
      DEMO_THESIS.name,
      DEMO_THESIS.description,
      `Sectors: ${DEMO_THESIS.sectors.join(", ")}`,
      `Stages: ${DEMO_THESIS.stages.join(", ")}`,
    ].join(" | ");
    let vectorStr = "";
    try {
      const emb = await generateEmbedding(text);
      vectorStr = embeddingToVectorString(emb);
    } catch (e) {
      console.error("Failed to embed demo thesis:", e);
    }
    const inserted = await sql()`
      INSERT INTO theses (user_id, name, description, sectors, stages, geo_focus, check_size, is_demo, is_active, embedding)
      VALUES (
        ${userId}::uuid,
        ${DEMO_THESIS.name},
        ${DEMO_THESIS.description},
        ${DEMO_THESIS.sectors},
        ${DEMO_THESIS.stages},
        ${DEMO_THESIS.geo_focus},
        ${DEMO_THESIS.check_size},
        true,
        true,
        ${vectorStr ? sql`${vectorStr}::vector` : sql`NULL`}
      )
      RETURNING id
    `;
    thesisId = inserted[0]!.id as string;
    thesisCount = 1;
  } else {
    thesisId = existingTheses[0]!.id as string;
  }

  // 2. Create demo companies
  for (const c of DEMO_COMPANIES) {
    const exists = await sql()`
      SELECT id FROM companies WHERE LOWER(name) = LOWER(${c.name}) AND is_demo = true LIMIT 1
    `;
    if (exists.length > 0) continue;

    const text = [c.name, c.description].filter(Boolean).join(": ");
    let vectorStr = "";
    try {
      const emb = await generateEmbedding(text);
      vectorStr = embeddingToVectorString(emb);
    } catch (e) {
      console.error(`Failed to embed demo company ${c.name}:`, e);
    }

    const inserted = await sql()`
      INSERT INTO companies (name, description, sector, stage, location, total_funding, source, is_demo, embedding)
      VALUES (
        ${c.name},
        ${c.description},
        ${c.sector},
        ${c.stage},
        ${c.location},
        ${c.total_funding},
        'demo',
        true,
        ${vectorStr ? sql`${vectorStr}::vector` : sql`NULL`}
      )
      RETURNING id
    `;
    const companyId = inserted[0]!.id as string;
    companyCount++;

    // Compute match score with the demo thesis
    if (thesisId && vectorStr) {
      const rows = await sql()`
        SELECT 1 - (c2.embedding <=> t.embedding) AS score
        FROM companies c2, theses t
        WHERE c2.id = ${companyId}::uuid
          AND t.id = ${thesisId}::uuid
          AND c2.embedding IS NOT NULL
          AND t.embedding IS NOT NULL
        LIMIT 1
      `;
      if (rows.length > 0 && rows[0]!.score != null) {
        const score = Number(rows[0]!.score);
        await sql()`
          INSERT INTO matches (thesis_id, company_id, score)
          VALUES (${thesisId}::uuid, ${companyId}::uuid, ${score})
          ON CONFLICT (thesis_id, company_id) DO UPDATE SET score = ${score}
        `;
        matchCount++;
      }
    }
  }

  return { thesisCount, companyCount, matchCount };
});

/**
 * Check if user has any demo data seeded.
 */
export const hasDemoData = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  const rows = await sql()`
    SELECT id FROM theses WHERE user_id = ${userId}::uuid AND is_demo = true LIMIT 1
  `;
  return { hasDemo: rows.length > 0 };
});
