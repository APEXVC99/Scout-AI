#!/usr/bin/env bun
/**
 * Local end-to-end test for /api/stripe-webhook.
 * Generates a Stripe-signed checkout.session.completed event and POSTs it.
 *
 * Usage: STRIPE_WEBHOOK_SECRET=whsec_test_secret bun run scripts/test-stripe-webhook.ts [port]
 * Optional second arg: "duplicate" sends the same session again (idempotency check).
 * Optional second arg: "tampered" flips one char in the body AFTER signing (must be 400).
 */
import { createHmac } from "node:crypto";

const port = process.argv[2] ?? "3000";
const mode = process.argv[3] ?? "normal";
const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_secret";

const sessionId =
  "cs_test_local_" + (mode === "tampered" ? "TMP" : "A1B2C3");
const payload = JSON.stringify({
  id: "evt_test_" + Date.now(),
  object: "event",
  api_version: "2024-06-20",
  created: Math.floor(Date.now() / 1000),
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      amount_total: 49900,
      amount_subtotal: 49900,
      currency: "usd",
      customer_details: { email: "buyer-test@example.com" },
      payment_link: {
        id: "plink_test123",
        url: "https://buy.stripe.com/aFa9AScMse5sgYR8iz6Na03",
      },
      metadata: {},
    },
  },
});

// Sign the ORIGINAL payload, then (in tampered mode) send a modified body —
// this is what a real attacker does, so the signature must NOT verify.
const signedBody = payload;
let sentBody = payload;
if (mode === "tampered") {
  sentBody = payload.replace('"currency":"usd"', '"currency":"eur"');
}
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${signedBody}`;
const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
const header = `t=${timestamp},v1=${sig}`;

const res = await fetch(`http://localhost:${port}/api/stripe-webhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Stripe-Signature": header,
  },
  body: sentBody,
});
console.log(`mode=${mode} → HTTP ${res.status}`);
console.log(await res.text());
