/**
 * Content shapes. Mirrors what a future Sanity schema would define per document
 * type — singletons in copy.json, collections in their own files — so a later
 * Sanity port is a reimplementation of the accessor, not a rewrite of callers.
 */

export interface Cta {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteSettings {
  /** Office / display line, e.g. "(954) 484-1400". */
  phone: string;
  /** Direct cell — Call/Text CTAs and the mobile action bar route here. */
  cellPhone: string;
  email: string;
  /** White logo for dark surfaces (header/footer). */
  logoPath: string;
  /** Blue logo for light surfaces. */
  logoPathLight: string;
  accentBlueHex: string;
  serviceAreaLine: string;
  navItems: NavItem[];
  primaryCta: Cta;
  secondaryCta: Cta;
}

export interface DivisionCard {
  id: string;
  title: string;
  body: string;
  image: string;
  cta: Cta;
}

export interface HeroSection {
  headline: string;
  subhead: string;
  supportingCopy: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  trustLine: string;
  bgImage: string;
}

export interface LandscapeOverviewSection {
  headline: string;
  body: string[];
  serviceIds: string[];
  cta: Cta;
}

export interface PermanentLightingSection {
  headline: string;
  body: string[];
  useCaseTags: string[];
  cta: Cta;
}

export interface SoffitLightingBridgeSection {
  headline: string;
  body: string;
  image: string;
  cta: Cta;
}

export interface BeforeAfterTeaserSection {
  headline: string;
  beforeLabel: string;
  afterLabel: string;
  cta: Cta;
}

export interface WhyFarrellCard {
  id: string;
  title: string;
  body: string;
}

export interface WhyFarrellSection {
  headline: string;
  body: string[];
  cards: WhyFarrellCard[];
}

export interface ElectricalIntroSection {
  headline: string;
  body: string[];
  serviceIds: string[];
  cta: Cta;
}

export interface FinalCtaSection {
  headline: string;
  body: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  electricalPrompt: string;
  electricalCta: Cta;
  bgImage: string;
}

export interface Home {
  hero: HeroSection;
  divisionCards: DivisionCard[];
  soffitLightingBridge: SoffitLightingBridgeSection;
  landscapeOverview: LandscapeOverviewSection;
  permanentLighting: PermanentLightingSection;
  beforeAfterTeaser: BeforeAfterTeaserSection;
  whyFarrell: WhyFarrellSection;
  electricalIntro: ElectricalIntroSection;
  finalCta: FinalCtaSection;
}

export type PageSlug =
  | "landscape-lighting"
  | "permanent-lighting"
  | "outdoor-lighting"
  | "electrical-services"
  | "residential-electrician"
  | "commercial-electrician"
  | "electrical-service-calls"
  | "about";

export interface ProcessStep {
  step: number;
  title: string;
  body: string;
}

export interface PageContent {
  slug: PageSlug;
  headline: string;
  body: string[];
  serviceIds: string[];
  /** Flat capability/section labels given without a dedicated descriptive sentence in the brief. */
  sectionLabels: string[];
  /** Short tags/use-cases (e.g. permanent lighting occasions). */
  tags: string[];
  processHeadline: string | null;
  process: ProcessStep[] | null;
  cta: Cta | null;
  secondaryCta: Cta | null;
}

export interface Financing {
  headline: string;
  body: string;
  cta: Cta;
  hasTerms: boolean;
  terms: string | null;
}

export type ProjectCategory =
  | "landscape"
  | "architectural"
  | "palms-trees"
  | "pathways"
  | "pools-patios"
  | "permanent"
  | "before-after";

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  image: string;
  beforeImage: string | null;
  afterImage: string | null;
  isRealProject: boolean;
  caption: string;
}

export type ServiceCategory = "lighting" | "electrical" | "commercial";

export interface Service {
  id: string;
  slug: string;
  name: string;
  category: ServiceCategory;
  summary: string;
  body: string | null;
  order: number;
}

export interface CopyDocument {
  siteSettings: SiteSettings;
  home: Home;
  pages: Record<PageSlug, PageContent>;
  financing: Financing;
}
