import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getMatchCount, getMatches, type MatchEntry } from "./-match-actions";
import { getAllCompanies, type CompanyEntry } from "./-pipeline-actions";
import { getMemoCount } from "./-memo-actions";
import { getTheses } from "./-thesis-actions";
import { seedDemoData, hasDemoData } from "~/lib/seed";
import { checkOnboarding } from "./-onboarding-actions";
import { useToast } from "~/components/Toast";

export const Route = createFileRoute("/app/")({
  loader: async () => {
    let companies: CompanyEntry[] = [];
    let matchCount = 0;
    let memoCount = 0;
    let topMatches: MatchEntry[] = [];
    let thesisCount = 0;

    try {
      companies = await getAllCompanies();
    } catch { /* keep defaults */ }

    try {
      const mc = await getMatchCount();
      matchCount = mc.count;
    } catch { /* keep defaults */ }

    try {
      const mm = await getMemoCount();
      memoCount = mm.count;
    } catch { /* keep defaults */ }

    try {
      topMatches = await getMatches({ data: { limit: 5 } });
    } catch { /* keep defaults */ }

    try {
      const t = await getTheses();
      thesisCount = t.length;
    } catch { /* keep defaults */ }

    return { companies, matchCount, memoCount, topMatches, thesisCount };
  },
  component: DashboardHome,
});

function DashboardHome() {
  const { companies, matchCount, memoCount, topMatches, thesisCount } = Route.useLoaderData();
  const { addToast } = useToast();

  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [hasDemo, setHasDemo] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  useEffect(() => {
    checkOnboarding()
      .then((r) => setOnboardingComplete(r.onboardingComplete))
      .catch(() => {});
    hasDemoData()
      .then((r) => setHasDemo(r.hasDemo))
      .catch(() => {});
  }, []);

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const result = await seedDemoData();
      addToast(
        `Demo data loaded: ${result.thesisCount} thesis, ${result.companyCount} companies, ${result.matchCount} matches`,
        "success",
      );
      setHasDemo(true);
      // Reload page to reflect new data
      window.location.reload();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to load demo data",
        "error",
      );
    } finally {
      setSeedingDemo(false);
    }
  };

  const stats = [
    { label: "Theses", value: thesisCount, icon: FileIcon },
    { label: "Tracked Companies", value: companies.length, icon: BuildingIcon },
    { label: "Matches", value: matchCount, icon: SparklesIcon },
    { label: "Memos", value: memoCount, icon: DocumentIcon },
  ];

  const needsSetup = thesisCount === 0 && companies.length === 0 && matchCount === 0;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your deal flow at a glance
          </p>
        </div>
        {!hasDemo && !seedingDemo && (
          <button
            onClick={() => void handleSeedDemo()}
            disabled={seedingDemo}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            {seedingDemo ? "Loading..." : "Load Demo Data"}
          </button>
        )}
      </div>

      {/* Setup CTA for empty state */}
      {needsSetup && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Your dashboard is empty
              </h2>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {!onboardingComplete ? (
                  <>Finish the onboarding to set up your thesis and start sourcing deals.</>
                ) : (
                  <>Create your first thesis, load demo data, or run a scan to start discovering matching companies.</>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!onboardingComplete && (
                  <Link
                    to="/app/onboarding"
                    className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Complete Onboarding
                  </Link>
                )}
                <button
                  onClick={() => void handleSeedDemo()}
                  disabled={seedingDemo}
                  className="inline-flex items-center rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-800"
                >
                  Load Demo Data
                </button>
                <Link
                  to="/app/theses/new"
                  className="inline-flex items-center rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-gray-900 dark:text-amber-300 dark:hover:bg-amber-950"
                >
                  Create a Thesis
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="mt-4 flex justify-center gap-3">
              <Link
                to="/app/theses/new"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Create Thesis
              </Link>
              <Link
                to="/app/pipeline"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Run Scan
              </Link>
            </div>
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
        {topMatches.length > 0 && (
          <div className="mt-3 text-right">
            <Link
              to="/app/matches"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              View all matches →
            </Link>
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

function FileIcon() {
  return (
    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
