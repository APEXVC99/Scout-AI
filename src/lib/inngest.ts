import { Inngest } from "inngest";

/** Shared Inngest client for Scout AI background jobs. */
export const inngest = new Inngest({
  id: "scout-ai",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
