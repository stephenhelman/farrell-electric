# Farrell Electric — Build Sprint

**Project:** Farrell Electric, Inc. marketing site
**Positioning:** Premium Outdoor Lighting — Backed by Electrical Experience Since 1993
**Stack:** Next.js 15 (App Router) · TypeScript · CSS-variable design tokens · local JSON content · Google Sheets lead sink
**Execution model:** One task at a time. Read/summarize before editing. Run `tsc --noEmit` after each task and do not proceed until clean.

---

## 0. Locked architectural decisions (do not re-litigate)

These were decided before this sprint. Build to them exactly.

- **Greenfield.** Fresh Next.js 15 App Router + TypeScript repo. Do not scaffold from or depend on any other codebase.
- **Content lives in local JSON, shaped like Sanity documents.** Components **never** import JSON directly. All content is read through a single typed accessor module (`lib/content/`). v1 implements that interface against local JSON; the interface is what makes a later Sanity port a reimplementation rather than a rewrite. Keep the accessor the only place that knows content comes from JSON.
- **Singletons vs collections.** Singleton content (site settings, homepage sections, page narrative copy, financing, about) lives in `content/copy.json`. Unbounded collections live in their own files: `content/projects.json`, `content/services.json`. Each collection entry has the fields a Sanity document of that type would have, including gate booleans.
- **Images.** Referenced by path string in the content files, stored as local files under `content/` (or `public/`). Rendered via `next/image`. Path-string → asset-ref translation is a future accessor concern, not a component concern.
- **Gate booleans drive rendering.** `isRealProject` on each project gates all claim language and applies representative-image treatment in the gallery. `hasTerms` on the financing doc gates the terms block. Generalize the pattern where it reads cleanly.
- **Lead seam.** A single `submitLead(payload)` function is the only outbound seam for lead data. v1 appends a row to a Google Sheet via a service account (Sheets API, credentials in env). Two tabs: `Lighting Leads` and `Electrical Leads`. Intent is stamped as a field. Swapping to Notion / GHL / a real CRM later is this one function.
- **Notification seam.** A channel-agnostic `Notifier` with `notifyNewLead(lead)`, called by the route handler **separately** from `submitLead` so the two effects fail independently. v1 ships a `LogNotifier` stub that logs intent server-side and no-ops. Real transport (OP email system or otherwise) is one new implementation of the interface, config-selected.
- **Sheet is the source of truth.** Sheet write must land; notification is best-effort. Route handler always returns 200 to the client; a Sheets or Notifier failure never breaks form UX. Idempotent, async-shaped, matching the Hub discipline.
- **`notified` flag.** Each lead row carries a `notified: boolean` column, written `false` by the stub. When real transport goes live, an un-notified sweep can replay the gap. This makes notifications-live a backfill, not a hard cutover.
- **Design language.** Dark charcoal / near-black surfaces, white text, a single blue accent pulled from the Farrell logo. One modern display face + one text face. Full-bleed imagery, restrained motion. All theming via CSS variables. Mobile-first.
- **Mobile action bar.** Persistent Call / Text / Get Estimate bar on mobile (brief calls this out twice).

---

## 1. Content integrity rules (hard constraints from the client)

The agent must honor these and must **stop and flag** rather than invent:

- **Never imply a placeholder is a real, completed Farrell project.** Placeholder projects render in a visually complete gallery but with zero claim language and representative-image treatment. Gate on `isRealProject`.
- **Do not invent** electrical service specifics, voltage ratings, amperage, equipment capabilities, or certifications. Use only the generic capability language in the brief. Leave page architecture ready for verified specifics to be dropped in later.
- **Do not invent financing terms.** No APRs, no "0%", no monthly payments, no promo terms. Financing ships as a gated shell (`hasTerms: false`).
- **Do not invent service areas.** Broward County and Palm Beach County only. `/service-area/[city]` is a template route left ready for later city docs — do not populate cities.
- **Copy source of truth is the client brief** (provided alongside this doc). Transcribe headlines and body copy from the brief into the content files verbatim; do not paraphrase marketing copy.

---

## 2. Content model (JSON document shapes)

Define these as TS types first (`lib/content/types.ts`), then populate the JSON, then build the accessor.

**`copy.json` (singletons):**
- `siteSettings` — phone, textNumber, email, logo path, accent-blue hex, service-area line, nav items, primary/secondary CTA labels.
- `home` — ordered section props: hero (headline, subhead, supporting copy, CTAs, trust line, bg image), the two division cards, landscape overview + its service cards, permanent lighting block + use-case tags, before/after teaser, why-Farrell (4 cards), electrical intro (lower) + its service cards, final CTA.
- `pages` — narrative copy keyed by slug: `landscape-lighting`, `permanent-lighting`, `outdoor-lighting`, `electrical-services`, `residential-electrician`, `commercial-electrician`, `electrical-service-calls`, `about`.
- `financing` — headline, body, CTA, `hasTerms: false`, `terms: null`.

**`projects.json` (collection):**
- `id`, `title`, `category` (enum: landscape / architectural / palms-trees / pathways / pools-patios / permanent / before-after), `image` (path), `beforeImage` + `afterImage` (paths, nullable), `isRealProject: boolean`, `caption` (no claim language when placeholder).

**`services.json` (collection):**
- `id`, `slug`, `name`, `category` (lighting / electrical / commercial), `summary`, `body` (nullable — ready for verified detail), `order`.

---

## 3. Task breakdown

Execute in order. Each task: read first, implement, `tsc --noEmit`, confirm acceptance, stop.

**Task 0 — Scaffold.** Next 15 App Router + TS. Folder structure (`app/`, `components/`, `lib/content/`, `content/`, `public/`). CSS-variable token sheet (colors, type scale, spacing). Root layout, font loading, base metadata. *Accept:* app boots, tokens render, `tsc` clean.

**Task 1 — Content layer.** `types.ts` for every shape above. Populate `copy.json`, `projects.json` (≥8 clearly-flagged placeholder entries spanning all categories, several with before/after pairs), `services.json` (lighting + electrical + commercial from the brief). Build the typed accessor (`getSiteSettings`, `getHome`, `getPage(slug)`, `getProjects({category?})`, `getServices({category?})`, `getFinancing`). *Accept:* accessor returns typed data; no component reads JSON directly; `tsc` clean.

**Task 2 — Primitives + chrome.** Design primitives (Section shell, CTA buttons, card variants). Desktop nav with primary CTA "Get a Free Lighting Estimate" + secondary "Request Electrical Service." Mobile nav + persistent Call/Text/Estimate action bar. Footer. All labels/links from `siteSettings`. *Accept:* nav + footer render responsively from content; mobile bar sticky; `tsc` clean.

**Task 3 — Homepage.** Lighting-first section order per `home`: hero → two division cards → landscape overview + service cards → permanent lighting + use-cases → before/after teaser → why-Farrell → electrical intro (lower) → final CTA. Electrical is a linked destination, not a co-equal section. *Accept:* full homepage renders from content, hierarchy reads lighting-first; `tsc` clean.

**Task 4 — Flagship division pages.** `/landscape-lighting`, `/permanent-lighting`, and `/outdoor-lighting` (SEO umbrella linking to both). Full copy + service cards from content. *Accept:* three routes render from content; `tsc` clean.

**Task 5 — Our Work.** `/our-work`: filterable gallery driven by `projects.json` categories, plus a before/after slider component reading `beforeImage`/`afterImage`. `isRealProject` governs claim language + placeholder treatment. Structured so new projects are pure content additions. *Accept:* filters work, slider works, no placeholder implies a real job; `tsc` clean.

**Task 6 — Electrical tree.** `/electrical-services` hub + `/residential-electrician`, `/commercial-electrician`, `/electrical-service-calls` leaves. Generic capability language only, layout ready for verified specifics. *Accept:* four routes render from content, nothing invented; `tsc` clean.

**Task 7 — About, Financing shell, service-area stub.** `/about` from content. `/financing` renders from the financing doc with `hasTerms` gating the terms block (currently headline + CTA only). `/service-area/[city]` template route wired but unpopulated. *Accept:* financing shows no terms while gated; city route resolves as a template; `tsc` clean.

**Task 8 — Contact flow.** `/contact`: intent selector (Landscape / Permanent / Electrical / Commercial) → one of two form schemas (lighting payload vs electrical payload). Route handler calls `submitLead` (Sheets, correct tab, `notified: false`) then `notifyNewLead` **separately**; independent failure; always-200. Service-account creds + sheet ID in env, never committed. *Accept:* both forms submit, rows land in correct tabs with `notified=false`, a forced Sheets/Notifier error still returns 200 and preserves UX; `tsc` clean.

**Task 9 — SEO.** Per-route metadata + canonicals from content. JSON-LD: `Electrician`/`LocalBusiness` with `areaServed` = Broward + Palm Beach, per-service `Service` entities. `sitemap.xml`, `robots.txt`, OG tags. *Accept:* every route has metadata + valid structured data; sitemap lists all routes; `tsc` clean.

**Task 10 — Motion + responsive polish.** Reveal-on-scroll, slider interaction, hover lifts — restrained. Full responsive audit, mobile action-bar check. Final `tsc --noEmit` + production build. *Accept:* build passes, motion is subtle, mobile CTAs reachable throughout.

---

## 4. Environment / secrets

- `GOOGLE_SERVICE_ACCOUNT_JSON`, `LEADS_SHEET_ID` — env only, never committed. Follow the collect-offline / keep-sensitive-out-of-repo discipline.
- Notifier transport intentionally unconfigured in v1 (stub). Leave a clearly-marked config slot for the future channel.

---

## 5. Out of scope for this sprint (leave seams, don't build)

Sanity migration · real project photos · city/SEO pages · Google Reviews · real financing terms · verified electrical specs · real notification transport · CRM beyond the Sheet.
