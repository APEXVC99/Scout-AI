import { createServerFn } from "@tanstack/react-start";

export const checkAppAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    // Dynamic imports to keep server-only code out of client bundle
    const { getAuth } = await import("@clerk/tanstack-start/server");
    const { getEvent } = await import("vinxi/http");
    try {
      const event = getEvent();
      if (event?.request) {
        const auth = await getAuth(event.request);
        return { userId: auth.userId ?? null };
      }
    } catch {
      // Not in request context
    }
    return { userId: null };
  }
);
