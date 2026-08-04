import { InngestCommHandler } from "inngest";
import { createFileRoute } from "@tanstack/react-router";
import { dailyScan } from "~/inngest/daily-scan";
import { inngest } from "~/lib/inngest";

const handler = new InngestCommHandler({
  frameworkName: "tanstack-start",
  client: inngest,
  functions: [dailyScan],
  handler: (req: Request) => ({
    body: () => req.text(),
    headers: (key) => req.headers.get(key),
    method: () => req.method,
    url: () => new URL(req.url, `https://${req.headers.get("host") || "localhost"}`),
    transformResponse: ({ body, status, headers }: { body: string; status: number; headers: Record<string, string> }) =>
      new Response(body, { status, headers }),
  }),
});

const inngestHandler = handler.createHandler();

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: ({ request }) => inngestHandler(request),
      POST: ({ request }) => inngestHandler(request),
      PUT: ({ request }) => inngestHandler(request),
    },
  },
});
