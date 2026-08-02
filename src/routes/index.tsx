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
    <div className="bg-page min-h-dvh text-gray-900 antialiased dark:text-gray-100">
      <Header businessName={businessName} />
      <Hero businessName={businessName} />
      <SectionDivider />
      <HowItWorks />
      <WhoItsFor />
      <SectionDivider />
      <Pricing />
      <Waitlist />
      <Footer businessName={businessName} />
    </div>
  );
}

/* ── Section divider ─────────────────────────────────────────────── */
function SectionDivider() {
  return <div className="section-divider mx-auto max-w-4xl" aria-hidden />;
}

/* ── Header ─────────────────────────────────────────────────────── */
function Header({ businessName }: { businessName: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100/70 bg-white/80 backdrop-blur-md dark:border-indigo-950 dark:bg-[#0d0826]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
            S
          </span>
          <span className="text-gradient">{businessName}</span>
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
          <a
            href="/blog"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Blog
          </a>
          {isLoaded ? (
            isSignedIn ? (
              <Link
                to="/app"
                className="btn-gradient rounded-full px-4 py-2 text-sm font-medium"
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
                  className="btn-gradient rounded-full px-5 py-2 text-sm font-semibold"
                >
                  Get Started Free
                </Link>
              </>
            )
          ) : (
            <Link
              to="/sign-up"
              className="btn-gradient rounded-full px-5 py-2 text-sm font-semibold"
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
      {/* animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -top-32 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/30 via-violet-400/25 to-purple-400/30 blur-3xl dark:from-indigo-600/30 dark:via-violet-600/25 dark:to-purple-600/30" />
        <div className="animate-blob-delayed absolute top-24 -left-24 h-[320px] w-[320px] rounded-full bg-gradient-to-br from-cyan-300/25 to-sky-400/20 blur-3xl dark:from-cyan-500/20 dark:to-sky-600/20" />
        <div className="animate-float absolute -right-20 top-40 h-[300px] w-[300px] rounded-full bg-gradient-to-bl from-fuchsia-300/25 to-violet-400/20 blur-3xl dark:from-fuchsia-600/20 dark:to-violet-700/20" />
      </div>

      {/* subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #4f46e5 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm dark:border-indigo-800/80 dark:from-indigo-950 dark:via-violet-950 dark:to-purple-950 dark:text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          </span>
          Autonomous deal sourcing, 24/7
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your tireless{" "}
          <span className="text-gradient-shimmer">AI research team</span>
          <br />
          that never sleeps
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300/80 sm:text-xl">
          {businessName} deploys autonomous AI agents that source investment deals
          around the clock — scraping databases, tracking founder movements,
          building investment theses and deal memos, and sending personalized
          outreach. Top-tier deal flow, without the top-tier headcount.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isLoaded && isSignedIn ? (
            <Link
              to="/app"
              className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold"
            >
              Launch App
              <ArrowRight />
            </Link>
          ) : (
            <Link
              to="/sign-up"
              className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold"
            >
              Get Started Free
              <ArrowRight />
            </Link>
          )}
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200/70 bg-white/60 px-6 py-3 text-base font-medium text-indigo-700 backdrop-blur transition hover:border-indigo-300 hover:bg-white dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/60"
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
const STEP_STYLES = [
  {
    iconBg:
      "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/40",
    number: "text-indigo-600 dark:text-indigo-400",
    hover: "hover:border-indigo-300 dark:hover:border-indigo-700",
  },
  {
    iconBg:
      "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/40",
    number: "text-violet-600 dark:text-violet-400",
    hover: "hover:border-violet-300 dark:hover:border-violet-700",
  },
  {
    iconBg:
      "bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-fuchsia-500/40",
    number: "text-purple-600 dark:text-purple-400",
    hover: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  {
    iconBg:
      "bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/40",
    number: "text-cyan-600 dark:text-cyan-400",
    hover: "hover:border-cyan-300 dark:hover:border-cyan-700",
  },
];

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
          <span className="mb-3 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
            How it works
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your deal pipeline,{" "}
            <span className="text-gradient">on autopilot</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Four steps from signal to inbox. The agent loop runs continuously —
            you wake up to a curated pipeline every morning.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const s = STEP_STYLES[i];
            return (
              <div
                key={step.number}
                className={`card-lift group relative rounded-2xl border border-gray-100 bg-white/80 p-6 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/60 ${s.hover}`}
              >
                {/* corner accent */}
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg ${s.iconBg}`}
                >
                  <step.icon />
                </div>
                <span className={`text-sm font-bold tracking-widest ${s.number}`}>
                  {step.number}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Who It's For ────────────────────────────────────────────────── */
const AUDIENCE_STYLES = [
  "from-indigo-500 to-violet-500",
  "from-violet-500 to-purple-500",
  "from-purple-500 to-fuchsia-500",
];

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
    <section className="relative overflow-hidden border-y border-indigo-100/60 bg-white/50 px-6 py-24 backdrop-blur-sm dark:border-indigo-950/60 dark:bg-gray-900/30 sm:py-32">
      {/* subtle accent wash */}
      <div className="pointer-events-none absolute -top-32 right-0 h-64 w-96 rounded-full bg-gradient-to-bl from-violet-300/20 to-transparent blur-3xl dark:from-violet-700/20" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            Who it's for
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for investors who{" "}
            <span className="text-gradient">can't afford to miss</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Top-tier funds staff entire research teams. Scout AI levels the
            playing field.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {audiences.map((a, i) => (
            <div
              key={a.title}
              className="card-lift group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              {/* gradient top accent */}
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${AUDIENCE_STYLES[i]}`}
              />
              <div
                className={`mb-4 h-10 w-10 rounded-xl bg-gradient-to-br ${AUDIENCE_STYLES[i]} opacity-90 shadow-md`}
              />
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
const TIER_ACCENTS = [
  { border: "border-cyan-200 dark:border-cyan-900", header: "from-cyan-500 to-sky-600", check: "text-cyan-500 dark:text-cyan-400", button: "border-cyan-200 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-900 dark:text-cyan-300 dark:hover:bg-cyan-950" },
  { border: "", header: "from-indigo-600 via-violet-600 to-fuchsia-500", check: "text-violet-500 dark:text-violet-400", button: "" },
  { border: "border-purple-200 dark:border-purple-900", header: "from-purple-500 to-fuchsia-600", check: "text-purple-500 dark:text-purple-400", button: "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-900 dark:text-purple-300 dark:hover:bg-purple-950" },
];

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
          <span className="mb-3 inline-block rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Less than a junior analyst's monthly stipend — for 24/7 autonomous coverage.
            No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier, i) => {
            const accent = TIER_ACCENTS[i];
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white dark:bg-gray-950 ${
                  tier.highlight
                    ? "card-gradient-border shadow-xl shadow-violet-500/15 lg:-translate-y-2"
                    : `border-gray-100 shadow-sm dark:border-gray-800 ${accent.border}`
                }`}
              >
                {/* gradient header strip */}
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${accent.header}`}
                />

                {tier.highlight && (
                  <div className="absolute right-4 top-4 z-10">
                    <span className="btn-gradient inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-md">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.53 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.287-3.958z" />
                      </svg>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-8">
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
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${accent.check}`}
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
                        ? "btn-gradient"
                        : `border bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${accent.button}`
                    }`}
                  >
                    Subscribe
                  </a>
                </div>
              </div>
            );
          })}
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
          Get early access to{" "}
          <span className="text-gradient-shimmer">Scout AI</span>
        </h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          We're onboarding a small cohort of investors. Join the waitlist and
          we'll reach out as we roll out access.
        </p>

        {status === "submitted" ? (
          <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-teal-50 p-8 dark:border-emerald-800 dark:from-emerald-950/60 dark:to-teal-950/40">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
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
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-violet-400"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold"
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
    <footer className="border-t border-indigo-100/60 bg-white/40 px-6 py-8 dark:border-indigo-950/60 dark:bg-gray-950/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
        <nav className="flex gap-6">
          <a href="/blog" className="hover:text-gray-600 dark:hover:text-gray-400">
            Blog
          </a>
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
    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
