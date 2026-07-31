import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";

/**
 * Clerk Auth Webhook — handles user.created, user.updated, and user.deleted events.
 * Upserts into the `users` table in Neon Postgres.
 *
 * Users table schema:
 *   CREATE TABLE IF NOT EXISTS users (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     clerk_id VARCHAR(255) NOT NULL UNIQUE,
 *     email VARCHAR(255) NOT NULL,
 *     fund_name VARCHAR(255),
 *     tier VARCHAR(20) NOT NULL DEFAULT 'solo',
 *     stripe_customer_id VARCHAR(255),
 *     stripe_subscription_id VARCHAR(255),
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 */

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
}

export const handleClerkWebhook = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ClerkWebhookPayload }) => {
    const { type, data: payload } = data;

    // We only handle user events for now
    if (!type || !type.startsWith("user.")) {
      return { success: true, skipped: true };
    }

    const clerkId = payload.id;
    const email =
      payload.email_addresses?.[0]?.email_address ?? "";

    try {
      // Ensure the users table exists (idempotent)
      await sql()`CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        fund_name VARCHAR(255),
        tier VARCHAR(20) NOT NULL DEFAULT 'solo',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;

      switch (type) {
        case "user.created": {
          await sql()`
            INSERT INTO users (clerk_id, email, tier)
            VALUES (${clerkId}, ${email}, 'solo')
            ON CONFLICT (clerk_id) DO UPDATE
            SET email = EXCLUDED.email, updated_at = now()
          `;
          break;
        }
        case "user.updated": {
          await sql()`
            UPDATE users
            SET email = ${email}, updated_at = now()
            WHERE clerk_id = ${clerkId}
          `;
          break;
        }
        case "user.deleted": {
          await sql()`
            DELETE FROM users
            WHERE clerk_id = ${clerkId}
          `;
          break;
        }
        default:
          // Unknown event type — skip
          break;
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Unknown error";
      throw new Error(`Webhook processing failed: ${msg}`);
    }
  });
