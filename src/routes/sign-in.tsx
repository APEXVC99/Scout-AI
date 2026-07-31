import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-start";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign in to Scout AI
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Welcome back. Sign in to your dashboard.
          </p>
        </div>
        <SignIn
          routing="virtual"
          signUpUrl="/sign-up"
          forceRedirectUrl="/app"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm",
            },
          }}
        />
      </div>
    </div>
  );
}
