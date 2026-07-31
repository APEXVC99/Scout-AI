/**
 * Error utilities — extract user-facing messages from various error shapes.
 */

export function userFacingError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object") {
    // Try common error shapes
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.error === "string") return e.error;
    if (typeof e.statusText === "string") return e.statusText;
  }
  return "Something went wrong. Please try again.";
}
