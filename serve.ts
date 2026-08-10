// Production server for the built site. The TanStack Start build emits a portable
// fetch handler (dist/server/server.js) plus static client assets (dist/client);
// this wraps them in a Bun server on port 3000 — static files first, SSR for the
// rest. Run `bun run build` before starting. Restart it with `bun run publish`.
//
// Starting a new instance supersedes the old one: it frees the port no matter
// which user owns the current server (provisioning starts it as `engine`; a team
// member's `bun run publish` runs as their own user), so publish never collides
// with an already-running server. Every sandbox user has passwordless sudo, so
// the takeover works across user boundaries.
import handler from "./dist/server/server.js";
import { neon } from "@neondatabase/serverless";
import { runTrial, getTrialResults, generateNextTrialMemo } from "./src/lib/trial.ts";

// Pinned, NOT read from the environment. The published preview URL
// (<label>.<PUBLIC_SITE_DOMAIN>) is reverse-proxied to 0.0.0.0:3000 inside the
// sandbox, so the default site MUST bind there. Bun auto-loads .env files, so
// honouring process.env.PORT/HOST would let a stray env var or a .env in the site
// dir silently move the site off :3000 (or onto loopback) and break the public URL.
const PORT = 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = `${import.meta.dir}/dist/client`;

// Public static pages served before Clerk SSR so visitors can explore without auth.
const STATIC_PAGES: Record<string, string> = {
  "/": "/landing.html",
  "/demo": "/demo.html",
  "/welcome": "/welcome.html",
  "/sample-memo": "/sample-memo.html",
  "/digest": "/digest.html",
  "/trial": "/trial.html",
  "/trial/results": "/trial-results.html",
};

// ── Public trial API: in-memory rate limiting (single-process Bun server) ──
// Each trial run costs real OpenAI calls, so cap usage per IP. Cheap and
// sufficient for v1; swap for a DB-backed limiter if the site ever scales out.
const trialRunHits = new Map<string, number[]>();
const trialMemoHits = new Map<string, number[]>();

function rateLimit(
  map: Map<string, number[]>,
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    map.set(key, hits);
    return false;
  }
  hits.push(now);
  map.set(key, hits);
  return true;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "local";
}

// Free PORT regardless of which user owns the current listener. lsof runs under
// sudo so it can see (and the kill can signal) a process owned by another user;
// the loop waits for the socket to actually release before we bind.
const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

// Take over the port, re-freeing and retrying if another publish grabbed it in the
// gap between freeing and binding (last publish wins). Bun.serve throws EADDRINUSE
// synchronously, so without this a raced publish would die while the shell already
// reported success.
for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const { pathname } = new URL(req.url);

        // Waitlist API — direct handler so the static landing page works
        if (req.method === "POST" && pathname === "/api/waitlist") {
          try {
            const body = await req.json() as { email?: string };
            const email = body.email?.trim().toLowerCase();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
            }
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) {
              return Response.json({ error: "Service unavailable — database not connected." }, { status: 503 });
            }
            const sql = neon(dbUrl);
            await sql`CREATE TABLE IF NOT EXISTS waitlist_subscribers (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              created_at TIMESTAMP DEFAULT NOW()
            )`;
            await sql`INSERT INTO waitlist_subscribers (email) VALUES (${email})`;
            return Response.json({ success: true });
          } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (code === "23505") {
              return Response.json({ error: "You're already on the list!" });
            }
            return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
          }
        }

        // ── Public trial pipeline API (no auth) ──────────────────────────
        // POST /api/trial/run — create thesis, scrape feeds, embed, match.
        if (req.method === "POST" && pathname === "/api/trial/run") {
          try {
            if (!rateLimit(trialRunHits, clientIp(req), 5, 60 * 60 * 1000)) {
              return Response.json(
                { error: "You've reached the free trial limit for now — please try again in a bit." },
                { status: 429 },
              );
            }
            const body = await req.json() as Record<string, unknown>;
            const name = typeof body.name === "string" ? body.name.trim() : "";
            const description = typeof body.description === "string" ? body.description.trim() : "";
            const sectorsRaw = Array.isArray(body.sectors)
              ? body.sectors.filter((s): s is string => typeof s === "string")
              : [];
            const stagesRaw = Array.isArray(body.stages)
              ? body.stages.filter((s): s is string => typeof s === "string")
              : [];
            const sectors = [...new Set(sectorsRaw.map((s) => s.trim().toLowerCase()).filter(Boolean))];
            const stages = [...new Set(stagesRaw.map((s) => s.trim().toLowerCase()).filter(Boolean))];

            if (!name || name.length > 120) {
              return Response.json({ error: "Please provide a thesis name (max 120 characters)." }, { status: 400 });
            }
            if (!description || description.length > 1500) {
              return Response.json({ error: "Please provide a thesis description (max 1500 characters)." }, { status: 400 });
            }
            if (sectors.length === 0) {
              return Response.json({ error: "Please provide at least one sector." }, { status: 400 });
            }
            if (stages.length === 0) {
              return Response.json({ error: "Please provide at least one stage." }, { status: 400 });
            }

            const result = await runTrial({ name, description, sectors, stages });
            return Response.json(result);
          } catch (err) {
            console.error("[trial] run failed:", err);
            return Response.json({ error: "Scan failed — please try again in a moment." }, { status: 500 });
          }
        }

        // POST /api/trial/memo — generate the next deal memo for a trial.
        if (req.method === "POST" && pathname === "/api/trial/memo") {
          try {
            if (!rateLimit(trialMemoHits, clientIp(req), 15, 60 * 60 * 1000)) {
              return Response.json(
                { error: "Memo generation limit reached — please try again in a bit." },
                { status: 429 },
              );
            }
            const body = await req.json() as { thesisId?: unknown };
            if (typeof body.thesisId !== "string" || !body.thesisId) {
              return Response.json({ error: "Missing thesisId" }, { status: 400 });
            }
            const result = await generateNextTrialMemo(body.thesisId);
            return Response.json(result);
          } catch (err) {
            console.error("[trial] memo failed:", err);
            return Response.json({ error: "Memo generation failed — please try again." }, { status: 500 });
          }
        }

        // GET /api/trial/results?thesisId=… — fetch a trial's matches + memos.
        if (req.method === "GET" && pathname === "/api/trial/results") {
          try {
            const thesisId = new URL(req.url).searchParams.get("thesisId");
            if (!thesisId) {
              return Response.json({ error: "Missing thesisId" }, { status: 400 });
            }
            const results = await getTrialResults(thesisId);
            if (!results) {
              return Response.json({ error: "Trial not found" }, { status: 404 });
            }
            return Response.json(results);
          } catch (err) {
            console.error("[trial] results failed:", err);
            return Response.json({ error: "Could not load results." }, { status: 500 });
          }
        }

        // Serve public static pages before Clerk SSR so visitors can explore without auth.
        const pageName = STATIC_PAGES[pathname];
        if (pageName) {
          const page = Bun.file(CLIENT_DIR + pageName);
          if (await page.exists()) {
            return new Response(page, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        }
        if (!(pathname in STATIC_PAGES)) {
          const file = Bun.file(CLIENT_DIR + pathname);
          if (await file.exists()) return new Response(file);
        }
        return (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}

console.log(`team-site serving on http://${HOST}:${String(PORT)}`);
