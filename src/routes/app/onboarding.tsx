import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  checkOnboarding,
  completeOnboarding,
  createThesisFromText,
} from "./-onboarding-actions";
import { scanSources, getRecentCompanies } from "./-pipeline-actions";
import { getMatches, matchCompanyToTheses } from "./-match-actions";
import { seedDemoData, hasDemoData } from "~/lib/seed";
import type { CompanyEntry, ScanResult } from "./-pipeline-actions";
import type { MatchEntry } from "./-match-actions";

export const Route = createFileRoute("/app/onboarding")({
  component: OnboardingPage,
});

type Step = 1 | 2 | 3;

function OnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState(false);

  // Step 1 state
  const [thesisText, setThesisText] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 state
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Progress, setStep2Progress] = useState<string>("");
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step2Complete, setStep2Complete] = useState(false);

  // Step 3 state
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [step3Loading, setStep3Loading] = useState(false);

  // Check if already onboarded
  useEffect(() => {
    checkOnboarding()
      .then((result) => {
        if (result.onboardingComplete) {
          navigate({ to: "/app" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  // ── Step 1: Create thesis from free text ────────────────────────────
  const handleStep1 = async () => {
    if (!thesisText.trim()) {
      setStep1Error("Please tell us what you invest in.");
      return;
    }
    setStep1Loading(true);
    setStep1Error(null);
    try {
      await createThesisFromText({ data: { text: thesisText } });
      setStep1Loading(false);
      setStep(2);
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : "Something went wrong.");
      setStep1Loading(false);
    }
  };

  // ── Step 2: Run first scan ──────────────────────────────────────────
  const handleStep2 = async () => {
    setStep2Loading(true);
    setStep2Error(null);
    setStep2Progress("Scanning data sources for deals...");
    try {
      // Run scan
      await scanSources();
      setStep2Progress("Scan complete! Computing matches...");

      // Seed demo data to ensure user sees value
      try {
        const demoCheck = await hasDemoData();
        if (!demoCheck.hasDemo) {
          await seedDemoData();
        }
      } catch {
        // Demo data is optional
      }

      // Run matching for all companies with the new thesis
      setStep2Progress("Scan complete! Computing matches...");
      try {
        const companies = await getRecentCompanies();
        for (const c of companies) {
          try {
            await matchCompanyToTheses({ data: { companyId: c.id } });
          } catch {
            // individual match failures are ok
          }
        }
      } catch {
        // matching is best-effort
      }

      setStep2Complete(true);
      setStep2Loading(false);
      setStep(3);
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : "Scan failed. Please try again.");
      setStep2Loading(false);
    }
  };

  // ── Step 3: Show matches ────────────────────────────────────────────
  const handleViewMatches = async () => {
    setStep3Loading(true);
    try {
      const result = await getMatches({ data: { limit: 5 } });
      setMatches(result);
    } catch {
      setMatches([]);
    } finally {
      setStep3Loading(false);
    }
  };

  const handleFinish = async () => {
    try {
      await completeOnboarding();
    } catch {}
    navigate({ to: "/app" });
  };

  const handleSkip = async () => {
    setSkipped(true);
    // Seed demo data so the user sees something even if they skip
    try {
      const demoCheck = await hasDemoData();
      if (!demoCheck.hasDemo) {
        await seedDemoData();
      }
    } catch {}
    await handleFinish();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                s < step
                  ? "bg-green-500 text-white"
                  : s === step
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-200 dark:ring-indigo-800"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {s < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 rounded transition ${
                  s < step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: What do you invest in? */}
      {step === 1 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
              <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              What do you invest in?
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Describe your investment focus in your own words. Our AI will structure it into a thesis.
            </p>
          </div>

          <textarea
            value={thesisText}
            onChange={(e) => {
              setThesisText(e.target.value);
              if (step1Error) setStep1Error(null);
            }}
            placeholder="e.g. I invest in early-stage AI infrastructure and developer tools companies. I'm looking for strong technical teams building the picks and shovels that power the next generation of AI applications..."
            rows={5}
            disabled={step1Loading}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 disabled:opacity-50"
          />

          {step1Error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{step1Error}</p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Skip for now
            </button>
            <button
              onClick={handleStep1}
              disabled={step1Loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {step1Loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Structuring your thesis...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Let's find deals */}
      {step === 2 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
              <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Let's find deals
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We'll scan our data sources and find companies that match your thesis. This takes about 30 seconds.
            </p>
          </div>

          {!step2Loading && !step2Complete ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => void handleStep2()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Start Scanning
              </button>
              <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                Skip for now
              </button>
            </div>
          ) : step2Loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {step2Progress || "Scanning..."}
                </span>
              </div>
              {step2Error && (
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">{step2Error}</p>
                  <button
                    onClick={() => void handleStep2()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan complete!</p>
              <button
                onClick={() => {
                  setStep(3);
                  void handleViewMatches();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View Your Matches
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Your first matches */}
      {step === 3 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
              <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your first matches
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Here are some companies that match your investment thesis.
            </p>
          </div>

          {step3Loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No matches yet. Matches appear when you scan for companies.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Company</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                        {m.company_name}
                      </td>
                      <td className="px-4 py-2.5">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => void handleSkip().then(() => navigate({ to: "/app" }))}
              className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Skip to dashboard
            </button>
            <button
              onClick={() => void handleFinish()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
