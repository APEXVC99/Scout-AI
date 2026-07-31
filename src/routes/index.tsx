import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/tanstack-start";
import { readFile } from "node:fs/promises";
import { useState } from "react";
import { submitWaitlistEmail } from "./api/-waitlist";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "Scout AI";
  } catch {
    return "Scout AI";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();

  return (
    <div className="min-h-dvh text-gray-900 antialiased dark:text-gray-100">
      <Header businessName={businessName} />
      <Hero businessName={businessName} />
      <HowItWorks />
      <WhoItsFor />
      <Pricing />
      <Waitlist />
      <Footer businessName={businessName} />
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────── */
function Header({ businessName }: { businessName: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-lg font-bold tracking-tight">
          {businessName}
        </a>
        <nav className="flex items-center gap-4">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Pricing
          </a>
          {isLoaded ? (
            isSignedIn ? (
              <Link
                to="/app"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Get Started Free
                </Link>
              </>
            )
          ) : (
            <Link
              to="/sign-up"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Get Started Free
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ── Hero ────────────────────────────────────────────────────────── */
function Hero({ businessName }: { businessName: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* subtle gradient bloom */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-100 via-transparent to-transparent opacity-60 dark:from-indigo-900/30" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          Autonomous deal sourcing, 24/7
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your tireless{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
            AI research team
          </span>
          <br />
          that never sleeps
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
          {businessName} deploys autonomous AI agents that source investment deals
          around the clock — scraping databases, tracking founder movements,
          building investment theses and deal memos, and sending personalized
          outreach. Top-tier deal flow, without the top-tier headcount.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isLoaded && isSignedIn ? (
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
            >
              Launch App
              <ArrowRight />
            </Link>
          ) : (
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"
            >
              Get Started Free
              <ArrowRight />
            </Link>
          )}
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            See how it works
            <span className="text-lg">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Scan the entire ecosystem",
      body: "Agents continuously scrape startup databases, news outlets, job boards, and social platforms — tracking thousands of signals across the tech landscape so you never miss a beat.",
      icon: Radar,
    },
    {
      number: "02",
      title: "Track founders and momentum",
      body: "Agents monitor founder movements, company milestones, hiring surges, product launches, and funding signals — surfacing the startups that match your thesis before they hit a data room.",
      icon: Target,
    },
    {
      number: "03",
      title: "Build theses and memos automatically",
      body: "AI synthesizes research into structured investment theses, deal memos, and SWOT analyses — so you walk into every meeting with institutional-grade preparation.",
      icon: FileText,
    },
    {
      number: "04",
      title: "Outreach that feels personal",
      body: "Personalized emails land in the right founders' inboxes, written in your voice and aligned to your investment criteria. Your pipeline fills while you sleep.",
      icon: Send,
    },
  ];

  return (
    <section id="how-it-works" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your deal pipeline, on autopilot
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Four steps from signal to inbox. The agent loop runs continuously —
            you wake up to a curated pipeline every morning.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-2xl border border-gray-100 bg-gray-50/50 p-6 transition hover:border-indigo-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-indigo-800 dark:hover:bg-gray-900"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                <step.icon />
              </div>
              <span className="text-sm font-semibold tracking-wider text-indigo-500 dark:text-indigo-400">
                {step.number}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Who It's For ────────────────────────────────────────────────── */
function WhoItsFor() {
  const audiences = [
    {
      title: "Solo GPs",
      body: "You're running the fund, sourcing deals, and managing portfolio support — all by yourself. Scout AI gives you an institutional-grade research function without hiring a single analyst.",
    },
    {
      title: "Emerging fund managers",
      body: "Fund I or Fund II? You need to punch above your weight class. Scout AI helps you build a proprietary pipeline that competes with multi-billion-dollar firms.",
    },
    {
      title: "Small VC firms",
      body: "You have a lean team and high ambitions. Scout AI amplifies your existing analysts — letting them focus on relationship-building while agents handle the grind of sourcing.",
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-gray-50/50 px-6 py-24 dark:border-gray-800 dark:bg-gray-900/30 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for investors who can't afford to miss
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Top-tier funds staff entire research teams. Scout AI levels the
            playing field.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-gray-800 dark:bg-gray-950"
            >
              <h3 className="text-xl font-semibold">{a.title}</h3>
              <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
                {a.body}
              </p>
            </div>
          ))}
        </div>

        {/* social proof placeholder */}
        <div className="mt-16 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Designed for the future of venture
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-gray-300 dark:text-gray-700">
            <span className="text-2xl font-bold">Seed</span>
            <span className="text-2xl font-bold">Series A</span>
            <span className="text-2xl font-bold">Pre-seed</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ─────────────────────────────────────────────────────── */
function Pricing() {
  const tiers = [
    {
      name: "Solo",
      price: "$499",
      period: "/mo",
      features: [
        "3 active theses",
        "1 agent",
        "Up to 50 tracked companies",
        "Full autonomous loop",
      ],
      stripeUrl: "https://buy.stripe.com/aFa9AScMse5sgYR8iz6Na03",
      highlight: false,
    },
    {
      name: "Studio",
      price: "$1,499",
      period: "/mo",
      features: [
        "10 active theses",
        "5 agents",
        "Up to 300 tracked companies",
        "Custom outreach templates",
      ],
      stripeUrl: "https://buy.stripe.com/9B67sKfYEe5s8sleGX6Na04",
      highlight: true,
    },
    {
      name: "Firm",
      price: "$3,999",
      period: "/mo",
      features: [
        "Unlimited theses",
        "20+ agents",
        "Custom data sources",
        "White-label memos",
        "Priority support",
      ],
      stripeUrl: "https://buy.stripe.com/14A7sK5k05yW23X7ev6Na05",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Less than a junior analyst's monthly stipend — for 24/7 autonomous coverage.
            No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                tier.highlight
                  ? "border-indigo-300 bg-white ring-1 ring-indigo-500/20 dark:border-indigo-700 dark:bg-gray-900"
                  : "border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className="text-xl font-semibold">{tier.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-lg text-gray-500 dark:text-gray-400">
                  {tier.period}
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={tier.stripeUrl}
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition ${
                  tier.highlight
                    ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                    : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                Subscribe
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Waitlist ────────────────────────────────────────────────────── */
function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "submitted">(
    "idle",
  );
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Quick client-side check
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const result = await submitWaitlistEmail({
        data: { email: email.trim().toLowerCase() },
      });

      if ("error" in result && result.error) {
        setError(result.error);
        setStatus("idle");
      } else {
        setStatus("submitted");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <section id="waitlist" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Get early access to Scout AI
        </h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          We're onboarding a small cohort of investors. Join the waitlist and
          we'll reach out as we roll out access.
        </p>

        {status === "submitted" ? (
          <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-8 dark:border-green-800 dark:bg-green-950/50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckIcon />
            </div>
            <h3 className="mt-4 text-xl font-semibold">You're on the list</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Thanks! We'll be in touch at <strong>{email}</strong> as soon as
              your spot opens up.
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
              className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              ← Add another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10" noValidate>
            <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="you@yourfund.com"
                  disabled={status === "loading"}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-indigo-400"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {status === "loading" ? (
                  <>
                    <Spinner />
                    <span className="ml-2">Joining...</span>
                  </>
                ) : (
                  "Join waitlist"
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              No spam, ever. We'll only email you about Scout AI early access.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────── */
function Footer({ businessName }: { businessName: string }) {
  return (
    <footer className="border-t border-gray-100 px-6 py-8 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
        <nav className="flex gap-6">
          <a href="/terms" className="hover:text-gray-600 dark:hover:text-gray-400">
            Terms of Service
          </a>
          <a href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-400">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}

/* ── Icon components (inline SVGs) ────────────────────────────────── */

function ArrowRight() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
    </svg>
  );
}

function Radar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function Target() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function FileText() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M10 14h4M10 17h2" />
    </svg>
  );
}

function Send() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l18-7-7 18-1.5-6.5L3 10z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
  );
}
