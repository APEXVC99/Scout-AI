import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getAllCompanies, type CompanyEntry } from "./-pipeline-actions";

export const Route = createFileRoute("/app/companies")({
  loader: async () => {
    try {
      const companies = await getAllCompanies();
      return { companies };
    } catch {
      return { companies: [] as CompanyEntry[] };
    }
  },
  component: CompaniesPage,
});

const SOURCE_PALETTE = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
];

function sourceColor(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return SOURCE_PALETTE[hash % SOURCE_PALETTE.length];
}

function CompaniesPage() {
  const { companies: initialCompanies } = Route.useLoaderData();
  const [companies, setCompanies] = useState<CompanyEntry[]>(initialCompanies);

  const refreshCompanies = async () => {
    try {
      const updated = await getAllCompanies();
      setCompanies(updated);
    } catch {
      // keep current state
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Tracked Companies
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Companies matching your investment theses
          </p>
        </div>
        <button
          onClick={refreshCompanies}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Companies Table */}
      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
            <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75-3.75V5.25m0 0V3m0 2.25a2.25 2.25 0 010 4.5m0-4.5a2.25 2.25 0 000 4.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Companies Yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Run a scan from the Pipeline page to discover companies from our data sources. They'll appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/80 via-violet-50/50 to-transparent dark:border-indigo-950 dark:from-indigo-950/60 dark:via-violet-950/40 dark:to-transparent">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Company</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Source</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Discovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                    {c.description && (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 max-w-md">
                        {c.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${sourceColor(c.source)}`}>
                      {c.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                    {new Date(c.discovered_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {companies.length > 0 && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Showing {companies.length} compan{companies.length === 1 ? "y" : "ies"}
        </p>
      )}
    </div>
  );
}
