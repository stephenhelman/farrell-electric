/**
 * Renders a sample Scope-of-Work PDF to .sample/ (gitignored) for visual
 * comparison against the mockup. Representative data only — NOT the real
 * Kaczmarzewski quote.
 *
 * Run (tsx can't load @react-pdf — it forces CJS and a dependency is ESM-only —
 * so bundle to native ESM first):
 *   npx esbuild scripts/sow-sample.mts --bundle --platform=node --format=esm \
 *     --packages=external --jsx=automatic --outfile=.sample/sow-sample.mjs && node .sample/sow-sample.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { renderSowPdf } from "@/lib/app/sow/render";
import { generateScopeOfWork } from "@/lib/app/quotes/scope-of-work";

const lineItems = [
  { name: "Path Lighting Fixtures", description: "Low-voltage brass path lights, warm white LED, installed along walkway and beds.", qty: 12, unitPrice: 89.5 },
  { name: "Specimen Tree Uplighting", description: "Adjustable up-lights with glare shields — canopy and trunk highlighting.", qty: 6, unitPrice: 112.75 },
  { name: "300W Transformer with Photocell & Timer", description: "Stainless multi-tap transformer, astronomical timer, weatherproof enclosure.", qty: 1, unitPrice: 645 },
  { name: "Wire, Connectors & Installation Labor", description: "Direct-burial 12/2 wire, waterproof connectors, trenching, system commissioning and a walkthrough with the homeowner.", qty: 1, unitPrice: 918.94 },
];
const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

async function main() {
  const bytes = await renderSowPdf({
    quote: {
      number: 1042,
      customerName: "Jerome Kaczmarzewski",
      customerAddress: "1234 Palmetto Bay Dr, Tampa, FL 33606",
      lineItems,
      discount: 0,
      subtotal,
      total: subtotal,
      scopeOfWork: generateScopeOfWork(lineItems.map((i) => ({ ...i, description: i.description }))),
    },
    referenceNumber: "1042",
    acceptance: { acceptedByName: "Jerome Kaczmarzewski", acceptedAt: new Date("2026-10-14T19:42:00Z"), source: "customer" },
  });
  mkdirSync(".sample", { recursive: true });
  writeFileSync(".sample/sow-sample.pdf", bytes);
  console.log(`wrote .sample/sow-sample.pdf (${bytes.length} bytes), total ${subtotal.toFixed(2)}, header ${Buffer.from(bytes.slice(0, 5)).toString()}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
