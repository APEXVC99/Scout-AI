import { runTrial, getTrialResults, generateNextTrialMemo } from "~/lib/trial";

const input = {
  name: "AI Infrastructure for Agents",
  description: "We invest in the infrastructure layer powering autonomous AI agents — compute, orchestration, memory and vector databases, observability, and developer tooling. We look for technical founding teams, real revenue or strong usage, and open-source-friendly distribution.",
  sectors: ["ai infrastructure", "developer tools", "vector databases", "observability"],
  stages: ["seed", "series a"],
};

const t0 = Date.now();
const run = await runTrial(input);
console.log("RUN OK in", Date.now() - t0, "ms");
console.log("  thesisId:", run.thesisId);
console.log("  companiesScanned:", run.companiesScanned, "new:", run.newCompanies, "matchCount:", run.matchCount, "feedErrors:", JSON.stringify(run.feedErrors));

const results = await getTrialResults(run.thesisId);
console.log("RESULTS: thesis:", results?.thesis.name, "| matches:", results?.matches.length, "| total:", results?.matchesTotal, "| memos:", results?.memoCount);
if (results) {
  for (const m of results.matches.slice(0, 5)) {
    console.log("  ", (m.score * 100).toFixed(0) + "%", m.companyName, "|", m.sector ?? "-", "|", m.stage ?? "-");
  }
}

// Generate one memo to verify GPT-4o path
const memo0 = await generateNextTrialMemo(run.thesisId);
console.log("MEMO gen:", memo0.generated ? "generated" : "done", "matchId:", memo0.matchId ?? "-");
if (memo0.memo) {
  console.log("  recommendation:", memo0.memo.recommendation);
  console.log("  scores:", JSON.stringify(memo0.memo.scores));
  console.log("  swot strengths:", memo0.memo.swot.strengths.length, "weaknesses:", memo0.memo.swot.weaknesses.length);
  console.log("  content chars:", memo0.memo.content.length);
}
console.log("TOTAL elapsed:", Date.now() - t0, "ms");
