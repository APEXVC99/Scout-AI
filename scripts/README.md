# Stripe webhook + payment links — ops runbook

## What's in this PR

| Piece | Location | Status |
|---|---|---|
| Stripe webhook endpoint | `src/routes/api/stripe-webhook.ts` (POST `/api/stripe-webhook`) | ✅ built + tested |
| Signature verification (no `stripe` npm dep) | `src/lib/stripe.ts` | ✅ tested |
| Purchases table (idempotent migration in handler) | `purchases` (email, product_name, amount_cents, stripe_session_id, created_at) | ✅ created + tested |
| Welcome email on purchase (BCC hello@getscoutai.app) | via `sendEmailImpl` in `src/routes/api/-email-actions.ts` (cc/bcc support added) | ✅ sent test email |
| Payment-link recreation script | `scripts/create-payment-links.ts` | ⏳ needs `STRIPE_SECRET_KEY` (see below) |
| Webhook test script | `scripts/test-stripe-webhook.ts` | ✅ ran locally |

## Env vars the owner needs to add

1. **`STRIPE_WEBHOOK_SECRET`** (required for the webhook to accept events)
   - Stripe Dashboard → Developers → Webhooks → **Add endpoint**
     - URL: `https://www.getscoutai.app/api/stripe-webhook`
     - Events: `checkout.session.completed`
   - After saving, click the endpoint → "Signing secret" (starts with `whsec_`).
   - Set it as an env var on the host (same place `DATABASE_URL` / `RESEND_API_KEY` live) and republish.
   - Until it's set, the endpoint returns 500 with a clear log warning — no events are silently accepted.

2. **`STRIPE_SECRET_KEY`** (only needed to run the link-recreation script — do NOT put it in the app)
   - `sk_live_...` from Stripe Dashboard → Developers → API keys.

## Payment links — recreate with redirect (owner/lead action)

Stripe **Payment Links do not support dynamic params** like `{CHECKOUT_SESSION_EMAIL}` —
that's a Checkout Sessions feature. Payment Links' `after_completion.redirect.url` is
static (only `{CHECKOUT_SESSION_ID}` is supported as a placeholder). So the new links
redirect to `https://www.getscoutai.app/welcome?tier=solo|studio|firm` — `public/welcome.html`
already auto-selects the tier from the `?tier=` query param. The customer email is then
captured by the webhook (and by Clerk sign-up) rather than the URL.

Run (creates 6 NEW links, leaves the old ones active — nothing breaks):

```bash
export STRIPE_SECRET_KEY=sk_live_...
bun run scripts/create-payment-links.ts
```

It lists the account's existing links, matches the six known Scout AI URLs, and creates
new ones with the same line items + the redirect. It prints a JSON map of
`tier → { old, new }`.

Then update these files with the **new** URLs and republish:
- `src/routes/index.tsx` — regular links (Solo / Studio / Firm)
- `public/landing.html` and `public/demo.html` — Product Hunt promo links (Solo / Studio / Firm)

After the swap, the "⚠️ After payment, Stripe's confirmation page won't link back here"
warning in `public/landing.html` / `public/demo.html` can be removed or softened.

## Local testing

```bash
# With a test secret set on the server:
STRIPE_WEBHOOK_SECRET=whsec_test_secret bun run start   # (see publish flow)

# Valid event → 200, purchase row inserted, welcome email attempted
bun run scripts/test-stripe-webhook.ts 3000 normal
# Same session id again → 200, no duplicate row, no second email
bun run scripts/test-stripe-webhook.ts 3000 duplicate
# Body signed then modified → 400 Invalid signature
bun run scripts/test-stripe-webhook.ts 3000 tampered
```

`scripts/check-email-path.ts` sends one clearly-labelled test email to
hello@getscoutai.app to verify the Resend path + BCC.

## Notes

- The webhook calls `sendEmailImpl` directly (not the exported `createServerFn`
  wrapper) because raw API-route handlers run outside the server-function RPC
  context — invoking the server fn there throws "Server function info not found".
- Email failure never fails the webhook: the purchase is recorded first and the
  failure is logged, so Stripe's retry doesn't cause duplicate sends.
- `purchases.stripe_session_id` is UNIQUE; `INSERT ... ON CONFLICT DO NOTHING`
  makes webhook retries idempotent (email only goes out on the first insert).
- Product/tier is derived from the payment-link URL in the session object
  (Stripe doesn't attach line items without an API call); metadata.tier is
  checked first if it's ever set on the links.
