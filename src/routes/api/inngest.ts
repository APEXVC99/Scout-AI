import { serve } from "inngest";
import { createFileRoute } from "@tanstack/react-router";
import { dailyScan } from "~/inngest/daily-scan";
import { inngest } from "~/lib/inngest";

const handler = serve({
  client: inngest,
  functions: [dailyScan],
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: ({ request }) => handler.GET(request),
      POST: ({ request }) => handler.POST(request),
      PUT: ({ request }) => handler.PUT(request),
    },
  },
});
