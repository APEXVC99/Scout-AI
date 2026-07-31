import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Last updated: July 30, 2026
        </p>

        <div className="mt-10 space-y-10 text-gray-600 dark:text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              1. Introduction
            </h2>
            <p className="mt-3">
              Scout AI (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed
              to protecting your privacy. This Privacy Policy explains how we collect, use,
              and share information when you use our website, join our waitlist, or
              subscribe to the Scout AI platform (&ldquo;the Service&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              2. Information We Collect
            </h2>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Waitlist Signups
                </h3>
                <p>
                  When you join our waitlist, we collect your email address. We use this
                  solely to notify you about early access availability and product updates
                  related to Scout AI.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Account Registration &amp; Payments
                </h3>
                <p>
                  When you create an account and subscribe, we collect your name, email
                  address, and payment information. Payments are processed securely through
                  Stripe, our third-party payment processor. We do not store your full
                  credit card details on our servers. Stripe&rsquo;s use of your personal
                  data is governed by their{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Usage Analytics
                </h3>
                <p>
                  We use Umami, a privacy-friendly analytics tool, to understand how visitors
                  interact with our site. Umami does not use cookies, does not collect
                  personally identifiable information, and does not track users across sites.
                  All analytics data is anonymized and self-hosted.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Service Usage Data
                </h3>
                <p>
                  When you use the Service, we may collect data about your usage patterns,
                  including features accessed, searches performed, and reports generated.
                  This data helps us improve the Service and your experience.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              3. How We Use Your Information
            </h2>
            <p className="mt-3">We use the information we collect to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications (e.g., waitlist updates, billing notices)</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Analyze usage trends to enhance the product</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              4. Data Sharing and Disclosure
            </h2>
            <p className="mt-3">
              We do <strong>not</strong> sell your personal data to third parties. We may
              share your information only in the following circumstances:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Service providers:</strong> We share data with trusted third parties
                who help us operate the Service (e.g., Stripe for payments, Umami for
                analytics). These providers are contractually bound to use your data only
                as necessary to provide services to us.
              </li>
              <li>
                <strong>Legal compliance:</strong> We may disclose information if required
                by law, regulation, or legal process.
              </li>
              <li>
                <strong>Business transfers:</strong> In the event of a merger, acquisition,
                or sale of assets, your data may be transferred as part of the transaction.
                We will notify you before your data is subject to a different privacy policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              5. Data Retention
            </h2>
            <p className="mt-3">
              We retain your personal information for as long as your account is active or
              as needed to provide the Service. Waitlist emails are retained until you
              unsubscribe or request deletion. We may retain certain data as required by
              law or for legitimate business purposes (e.g., financial records).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              6. Data Security
            </h2>
            <p className="mt-3">
              We implement reasonable technical and organizational measures to protect your
              personal data against unauthorized access, alteration, disclosure, or
              destruction. However, no method of electronic storage or transmission is 100%
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              7. Your Rights
            </h2>
            <p className="mt-3">
              Depending on your jurisdiction, you may have rights regarding your personal
              data, including the right to access, correct, delete, or port your data, and
              the right to object to or restrict certain processing. To exercise these
              rights, contact us at{" "}
              <a
                href="mailto:privacy@getscoutai.app"
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                privacy@getscoutai.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              8. Cookies
            </h2>
            <p className="mt-3">
              Our website does not use tracking cookies. We use Umami for analytics, which
              is cookie-free and privacy-respecting. Any session-related storage is strictly
              necessary for the functioning of the Service (e.g., maintaining your logged-in
              session).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              9. Children&rsquo;s Privacy
            </h2>
            <p className="mt-3">
              The Service is not intended for individuals under the age of 18. We do not
              knowingly collect personal information from children. If we become aware that
              a child has provided us with personal data, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              10. Changes to This Policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email or a notice on our website. Continued use of the
              Service after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              11. Contact
            </h2>
            <p className="mt-3">
              If you have questions or concerns about this Privacy Policy, contact us at{" "}
              <a
                href="mailto:privacy@getscoutai.app"
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                privacy@getscoutai.app
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
