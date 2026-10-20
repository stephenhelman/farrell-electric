import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // The SOW renderer reads its fonts from disk at runtime (process.cwd()/lib/app/sow/fonts),
  // which file tracing can't see — without this the font files aren't in the serverless
  // bundle. Server actions are traced with the pages that import them; the SOW runs from
  // createJobAction, reached from the app-portal quote screen.
  //
  // react-pdf is also required from node_modules at runtime (not webpack-bundled), and its
  // pdfkit dependency loads standard-fonts/*.cjs, .afm metrics and fontkit data via dynamic
  // paths the tracer can't follow (prod: MODULE_NOT_FOUND .../pdfkit/js/standard-fonts/Helvetica.cjs).
  // This can only be verified on a real Vercel deploy, not by a local build.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/app-portal/**/*": [
      "./lib/app/sow/fonts/**/*",
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
      "./node_modules/fontkit/**/*",
    ],
  },
};

export default nextConfig;
