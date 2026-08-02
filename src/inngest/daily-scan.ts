import { inngest } from "~/lib/inngest";
import { scanSources } from "~/routes/app/-pipeline-actions";

/** Run the RSS pipeline every day at 06:00 UTC. */
export const dailyScan = inngest.createFunction(
  { id: "daily-rss-scan", name: "Daily RSS scan" },
  { cron: "0 6 * * *" },
  async () => {
    console.info("[Inngest] Starting daily RSS scan");
    try {
      const result = await scanSources();
      console.info("[Inngest] Daily RSS scan complete", result);
      return result;
    } catch (error) {
      console.error("[Inngest] Daily RSS scan failed", error);
      throw error;
    }
  },
);
