#!/usr/bin/env bun
/**
 * Recreate the 6 Scout AI Stripe payment links with a post-payment redirect to
 * the /welcome page (tier pre-selected), WITHOUT touching the existing links.
 *
 * Why: Stripe Checkout Sessions support dynamic redirect params like
 * `{CHECKOUT_SESSION_EMAIL}`, but Stripe *Payment Links* do not — their
 * `after_completion.redirect.url` is static (only `{CHECKOUT_SESSION_ID}` is
 * supported as a placeholder). So each new link gets a static redirect with its
 * own tier baked in:
 *
 *   https://www.getscoutai.app/welcome?tier=solo|studio|firm
 *
 * (public/welcome.html already auto-selects the tier from the `?tier=` param.)
 *
 * Usage:
 *   export STRIPE_SECRET_KEY=sk_live_...
 *   bun run scripts/create-payment-links.ts
 *
 * The script lists the account's existing payment links, matches the six known
 * Scout AI links (by URL), and creates a NEW link for each with the same line
 * items plus the redirect. Existing links are left active — nothing breaks.
 *
 * Output: a JSON map of tier → { old, new } URLs. Update these files with the
 * new URLs:
 *   - src/routes/index.tsx   (regular: Solo/Studio/Firm)
 *   - public/landing.html    (PH promo: Solo/Studio/Firm)
 *   - public/demo.html       (PH promo banner)
 *
 * No npm deps — plain fetch against api.stripe.com.
 */

const STRIPE_API = "https://api.stripe.com/v1";

/** tier → the 6 known existing payment-link URLs (from the site code). */
const KNOWN_LINKS: { tier: "solo" | "studio" | "firm"; promo: boolean; url: string }[] = [
  { tier: "solo", promo: false, url: "https://buy.stripe.com/aFa9AScMse5sgYR8iz6Na03" },
  { tier: "studio", promo: false, url: "https://buy.stripe.com/9B67sKfYEe5s8sleGX6Na04" },
  { tier: "firm", promo: false, url: "https://buy.stripe.com/14A7sK5k05yW23X7ev6Na05" },
  { tier: "solo", promo: true, url: "https://buy.stripe.com/fZu6oG7s8e5saAt8iz6Na06" },
  { tier: "studio", promo: true, url: "https://buy.stripe.com/aFadR8aEkgdA6kd0Q76Na07" },
  { tier: "firm", promo: true, url: "https://buy.stripe.com/dRmdR8fYE9PcfUN2Yf6Na08" },
];

const WELCOME_BASE = "https://www.getscoutai.app/welcome";

interface StripePaymentLink {
  id: string;
  url: string;
  active?: boolean;
  allow_promotion_codes?: boolean | null;
  discount_coupon?: string | null;
  line_items?: { data?: { price?: { id?: string } | null; quantity?: number }[] };
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — export it before running (e.g. sk_live_...).",
    );
  }
  const res = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe API ${res.status} ${init?.method ?? "GET"} ${path}: ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Stripe returned non-JSON for ${path}: ${text.slice(0, 300)}`);
  }
}

async function listPaymentLinks(): Promise<StripePaymentLink[]> {
  const links: StripePaymentLink[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: "100", expand: ["data.line_items"] });
    if (startingAfter) q.set("starting_after", startingAfter);
    const body = await stripeRequest<{ data: StripePaymentLink[]; has_more: boolean }>(
      `/payment_links?${q.toString()}`,
    );
    links.push(...body.data);
    if (!body.has_more) break;
    startingAfter = body.data[body.data.length - 1]?.id;
  }
  return links;
}

async function createPaymentLink(
  source: StripePaymentLink,
  redirectUrl: string,
): Promise<StripePaymentLink> {
  const params = new URLSearchParams();
  const items = source.line_items?.data ?? [];
  if (items.length === 0) {
    throw new Error(
      `Cannot recreate ${source.url} — no line items returned. Try expanding line_items (script already does) or create this link manually in the dashboard.`,
    );
  }
  items.forEach((item, i) => {
    if (!item.price?.id) throw new Error(`Missing price id on line item ${i} of ${source.url}`);
    params.append(`line_items[${i}][price]`, item.price.id);
    params.append(`line_items[${i}][quantity]`, String(item.quantity ?? 1));
  });
  params.set("after_completion[type]", "redirect");
  params.set("after_completion[redirect][url]", redirectUrl);
  if (source.allow_promotion_codes) params.set("allow_promotion_codes", "true");
  // If the original link had a coupon applied (e.g. a fixed PH discount),
  // carry it over. If the API rejects this param the error surfaces below.
  if (source.discount_coupon) params.set("discount_coupon", source.discount_coupon);

  return stripeRequest<StripePaymentLink>("/payment_links", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

async function main() {
  const existing = await listPaymentLinks();
  const byUrl = new Map(existing.map((l) => [l.url.replace(/\/+$/, ""), l]));

  const results: Record<string, { old: string; new: string }> = {};
  let created = 0;
  let skipped = 0;

  for (const known of KNOWN_LINKS) {
    const source = byUrl.get(known.url.replace(/\/+$/, ""));
    if (!source) {
      console.warn(`⚠️  No payment link found in this Stripe account for ${known.url} — skipped.`);
      skipped++;
      continue;
    }
    const redirectUrl = `${WELCOME_BASE}?tier=${known.tier}`;
    const createdLink = await createPaymentLink(source, redirectUrl);
    results[`${known.tier}${known.promo ? "-ph" : ""}`] = {
      old: known.url,
      new: createdLink.url,
    };
    console.log(
      `✓ ${known.tier}${known.promo ? " (PH promo)" : ""}: ${known.url}\n  → ${createdLink.url}\n  → redirects to ${redirectUrl}`,
    );
    created++;
  }

  console.log("\n── RESULT (paste into the site files) ──");
  console.log(JSON.stringify(results, null, 2));
  console.log(`\n${created} created, ${skipped} skipped. Existing links untouched.`);
}

main().catch((err: unknown) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
