import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh text-gray-900 antialiased dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="text-lg font-bold tracking-tight">
            Scout AI
          </a>
          <nav className="flex items-center gap-4">
            <a
              href="/#pricing"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Pricing
            </a>
            <a
              href="/#waitlist"
              className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Join waitlist
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Last updated: July 30, 2026
        </p>

        <div className="mt-10 space-y-10 text-gray-600 dark:text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3">
              By accessing or using Scout AI (&ldquo;the Service&rdquo;), operated by Scout AI
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by
              these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              2. Description of Service
            </h2>
            <p className="mt-3">
              Scout AI provides an autonomous AI-powered deal sourcing platform for venture
              capital investors. The Service deploys AI agents that research, track, and
              generate investment deal flow intelligence. We offer monthly subscription
              plans with varying levels of coverage and customization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              3. Accounts and Registration
            </h2>
            <p className="mt-3">
              To access certain features, you must register for an account. You agree to
              provide accurate and complete information during registration and to keep your
              account credentials secure. You are responsible for all activity under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              4. Payments and Billing
            </h2>
            <p className="mt-3">
              Subscription fees are billed monthly in advance via Stripe, our third-party
              payment processor. By subscribing, you authorize us to charge your payment
              method on a recurring basis. All fees are non-refundable except as required by
              law. We may change pricing with 30 days&rsquo; notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              5. Acceptable Use
            </h2>
            <p className="mt-3">
              You agree not to misuse the Service. This includes, but is not limited to:
              violating any applicable laws, infringing intellectual property rights,
              transmitting malware, attempting to gain unauthorized access, or using the
              Service to send unsolicited communications. We reserve the right to suspend or
              terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              6. Intellectual Property
            </h2>
            <p className="mt-3">
              The Service, including its software, algorithms, design, and branding, is
              owned by Scout AI and protected by copyright, trademark, and other intellectual
              property laws. You may not copy, modify, distribute, or reverse-engineer any
              part of the Service without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              7. Disclaimer of Warranties
            </h2>
            <p className="mt-3">
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind,
              either express or implied. We do not guarantee that the Service will be
              uninterrupted, error-free, or that investment opportunities identified by our
              AI agents will result in profitable outcomes. Investment decisions are solely
              your responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              8. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, Scout AI shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from
              your use of the Service. Our total liability shall not exceed the amount you
              paid us in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              9. Termination
            </h2>
            <p className="mt-3">
              You may cancel your subscription at any time. We may suspend or terminate your
              access to the Service for breach of these Terms, with or without notice. Upon
              termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              10. Changes to Terms
            </h2>
            <p className="mt-3">
              We may update these Terms from time to time. Material changes will be
              communicated via email or through the Service. Continued use after changes
              take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              11. Contact
            </h2>
            <p className="mt-3">
              If you have questions about these Terms, contact us at{" "}
              <a
                href="mailto:legal@getscoutai.app"
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                legal@getscoutai.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-8 dark:border-gray-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-600 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Scout AI. All rights reserved.</p>
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
