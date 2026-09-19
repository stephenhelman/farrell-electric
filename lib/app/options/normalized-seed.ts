/**
 * Task 6 seed options — a handful of packages built directly from atoms in
 * the Task 3 catalog (lib/app/catalog/normalized-seed.ts), referenced by
 * their sourceId the same way CatalogItem does. customerDescription is
 * carried over verbatim from each atom's existing catalog description, per
 * the sprint's instruction not to invent scope-of-work language.
 *
 * defaultUnitPrice and laborPerUnit are deliberately left null — package
 * pricing and labor-per-unit are the owner's numbers to provide, not ours to
 * guess. qtyPerUnit on each component is 1 (one atom per option unit); these
 * are single-atom options, so that's a direct mapping, not invented bundle
 * math. Multi-atom bundle ratios (e.g. "1 transformer per N fixtures") are
 * exactly the kind of contractor math the sprint says not to invent — no
 * such options are seeded here.
 */

export type OptionInputType = "COUNT" | "LINEAR_FT" | "AREA" | "BOOLEAN";

export interface OptionComponentSeed {
  catalogSourceId: number;
  qtyPerUnit: number;
}

export interface OptionSeed {
  /** Stable slug — used as the in-memory id and to match rows on reseed. */
  key: string;
  name: string;
  customerDescription: string;
  inputType: OptionInputType;
  /** TODO(owner): package pricing per unit. Null until provided. */
  defaultUnitPrice: number | null;
  /** TODO(owner): labor cost/time per unit. Null until provided. */
  laborPerUnit: number | null;
  components: OptionComponentSeed[];
}

export const normalizedOptionSeed: OptionSeed[] = [
  {
    key: "front-yard-uplight",
    name: "Front-Yard Uplight (per fixture)",
    customerDescription: "Built in Adjustable Beam Spread 50,000 Hour Warranty on Entire Fixture",
    inputType: "COUNT",
    defaultUnitPrice: null,
    laborPerUnit: null,
    components: [{ catalogSourceId: 50, qtyPerUnit: 1 }],
  },
  {
    key: "pathway-lighting",
    name: "Pathway Lighting (per fixture)",
    customerDescription: "180 degree beam spread\nDirectional pathway lighting",
    inputType: "COUNT",
    defaultUnitPrice: null,
    laborPerUnit: null,
    components: [{ catalogSourceId: 63, qtyPerUnit: 1 }],
  },
  {
    key: "roofline-c9",
    name: "Roofline C9 (per linear ft)",
    customerDescription:
      "Professional-grade C9 LED bulbs custom cut to fit your roofline for a clean, tailored appearance. Installed with commercial-grade wire and clips to ensure all bulbs are perfectly straight and secure. Energy-efficient LEDs use minimal power and produce a warm, classic holiday glow. Installation includes all materials, professional setup, and removal at the end of the season.",
    inputType: "LINEAR_FT",
    defaultUnitPrice: null,
    laborPerUnit: null,
    components: [{ catalogSourceId: 56, qtyPerUnit: 1 }],
  },
  {
    key: "transformer-timer",
    name: "Transformer + Timer",
    customerDescription: "12-22 volt \nLifetime Warranty",
    inputType: "BOOLEAN",
    defaultUnitPrice: null,
    laborPerUnit: null,
    components: [{ catalogSourceId: 42, qtyPerUnit: 1 }],
  },
];
