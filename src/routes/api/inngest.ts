import { InngestCommHandler } from "inngest";
import { createFileRoute } from "@tanstack/react-router";
import { dailyScan } from "~/inngest/daily-scan";
import { inngest } from "~/lib/inngest";

const handler = new InngestCommHandler({
  client: inngest,
  functions: [dailyScan],
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: ({ request }) => handler.createHandler()(request),
      POST: ({ request }) => handler.createHandler()(request),
      PUT: ({ request }) => handler.createHandler()(request),
    },
  },
});
