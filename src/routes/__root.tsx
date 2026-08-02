import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/tanstack-start";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Scout AI — Autonomous Deal Flow for VCs" },
      {
        name: "description",
        content:
          "Scout AI deploys autonomous AI agents that source investment deals 24/7 — scraping databases, tracking founders, building memos, and sending outreach. Built for emerging VC funds and solo GPs.",
      },
      { property: "og:title", content: "Scout AI — Autonomous Deal Flow for VCs" },
      {
        property: "og:description",
        content:
          "Scout AI deploys autonomous AI agents that source investment deals 24/7 — scraping databases, tracking founders, building memos, and sending outreach. Built for emerging VC funds and solo GPs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://getscoutai.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Scout AI — Autonomous Deal Flow for VCs" },
      {
        name: "twitter:description",
        content:
          "Scout AI deploys autonomous AI agents that source investment deals 24/7 — scraping databases, tracking founders, building memos, and sending outreach. Built for emerging VC funds and solo GPs.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || ""}
    >
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ClerkProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{__html: `
          body {
            background:
              radial-gradient(1100px 520px at 85% -10%, rgba(168, 85, 247, 0.16), transparent 60%),
              radial-gradient(900px 480px at 0% 0%, rgba(79, 70, 229, 0.2), transparent 55%),
              radial-gradient(800px 600px at 50% 110%, rgba(6, 182, 212, 0.1), transparent 60%),
              linear-gradient(180deg, #eef2ff 0%, #f5f3ff 32%, #ffffff 55%, #ecfeff 100%) !important;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background:
                radial-gradient(1100px 520px at 85% -10%, rgba(168, 85, 247, 0.22), transparent 60%),
                radial-gradient(900px 480px at 0% 0%, rgba(79, 70, 229, 0.28), transparent 55%),
                radial-gradient(800px 600px at 50% 110%, rgba(6, 182, 212, 0.12), transparent 60%),
                linear-gradient(180deg, #171431 0%, #0f0a2e 32%, #020617 60%, #04101f 100%) !important;
            }
          }
        `}} />
        <script defer src="https://cloud.umami.is/script.js" data-website-id="6817ec81-cc23-4501-b405-dec5b77f011a"></script>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
