/**
 * Documents and soft-validates every env var this build introduced. This is
 * deliberately NOT a hard-fail/throw-at-import module — the stub-first
 * constraint holds across the whole app (zero credentials must still build
 * and run), so this only ever logs. Nothing here runs at build time; it's
 * called once at request/runtime (see middleware.ts) so operators get a
 * clear signal without risking the build.
 *
 * "required" here means required for one specific feature to function, not
 * required for the app to build or run — every var in this manifest is
 * optional at build time by design.
 */

type EnvVarTier =
  /** Unset means a real, easy-to-miss functionality gap worth flagging. */
  | "advisory"
  /** Unset is a deliberate, documented stub state (Notifier/repo/GHL-client
   * pattern) — never warn about these being unset. */
  | "stub";

interface EnvVarSpec {
  name: string;
  tier: EnvVarTier;
  /** What breaks, in plain language, if this is left unset. */
  whenUnset: string;
}

export const ENV_VARS: EnvVarSpec[] = [
  {
    name: "NEXTAUTH_SECRET",
    tier: "advisory",
    whenUnset: "sign-in will not work — session JWTs can't be signed without it.",
  },
  {
    name: "NEXTAUTH_URL",
    tier: "stub",
    whenUnset: "fine to leave unset — NextAuth v5 with trustHost:true infers it from the request.",
  },
  {
    name: "ADMIN_EMAIL",
    tier: "advisory",
    whenUnset: "no admin user is seeded — set this and ADMIN_PASSWORD_HASH together, then re-run the seed.",
  },
  {
    name: "ADMIN_PASSWORD_HASH",
    tier: "advisory",
    whenUnset: "no admin user is seeded — generate with `npm run hash-password -- '<password>'`.",
  },
  {
    name: "DATABASE_URL",
    tier: "stub",
    whenUnset: "the app runs on the in-memory repo — this is the intended stub-first path, not a gap.",
  },
  {
    name: "DIRECT_URL",
    tier: "stub",
    whenUnset: "only needed alongside DATABASE_URL, for `prisma migrate` — read directly by prisma/schema.prisma.",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    tier: "stub",
    whenUnset: "quote/invoice links default to https://www.farrellelectric.com.",
  },
  {
    name: "NEXT_PUBLIC_APP_HOST",
    tier: "stub",
    whenUnset: "middleware.ts defaults the app host to app.farrellelectric.com (app.localhost:3000 in dev).",
  },
  {
    name: "GOOGLE_SERVICE_ACCOUNT_JSON",
    tier: "stub",
    whenUnset: "lib/leads/submitLead.ts logs leads instead of writing to Sheets.",
  },
  {
    name: "LEADS_SHEET_ID",
    tier: "stub",
    whenUnset: "same as GOOGLE_SERVICE_ACCOUNT_JSON — both are required together for the Sheets write.",
  },
];

/** Pure — computes warnings, never logs or throws itself. */
export function getEnvWarnings(): string[] {
  return ENV_VARS.filter((spec) => spec.tier === "advisory" && !process.env[spec.name]).map(
    (spec) => `[env] ${spec.name} is not set — ${spec.whenUnset}`,
  );
}

let logged = false;

/** Safe to call from anywhere, any number of times — logs at most once per process. */
export function logEnvWarningsOnce(): void {
  if (logged) return;
  logged = true;

  for (const warning of getEnvWarnings()) {
    console.warn(warning);
  }
}
