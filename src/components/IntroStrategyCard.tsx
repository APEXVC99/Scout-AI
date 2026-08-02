import { Link } from "@tanstack/react-router";
import type { IntroStrategy } from "~/lib/intro";

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

function PersonIcon() {
  return (
    <svg
      className="h-5 w-5 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

// ── Card ────────────────────────────────────────────────────────────────

interface IntroStrategyCardProps {
  /** The existing intro strategy, or null if none has been generated yet. */
  strategy: IntroStrategy | null;
  /** True while the strategy is being generated. */
  loading?: boolean;
  /** Called when the user clicks "Generate Intro Strategy". */
  onGenerate?: () => void;
  /** Called when the user clicks "Generate Outreach from Strategy". */
  onGenerateOutreach?: () => void;
  /** True while an outreach draft is being generated from the strategy. */
  outreachGenerating?: boolean;
  /** True after an outreach draft was generated — shows a "View in Outreach" link. */
  outreachReady?: boolean;
  error?: string | null;
}

export function IntroStrategyCard({
  strategy,
  loading,
  onGenerate,
  onGenerateOutreach,
  outreachGenerating,
  outreachReady,
  error,
}: IntroStrategyCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <PersonIcon />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Warm Intro Path
        </h3>
      </div>

      {!strategy ? (
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identify the best person to contact at this company and get an intro
            strategy with conversation starters.
          </p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={loading}
              className={`mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                loading
                  ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  : "bg-green-600 text-white hover:bg-green-700"
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
                  Generating...
                </>
              ) : (
                "Generate Intro Strategy"
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
          {/* Target persona + title */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {strategy.targetPersona}
            </span>
            {strategy.targetTitle && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {strategy.targetTitle}
              </span>
            )}
          </div>

          {/* Rationale */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Why this person
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {strategy.rationale}
            </p>
          </div>

          {/* Conversation starters */}
          {strategy.conversationStarters.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Conversation starters
              </h4>
              <ol className="mt-2 space-y-1.5">
                {strategy.conversationStarters.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Mutual context */}
          {strategy.mutualContext && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Possible mutual context
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {strategy.mutualContext}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {onGenerateOutreach && (
              <button
                onClick={onGenerateOutreach}
                disabled={outreachGenerating}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {outreachGenerating
                  ? "Generating outreach..."
                  : "Generate Outreach from Strategy"}
              </button>
            )}
            {outreachReady && (
              <Link
                to="/app/outreach"
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                View in Outreach
              </Link>
            )}
            {onGenerate && (
              <button
                onClick={onGenerate}
                disabled={loading}
                className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50 dark:text-green-400"
              >
                {loading ? "Regenerating..." : "Regenerate"}
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Generated {formatDate(strategy.generatedAt)}
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
