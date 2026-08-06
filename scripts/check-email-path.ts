import { sendEmailImpl } from "../src/routes/api/-email-actions";

// One-time verification that the Resend path (with bcc) works end to end.
// Sends a clearly-labelled TEST email to the owner's own inbox.
const result = await sendEmailImpl({
  to: "hello@getscoutai.app",
  subject: "Scout AI webhook TEST - welcome email template + bcc check",
  body: [
    "TEST ONLY (not a real customer email).",
    "",
    "Welcome to Scout AI!",
    "",
    "You purchased the Solo plan. Here's your next step:",
    "",
    "https://www.getscoutai.app/welcome",
    "",
    "If you received this, the Stripe webhook email path (sendEmailImpl with bcc) works end to end.",
  ].join("\n"),
  bcc: ["hello@getscoutai.app"],
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
