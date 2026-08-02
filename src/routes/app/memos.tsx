import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllMemos, type DealMemoData } from "./-memo-actions";

export const Route = createFileRoute("/app/memos")({
  loader: async () => {
    try {
      const result = await getAllMemos();
      return { memos: result.memos };
    } catch {
      return { memos: [] as DealMemoData[] };
    }
  },
  component: MemosListPage,
});

function recommendationBadgeClass(recommendation: string): string {
  switch (recommendation.toLowerCase()) {
    case "strong_buy":
    case "strong buy":
      return "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700";
    case "buy":
      return "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-900/70 dark:text-blue-200 dark:border-blue-700";
    case "hold":
      return "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700";
    case "pass":
      return "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/70 dark:text-rose-200 dark:border-rose-700";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  }
}

function recommendationLabel(recommendation: string): string {
  switch (recommendation.toLowerCase()) {
    case "strong_buy":
      return "Strong Buy";
    case "buy":
      return "Buy";
    case "hold":
      return "Hold";
    case "pass":
      return "Pass";
    default:
      return recommendation;
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

function MemosListPage() {
  const { memos } = Route.useLoaderData();

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Deal Memos
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          AI-generated investment analyses for your top matches
        </p>
      </div>

      {memos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Memos Yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Go to the Matches page and click "Generate Memo" on a match to
            create your first AI-powered deal analysis.
          </p>
          <Link
            to="/app/matches"
            className="btn-gradient mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            View Matches
          </Link>
        </div>
      ) : (
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
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                  Recommendation
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {memos.map((memo) => (
                <tr key={memo.matchId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <Link
                      to="/app/memos/$matchId"
                      params={{ matchId: memo.matchId }}
                      className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {memo.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                    {memo.thesisName}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${recommendationBadgeClass(memo.recommendation)}`}
                    >
                      {recommendationLabel(memo.recommendation)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400">
                    {formatDate(memo.generatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {memos.length > 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Showing {memos.length} memo{memos.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
