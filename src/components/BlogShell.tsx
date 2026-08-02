import { Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-start";

export function BlogHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100/70 bg-white/80 backdrop-blur-md dark:border-indigo-950 dark:bg-[#0d0826]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
            S
          </span>
          <span className="text-gradient">Scout AI</span>
        </Link>
        <nav className="flex items-center gap-4">
          <a
            href="/#how-it-works"
            className="hidden text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white sm:block"
          >
            How it works
          </a>
          <a
            href="/#pricing"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Pricing
          </a>
          <Link
            to="/blog"
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            Blog
          </Link>
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

export function BlogFooter() {
  return (
    <footer className="border-t border-indigo-100/60 bg-white/40 px-6 py-8 dark:border-indigo-950/60 dark:bg-gray-950/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Scout AI. All rights reserved.</p>
        <nav className="flex gap-6">
          <Link to="/blog" className="hover:text-gray-600 dark:hover:text-gray-400">
            Blog
          </Link>
          <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-400">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-400">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
