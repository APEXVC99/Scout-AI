import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getMatches,
  updateMatchStatus,
  type MatchEntry,
} from "./-match-actions";
import { generateMemo, checkMatchHasMemo } from "./-memo-actions";
import { generateOutreach, checkMatchHasOutreach } from "./-outreach-actions";
import { generateAnalysis, getAnalysis } from "./-analysis-actions";
import { AnalysisCard } from "~/components/AnalysisCard";
import type { ThesisAnalysis } from "~/lib/analysis";

export const Route = createFileRoute("/app/matches")({
  loader: async () => {
    try {
      const matches = await getMatches();
      return { matches };
    } catch {
      return { matches: [] as MatchEntry[] };
    }
  },
  component: MatchesPage,
});

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "interested", label: "Interested" },
  { value: "passed", label: "Passed" },
] as const;

function scoreColor(score: number): string {
  if (score > 0.8)
    return "text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/70 border-2 border-emerald-300 dark:border-emerald-600 ring-2 ring-emerald-200/60 dark:ring-emerald-800/60";
  if (score > 0.6)
    return "text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/70 border-2 border-amber-300 dark:border-amber-600 ring-2 ring-amber-200/60 dark:ring-amber-800/60";
  return "text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/70 border-2 border-rose-300 dark:border-rose-600 ring-2 ring-rose-200/60 dark:ring-rose-800/60";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/70 dark:text-blue-200 dark:border-blue-700";
    case "reviewing":
      return "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700";
    case "interested":
      return "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700";
    case "passed":
      return "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
}

function MatchesPage() {
  const { matches: initialMatches } = Route.useLoaderData();
  const [matches, setMatches] = useState<MatchEntry[]>(initialMatches);
  const [selectedMatch, setSelectedMatch] = useState<MatchEntry | null>(null);
  const [generatingMemo, setGeneratingMemo] = useState<string | null>(null);
  const [memoStates, setMemoStates] = useState<
    Record<string, "loading" | "exists" | null>
  >({});
  const [memoError, setMemoError] = useState<string | null>(null);
  const [generatingOutreach, setGeneratingOutreach] = useState<string | null>(
    null,
  );
  const [outreachStates, setOutreachStates] = useState<
    Record<string, "loading" | "exists" | null>
  >({});
  const [outreachError, setOutreachError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<ThesisAnalysis | null>(null);
  const [analysisFetching, setAnalysisFetching] = useState(false);
  const [analysisGenerating, setAnalysisGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch the thesis fit analysis whenever a new match is selected
  useEffect(() => {
    let cancelled = false;
    if (!selectedMatch) {
      setSelectedAnalysis(null);
      setAnalysisError(null);
      return;
    }
    setAnalysisFetching(true);
    setAnalysisError(null);
    getAnalysis({ data: { matchId: selectedMatch.id } })
      .then((result) => {
        if (!cancelled) setSelectedAnalysis(result.analysis);
      })
      .catch(() => {
        if (!cancelled) setSelectedAnalysis(null);
      })
      .finally(() => {
        if (!cancelled) setAnalysisFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMatch?.id]);

  const handleGenerateAnalysis = async (matchId: string) => {
    setAnalysisGenerating(true);
    setAnalysisError(null);
    try {
      const result = await generateAnalysis({ data: { matchId } });
      setSelectedAnalysis(result.analysis);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setAnalysisError(msg);
    } finally {
      setAnalysisGenerating(false);
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    try {
      await updateMatchStatus({ matchId, status: newStatus });
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m)),
      );
      if (selectedMatch?.id === matchId) {
        setSelectedMatch((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleGenerateMemo = async (matchId: string) => {
    setGeneratingMemo(matchId);
    setMemoError(null);
    try {
      await generateMemo({ data: { matchId } });
      setMemoStates((prev) => ({ ...prev, [matchId]: "exists" }));
      // Update match status locally
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: "reviewing" } : m)),
      );
      if (selectedMatch?.id === matchId) {
        setSelectedMatch((prev) =>
          prev ? { ...prev, status: "reviewing" } : null,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMemoError(msg);
    } finally {
      setGeneratingMemo(null);
    }
  };

  const checkHasMemo = async (matchId: string) => {
    if (memoStates[matchId]) return;
    try {
      setMemoStates((prev) => ({ ...prev, [matchId]: "loading" }));
      const result = await checkMatchHasMemo({ data: { matchId } });
      setMemoStates((prev) => ({
        ...prev,
        [matchId]: result.hasMemo ? "exists" : null,
      }));
    } catch {
      setMemoStates((prev) => ({ ...prev, [matchId]: null }));
    }
  };

  const handleGenerateOutreach = async (matchId: string) => {
    setGeneratingOutreach(matchId);
    setOutreachError(null);
    try {
      await generateOutreach({ data: { matchId } });
      setOutreachStates((prev) => ({ ...prev, [matchId]: "exists" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setOutreachError(msg);
    } finally {
      setGeneratingOutreach(null);
    }
  };

  const checkHasOutreach = async (matchId: string) => {
    if (outreachStates[matchId]) return;
    try {
      setOutreachStates((prev) => ({ ...prev, [matchId]: "loading" }));
      const result = await checkMatchHasOutreach({ data: { matchId } });
      setOutreachStates((prev) => ({
        ...prev,
        [matchId]: result.hasOutreach ? "exists" : null,
      }));
    } catch {
      setOutreachStates((prev) => ({ ...prev, [matchId]: null }));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Matches
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Companies matched to your investment theses by AI similarity scoring
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
            <SparklesIcon />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Matches Yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Create a thesis and run a scan to discover matching companies.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Match List */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/80 via-violet-50/50 to-transparent dark:border-indigo-950 dark:from-indigo-950/60 dark:via-violet-950/40 dark:to-transparent">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                      Company
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      Thesis
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                      Score
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {matches.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        selectedMatch?.id === m.id
                          ? "bg-indigo-50 dark:bg-indigo-950/50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {m.company_name}
                        </div>
                        {m.company_source && (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {m.company_source}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                        {m.thesis_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-bold ${scoreColor(m.score)}`}
                        >
                          {(m.score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass(m.status)}`}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === m.status)
                            ?.label ?? m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {matches.length} match{matches.length === 1 ? "" : "es"}
            </p>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedMatch ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedMatch.company_name}
                </h3>

                {/* Score */}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-bold ${scoreColor(selectedMatch.score)}`}
                  >
                    {(selectedMatch.score * 100).toFixed(0)}% Match
                  </span>
                  {selectedMatch.company_source && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      via {selectedMatch.company_source}
                    </span>
                  )}
                </div>

                {/* Company Description */}
                {selectedMatch.company_description && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Company
                    </h4>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedMatch.company_description}
                    </p>
                  </div>
                )}

                {/* Thesis */}
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Matched Thesis
                  </h4>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedMatch.thesis_name}
                  </p>
                  {selectedMatch.thesis_description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {selectedMatch.thesis_description}
                    </p>
                  )}
                </div>

                {/* Status Controls */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          handleStatusChange(selectedMatch.id, opt.value)
                        }
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          selectedMatch.status === opt.value
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thesis Fit Analysis */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Why This Deal
                  </h4>
                  <div className="mt-2">
                    {analysisFetching ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Loading analysis...
                      </p>
                    ) : (
                      <AnalysisCard
                        analysis={selectedAnalysis}
                        loading={analysisGenerating}
                        onGenerate={() =>
                          void handleGenerateAnalysis(selectedMatch.id)
                        }
                        error={analysisError}
                      />
                    )}
                  </div>
                </div>

                {/* Memo Actions */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Deal Memo
                  </h4>
                  <div className="mt-2">
                    {memoStates[selectedMatch.id] === "exists" ? (
                      <Link
                        to="/app/memos/$matchId"
                        params={{ matchId: selectedMatch.id }}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        View Memo
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          void checkHasMemo(selectedMatch.id).then(() => {
                            if (memoStates[selectedMatch.id] !== "exists") {
                              void handleGenerateMemo(selectedMatch.id);
                            }
                          });
                        }}
                        disabled={generatingMemo === selectedMatch.id}
                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                          generatingMemo === selectedMatch.id
                            ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {generatingMemo === selectedMatch.id ? (
                          <>
                            <svg
                              className="mr-2 h-4 w-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          "Generate Memo"
                        )}
                      </button>
                    )}
                  </div>
                  {memoError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {memoError}
                    </p>
                  )}
                </div>

                {/* Outreach Actions */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Outreach
                  </h4>
                  <div className="mt-2">
                    {outreachStates[selectedMatch.id] === "exists" ? (
                      <Link
                        to="/app/outreach"
                        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                      >
                        View/Edit Outreach
                      </Link>
                    ) : memoStates[selectedMatch.id] !== "exists" ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Generate a memo first to unlock outreach
                      </p>
                    ) : (
                      <button
                        onClick={() => {
                          void checkHasOutreach(selectedMatch.id).then(() => {
                            if (outreachStates[selectedMatch.id] !== "exists") {
                              void handleGenerateOutreach(selectedMatch.id);
                            }
                          });
                        }}
                        disabled={generatingOutreach === selectedMatch.id}
                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                          generatingOutreach === selectedMatch.id
                            ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {generatingOutreach === selectedMatch.id ? (
                          <>
                            <svg
                              className="mr-2 h-4 w-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          "Generate Outreach"
                        )}
                      </button>
                    )}
                  </div>
                  {outreachError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {outreachError}
                    </p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                  Matched{" "}
                  {new Date(selectedMatch.created_at).toLocaleDateString()}
                  {selectedMatch.reviewed_at &&
                    ` · Reviewed ${new Date(selectedMatch.reviewed_at).toLocaleDateString()}`}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a match to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────── */

function SparklesIcon() {
  return (
    <svg
      className="h-8 w-8 text-indigo-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}
