import { sql } from "~/db";

// ── Lazy OpenAI client ──────────────────────────────────────────────

let _openaiPromise: Promise<import("openai").OpenAI> | null = null;

async function getOpenAI(): Promise<import("openai").OpenAI> {
  if (_openaiPromise) return _openaiPromise;
  _openaiPromise = (async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set — connect an OpenAI API key before using embeddings or AI features.",
      );
    }
    // Dynamic import for ESM compatibility (this module is only loaded on the server)
    const { default: OpenAI } = await import("openai");
    return new OpenAI({ apiKey });
  })();
  return _openaiPromise;
}

// ── Embedding Generation ────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text using OpenAI text-embedding-3-small.
 * Returns the embedding as an array of 1536 floats.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = await getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.trim() || " ",
    encoding_format: "float",
  });
  return response.data[0]!.embedding;
}

/**
 * Format an embedding array as a pgvector-compatible string: "[0.1,0.2,...]"
 */
export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// ── Ensure pgvector extension ────────────────────────────────────────

async function ensurePgVector() {
  await sql()`CREATE EXTENSION IF NOT EXISTS vector`;
}

// ── Company Embedding ────────────────────────────────────────────────

/**
 * Generate an embedding from a company's name + description and store it.
 */
export async function embedAndStoreCompany(companyId: string): Promise<void> {
  await ensurePgVector();

  const rows = await sql()`
    SELECT name, description FROM companies WHERE id = ${companyId}::uuid LIMIT 1
  `;
  if (rows.length === 0) return;

  const company = rows[0] as { name: string; description: string | null };
  const text = [company.name, company.description].filter(Boolean).join(": ");
  if (!text.trim()) return;

  const embedding = await generateEmbedding(text);
  const vectorStr = embeddingToVectorString(embedding);

  await sql()`
    UPDATE companies SET embedding = ${vectorStr}::vector WHERE id = ${companyId}::uuid
  `;
}

// ── Thesis Embedding ─────────────────────────────────────────────────

/**
 * Generate an embedding from thesis name + description + sectors/stages and store it.
 */
export async function embedAndStoreThesis(thesisId: string): Promise<void> {
  await ensurePgVector();

  const rows = await sql()`
    SELECT name, description, sectors, stages FROM theses WHERE id = ${thesisId}::uuid LIMIT 1
  `;
  if (rows.length === 0) return;

  const thesis = rows[0] as {
    name: string;
    description: string | null;
    sectors: string[] | null;
    stages: string[] | null;
  };

  const parts: string[] = [thesis.name];
  if (thesis.description) parts.push(thesis.description);
  if (thesis.sectors && thesis.sectors.length > 0) parts.push(`Sectors: ${thesis.sectors.join(", ")}`);
  if (thesis.stages && thesis.stages.length > 0) parts.push(`Stages: ${thesis.stages.join(", ")}`);

  const text = parts.join(" | ");
  if (!text.trim()) return;

  const embedding = await generateEmbedding(text);
  const vectorStr = embeddingToVectorString(embedding);

  await sql()`
    UPDATE theses SET embedding = ${vectorStr}::vector WHERE id = ${thesisId}::uuid
  `;
}
