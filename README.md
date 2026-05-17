# AgriWatch

A multi-site weather monitoring dashboard for cooperative-farm field agents in Western Europe. Agents track 10+ agricultural sites and make daily go/no-go decisions on sowing, irrigation, spraying and harvest based on weather. AgriWatch consolidates current conditions, multi-day forecasts and a live precipitation radar into a single per-agent view, with the ability to switch between multiple weather providers to cross-check the data before acting on a critical decision.

Submitted as the technical-test deliverable for the Ecorobotix application.

---

## Demo credentials

After running `pnpm bootstrap` (see below), the seed creates one demo user:

| Email | Password |
|---|---|
| `agent@agriwatch.demo` | `agriwatch` |

The seed also adds one sample site (Yverdon-les-Bains, near the Ecorobotix HQ) so the dashboard isn't empty on first login. You can also sign up a fresh account via `/signup`.

---

## Setup

### Prerequisites

- **Docker + Docker Compose** — PostgreSQL runs in a container
- **Node.js 22 LTS** — use `nvm use 22`
- **pnpm 10** — `corepack enable` then `corepack prepare pnpm@latest --activate`

### Run

```bash
git clone <repo> && cd homework_ecorobotix
cp .env.example .env
docker compose up -d                  # PostgreSQL on :5432
pnpm bootstrap                        # install root + shared + api + web,
                                      # migrate the DB, then seed the demo
                                      # user and sample site
pnpm dev                              # web on :5173, api on :3000
```

Open <http://localhost:5173> and sign in with the demo user.

### Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Web (Vite, :5173) + API (Fastify, :3000) in parallel |
| `pnpm build` | Production build of both packages |
| `pnpm test` | Vitest across `shared`, `api`, `web` |
| `pnpm test:e2e` | Playwright (requires `pnpm dev` running, or it spins one up) |
| `pnpm verify` | `typecheck + lint + test` — what to run before every commit |
| `pnpm --filter api db:studio` | Prisma Studio (DB GUI) |
| `pnpm --filter api db:reset` | Wipe + remigrate + reseed (dev only) |

The API exposes its OpenAPI spec at <http://localhost:3000/docs> (Scalar UI).

### Weather sources

Two providers ship — **Open-Meteo** and **Yr.no (Met.no)**, both free and keyless, so the app works end-to-end out of the box. Open-Meteo additionally exposes four numerical models (Best match / ECMWF / ICON / GFS) flattened into the in-app source switcher. Adding a keyed provider (OpenWeatherMap, WeatherAPI, …) is a one-file addition under `api/src/modules/weather/infrastructure/` plus a registry entry in `weather.module.ts` — listed in "What I would add" below.

---

## What's in the repo

```
homework_ecorobotix/
├── web/        # Vite + React 19 + TanStack Router / Query
├── api/        # Fastify 5 + Prisma 6 + Zod
└── shared/     # Zod schemas + types — single source of truth for API contracts
```

`shared` is consumed by both `web` and `api` via `file:../shared`, with Vite/Vitest/tsconfig aliased to read the source directly (no `node_modules` indirection, no build step, no cache-busting after editing a schema).

The backend is organised by **bounded context** (one folder per sub-domain under `api/src/modules/`) following a **DDD-light** layering: `domain` (pure types + errors) → `ports` (interfaces) → `application` (use cases) → `infrastructure` (Prisma / HTTP adapters) → `interface` (Fastify routes). A small `<module>.module.ts` composition root is the only place that wires the adapters into the use cases. Use cases never depend on infrastructure directly — they take their dependencies through ports, which makes the test fakes trivial (`test-fakes.ts` next to each module).

The frontend mirrors the same per-feature folder split (`auth`, `sites`, `weather`, `preferences`) with `api/`, `hooks/`, `components/`, `lib/` sub-folders.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite 6 · React 19 · TypeScript strict · TanStack Router/Query · Tailwind v4 · shadcn/ui · Leaflet + react-leaflet |
| Backend | Node 22 LTS · Fastify 5 · Prisma 6 · Zod · `fastify-type-provider-zod` (OpenAPI auto-gen) |
| Auth | `@fastify/secure-session` (encrypted HTTP-only cookies) + bcrypt |
| Cache | `lru-cache` in-memory (per-provider) + HTTP-aware `If-Modified-Since` for Yr.no |
| DB | PostgreSQL 16 in Docker Compose |
| Tests | Vitest · React Testing Library · Playwright (chromium + mobile-chrome) |
| Tooling | Biome (lint + format) · Husky + lint-staged + commitlint (Conventional Commits enforced) · `tsc --strict` with `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters` |

---

## Notable technical decisions

### Domain vocabulary — "Site", not "Parcel" or "Location"
The brief uses the generic word *location*. I initially modelled the saved entity as **Parcel** (the natural agri term), then dropped both after a quick discussion with an agriculturalist: an agent may have **several parcels at the same location** (one farm, multiple crops), and also parcels at totally different places. A *parcel* is a polygon-shaped land unit; the **monitoring point** for weather is one node above — a **site**. The brief's "track 10+ sites quickly" wording lands on this naming too.

Vocabulary aligned, the search UI also covers the agri reality: **two creation modes in parallel**. (1) text autocomplete via Open-Meteo geocoding for sites near a known place, and (2) a manual lat/lng pair with best-effort reverse geocoding for isolated parcels that no geocoder will resolve. The custom `label` is required either way ("North field — wheat 2026"), so the agent's mental map wins over the geocoder's name. First-time agents land on an empty state with two CTAs — "Search a location" or "Use my current location" (`navigator.geolocation` + reverse-geocode + pre-filled dialog).

### Authentication — credentials over Auth.js
Ecorobotix uses Infomaniak/kSuite, not Google Workspace, so a Google OAuth flow would not work for their internal accounts. Passwordless adds setup friction (SMTP, magic-link UX). Credentials = zero friction for the reviewer. Auth.js v5 is optimised for fullstack frameworks (Next.js); on a separate Fastify backend it requires ~80–120 lines of glue to bridge Web Fetch with Fastify req/reply. `@fastify/secure-session` (Fastify-native, encrypted cookies — no DB session table) gives the same security guarantees in ~10 lines of setup.

### Weather is multi-provider behind a port
The brief calls for "multiple sources" so the agent can cross-check data. The `WeatherProvider` port has two methods that match the UX granularity rather than the upstream taxonomy:

- `getCurrentAndDaily(...)` — single bundle for the dashboard's primary view (one HTTP call upstream, internally-consistent snapshot, one cache entry, one frontend request)
- `getHourly(...)` — on-demand drill-down for a specific date

Open-Meteo additionally exposes a curated set of numerical models (`best_match`, `ECMWF`, `ICON`, `GFS`) which the registry advertises via an optional `models` field. The frontend switcher flattens `(provider, models)` into five entries today.

The agent picks per session — there's no persisted "preferred provider" because the whole point is ad-hoc cross-checking, and the in-section switcher is enough.

### Two cache patterns, picked per provider
- **Generic LRU+TTL decorator** (used for Open-Meteo): keyed by `(coord-rounded-to-4-decimals, days, model)`. 10-min TTL on the bundle, 15-min TTL on hourly. Coordinates are quantised so nearby points share entries.
- **HTTP-aware cache baked into the adapter** (used for Yr.no): Met.no's TOS explicitly require respecting `Last-Modified` and `Expires` — repeated unconditional GETs can get the client blocked. The adapter stores `{ payload, lastModified, expires }` per coord and revalidates with `If-Modified-Since` past the expiry. The generic decorator would defeat this contract, so Yr.no opts out.

The frontend uses TanStack Query as a third cache layer (5-min `staleTime` on forecast, 1 h on the providers list).

### Forecast UI — chip tables, not Recharts
Originally planned with Recharts (multi-series temperature/precip/wind/humidity chart). After agri-context review I pivoted to a transposed daily chip table — days as columns, the four decision-driving metrics as rows. Reasons:
1. Chips on a grid scan faster than a line chart for the typical decision ("can I spray tomorrow morning?")
2. The mobile view stays usable: horizontal scroll happens inside the table only (page scroll stays vertical), so 14+ days fit without eating the screen
3. The same chip language extends naturally to the hourly drill-down

Each metric gets its own hue family with **continuous opacity** scaling on the raw value (no discrete tier buckets visible to the agent): orange for heat / sky-blue for cold (diverging on temp), blue for precip, slate for wind, amber/cyan for humidity (diverging on the dry/humid sides). Precip's "full intensity" threshold is window-aware — 8 mm in 1 h reads as full alert, but spread over 24 h it's moderate. Wind cells embed a small arrow rotated `direction + 180°` — it points **downwind**, i.e. the direction sprayer drift would travel.

### Map — Esri satellite + observed rain radar
- Esri World Imagery (free, no key) instead of OSM tiles so the agent can recognise field boundaries at zoom 14+. Esri's transparent "World Boundaries and Places" overlay carries city / region names.
- **RainViewer** (free, no key) for an animated precipitation radar overlay. The product scope here is intentionally narrow: **past 2 h of observed radar + a 30-min nowcast when available** (10-min granularity). It does not give multi-hour or daily forecast — that's the chip table's job. The agri value of "where has it actually rained on my parcels in the last 2 hours" is real: an agent can see which fields got water and which didn't before deciding to spray or irrigate. A forecast-tile layer covering the next 6–24 h is the natural next step (see "What I would add").
- Animation: every frame is rendered as its own `<TileLayer>` with the inactive ones at `opacity: 0`, so playback is an opacity flip rather than an unmount/refetch flash. Cross-refresh persistence via `localStorage` (15-min TTL) so the radar shows up with the rest of the page on reload.
- The radar is gated on "today" — picking a future day in the daily table hides the overlay (showing past observed rain while the agent reads Wednesday's forecast would mislead).

### Mobile + desktop parity (US7)
Mobile-first Tailwind, validated at 375 / 768 / 1280 px in DevTools mobile mode (no separate physical-device setup needed for the reviewer). The two viewports have different layouts that share the same data hooks:

- **Mobile** — bottom-tab navigation; the map lives in a Vaul drawer (`92dvh`) opened from a "Map" tab, so it's never cropped under a header; the daily chip table scrolls horizontally inside itself while the page scroll stays vertical (no scroll-in-scroll conflict).
- **Desktop** — a sticky 30 / 70 left column hosts the site list (top) and the map (bottom), both pinned while the forecast on the right scrolls with the page. The radar `<TileLayer>` stays mounted-but-hidden when switching off-today, so the RainViewer tile cache survives day toggles instead of re-downloading.

### OpenAPI generated from the same Zod schemas
`fastify-type-provider-zod` + `@fastify/swagger` lets one Zod schema in `shared/` do three jobs at once: HTTP validation on the route, fully-typed handler signature for the dev, and an OpenAPI 3 spec entry served at `/docs` (Scalar UI). Adding an endpoint = writing a Zod schema and a handler; the doc and the types follow for free. The frontend reads the same schemas to parse responses through `.parse()` at the boundary — no hand-rolled DTOs and no drift between client and server expectations.

### Shared package via path aliases, not pre-bundling
The `shared` package is consumed via `file:../shared` but **read directly from source** by every consumer:
- `vite.config.ts` aliases `@agriwatch/shared` to `../shared/src/index.ts`
- Same alias in `vitest.config.ts` (Vitest doesn't inherit the Vite alias)
- Same alias in both `tsconfig.json` paths for IDE + `tsc`
- `dedupe: ["zod"]` everywhere — pnpm hoists a separate `zod` copy per package, so without dedupe `err instanceof ZodError` fails when the schema and the consumer aren't the same physical file

The net effect: adding a new export to `shared/src/` is reflected on the next reload — no `pnpm install`, no `.vite/deps` purge.

### Single-default site + heart toggle (US6)
One site at a time can be marked as default. Clicking the heart on site A while B was default sets A as default and unsets B atomically through a single `PATCH /api/me/preferences`. If the default site is deleted, the FK is `ON DELETE SET NULL` — the preference self-clears and the user must explicitly pick a new default (no silent fallback).

### Two-tap delete instead of a confirm dialog (US4)
Tapping the trash arms the button (it widens to a red "Confirm" Check icon); a click anywhere else cancels (`pointerdown` capture listener on `document`); a second click fires the delete. Picked over `<Dialog>` confirm because it keeps the destructive action one tap away on mobile — no modal, no focus trap, no overlay tap-to-dismiss.

### Repo layout — light monorepo, no pnpm workspaces
Three top-level directories (`web/`, `api/`, `shared/`) with `file:` deps and a root `package.json` exposing the convenience scripts. pnpm workspaces would add an extra layer for marginal benefit at this scale — the three packages are independently installable and the cross-package dev experience is handled by the alias pattern above. Backend stays reusable by any future client (mobile, third-party integration).

### Alternatives considered and rejected
A short list of choices that didn't make it, and why:

- **Next.js** — no SSR/SEO need (app is fully behind login), App Router would add complexity for zero gain. SPA + separate API gives a cleaner front/back boundary and keeps the backend reusable by other clients.
- **Supabase (or any BaaS)** — 3 tables, no realtime, no storage, no edge functions. Supabase oversizes the stack and would force the reviewer through a cloud signup (or a 12-container self-host); the local `docker compose up -d postgres` is the right size for the scope.
- **Redux / Zustand** — server state already lives in TanStack Query, and the client-only state surface is tiny (one temp-unit toggle, one provider selection that's a session-only). Context + URL state covers it. Redux would be the right call if the app grew to manage complex cross-cutting client state.
- **Redis for the MVP cache** — single-instance backend; in-memory LRU is enough. Redis is on the roadmap for the day this runs behind a load balancer.
- **Bun runtime** — evaluated and rejected for predictability: Prisma + a handful of Fastify plugins are battle-tested on Node 22 LTS, and a homework is not the place to find an edge-case incompatibility.
- **Drizzle / raw SQL** — would signal SQL fluency more loudly, but Prisma's productivity (and its schema-driven migration flow) wins for a deadline-bound build with three tables.
- **Recharts on the forecast** — originally planned; pivoted after agri-context review (see *Forecast UI* above).

---

## Tests

Meaningful coverage over checkbox coverage — no coverage threshold enforced.

| Layer | Count | Notable targets |
|---|---|---|
| **API unit + integration** (Vitest) | 148 | Auth flow, sites CRUD with `userId` scoping, weather provider mapping (per-adapter fixtures), cache TTL with real short timers (not fake), Yr.no `If-Modified-Since` 304 path, route → domain error mapping, preferences module |
| **Web unit + RTL** (Vitest + RTL) | 57 | Agri metric thresholds (frost, spray limit, mildew bands), slice aggregation (mean / sum / max / mid-direction + today-only `fromHour` cutoff), temperature unit conversion (C ↔ F), two-tap delete (arm + outside-click cancel + confirm), `SiteRow` heart toggle |
| **E2E** (Playwright, chromium + mobile-chrome) | 2 scenarios × 2 viewports | Signup → add site via geocoding → view forecast → toggle default. Login as seeded user → switch source (Open-Meteo → Yr.no) |

Run any single file:
```bash
pnpm --filter api test src/modules/weather/...
pnpm --filter web test src/modules/.../tests/...
```

---

## What I would add given more time

Roughly in priority order:

1. **Threshold alerts** — push notifications on conditions like "rain > 15 mm/24 h", "wind > 20 km/h during spray window", "humidity > 90 % for 6 h → mildew risk", "frost overnight". Highest-value product addition for the agri context.
2. **Forecast precipitation overlay on the map** — the current RainViewer overlay is observation-only (past 2 h + 30 min nowcast), which is useful for "what just happened to my parcels" but doesn't answer "will it rain here tomorrow morning?" on the map. A custom heatmap layer interpolating Open-Meteo hourly precipitation across a grid of points would close that gap (~1–2 days of work). The keyed paid alternatives (Windy, OpenWeather One Call 3.0) would be faster but blow the free-tier constraint of the MVP.
3. **Weather provider Phase 2** — adapters for Bright Sky (DWD), OpenWeatherMap, WeatherAPI. The infrastructure is ready; each is ~1 file under `infrastructure/`, a registry entry and (for keyed providers) an env-var gate.
4. **Polygon sites** — draw on the satellite map, centroid + area. Currently sites are single GPS points.
5. **Multi-series visual chart** (Recharts) overlaid with the chip table — the chip language wins the typical agri decision, but a chart adds shape/trend reading for power users (peak detection, daily envelope). Originally planned, pivoted away from for the MVP.
6. **Daily humidity mean from Yr.no** — currently `null` for Yr.no's daily entries (requires a circular mean over hourly entries).
7. **Yr.no daily wind dominant direction** — same reason.
8. **Redis** for the backend cache once we run more than one API instance (currently in-memory LRU is single-instance only).
9. **Password reset + email verification + 2FA + rate limiting** on auth.
10. **Soil moisture + UV index in the daily chip table** (currently only in the current-conditions card).
11. **Dark mode** — agents work in daylight so light theme was the right default, but a dark mode would help for early-morning checks.
12. **i18n** — currently English only.
13. **Production deployment** — Render or Railway free tier; `render.yaml` to make the deploy one-click.

---

Built with care. Happy to walk through any decision in depth — the rationales above are the short versions. For the long version (full DDD-light layering rules, palette extraction, phase-by-phase implementation log), see [CLAUDE.md](./CLAUDE.md), the dev-facing companion shipped alongside this README.
