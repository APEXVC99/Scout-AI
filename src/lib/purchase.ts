// ── Post-purchase redirect processing ─────────────────────────────────────
// Stripe payment links redirect buyers to /welcome?tier=…&session_id=cs_…
// after a successful checkout. This module turns that redirect into a recorded
// purchase + welcome email WITHOUT relying on the Stripe webhook (whose
// STRIPE_WEBHOOK_SECRET is missing and can't be provisioned until the owner
// can reach the Stripe dashboard):
//
//   1. If STRIPE_SECRET_KEY is set, the checkout session is verified against
//      the Stripe API (payment_status must be "paid") and the customer's email,
//      amount and product are read from the session.
//   2. If STRIPE_SECRET_KEY is missing (the current state), the redirect is
//      trusted: Stripe only sends buyers to the success URL after payment
//      completes. The purchase is recorded with the session id and the tier
//      from the URL. The customer's welcome email can't be sent in this mode
//      because Stripe's redirect only carries the session id — not the email
//      (that needs the API or the webhook). Instead, an owner notification is
//      emailed to hello@getscoutai.app so the team knows a sale happened and
//      can pull the address from the Stripe dashboard. Stripe itself still
//      emails the customer a receipt.
//
// Server-only module. Imported by serve.ts (Bun, direct TS) and by the
// /api/stripe-webhook route (Vite build) — keep imports resolvable in both.

import { sql } from "~/db";
import { sendEmailImpl } from "~/routes/api/-email-actions";
import {
  paymentLinkSuffix,
  PAYMENT_LINK_TIERS,
  TIER_LABELS,
  type StripeCheckoutSession,
} from "./stripe";

export const PURCHASE_TIERS = ["solo", "studio", "firm"] as const;
export type PurchaseTier = (typeof PURCHASE_TIERS)[number];

export function isTier(value: unknown): value is PurchaseTier {
  return (
    typeof value === "string" &&
    (PURCHASE_TIERS as readonly string[]).includes(value.toLowerCase())
  );
}

export function tierProductName(tier: PurchaseTier | null | undefined): string {
  return tier ? TIER_LABELS[tier] : "Scout AI subscription";
}

export interface WelcomeEmailInput {
  to: string;
  productName: string;
}

/**
 * Send the Scout AI purchase welcome email (BCC hello@getscoutai.app so the
 * owner sees it). Shared by the webhook and the redirect handler so the copy
 * stays in one place. Never throws — returns the send result.
 */
export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{
  success: boolean;
  error?: string;
}> {
  return sendEmailImpl({
    to: input.to,
    subject: "Welcome to Scout AI! 🎉",
    body: [
      `Welcome to Scout AI!`,
      ``,
      `You purchased the ${input.productName} plan. Here's your next step:`,
      ``,
      `https://www.getscoutai.app/welcome`,
      ``,
      `Create your account with the same email you used at checkout, complete`,
      `the 3-step onboarding, and your agent will start sourcing deals for you.`,
      ``,
      `— The Scout AI team`,
    ].join("\n"),
    bcc: ["hello@getscoutai.app"],
  });
}

/**
 * Owner-facing alert for purchases recorded in fallback mode (no
 * STRIPE_SECRET_KEY), where the customer's email is unknown. Fire-and-forget:
 * never throws.
 */
async function sendOwnerPurchaseAlert(opts: {
  sessionId: string;
  tier: PurchaseTier | null;
  productName: string;
}): Promise<void> {
  try {
    const result = await sendEmailImpl({
      to: "hello@getscoutai.app",
      subject: `New Scout AI purchase — ${opts.productName} (session ${opts.sessionId.slice(0, 18)}…)`,
      body: [
        `A new Scout AI purchase was recorded from the /welcome redirect:`,
        ``,
        `  Plan:      ${opts.productName}`,
        `  Tier:      ${opts.tier ?? "unknown"}`,
        `  Session:   ${opts.sessionId}`,
        ``,
        `The customer's email could not be read because STRIPE_SECRET_KEY is not`,
        `set on the server (the Stripe API call is skipped). You can look the`,
        `customer up in the Stripe dashboard by session id. Stripe has already`,
        `sent the customer a receipt.`,
        ``,
        `Once STRIPE_SECRET_KEY is configured, welcome emails to customers go`,
        `out automatically.`,
        ``,
        `— Scout AI`,
      ].join("\n"),
    });
    if (!result.success) {
      console.warn(
        `[purchase] owner alert email failed for ${opts.sessionId}: ${result.error ?? "unknown error"}`,
      );
    }
  } catch (err: unknown) {
    console.warn(
      `[purchase] owner alert email threw for ${opts.sessionId}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }
}

/**
 * Verify a checkout session against the Stripe API using STRIPE_SECRET_KEY.
 * Returns the session object when the key exists and the API call succeeds,
 * otherwise null (callers fall back to trusting the redirect).
 */
export async function verifyStripeSession(
  sessionId: string,
): Promise<StripeCheckoutSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn(
      "[purchase] STRIPE_SECRET_KEY is not set — cannot verify session, trusting the Stripe redirect.",
    );
    return null;
  }
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.warn(`[purchase] Stripe API returned ${res.status} for session ${sessionId}`);
      return null;
    }
    const session = (await res.json()) as StripeCheckoutSession;
    return session && typeof session === "object" ? session : null;
  } catch (err: unknown) {
    console.warn(
      `[purchase] Stripe API call failed for ${sessionId}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return null;
  }
}

/** Derive tier + product name from the session's payment link URL, falling back
 * to the ?tier= URL param, then to a generic label. */
export function deriveTierAndProduct(
  session: StripeCheckoutSession | null,
  tierParam: string | null,
): { tier: PurchaseTier | null; productName: string } {
  const suffix = paymentLinkSuffix(session?.payment_link?.url);
  const known = suffix ? PAYMENT_LINK_TIERS[suffix] : undefined;
  if (known) return { tier: known.tier, productName: known.productName };
  const tier = tierParam && isTier(tierParam) ? (tierParam.toLowerCase() as PurchaseTier) : null;
  return { tier, productName: tierProductName(tier) };
}

export interface RecordedPurchase {
  email: string;
  productName: string;
  amountCents: number;
  stripeSessionId: string;
}

export interface RecordPurchaseResult {
  /** True when this call created the row (false = already processed). */
  inserted: boolean;
  /** True when the customer welcome email was actually sent. */
  emailSent: boolean;
  error?: string;
}

/**
 * Idempotently record a purchase (dedup on stripe_session_id) and send the
 * welcome email only for the first insert. The customer email may be empty in
 * fallback mode — in that case the welcome email is skipped (it needs a
 * recipient) and the owner alert is sent instead.
 */
export async function recordPurchase(
  purchase: RecordedPurchase,
): Promise<RecordPurchaseResult> {
  // Idempotent migration + insert (same pattern as the webhook / waitlist).
  await sql()`CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    amount_cents INTEGER NOT NULL,
    stripe_session_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
  )`;

  const inserted = await sql()`
    INSERT INTO purchases (email, product_name, amount_cents, stripe_session_id)
    VALUES (${purchase.email}, ${purchase.productName}, ${purchase.amountCents}, ${purchase.stripeSessionId})
    ON CONFLICT (stripe_session_id) DO NOTHING
    RETURNING id
  `;

  if (inserted.length === 0) {
    return { inserted: false, emailSent: false }; // already processed
  }

  const email = purchase.email.trim();
  if (!email) {
    // No recipient — notify the owner instead so a sale never goes unnoticed.
    await sendOwnerPurchaseAlert({
      sessionId: purchase.stripeSessionId,
      tier: null,
      productName: purchase.productName,
    });
    return { inserted: true, emailSent: false };
  }

  const emailResult = await sendWelcomeEmail({ to: email, productName: purchase.productName });
  if (!emailResult.success) {
    console.warn(
      `[purchase] Purchase recorded for ${email} but welcome email failed: ${emailResult.error ?? "unknown error"}`,
    );
    return { inserted: true, emailSent: false, error: emailResult.error };
  }
  return { inserted: true, emailSent: true };
}

export interface ProcessCheckoutRedirectInput {
  sessionId: string;
  /** Raw ?tier= URL param (solo|studio|firm), may be null/absent. */
  tier?: string | null;
}

export interface ProcessCheckoutRedirectResult {
  success: boolean;
  /** True when the session was verified against the Stripe API. */
  verified: boolean;
  alreadyProcessed: boolean;
  tier: PurchaseTier | null;
  productName: string;
  /** Customer email — present only in verified mode. */
  email: string | null;
  /** True when the customer welcome email was sent. */
  emailSent: boolean;
  error?: string;
}

/**
 * Entry point for POST /api/purchase/complete (called by /welcome when Stripe
 * redirects with ?session_id=…).
 *
 * Verified mode (STRIPE_SECRET_KEY set): call the Stripe API, require
 * payment_status === "paid", then record + email with real customer data.
 *
 * Fallback mode (no key): trust the redirect, record with the tier from the
 * URL, and alert the owner (the customer's address is unknowable without the
 * API/webhook).
 */
export async function processCheckoutRedirect(
  input: ProcessCheckoutRedirectInput,
): Promise<ProcessCheckoutRedirectResult> {
  const sessionId = input.sessionId.trim();
  const tierParam = input.tier?.trim().toLowerCase() ?? null;

  const session = await verifyStripeSession(sessionId);
  let email = "";
  let amountCents = 0;

  if (session) {
    if (session.payment_status !== "paid") {
      return {
        success: false,
        verified: true,
        alreadyProcessed: false,
        tier: null,
        productName: "Scout AI subscription",
        email: null,
        emailSent: false,
        error: "Session is not paid.",
      };
    }
    email = session.customer_details?.email?.trim() ?? "";
    amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
  }

  const { tier, productName } = deriveTierAndProduct(session, tierParam);

  try {
    const result = await recordPurchase({
      email,
      productName,
      amountCents,
      stripeSessionId: sessionId,
    });

    return {
      success: true,
      verified: !!session,
      alreadyProcessed: !result.inserted,
      tier,
      productName,
      email: email || null,
      emailSent: result.emailSent,
      ...(result.error ? { error: result.error } : {}),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[purchase] Failed to record purchase for session ${sessionId}: ${msg}`);
    return {
      success: false,
      verified: !!session,
      alreadyProcessed: false,
      tier,
      productName,
      email: email || null,
      emailSent: false,
      error: "Failed to record purchase.",
    };
  }
}
