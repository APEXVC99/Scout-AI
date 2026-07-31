# Scout AI — Autonomous Deal Flow for VCs

**Scout AI** deploys autonomous AI agents that work around the clock to source investment deals — scraping startup databases, tracking founder movements, building investment theses and deal memos, and sending personalized outreach. Built for smaller VC firms and solo GPs who want top-tier deal flow without top-tier headcount.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React + Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Neon Serverless (PostgreSQL)
- **Runtime:** Bun

## Project Structure

```
src/
  routes/
    index.tsx        # Landing page (hero, how it works, audience, pricing, waitlist)
    __root.tsx       # Root layout with SEO meta tags
  styles/
    app.css          # Tailwind CSS import
  db.ts              # Database client & schema
  router.tsx         # TanStack Router config
  routeTree.gen.ts   # Generated route tree
```

## Getting Started

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Build for production
bun run build

# Publish to production (build + serve on port 3000)
bun run publish
```

The site is served on port 3000. Changes to `src/routes/index.tsx` update the landing page.

## Deployment

Run `bun run publish` to build the production bundle and start serving on port 3000. The `publish.sh` script handles the full build → serve pipeline.

## Pricing Tiers

| Tier | Price | Who it's for |
|------|-------|-------------|
| **Solo** | $499/mo | Solo GPs, angel syndicates |
| **Studio** | $1,499/mo | Emerging fund managers |
| **Firm** | $3,999/mo | Established small VCs |

All tiers include the full autonomous agent loop: scraping → tracking → thesis building → outreach.

## License

Proprietary. All rights reserved.
