import Parser from "rss-parser";

// ── Types ────────────────────────────────────────────────────────────

export interface NormalizedCompany {
  name: string;
  description: string | null;
  source: string;
  source_url: string;
  metadata?: Record<string, unknown>;
}

export interface ScrapeResult {
  source: string;
  companies: NormalizedCompany[];
  error?: string;
}

// ── RSS Parser instance ──────────────────────────────────────────────

const parser = new Parser<Record<string, unknown>, Record<string, unknown>>({
  timeout: 15000,
  headers: {
    "User-Agent": "Scout-AI/1.0 (deal-sourcing platform; https://getscoutai.app)",
  },
});

// ── Feed definitions ─────────────────────────────────────────────────

interface FeedConfig {
  name: string;
  url: string;
}

const FEEDS: FeedConfig[] = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "VentureBeat", url: "https://venturebeat.com/feed/" },
];

// ── Rate limiting ────────────────────────────────────────────────────

const RATE_LIMIT_MS = 3000; // 1 request per 3 seconds

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Adapters: RSS item → NormalizedCompany ───────────────────────────

/**
 * Extracts a reasonable company name from an RSS feed item.
 * Strategy: use the article title as a signal — usually contains
 * the company name as the primary subject.
 */
function extractCompanyName(item: Parser.Item & Record<string, unknown>): string {
  const title = item.title ?? "";
  // Common patterns in funding announcement titles:
  // "StartupName raises $XM to..."
  // "StartupName lands $XM in Series A..."
  // "StartupName launches..."
  // Clean up common prefixes
  let name = title
    .replace(/^(Daily Crunch:?\s*)/i, "")
    .replace(/^(Funding Round(up)?:?\s*)/i, "")
    .trim();

  // If title is still long, try to extract company name by common patterns
  const fundingMatch = name.match(
    /^(.+?)\s+(?:raises|lands|secures|closes|announces|gets|nabs|scores|collects|takes|brings in)/i
  );
  if (fundingMatch) {
    return fundingMatch[1].trim();
  }

  // Take first 80 chars as name (best-effort)
  if (name.length > 80) {
    return name.substring(0, 77).trimEnd() + "...";
  }

  return name || "Unknown Company";
}

/**
 * Normalize a raw RSS item into a company-like structure.
 */
function normalizeItem(item: Parser.Item & Record<string, unknown>, source: string): NormalizedCompany {
  // Clean up HTML from description
  const rawDesc = item.contentSnippet ?? item.content ?? item.summary ?? "";
  const description = rawDesc.replace(/<[^>]*>/g, "").trim().substring(0, 2000) || null;

  return {
    name: extractCompanyName(item),
    description,
    source,
    source_url: item.link ?? "",
    metadata: {
      pubDate: item.pubDate ?? null,
      creator: item.creator ?? null,
      categories: item.categories ?? [],
      guid: item.guid ?? null,
    },
  };
}

// ── Feed-specific adapters ───────────────────────────────────────────

async function scrapeTechCrunch(): Promise<ScrapeResult> {
  const source = "TechCrunch";
  try {
    const feed = await parser.parseURL(FEEDS.find((f) => f.name === source)!.url);
    const companies = (feed.items ?? []).map((item) => normalizeItem(item, source));
    return { source, companies };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { source, companies: [], error: msg };
  }
}

async function scrapeVentureBeat(): Promise<ScrapeResult> {
  const source = "VentureBeat";
  try {
    const feed = await parser.parseURL(FEEDS.find((f) => f.name === source)!.url);
    const companies = (feed.items ?? []).map((item) => normalizeItem(item, source));
    return { source, companies };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { source, companies: [], error: msg };
  }
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Scrape all configured RSS sources with polite rate limiting.
 * Each feed is fetched sequentially with a delay between requests.
 * If one feed fails, the others continue.
 */
export async function scrapeAllSources(): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  // TechCrunch
  results.push(await scrapeTechCrunch());
  await sleep(RATE_LIMIT_MS);

  // VentureBeat
  results.push(await scrapeVentureBeat());
  await sleep(RATE_LIMIT_MS);

  return results;
}
