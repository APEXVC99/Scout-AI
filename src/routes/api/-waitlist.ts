import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Waitlist API endpoint — TanStack Start v1 server function.
 * Handles email signups for the Scout AI waitlist.
 * Table schema (per business plan):
 *   CREATE TABLE waitlist_subscribers (
 *     id SERIAL PRIMARY KEY,
 *     email VARCHAR(255) NOT NULL UNIQUE,
 *     created_at TIMESTAMP DEFAULT NOW()
 *   );
 */
export const submitWaitlistEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (typeof input !== "object" || input === null || !("email" in input)) {
      throw new Error("Invalid input");
    }
    const { email } = input as { email: unknown };
    if (typeof email !== "string") {
      throw new Error("Email must be a string");
    }
    return { email: email.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const { email } = data;

    // Basic email format check (double-check server-side)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Please enter a valid email address." };
    }

    try {
      // Ensure the table exists (idempotent)
      await sql()`CREATE TABLE IF NOT EXISTS waitlist_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )`;

      await sql()`INSERT INTO waitlist_subscribers (email) VALUES (${email})`;

      // Append to shared notification file for the team lead's email alerts.
      // This is best-effort: DB insert is the primary operation.
      const NOTIFY_PATH = "/home/team/shared/new-waitlist-signups.json";
      try {
        const entry = { email, timestamp: new Date().toISOString() };
        let records: unknown[] = [];
        if (existsSync(NOTIFY_PATH)) {
          const raw = await readFile(NOTIFY_PATH, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) records = parsed;
        }
        records.push(entry);
        await mkdir(dirname(NOTIFY_PATH), { recursive: true });
        await writeFile(NOTIFY_PATH, JSON.stringify(records, null, 2) + "\n", "utf-8");
      } catch {
        // File write failed — not fatal; DB insert already succeeded.
      }

      return { success: true } as const;
    } catch (err: unknown) {
      // Postgres unique violation code is 23505
      const code = (err as { code?: string })?.code;
      const msg = (err as { message?: string })?.message ?? "";
      if (
        code === "23505" ||
        msg.includes("unique") ||
        msg.includes("duplicate")
      ) {
        return { error: "You're already on the list!" } as const;
      }
      return { error: "Something went wrong. Please try again." } as const;
    }
  });
