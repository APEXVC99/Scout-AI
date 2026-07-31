import { createFileRoute } from "@tanstack/react-router";
import { getMatchCount, getMatches, type MatchEntry } from "./-match-actions";
import { getAllCompanies, type CompanyEntry } from "./-pipeline-actions";

export const Route = createFileRoute("/app/")({
  loader: async () => {
    let companies: CompanyEntry[] = [];
    let matchCount = 0;
    let topMatches: MatchEntry[] = [];

    try {
      companies = await getAllCompanies();
    } catch {
      // keep defaults
    }

    try {
      const mc = await getMatchCount();
      matchCount = mc.count;
    } catch {
      // keep defaults
    }

    try {
      topMatches = await getMatches({ data: { limit: 5 } });
    } catch {
      // keep defaults
    }

    return { companies, matchCount, topMatches };
  },
  component: DashboardHome,
});

function DashboardHome() {
  const { companies, matchCount, topMatches } = Route.useLoaderData();

  const stats = [
    { label: "Tracked Companies", value: companies.length, icon: BuildingIcon },
    { label: "Matches", value: matchCount, icon: SparklesIcon },
    { label: "Memos", value: 0, icon: DocumentIcon },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your deal flow at a glance
        </p>
      </div>

      {/* Welcome Message */}
      <div className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-950">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900">
            <WaveIcon />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              Welcome to Scout AI
            </h2>
            <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
              Create your first investment thesis to start sourcing deals. Our
              autonomous agents will scan the ecosystem and surface companies
              that match your criteria.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <stat.icon />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Matches */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top Matches
        </h2>
        {topMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No matches yet. Create a thesis and run a scan to see matching companies here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Company</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    Thesis
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Score</th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {topMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {m.company_name}
                      </div>
                      {m.company_source && (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {m.company_source}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                      {m.thesis_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                          m.score > 0.8
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : m.score > 0.6
                              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {(m.score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {m.status === "new"
                          ? "New"
                          : m.status === "reviewing"
                            ? "Reviewing"
                            : m.status === "interested"
                              ? "Interested"
                              : m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────── */

function BuildingIcon() {
  return (
    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75-3.75V5.25m0 0V3m0 2.25a2.25 2.25 0 010 4.5m0-4.5a2.25 2.25 0 000 4.5" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}
