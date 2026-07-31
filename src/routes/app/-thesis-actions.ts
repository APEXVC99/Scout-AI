import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";

// ── Shared types ──────────────────────────────────────────────────

export interface ThesisData {
  name: string;
  description?: string;
  sectors: string[];
  stages: string[];
  geo_focus: string[];
  check_size?: string;
  criteria_json?: Record<string, unknown>;
  is_active?: boolean;
}

export interface Thesis extends ThesisData {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Auth helper ───────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const { getAuth } = await import("@clerk/tanstack-start/server");
  const { getEvent } = await import("vinxi/http");

  const event = getEvent();
  if (!event?.request) {
    throw new Error("Not in request context");
  }

  const auth = await getAuth(event.request);
  const clerkId = auth.userId;
  if (!clerkId) {
    throw new Error("Not authenticated");
  }

  // Ensure users table exists (idempotent — also created by Clerk webhook)
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

  // Look up internal user UUID
  const rows = await sql()`
    SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("User not found in database — try signing out and back in");
  }

  return rows[0].id as string;
}

// Ensure the theses table exists (idempotent)
async function ensureThesesTable() {
  await sql()`CREATE TABLE IF NOT EXISTS theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sectors TEXT[] NOT NULL DEFAULT '{}',
    stages TEXT[] NOT NULL DEFAULT '{}',
    geo_focus TEXT[] NOT NULL DEFAULT '{}',
    check_size VARCHAR(50),
    criteria_json JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

// ── Server Functions ──────────────────────────────────────────────

export const getTheses = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getCurrentUserId();
  await ensureThesesTable();

  const rows = await sql()`
    SELECT id, user_id, name, description, sectors, stages, geo_focus,
           check_size, criteria_json, is_active, created_at, updated_at
    FROM theses
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map((r) => ({
    ...r,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  })) as Thesis[];
});

export const getThesisById = createServerFn({ method: "GET" })
  .handler(async ({ data }: { data: { id: string } }) => {
    const userId = await getCurrentUserId();
    await ensureThesesTable();

    const rows = await sql()`
      SELECT id, user_id, name, description, sectors, stages, geo_focus,
             check_size, criteria_json, is_active, created_at, updated_at
      FROM theses
      WHERE id = ${data.id}::uuid AND user_id = ${userId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    return {
      ...rows[0],
      created_at: String(rows[0].created_at),
      updated_at: String(rows[0].updated_at),
    } as Thesis;
  });

export const createThesis = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: ThesisData }) => {
    const userId = await getCurrentUserId();
    await ensureThesesTable();

    const rows = await sql()`
      INSERT INTO theses (user_id, name, description, sectors, stages, geo_focus, check_size, criteria_json)
      VALUES (
        ${userId}::uuid,
        ${data.name},
        ${data.description ?? null},
        ${data.sectors ?? []},
        ${data.stages ?? []},
        ${data.geo_focus ?? []},
        ${data.check_size ?? null},
        ${data.criteria_json ? JSON.stringify(data.criteria_json) : null}::jsonb
      )
      RETURNING id, user_id, name, description, sectors, stages, geo_focus,
                check_size, criteria_json, is_active, created_at, updated_at
    `;

    const r = rows[0];
    return {
      ...r,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    } as Thesis;
  });

export const updateThesis = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string } & Partial<ThesisData> }) => {
    const userId = await getCurrentUserId();
    await ensureThesesTable();

    // Verify ownership
    const owned = await sql()`
      SELECT id FROM theses WHERE id = ${data.id}::uuid AND user_id = ${userId}::uuid LIMIT 1
    `;
    if (owned.length === 0) {
      throw new Error("Thesis not found or not authorized");
    }

    const rows = await sql()`
      UPDATE theses
      SET
        name = COALESCE(${data.name ?? null}, name),
        description = COALESCE(${data.description ?? null}, description),
        sectors = COALESCE(${data.sectors ?? null}, sectors),
        stages = COALESCE(${data.stages ?? null}, stages),
        geo_focus = COALESCE(${data.geo_focus ?? null}, geo_focus),
        check_size = COALESCE(${data.check_size ?? null}, check_size),
        criteria_json = COALESCE(${data.criteria_json ? JSON.stringify(data.criteria_json) : null}::jsonb, criteria_json),
        is_active = COALESCE(${data.is_active ?? null}, is_active),
        updated_at = now()
      WHERE id = ${data.id}::uuid AND user_id = ${userId}::uuid
      RETURNING id, user_id, name, description, sectors, stages, geo_focus,
                check_size, criteria_json, is_active, created_at, updated_at
    `;

    const r = rows[0];
    return {
      ...r,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    } as Thesis;
  });

export const deleteThesis = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string } }) => {
    const userId = await getCurrentUserId();
    await ensureThesesTable();

    const result = await sql()`
      DELETE FROM theses
      WHERE id = ${data.id}::uuid AND user_id = ${userId}::uuid
    `;

    return { success: true };
  });
