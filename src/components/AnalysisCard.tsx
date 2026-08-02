import type { ThesisAnalysis } from "~/lib/analysis";

// ── Color helpers ───────────────────────────────────────────────────────

function fitScoreColor(score: number): string {
  if (score > 80) return "text-green-600 dark:text-green-400";
  if (score > 60) return "text-yellow-600 dark:text-yellow-400";
  if (score > 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function fitScoreBg(score: number): string {
  if (score > 80) return "bg-green-50 dark:bg-green-950";
  if (score > 60) return "bg-yellow-50 dark:bg-yellow-950";
  if (score > 40) return "bg-orange-50 dark:bg-orange-950";
  return "bg-red-50 dark:bg-red-950";
}

function verdictBadgeClass(verdict: string): string {
  switch (verdict) {
    case "strong_fit":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "fit":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "watch":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "pass":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function verdictLabel(verdict: string): string {
  switch (verdict) {
    case "strong_fit":
      return "Strong Fit";
    case "fit":
      return "Fit";
    case "watch":
      return "Watch";
    case "pass":
      return "Pass";
    default:
      return verdict;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── Icons ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-green-500 dark:text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500 dark:text-yellow-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      className="h-5 w-5 text-indigo-500"
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

// ── Card ────────────────────────────────────────────────────────────────

interface AnalysisCardProps {
  /** The existing analysis, or null if none has been generated yet. */
  analysis: ThesisAnalysis | null;
  /** True while an analysis is being generated. */
  loading?: boolean;
  /** Called when the user clicks "Analyze Thesis Fit". */
  onGenerate?: () => void;
  error?: string | null;
}

export function AnalysisCard({
  analysis,
  loading,
  onGenerate,
  error,
}: AnalysisCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <SparkleIcon />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Why This Deal — Thesis Fit Analysis
        </h3>
      </div>

      {!analysis ? (
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get a structured breakdown of why this company matches your thesis
            and what to watch for before you dig deeper.
          </p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={loading}
              className={`mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                loading
                  ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {loading ? (
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
                  Analyzing...
                </>
              ) : (
                "Analyze Thesis Fit"
              )}
            </button>
          )}
          {error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {/* Score + Verdict */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 ${fitScoreBg(analysis.fitScore)}`}
            >
              <span
                className={`text-3xl font-bold ${fitScoreColor(analysis.fitScore)}`}
              >
                {analysis.fitScore}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                / 100
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${verdictBadgeClass(analysis.verdict)}`}
            >
              {verdictLabel(analysis.verdict)}
            </span>
          </div>

          {/* Summary */}
          <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {analysis.fitSummary}
          </p>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Why it fits
              </h4>
              <ul className="mt-2 space-y-1.5">
                {analysis.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <CheckIcon />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {analysis.concerns.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                What to watch
              </h4>
              <ul className="mt-2 space-y-1.5">
                {analysis.concerns.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <WarningIcon />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing signals */}
          {analysis.missingSignals.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Missing signals
              </h4>
              <ul className="mt-2 space-y-1.5">
                {analysis.missingSignals.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    <InfoIcon />
                    <span>
                      We couldn't determine{" "}
                      <span className="font-medium">{s}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated date */}
          <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
            Generated {formatDate(analysis.generatedAt)}
            {onGenerate && (
              <button
                onClick={onGenerate}
                disabled={loading}
                className="ml-3 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 dark:text-indigo-400"
              >
                {loading ? "Regenerating..." : "Regenerate"}
              </button>
            )}
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
