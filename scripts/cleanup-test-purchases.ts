import { neon } from "@neondatabase/serverless";

// Remove local webhook-test rows from the purchases table.
const sql = neon(process.env.DATABASE_URL!);
const del = await sql`DELETE FROM purchases WHERE stripe_session_id LIKE 'cs_test_local_%' RETURNING id`;
console.log("deleted test rows:", JSON.stringify(del));
const rows = await sql`SELECT count(*)::int AS n FROM purchases`;
console.log("remaining purchases:", rows[0].n);
