/**
 * Single typed seam onto content. Components never import the JSON files
 * directly — everything flows through these accessors, so swapping the
 * storage backend (e.g. to Sanity) later only means reimplementing this file.
 */
import copyData from "@/content/copy.json";
import projectsData from "@/content/projects.json";
import servicesData from "@/content/services.json";
import type {
  CopyDocument,
  Financing,
  Home,
  PageContent,
  PageSlug,
  Project,
  ProjectCategory,
  Service,
  ServiceCategory,
  SiteSettings,
} from "./types";

const copy = copyData as CopyDocument;
const projects = projectsData as Project[];
const services = servicesData as Service[];

export function getSiteSettings(): SiteSettings {
  return copy.siteSettings;
}

export function getHome(): Home {
  return copy.home;
}

export function getPage(slug: PageSlug): PageContent {
  return copy.pages[slug];
}

export function getFinancing(): Financing {
  return copy.financing;
}

export function getProjects(filter?: { category?: ProjectCategory }): Project[] {
  if (!filter?.category) return projects;
  return projects.filter((project) => project.category === filter.category);
}

export function getServices(filter?: { category?: ServiceCategory }): Service[] {
  const sorted = [...services].sort((a, b) => a.order - b.order);
  if (!filter?.category) return sorted;
  return sorted.filter((service) => service.category === filter.category);
}

export function getServicesByIds(ids: string[]): Service[] {
  const byId = new Map(services.map((service) => [service.id, service]));
  return ids
    .map((id) => byId.get(id))
    .filter((service): service is Service => service !== undefined);
}

export type {
  Cta,
  NavItem,
  SiteSettings,
  Home,
  HeroSection,
  DivisionCard,
  LandscapeOverviewSection,
  PermanentLightingSection,
  BeforeAfterTeaserSection,
  WhyFarrellCard,
  WhyFarrellSection,
  ElectricalIntroSection,
  FinalCtaSection,
  PageContent,
  PageSlug,
  ProcessStep,
  Financing,
  Project,
  ProjectCategory,
  Service,
  ServiceCategory,
} from "./types";
