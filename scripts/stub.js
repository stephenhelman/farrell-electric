#!/usr/bin/env node
/**
 * Runs `next build` / `next start` with every external credential blanked in
 * the process environment, so stub-first (zero-credential) can be verified
 * with one command even when .env holds live values. Next never overrides a
 * variable that is already set — even to "" — so .env cannot refill these.
 *
 * ADMIN_* and NEXTAUTH_* are left intact so portal login still works.
 *
 *   node scripts/stub.js build | start
 */
const { spawnSync } = require("node:child_process");

const BLANKED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SHADOW_DB_URL",
  "GHL_WEBHOOK_URL_LEAD",
  "GHL_WEBHOOK_URL_QUOTE",
  "GHL_WEBHOOK_URL_JOB",
  "GHL_WEBHOOK_SECRET",
  "BLOB_READ_WRITE_TOKEN",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  console.error("Usage: node scripts/stub.js <build|start>");
  process.exit(1);
}

const env = { ...process.env };
for (const name of BLANKED) env[name] = "";

const result = spawnSync("npx", ["next", command, ...process.argv.slice(3)], {
  stdio: "inherit",
  env,
});
process.exit(result.status ?? 1);
