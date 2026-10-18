import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // The SOW renderer reads its fonts from disk at runtime (process.cwd()/lib/app/sow/fonts),
  // which file tracing can't see — without this the font files aren't in the serverless
  // bundle. Server actions are traced with the pages that import them; the SOW runs from
  // createJobAction, reached from the app-portal quote screen.
  outputFileTracingIncludes: {
    "/app-portal/**/*": ["./lib/app/sow/fonts/**/*"],
  },
};

export default nextConfig;
