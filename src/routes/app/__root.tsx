import { createFileRoute, redirect } from "@tanstack/react-router";
import { Outlet, Link } from "@tanstack/react-router";
import { UserButton, useAuth } from "@clerk/tanstack-start";
import { useEffect, useState } from "react";
import { ToastProvider } from "~/components/Toast";
import { getCurrentUser, type Tier } from "./-onboarding-actions";

const TIER_LABELS: Record<Tier, string> = {
  solo: "Solo",
  studio: "Studio",
  firm: "Firm",
};

export const Route = createFileRoute("/app/__root")({
  beforeLoad: async () => {
    // Server-side auth check via createServerFn (runs only on server)
    if (typeof window === "undefined") {
      const { checkAppAuth } = await import("./-auth-guard");
      try {
        const result = await checkAppAuth();
        if (!result.userId) {
          throw redirect({ to: "/sign-in" });
        }
      } catch (err) {
        // If it throws a redirect, re-throw; otherwise let the client handle it
        if (err && typeof err === "object" && "statusCode" in err) throw err;
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const [tier, setTier] = useState<Tier | null>(null);

  // Load the user's plan tier to show in the sidebar
  useEffect(() => {
    if (!isSignedIn) return;
    getCurrentUser()
      .then((u) => setTier(u.tier))
      .catch(() => {});
  }, [isSignedIn]);

  // Check onboarding status on client-side (redirect to onboarding if needed)
  useEffect(() => {
    if (!isSignedIn) return;
    const currentPath = window.location.pathname;
    // Don't redirect if already on the onboarding page
    if (currentPath === "/app/onboarding") return;

    import("./-onboarding-actions")
      .then(({ checkOnboarding }) =>
        checkOnboarding().then((r) => {
          if (!r.onboardingComplete && currentPath !== "/app/onboarding") {
            window.location.href = "/app/onboarding";
          }
        }),
      )
      .catch(() => {});
  }, [isSignedIn]);

  // Navigation items — each has its own accent color for icons/active state
  const navItems = [
    { to: "/app", label: "Dashboard", icon: HomeIcon, color: "text-indigo-600 dark:text-indigo-400", active: "bg-gradient-to-r from-indigo-50 to-transparent text-indigo-700 dark:from-indigo-950 dark:text-indigo-300" },
    { to: "/app/theses", label: "Theses", icon: FileIcon, color: "text-violet-600 dark:text-violet-400", active: "bg-gradient-to-r from-violet-50 to-transparent text-violet-700 dark:from-violet-950 dark:text-violet-300" },
    { to: "/app/companies", label: "Companies", icon: BuildingIcon, color: "text-cyan-600 dark:text-cyan-400", active: "bg-gradient-to-r from-cyan-50 to-transparent text-cyan-700 dark:from-cyan-950 dark:text-cyan-300" },
    { to: "/app/matches", label: "Matches", icon: SparklesIcon, color: "text-fuchsia-600 dark:text-fuchsia-400", active: "bg-gradient-to-r from-fuchsia-50 to-transparent text-fuchsia-700 dark:from-fuchsia-950 dark:text-fuchsia-300" },
    { to: "/app/memos", label: "Memos", icon: DocumentIcon, color: "text-emerald-600 dark:text-emerald-400", active: "bg-gradient-to-r from-emerald-50 to-transparent text-emerald-700 dark:from-emerald-950 dark:text-emerald-300" },
    { to: "/app/pipeline", label: "Pipeline", icon: FunnelIcon, color: "text-sky-600 dark:text-sky-400", active: "bg-gradient-to-r from-sky-50 to-transparent text-sky-700 dark:from-sky-950 dark:text-sky-300" },
    { to: "/app/outreach", label: "Outreach", icon: SendIcon, color: "text-purple-600 dark:text-purple-400", active: "bg-gradient-to-r from-purple-50 to-transparent text-purple-700 dark:from-purple-950 dark:text-purple-300" },
  ];

  // Client-side auth guard: show nothing until Clerk loads,
  // then redirect if not signed in
  if (!isLoaded) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    // Redirect on client side
    window.location.href = "/sign-in";
    return null;
  }

  return (
    <ToastProvider>
      <div className="bg-app flex min-h-screen">
        {/* Sidebar */}
        <aside className="sidebar-gradient fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-indigo-100/70 dark:border-indigo-950">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-indigo-100/70 px-6 dark:border-indigo-950">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Scout AI
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={item.exact ? { exact: true } : undefined}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white"
                    activeProps={{
                      className: `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold border-l-[3px] border-transparent ${item.active}`,
                    }}
                  >
                    <item.icon colorClass={item.color} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Section */}
          <div className="border-t border-indigo-100/70 p-4 dark:border-indigo-950">
            {tier && (
              <a
                href="https://www.getscoutai.app/#pricing"
                className="group mb-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2 transition hover:from-indigo-100 hover:to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 dark:hover:from-indigo-950 dark:hover:to-violet-900"
                aria-label={`View ${TIER_LABELS[tier]} plan pricing`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-[10px] font-bold text-white">
                  {TIER_LABELS[tier][0]}
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {TIER_LABELS[tier]} Plan
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-medium text-indigo-500 transition group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-200">
                    Upgrade plan →
                  </span>
                </span>
              </a>
            )}
            <div className="flex items-center gap-3">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonBox: "flex items-center",
                  },
                }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Account
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

/* ── Nav Icons (accept a color class) ───────────────────────────── */

function HomeIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function FileIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function BuildingIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75-3.75V5.25m0 0V3m0 2.25a2.25 2.25 0 010 4.5m0-4.5a2.25 2.25 0 000 4.5" />
    </svg>
  );
}

function FunnelIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function SparklesIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function DocumentIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SendIcon({ colorClass = "text-gray-500 dark:text-gray-400" }: { colorClass?: string }) {
  return (
    <svg className={`h-4 w-4 ${colorClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}
