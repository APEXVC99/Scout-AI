import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe webhook helpers — dependency-free (Node's crypto, no `stripe` npm
 * package). Used by the /api/stripe-webhook route and by local tests.
 *
 * Signature verification follows Stripe's docs: the `Stripe-Signature` header
 * carries `t=<timestamp>,v1=<hex hmac>` pairs; the signed payload is
 * `<timestamp>.<rawBody>` and the HMAC key is the webhook signing secret
 * (`STRIPE_WEBHOOK_SECRET` from the Stripe dashboard).
 */

/** Max age of a webhook timestamp (seconds) — Stripe's recommended tolerance. */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader) return false;
  // Parse "t=123,v1=abc,v1=def"
  const parts = new Map<string, string>();
  for (const pair of signatureHeader.split(",")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    parts.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const timestamp = parts.get("t");
  const expected = parts.get("v1");
  if (!timestamp || !expected) return false;

  // Reject stale timestamps (replay protection).
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest();

  // Constant-time compare against every v1 value Stripe sent (normally one).
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== digest.length) return false;
  for (const [key, value] of parts) {
    if (key === "v1") {
      const candidate = Buffer.from(value, "hex");
      if (candidate.length === digest.length && timingSafeEqual(candidate, digest)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Known payment-link URLs → human/product metadata. The URL suffix (the last
 * path segment, e.g. "aFa9AScMse5sgYR8iz6Na03") uniquely identifies each of the
 * six links created for Scout AI (3 tiers × regular/Product-Hunt promo).
 */
export const PAYMENT_LINK_TIERS: Record<
  string,
  { tier: "solo" | "studio" | "firm"; productName: string }
> = {
  aFa9AScMse5sgYR8iz6Na03: { tier: "solo", productName: "Solo" },
  "9B67sKfYEe5s8sleGX6Na04": { tier: "studio", productName: "Studio" },
  "14A7sK5k05yW23X7ev6Na05": { tier: "firm", productName: "Firm" },
  fZu6oG7s8e5saAt8iz6Na06: { tier: "solo", productName: "Solo (Product Hunt launch 20% off)" },
  aFadR8aEkgdA6kd0Q76Na07: { tier: "studio", productName: "Studio (Product Hunt launch 20% off)" },
  dRmdR8fYE9PcfUN2Yf6Na08: { tier: "firm", productName: "Firm (Product Hunt launch 20% off)" },
};

export const TIER_LABELS: Record<"solo" | "studio" | "firm", string> = {
  solo: "Solo",
  studio: "Studio",
  firm: "Firm",
};

export function paymentLinkSuffix(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return path.split("/").filter(Boolean).pop() ?? null;
  } catch {
    // Not a valid URL — fall back to raw last segment.
    const clean = url.trim().replace(/\/+$/, "");
    return clean.split("/").filter(Boolean).pop() ?? null;
  }
}

export interface StripeCheckoutSession {
  id?: string;
  object?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null } | null;
  payment_link?: { id?: string | null; url?: string | null } | null;
  metadata?: Record<string, string> | null;
}

export interface ParsedPurchase {
  email: string;
  productName: string;
  tier: "solo" | "studio" | "firm" | null;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
}

/**
 * Extract the purchase facts from a checkout.session.completed object.
 * Stripe does not attach line items to the session by default (that requires an
 * API call with the secret key), so the product/tier is derived from the
 * payment link URL, falling back to `metadata.tier` then a generic label.
 */
export function extractPurchase(session: StripeCheckoutSession): ParsedPurchase | null {
  if (!session || session.object !== "checkout.session") return null;
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!email) return null;
  const stripeSessionId = session.id;
  if (!stripeSessionId) return null;

  const amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
  const currency = session.currency || "usd";

  const suffix = paymentLinkSuffix(session.payment_link?.url);
  const known = suffix ? PAYMENT_LINK_TIERS[suffix] : undefined;
  const metadataTier = session.metadata?.tier as "solo" | "studio" | "firm" | undefined;
  const tier =
    known?.tier ??
    (metadataTier && TIER_LABELS[metadataTier] ? metadataTier : null);
  const productName =
    known?.productName ??
    (tier ? TIER_LABELS[tier] : "Scout AI subscription");

  return { email, productName, tier, amountCents, currency, stripeSessionId };
}
