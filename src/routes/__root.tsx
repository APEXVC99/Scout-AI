import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
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
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{__html: `
          body {
            background: linear-gradient(180deg, #eff6ff 0%, #ffffff 40%, #f0f9ff 100%) !important;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: linear-gradient(180deg, #0f172a 0%, #030712 40%, #0c1222 100%) !important;
            }
          }
        `}} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
