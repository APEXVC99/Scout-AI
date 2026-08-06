import { createFileRoute } from "@tanstack/react-router";
import { sql } from "~/db";
import { sendEmailImpl } from "./-email-actions";
import {
  extractPurchase,
  verifyStripeSignature,
  type StripeCheckoutSession,
} from "~/lib/stripe";

/**
 * Stripe webhook — POST /api/stripe-webhook
 *
 * Receives Stripe events (checkout.session.completed), verifies the signature
 * against `STRIPE_WEBHOOK_SECRET`, records the purchase in the `purchases`
 * table, and sends the customer a welcome email (BCC hello@getscoutai.app so
 * the owner sees it).
 *
 * The raw request body is required for signature verification, so this is a
 * file route with a raw server handler (same pattern as /api/inngest) rather
 * than a createServerFn, which would parse the body before we could verify.
 *
 * Env vars:
 *   STRIPE_WEBHOOK_SECRET  (required) — signing secret from
 *     Stripe Dashboard → Developers → Webhooks → your endpoint → "Signing secret".
 *     If missing, the endpoint logs a warning and returns 500 so a misconfigured
 *     endpoint fails loudly instead of silently accepting unverified events.
 */

interface StripeWebhookEnvelope {
  id?: string;
  type?: string;
  data?: { object?: unknown } | null;
}

async function handleStripeWebhook(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — refusing to process events. " +
        "Add it from the Stripe dashboard (Developers → Webhooks → signing secret).",
    );
    return Response.json(
      { error: "Webhook not configured — STRIPE_WEBHOOK_SECRET is missing." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signature, secret)) {
    console.warn("[stripe-webhook] Signature verification failed — ignoring event.");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeWebhookEnvelope;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEnvelope;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "invalid JSON";
    console.warn(`[stripe-webhook] Malformed event body: ${msg}`);
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Acknowledge everything else immediately (Stripe retries non-2xx).
  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true, skipped: event.type ?? "unknown" });
  }

  const session = event.data?.object as StripeCheckoutSession | undefined;
  const purchase = extractPurchase(session ?? {});
  if (!purchase) {
    console.warn(
      "[stripe-webhook] checkout.session.completed without email/session id — cannot record purchase.",
    );
    return Response.json({ error: "Missing purchase details." }, { status: 400 });
  }

  try {
    // Idempotent migration + insert (same pattern as the waitlist table).
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

    // Only email on the first record — Stripe retries the same session id after
    // a timeout, and we don't want to spam the customer with duplicate welcomes.
    if (inserted.length > 0) {
      const welcomeUrl = "https://www.getscoutai.app/welcome";
      // Direct implementation, NOT the exported createServerFn wrapper: this raw
      // API route runs outside a server-function RPC context, where invoking
      // the server fn throws "Server function info not found".
      const emailResult = await sendEmailImpl({
        to: purchase.email,
        subject: "Welcome to Scout AI! 🎉",
        body: [
          `Welcome to Scout AI!`,
          ``,
          `You purchased the ${purchase.productName} plan. Here's your next step:`,
          ``,
          welcomeUrl,
          ``,
          `Create your account with the same email you used at checkout, complete`,
          `the 3-step onboarding, and your agent will start sourcing deals for you.`,
          ``,
          `— The Scout AI team`,
        ].join("\n"),
        bcc: ["hello@getscoutai.app"],
      });
      if (!emailResult.success) {
        // Purchase is recorded; email failure must not fail the webhook (Stripe
        // would retry and we'd double-send once the address is fixed).
        console.warn(
          `[stripe-webhook] Purchase recorded for ${purchase.email} but welcome email failed: ${emailResult.error ?? "unknown error"}`,
        );
      }
    }

    return Response.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[stripe-webhook] Failed to record purchase: ${msg}`);
    return Response.json({ error: "Failed to record purchase." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handleStripeWebhook(request),
    },
  },
});
