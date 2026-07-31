import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  scanSources,
  getRecentCompanies,
  getRecentScans,
  type CompanyEntry,
  type ScanLogEntry,
} from "./-pipeline-actions";

export const Route = createFileRoute("/app/pipeline")({
  loader: async () => {
    try {
      const [companies, scans] = await Promise.all([
        getRecentCompanies(),
        getRecentScans(),
      ]);
      return { companies, scans };
    } catch {
      return { companies: [] as CompanyEntry[], scans: [] as ScanLogEntry[] };
    }
  },
  component: PipelinePage,
});

function PipelinePage() {
  const { companies: initialCompanies, scans: initialScans } = Route.useLoaderData();

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    companiesFound: number;
    newCompanies: number;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyEntry[]>(initialCompanies);
  const [scans, setScans] = useState<ScanLogEntry[]>(initialScans);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const result = await scanSources();
      setScanResult(result);
      // Refresh data after scan
      const [updatedCompanies, updatedScans] = await Promise.all([
        getRecentCompanies(),
        getRecentScans(),
      ]);
      setCompanies(updatedCompanies);
      setScans(updatedScans);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Deal Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Scan sources and track discovered companies
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
              Scanning...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Scan Now
            </>
          )}
        </button>
      </div>

      {/* Scan Result Toast */}
      {scanResult && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Scan complete! Found {scanResult.companiesFound} companies, {scanResult.newCompanies} new.
            </span>
          </div>
        </div>
      )}

      {/* Scan Error */}
      {scanError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              {scanError}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Companies */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Recently Discovered Companies
          </h2>
          {companies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
                <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75-3.75V5.25m0 0V3m0 2.25a2.25 2.25 0 010 4.5m0-4.5a2.25 2.25 0 000 4.5" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No companies discovered yet. Click "Scan Now" to start sourcing deals.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Company</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Source</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Discovered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                        {c.description && (
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-xs">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {c.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {new Date(c.discovered_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scan History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Scan History
          </h2>
          {scans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="mb-3 flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No scans yet. Run your first scan to see results here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          log.status === "completed"
                            ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                            : log.status === "completed_with_errors"
                              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                              : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {log.status === "completed" || log.status === "completed_with_errors" ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {log.action.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                          {log.duration_ms != null && (
                            <span className="ml-2">· {(log.duration_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.detail && typeof log.detail === "object" && !Array.isArray(log.detail) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {("companiesFound" in log.detail) && (
                            <span>
                              {(log.detail as Record<string, unknown>).companiesFound} found ·{" "}
                              {(log.detail as Record<string, unknown>).newCompanies} new
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
