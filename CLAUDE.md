# AgriWatch — Project Bible

This document is the canonical, exhaustive specification of the AgriWatch project. It contains everything required to build the project from scratch: product context, scope, technical stack, architecture, conventions, constraints, and implementation order.

**Read this in full before writing any code.** When in doubt during development, this file is the source of truth.

---

## 1. Mission

**AgriWatch** is an internal tool for field agents working with cooperative farms in Western Europe. Agents are responsible for many agricultural sites (often 10+) and need to make daily decisions on sowing, irrigation, pesticide application, and harvest based on weather conditions.

Today they waste time consulting multiple weather sources (national meteorological services, generic weather apps, regional sites). AgriWatch consolidates everything into a **single multi-site dashboard** with current conditions, multi-day forecasts, per-agent preferences, and the ability to **switch between multiple weather providers** to cross-check the data — reflecting the real-world habit of comparing sources before acting on critical decisions.

The deliverable is a thoughtful, working prototype that demonstrates:
- End-to-end functionality of the core flow (auth → search site → view forecast → save → set default)
- Code quality a teammate could maintain
- Justified technical choices
- Meaningful tests (not coverage theatre)
- Mobile + desktop parity

---

## 2. Product Scope — User Stories

The brief defines 8 user stories. Each is translated below into a concrete, implementable specification.

### US1. Search for a location and see its current weather conditions
- **Search input** with two modes:
  - **Text search** with autocomplete via Open-Meteo Geocoding API
  - **Direct lat/lng input** (two numeric fields) for sites not matching any geocoder entry. When the user submits coordinates, perform a **reverse geocoding** call (Open-Meteo) to populate `displayName` informatively (best-effort, optional — coordinates remain valid even if reverse geocoding fails).
- On result selection, display a **current weather card** with: temperature, precipitation (last hour + probability), wind (speed + direction), humidity, plus `soil moisture` and `UV index` as low-cost agri-specific bonuses.
- Temperature unit follows the user's preference (Celsius/Fahrenheit). Convert at display time.

### US2. View an upcoming forecast for any given location
- **Daily forecast over 7 days**, displayed as a **transposed table**: days run across as columns, the four decision-driving metrics (**Temperature, Precipitation, Wind, Humidity**) stack as rows. Each cell carries a coloured chip graduated per metric so the agent reads risk by hue — temperature climbs cool-blue → green → amber → red, precipitation slate → cyan → blue → indigo, wind slate → amber → orange → red, humidity dry-amber → green → violet. Thresholds calibrated for agri decisions (frost <0°C, sustained heat >32°C, spray-wind limit at 25 km/h, mildew-friendly humidity >75%).
- Days run as columns to keep horizontal scroll on mobile inside the table (the page keeps scrolling vertically). The sticky first column carries the metric labels (collapsed to icon-only on `< sm`).
- Each day column header shows a weather hint icon (sun / cloud / rain / snowflake) derived from the day's dominant condition. Tapping anywhere in a day's column selects that day for the hourly drill-down below.
- **Drill-down hourly table** appears under a `HourlyHeader` card that centres the selected date with prev/next arrows and a **3 h / 1 h segmented toggle** to flip slice granularity (8 broad windows vs every upstream entry). The hourly table mirrors the daily's chip language. Wind cells carry a small arrow rotated to point downwind (the direction sprayer drift travels).
- A pivot away from the original Recharts multi-series chart plan: chips on a tabular grid scan faster than a line chart for the typical agri decision ("is this day OK to spray?") and degrade better to mobile.
- Forecast is fetched from the **currently selected provider** (see Architecture §7.2).

### US3. Save sites I monitor regularly
- After viewing current weather for a searched location, an action **"Save as site"** is available.
- A **custom label** is required (prompt: "Name this site"). Default suggestion is the geocoded display name; the user typically overrides ("North field — wheat 2026").
- The persisted record includes: `label`, `latitude`, `longitude`, `displayName` (from geocoding), optional `countryCode`, `timezone`, `cropType`.
- Vocabulary: in UI and code, the saved entity is called **`Site`** (not "Location"). Reflects agri domain.

### US4. Remove a saved site
- Each site card has a **delete action** with a confirmation step (modal or destructive button two-tap).
- On delete: cascading cleanup if the site was the user's default (`defaultSiteId` set to `null` — no automatic fallback to another site).

### US5. Set my preferred temperature unit (Celsius/Fahrenheit) and remember it
- Stored in `UserPreferences.temperatureUnit`.
- Settings UI provides a toggle.
- Applies to all temperature displays across the app (forecast cards, chart Y-axis, current conditions, etc.).

### US6. Set a default site that loads automatically when I open the dashboard
- **One site at a time** can be marked as default, indicated by a **heart icon** on the site card (filled when default, empty otherwise).
- Clicking the heart on site A while site B was default sets A as default and unsets B atomically. Show a **toast confirmation** *"Default site updated"* — no modal, friction-free.
- If the default site is deleted, `defaultSiteId` is set to `null`. The user must explicitly set a new default (no automatic fallback).
- On dashboard load:
  - If user has 0 sites: **empty state** with two CTAs: "Search a location" and "Use my current location". The latter uses `navigator.geolocation.getCurrentPosition()` → reverse-geocodes via Open-Meteo → pre-fills the site form with `displayName` and coordinates → the user reviews and edits the custom label → saves.
  - If user has sites, **all are displayed**. If a default is set, it is highlighted (first position + filled heart).

### US7. Access the tool from a phone and a desktop equally well
- **Mobile-first** Tailwind design, tested at 375px / 768px / 1280px viewports.
- Tested via **browser DevTools mobile mode** (no separate physical-device setup required for the reviewer).
- Mobile: bottom-tab navigation (Sites / Search / Settings).
- Desktop: left sidebar (site list) + main content area with multi-column grids where useful.

### US8. Preferences and saved sites tied to my identity, persist across sessions and devices
- **Email + password authentication** via Auth.js Credentials provider (bcrypt-hashed passwords).
- Server-side sessions, secure HTTP-only cookies.
- Sites and preferences scoped per `userId` in PostgreSQL.
- Not stored in localStorage — always server-side, accessible from any device after login.

---

## 3. Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js LTS | 22.x |
| Package manager | pnpm | 10.x |
| Language | TypeScript (strict) | 5.x |
| Frontend framework | Vite + React | Vite 5 / React 19 |
| Routing | TanStack Router | latest |
| Data fetching | TanStack Query | latest |
| UI library | shadcn/ui + Tailwind CSS | Tailwind v4 |
| Backend framework | Fastify | latest |
| ORM | Prisma | latest |
| Database | PostgreSQL (via Docker) | 16-alpine |
| Authentication | `@fastify/secure-session` + bcrypt | latest |
| API documentation | `@fastify/swagger` + `fastify-type-provider-zod` (OpenAPI 3.x) | latest |
| Schema validation | Zod | latest |
| Backend cache | `lru-cache` (in-memory) | latest |
| Map | Leaflet + react-leaflet + OpenStreetMap tiles | latest |
| Tests | Vitest + React Testing Library + Playwright | latest |
| Linter / formatter | Biome | latest |
| Git hooks | Husky + lint-staged + commitlint | latest |

---

## 4. Repository Structure

The API is organised by **bounded context** (one folder under `modules/` per sub-domain) and each module follows a **DDD-light** layered structure: `domain/` (pure business types and errors), `application/` (use cases that orchestrate domain + ports), `ports/` (interfaces describing what the infrastructure must provide), `infrastructure/` (concrete adapters like Prisma, bcrypt, Fastify session), and `interface/` (HTTP routes — the inbound adapter). A small `<module>.module.ts` file is the composition root that wires the adapters into the use cases and registers the routes.

The frontend mirrors the same organisation: feature folders per bounded context (`auth/`, `sites/`, `weather/`, `preferences/`) with sub-folders for `api/`, `hooks/`, `components/`, `pages/`.

```
homework_ecorobotix/
├── web/                                # Frontend
│   ├── src/
│   │   ├── app/                        # App-level setup: TanStack Router config, providers
│   │   ├── modules/                    # Feature modules (mirror api/src/modules)
│   │   │   ├── auth/
│   │   │   │   ├── api/                # fetch wrappers for /api/auth/*
│   │   │   │   ├── hooks/              # useCurrentUser, useLogin, useSignup
│   │   │   │   ├── components/         # LoginForm, SignupForm
│   │   │   │   └── pages/              # /login, /signup screens
│   │   │   ├── sites/                  # CRUD + map + selector + create flow
│   │   │   ├── geocoding/              # Nominatim search + reverse wrappers
│   │   │   ├── weather/
│   │   │   │   ├── api/                # fetch wrappers for /api/weather/*
│   │   │   │   ├── hooks/              # useCurrentAndDaily, useHourly, useProviders
│   │   │   │   ├── lib/                # metric-thresholds, format, slice-hourly
│   │   │   │   └── components/
│   │   │   │       ├── forecast-section.tsx      # orchestrator (state + queries)
│   │   │   │       ├── provider-model-switcher.tsx # shadcn Select, (provider, model) dropdown
│   │   │   │       ├── daily/                    # transposed daily table
│   │   │   │       │   ├── daily-summary-table.tsx
│   │   │   │       │   ├── day-header.tsx
│   │   │   │       │   └── metric-row.tsx
│   │   │   │       ├── hourly/                   # drill-down + day picker + slice toggle
│   │   │   │       │   ├── hourly-table.tsx
│   │   │   │       │   ├── hourly-header.tsx
│   │   │   │       │   ├── hourly-row.tsx
│   │   │   │       │   ├── granularity-toggle.tsx
│   │   │   │       │   ├── granularity-option.tsx
│   │   │   │       │   └── nav-button.tsx
│   │   │   │       └── shared/                   # cross-table primitives
│   │   │   │           ├── chip-cell.tsx
│   │   │   │           ├── column-header.tsx
│   │   │   │           └── wind-arrow.tsx
│   │   │   └── preferences/            # (Phase 5)
│   │   ├── shared/
│   │   │   ├── ui/                     # shadcn primitives (Button, Card, Input, ...)
│   │   │   ├── lib/                    # cn(), formatters, date helpers
│   │   │   └── styles/                 # globals.css with @theme tokens
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json                    # depends on "@agriwatch/shared": "file:../shared"
│
├── api/                                # Backend
│   ├── src/
│   │   ├── modules/                    # Bounded contexts — one folder per sub-domain
│   │   │   └── auth/                   # `auth` bounded context
│   │   │       ├── domain/             # Pure business types, value objects, errors
│   │   │       │   ├── user.ts
│   │   │       │   ├── auth.errors.ts
│   │   │       │   └── tests/          # Unit tests for the domain layer
│   │   │       │       └── user.test.ts
│   │   │       ├── application/        # Use cases (orchestrate domain + ports)
│   │   │       │   ├── signup.usecase.ts
│   │   │       │   ├── login.usecase.ts
│   │   │       │   ├── get-current-user.usecase.ts
│   │   │       │   └── tests/          # Unit tests for the use cases (use the in-memory fakes)
│   │   │       │       ├── signup.usecase.test.ts
│   │   │       │       ├── login.usecase.test.ts
│   │   │       │       └── get-current-user.usecase.test.ts
│   │   │       ├── ports/              # Interfaces — what infrastructure must provide
│   │   │       │   ├── user.repository.ts
│   │   │       │   └── password-hasher.ts
│   │   │       ├── infrastructure/     # Concrete adapters
│   │   │       │   ├── user.repository.prisma.ts
│   │   │       │   ├── password-hasher.bcrypt.ts
│   │   │       │   └── session-store.fastify.ts
│   │   │       ├── interface/          # HTTP adapter (inbound)
│   │   │       │   ├── auth.routes.ts
│   │   │       │   ├── require-auth.middleware.ts
│   │   │       │   └── tests/          # HTTP integration tests via app.inject()
│   │   │       │       ├── test-app.ts          # in-memory Fastify boot with mocked use cases
│   │   │       │       └── auth.routes.test.ts
│   │   │       ├── test-fakes.ts       # Reusable test doubles (in-memory repo, fake hasher)
│   │   │       └── auth.module.ts      # Composition root: wires adapters → use cases → routes
│   │   │
│   │   │   # The other bounded contexts follow the same DDD-light layering.
│   │   │   # `weather/` is a representative example of a slightly richer module:
│   │   │   #
│   │   │   #   weather/
│   │   │   #     domain/weather.errors.ts            # WeatherProviderNotAvailable / FetchFailed / ModelNotAvailable
│   │   │   #     ports/
│   │   │   #       weather-provider.ts                # the WeatherProvider port (2 methods + options bag)
│   │   │   #     application/
│   │   │   #       resolve-provider.ts                # resolve provider id + assert model is available
│   │   │   #       get-current-and-daily.usecase.ts
│   │   │   #       get-hourly.usecase.ts
│   │   │   #       list-providers.usecase.ts
│   │   │   #     infrastructure/
│   │   │   #       open-meteo.provider.ts             # adapter, fetch injected
│   │   │   #       yr-no.provider.ts                  # adapter with its own HTTP-aware cache
│   │   │   #       cached-provider.ts                 # generic LRU+TTL decorator (used for open-meteo only)
│   │   │   #     interface/weather.routes.ts          # GET /weather, /weather/hourly, /weather/providers
│   │   │   #     test-fakes.ts                        # fake provider, fixtures
│   │   │   #     weather.module.ts
│   │   ├── shared/                     # Cross-cutting infrastructure
│   │   │   └── db/
│   │   │       └── prisma.client.ts    # Prisma singleton
│   │   ├── config/
│   │   │   └── env.ts                  # Zod-validated env vars
│   │   └── server.ts                   # Bootstrap (registers each module)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── package.json
│
├── shared/                             # Shared Zod schemas + types (API contracts)
│   ├── src/
│   │   ├── auth.schema.ts
│   │   ├── site.schema.ts            # (Phase 2)
│   │   ├── weather.types.ts            # (Phase 3)
│   │   ├── preferences.schema.ts       # (Phase 5)
│   │   └── index.ts
│   └── package.json                    # name: "@agriwatch/shared"
│
├── docker-compose.yml                  # postgres only
├── .env.example
├── .gitignore                          # must ignore sujet.md, points_restants.md, .env, node_modules, build artefacts
├── biome.json                          # root linter/formatter config
├── tsconfig.base.json                  # shared TS strict config
├── package.json                        # root scripts (setup, dev, build, ...)
├── README.md                           # deliverable for reviewer
└── CLAUDE.md                           # this file (shipped, dev-facing)
```

**DDD-light rules for new modules**:
- One folder per **bounded context** under `modules/`. Never mix two domains in the same folder.
- Use cases (`application/`) **never import** from `infrastructure/` directly. They depend only on **ports** (`ports/`).
- The **composition root** (`<module>.module.ts`) is the only place that instantiates infrastructure adapters and injects them into use cases.
- HTTP handlers (`interface/`) are **thin translators**: parse request, call use case, map result or domain error to HTTP. No business logic.
- Cross-cutting concerns (the Prisma client, error mappers) go under `src/shared/`, never inside a module.
- **Tests** live in a `tests/` subfolder next to their source (`domain/tests/`, `application/tests/`, `interface/tests/`). Shared test doubles (in-memory repositories, fake hashers) sit at the module root in `test-fakes.ts`.

**Important**: `sujet.md` and `points_restants.md` are internal working notes (French) and must be added to `.gitignore`. Do not commit them.

---

## 5. Local Setup

The reviewer should be able to clone and run with these commands:

```bash
git clone <repo> && cd homework_ecorobotix
cp .env.example .env
docker compose up -d              # PostgreSQL
pnpm run setup                    # install all + db:migrate + db:seed
pnpm dev                          # runs web + api in parallel
```

Then opens `http://localhost:5173`. A demo user is seeded (credentials documented in the README).

**Prerequisites for the reviewer**:
- Docker + Docker Compose
- Node.js 22 LTS (via `nvm use 22`)
- pnpm 10 (`corepack enable`)

**Vite proxy**: configured so the frontend calls `/api/*` and Vite forwards to `http://localhost:3000`. No CORS, no need to expose API URLs in the frontend env.

---

## 6. Implementation Plan

Build the project in this order. Do not skip ahead; each phase relies on the previous one being clean.

### Phase 0 — Scaffolding
1. Initialize `package.json` at root with workspaces-light setup (root scripts only; no pnpm workspaces).
2. Create `web/`, `api/`, `shared/` directories with their own `package.json`.
3. Set up `tsconfig.base.json` (strict + extras — see §10) and per-package `tsconfig.json` extending it.
4. Configure `biome.json` at root.
5. Install Husky + lint-staged + commitlint, wire up pre-commit hook.
6. Create `.env.example`, `.gitignore` (including `sujet.md`, `points_restants.md`).
7. Set up `docker-compose.yml` with PostgreSQL 16-alpine.
8. Scaffold Vite + React + TS in `web/`; install Tailwind v4 + shadcn/ui initial setup; configure path aliases.
9. Scaffold Fastify + TS in `api/`; install Prisma, Auth.js, Zod, OpenAPI plugins.
10. Add the `shared/` package with a single `index.ts` export.
11. Commit baseline: `chore: scaffold project structure`.

### Phase 1 — Database + Auth
1. Define Prisma schema for `User`, `Site`, `UserPreferences` (see §8).
2. Run first migration; verify Prisma Client generates.
3. Implement `api/src/auth/`: register `@fastify/secure-session` plugin, bcrypt password hashing/verification helpers, session typing on the Fastify request.
4. Implement signup + login endpoints with Zod-validated bodies (schemas in `shared/`).
5. Seed a demo user (`agent@agriwatch.demo` / `agriwatch`) and one sample site.
6. Build minimal login + signup UI in `web/`. TanStack Router with auth-protected routes (`beforeLoad` guard).
7. Test the auth flow end-to-end manually.
8. Commit: `feat(auth): credentials authentication + protected routes`.

### Phase 2 — Site CRUD + Geocoding
1. Define `siteCreateSchema`, `siteUpdateSchema` in `shared/`.
2. Implement Fastify routes: `POST/GET/PATCH/DELETE /api/sites` (Zod-validated, scoped to `userId`).
3. Build a thin Open-Meteo geocoding wrapper (no provider abstraction yet — just used for search).
4. Build search UI in `web/`: text input with autocomplete + lat/lng manual mode.
5. Build site list view with create / edit / delete affordances.
6. Add the heart toggle for default site (US6).
7. Empty state for users with 0 sites (Search + Use my location CTAs).
8. Tests: Zod validation, label uniqueness per user, default toggle atomicity.
9. Commit: `feat(sites): CRUD + default management`.

### Phase 3 — Weather Provider Architecture + P1
1. Define the `WeatherProvider` port in `api/src/modules/weather/ports/weather-provider.ts` (see §7.2). Two methods, matching the UX granularity rather than the upstream data taxonomy:
   - `getCurrentAndDaily(lat, lng, days, opts?)` returns a `{ current, daily }` bundle — the dashboard's primary view, one HTTP call upstream, one cache entry, one frontend request.
   - `getHourly(lat, lng, isoDate, opts?)` returns the day's hourly array for the on-demand drill-down.
   - Optional `models?: ReadonlyArray<{ id, displayName }>` for providers that let callers pick a numerical model (Open-Meteo); `opts.model` flows from the route query to the upstream call.
2. Define unified types in `shared/src/weather.types.ts`: `CurrentWeather`, `DailyForecast`, `HourlyForecast`, `CurrentAndDaily`, `WeatherProviderInfo` (with optional `models`), query schemas.
3. Implement `open-meteo.provider.ts` adapter (one HTTP call combines `current=...&hourly=...&daily=...`; piggy-backs `relative_humidity_2m` in hourly so daily can aggregate a humidity mean — Open-Meteo's daily endpoint has none). Exposes a curated `OPEN_METEO_MODELS` list (`best_match` / `ecmwf_ifs025` / `icon_seamless` / `gfs_global`).
4. Implement `yr-no.provider.ts` adapter (Met.no Locationforecast 2.0). Required User-Agent header per their TOS. Single upstream payload; bundle + hourly slice the same cached response.
5. Caching:
   - `cached-provider.ts` decorator — generic LRU+TTL keyed by `(coord, days, model)` for the bundle and `(coord, date, model)` for hourly. Used for Open-Meteo (no native HTTP cache contract).
   - Yr.no owns its cache inside its adapter — `If-Modified-Since` revalidation with `Last-Modified` / `Expires` headers, as required by their TOS. Wrapping with the generic decorator would defeat the conditional-GET contract.
6. Use cases (`application/`):
   - `resolveProvider(registry, prefsReader, userId, requestedId)` — priority: `?provider=` → user preference → `open-meteo` fallback. Raises `WeatherProviderNotAvailable` (→ 404) if nothing valid resolves.
   - `assertModelAvailable(provider, modelId)` — raises `WeatherProviderModelNotAvailable` (→ 400) on unknown models, or any model when the provider doesn't support multi-model.
   - `getCurrentAndDaily`, `getHourly`, `listProviders` orchestrate the above.
7. Implement Fastify routes (all behind `requireAuth`):
   - `GET /api/weather?lat&lng&days?&provider?&model?` → `{ current, daily }`
   - `GET /api/weather/hourly?lat&lng&date&provider?&model?` → `HourlyForecast[]`
   - `GET /api/weather/providers` → `WeatherProviderInfo[]` (with `models` flattened by the frontend switcher into 5 entries: 4 Open-Meteo models + Yr.no).
8. `@fastify/swagger` + `fastify-type-provider-zod` were already wired in Phase 0; the new routes auto-document at `/docs`.
10. Tests: cache hit/miss/expiry (real short TTLs, not fake timers), per-adapter mapping with representative fixtures, model validation, HTTP-aware revalidation (304 path), route mapping for the domain errors. ~75 weather tests on top of the existing API tests.
11. Commits split into 3.A skeleton+cache → 3.B Open-Meteo → 3.C use cases+routes+module (+ shared `test-app` helper for the integration tests) → 3.D Yr.no → 3.E multi-models.

### Phase 4 — Forecast UI (chip tables, not Recharts)
1. **Web API client + hooks** (`api/weather.api.ts`, `useCurrentAndDaily`, `useHourly`, `useProviders`) — thin wrappers parsing through the shared Zod schemas at the boundary.
2. **`DailySummaryTable` — transposed**: days run across as columns, the four metrics stack as rows. Each cell carries a coloured chip with a graduated background per metric (`metric-thresholds.ts` owns the tier scale + Tailwind class matrix). On mobile, horizontal scroll happens on the table only; the sticky first column keeps the metric labels visible. The day-column header shows a weather hint icon (sun / cloud / rain / snowflake) coloured to match the dominant condition. Tapping anywhere in a column selects that day for the hourly drill-down; on selection, the wrapper scrolls only `scrollLeft` to bring the column into view (never the page's vertical scroll, which would snap mobile users back to the top).
3. **`HourlyHeader`** card between the two tables. 3-column grid: prev-day arrow flush left, selected date centred, then a `[3h | 1h]` granularity toggle + next-day arrow flush right. Lets the agent navigate days without scrolling back to the daily.
4. **`HourlyTable`** — same chip language as the daily. Slices computed by `slice-hourly.ts` (3 h = 8 windows / 1 h = 24 rows). Wind cells include a small `WindArrow` rotated `direction + 180°` so the arrow points downwind (sprayer drift direction). `temperature` mean, `precipitation` sum, `wind` max, `humidity` mean per slice; wind direction snapped to the slice midpoint.
5. **`ForecastSection`** orchestrator: owns `selectedDate` + `sliceHours` state, auto-pins the first available day on load so the hourly is never empty, plumbs the queries.
6. **Tabular chip UI rather than Recharts**: pivoted after agri-context review — chips on a grid scan faster than a multi-series line chart for the typical decision ("can I spray tomorrow morning?") and degrade better on mobile. Recharts dependency removed from the stack.
7. **Per-file split** (`daily/`, `hourly/`, `shared/` subfolders under `components/`) so the project's "1 component per file" rule applies cleanly: `ChipCell`, `ColumnHeader`, `WindArrow` are shared between the two tables instead of duplicated.
8. **Provider + model switcher** (`provider-model-switcher.tsx`, shadcn `Select` primitive) lives **inside `ForecastSection`**, placed between the site selector and the daily table. Reads `/api/weather/providers` via `useProviders()` and flattens the `(provider, models)` tree into a single grouped dropdown (5 entries today — `Open-Meteo · Best match / · ECMWF / · ICON / · GFS`, then `Yr.no`). The `(providerId, model)` selection state lives on `ForecastSection` so it **persists across site switches** (the component is mounted without a `key`, React reuses the instance) — matches the agent's expectation that picking "ECMWF" once applies to the next site too. Switching refetches via TanStack Query invalidation (query keys include `providerId` and `model`). Selection auto-pins to the first available entry on first providers load so the trigger never shows a blank placeholder while data is already on screen.
9. **Temperature unit conversion at display time** (read `UserPreferences.temperatureUnit`) — wired in Phase 5 when the preferences module lands; until then defaults to Celsius.
10. **Leaflet map view** — already built in Phase 2 (`SitesMap` + `MobileMapDrawer`). Stays unchanged here.
11. Tests (Phase 4.F): unit conversion, chip tier resolution, slice aggregation edge cases, provider switcher render with N entries.
12. Commits: 4.A hooks → 4.B daily v1 → 4.C hourly + transposed daily + slice toggle + per-file split → 4.D provider switcher → 4.E polish → 4.F RTL tests.

### Phase 5 — Preferences + US4/US6 UI
1. `preferences` bounded context backend: `GET /api/me/preferences` + `PATCH /api/me/preferences` returning `{ temperatureUnit, defaultSiteId }`. Site-ownership read port validates the optional `defaultSiteId` before write (→ 400 instead of leaking a Prisma FK error). DDD-light: domain errors, ports, application use cases, Prisma adapters, fakes, tests (~17 tests).
2. Frontend hooks: `usePreferences()` (TanStack Query, 10-min staleTime) + `useUpdatePreferencesMutation()` (optimistic merge on the cached blob, restore-on-error).
3. US4 (delete site) + US6 (default site) wired on the SiteRow: three sibling controls (select / heart toggle / two-tap delete). Heart is filled when the row matches `defaultSiteId`; click toggles to `null` or this site. Delete button is icon-only — first click arms (Check icon, red fill), outside-click cancels, second click deletes.
4. Dashboard auto-loads the default site on first selection (`selectedSiteId === null`); once the user picks explicitly, preference changes don't hijack the view.
5. US5 (temperature unit): segmented `°C / °F` toggle next to the in-section provider switcher. `useTemperatureUnit()` hook returns `{ unit, symbol, formatTemp, formatTempRange }` — daily and hourly tables consume it directly so flipping units re-renders every temperature without a refetch.
6. The provider preference deliberately stays per-session via the in-section switcher only — no persisted `preferredProvider`, no UI for it. Cross-checking providers is the core feature, not a setting.
7. Commits: 5.A backend → 5.B US4/US6 UI → 5.C temp unit toggle.

### Phase 6 — Tests + Polish
1. Add Playwright with 2 happy-path E2E scenarios (see §11).
2. Loading states, empty states, error states across all flows.
3. Accessibility pass: keyboard navigation, alt text, ARIA labels on icons (heart, map, etc.).
4. Responsive QA at 375px / 768px / 1280px in DevTools.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` — all green.
6. Commit: `test: e2e happy paths` + `chore: polish and a11y pass`.

### Phase 7 — README
Write the README in English (recruiter-facing). Sections:
- What is AgriWatch (1 paragraph product mission)
- Demo credentials (seeded user)
- Setup (4 commands)
- Architecture overview + diagram if useful
- Technical choices with justifications (each major decision: stack, auth, multi-provider, no Supabase, etc.)
- Tests
- What I would add given more time (the "Out of MVP scope" list from §14)
- Optional API keys for additional providers (OpenWeatherMap, WeatherAPI)

Commit: `docs: README with setup, architecture decisions, future improvements`.

### Phase 8 (Stretch) — Provider P2 + Deployment (only if P0-P7 are done)
1. Implement `bright-sky.ts` adapter (DWD MOSMIX via Bright Sky's JSON API, no key needed).
2. Implement `openweathermap.ts` adapter (API key optional via `OPENWEATHERMAP_API_KEY` env var).
3. Implement `weatherapi.ts` adapter (API key optional via `WEATHERAPI_KEY` env var).
4. Verify the frontend switcher hides providers whose key is absent.
5. Optional: deploy to Render (free tier Postgres + Web Service); write `render.yaml`; document the public URL in the README.
6. Commits: one per provider, one for deployment.

---

## 7. Architecture & Key Concepts

### 7.1 Shared Zod schemas — single source of truth
All API contracts (request bodies, response shapes, query params) live as **Zod schemas in `shared/src/`**. The backend uses them for input validation; the frontend uses them for form validation and response parsing. **Types are inferred** from schemas — never duplicated.

```ts
// shared/src/site.schema.ts
import { z } from "zod"

export const siteCreateSchema = z.object({
  label: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  displayName: z.string().optional(),
  cropType: z.string().optional(),
})

export type SiteCreate = z.infer<typeof siteCreateSchema>
```

### 7.2 WeatherProvider pattern — multi-source + multi-model abstraction
The weather layer is built around a port whose method shape matches the **UX granularity**, not the upstream data taxonomy. Two methods, one bundle + one drill-down:

```ts
// api/src/modules/weather/ports/weather-provider.ts
export type WeatherProviderCallOptions = Readonly<{ model?: string }>;

export interface WeatherProvider {
  readonly id: WeatherProviderId;          // "open-meteo" | "yr-no"
  readonly displayName: string;
  readonly requiresApiKey: boolean;
  readonly models?: ReadonlyArray<WeatherProviderModel>;  // optional — providers without
                                                          // multi-model support omit it
  isAvailable(): boolean;

  getCurrentAndDaily(
    latitude: number,
    longitude: number,
    days: number,
    opts?: WeatherProviderCallOptions,
  ): Promise<CurrentAndDaily>;

  getHourly(
    latitude: number,
    longitude: number,
    isoDate: string,
    opts?: WeatherProviderCallOptions,
  ): Promise<HourlyForecast[]>;

  getGeocoding?(query: string): Promise<GeocodingResult[]>;
}
```

Each implementation maps its raw API response to the **unified types** in `shared/src/weather.types.ts`. The bundle method matters: it means one upstream HTTP call per dashboard view, one cache entry, one frontend request, and an internally-consistent snapshot (you never see a `current` from t0 paired with a `daily` from t0+5min).

**Multi-model** (Open-Meteo): adapters that expose `models` advertise a curated list of numerical models (Open-Meteo: `best_match`, `ecmwf_ifs025`, `icon_seamless`, `gfs_global`). The `opts.model` flows from the route query into the upstream call. The use case rejects unknown models AND any model on providers that don't support multi-model — asking Yr.no for `ecmwf_ifs025` is a client mistake, not a silent no-op (→ HTTP 400).

**Provider availability** is determined at startup by reading env vars (for keyed providers). Exposed via `GET /api/weather/providers`. The frontend switcher **hides** providers whose key is absent — not greys them out, to avoid frustration for users who cannot obtain a key. The switcher flattens the `(provider, models)` tuples into a single dropdown (5 entries today: 4 Open-Meteo models + Yr.no).

**Switch behavior is per-request, one at a time** — no consensus/averaging across providers. The agent sees the raw output of the selected source.

### 7.3 Caching strategy
Two patterns coexist, picked per provider depending on what the upstream contract supports.

**Generic `createCachedProvider` decorator** (used for Open-Meteo). LRU+TTL, no HTTP revalidation:
- Two buckets keyed by:
  - bundle: `(coord, days, model)` — TTL 10 min (gated by the freshness of `current`; daily would tolerate longer but bundling forces the shorter)
  - hourly: `(coord, date, model)` — TTL 15 min
- Coordinates rounded to 4 decimals (~11 m) so callers querying near-identical points share entries.
- Bounded eviction (LRUCache `max: 500` per bucket).
- `model` is part of the key so different (provider, model) tuples don't collide.

**HTTP-aware cache (Yr.no, baked into the adapter)**. Met.no's TOS *require* respecting `Last-Modified` + `Expires` — repeated unconditional GETs can get the client blocked, so the decorator approach above would defeat the contract.
- `LRUCache<coord, { payload, lastModified, expires }>`
- Fresh reads while `expires > now` skip the network entirely.
- Past `Expires` the adapter revalidates with `If-Modified-Since: <lastModified>`. A 304 keeps the cached payload and extends the expiry; a 200 replaces it.
- Single payload per coord because Yr.no returns the whole timeseries (current + multi-day + hourly) in one fetch — `getCurrentAndDaily` and `getHourly` slice the same cached response.
- Safety-net 15-min TTL if upstream omits `Expires`.

**Frontend cache**: TanStack Query, stale-while-revalidate, query keys include `providerId` + `model` so switcher changes invalidate cleanly. `staleTime` ≈ 5 min on forecast data (mirrors the upstream cache TTL), 1 h on the providers list (essentially static at runtime).

### 7.4 Authentication flow
- **Email + password** credentials, validated via Zod schemas in `shared/`
- Passwords hashed with **bcrypt** (work factor 12)
- Sessions: **encrypted HTTP-only cookies** via `@fastify/secure-session` (Fastify's first-party plugin) — stateless, no DB `Session` table needed; the session payload is encrypted in the cookie itself with `SESSION_SECRET`
- Endpoints (all under `/api/auth`):
  - `POST /signup` — create user, hash password, set session cookie
  - `POST /login` — verify password, set session cookie
  - `POST /logout` — clear session cookie
  - `GET /me` — return the current user (or 401 if no valid session)
- Frontend route guards via TanStack Router `beforeLoad` (redirect to `/login` if `/api/auth/me` returns 401)

**Why `@fastify/secure-session` over Auth.js**: Auth.js v5 is optimized for fullstack frameworks (Next.js, SvelteKit). On a separate Fastify backend it requires ~80-120 lines of glue code to bridge Web Fetch API with Fastify req/reply. `@fastify/secure-session` is the idiomatic Fastify-native equivalent: same security guarantees (HTTP-only, encrypted, sliding expiry), 10 lines of setup, no DB session table. The README documents this trade-off.

### 7.5 API contract — Fastify + Zod + OpenAPI
- Every route validates input with a Zod schema from `shared/`
- `fastify-type-provider-zod` infers TS types from the schemas — fully typed handlers, no manual annotations
- `@fastify/swagger` auto-generates OpenAPI 3.x spec from the registered schemas
- Swagger UI served at `/docs` for interactive API exploration

**Adding an endpoint = writing a Zod schema + a handler.** Docs and types update automatically.

---

## 8. Database Schema

```prisma
// api/prisma/schema.prisma

model User {
  id           String           @id @default(cuid())
  email        String           @unique
  passwordHash String
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  sites      Site[]
  preferences  UserPreferences?
}

model Site {
  id          String   @id @default(cuid())
  userId      String
  label       String                // user-chosen ("North field — wheat 2026")
  displayName String?               // from geocoding, informational
  latitude    Float
  longitude   Float
  countryCode String?
  timezone    String?
  cropType    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, label])
  @@index([userId])
}

model UserPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  temperatureUnit String   @default("celsius")        // "celsius" | "fahrenheit"
  defaultSiteId   String?                              // nullable, no auto-fallback on delete
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultSite     Site?    @relation(fields: [defaultSiteId], references: [id], onDelete: SetNull)
}

```

**Constraints**:
- `Site.label` unique per user — an agent cannot have two sites with the same custom name
- `UserPreferences.defaultSiteId` is nullable; when the referenced site is deleted, this field is set to `null` (no auto-fallback)
- Cascade deletes propagate from `User`

---

## 9. UI Design System

### Palette (extracted from the official Ecorobotix logo SVG)
```css
/* Brand */
--primary         : #4DC270   /* Ecorobotix green */
--primary-hover   : #3DA859
--primary-light   : #E5F4EA
--dark-navy       : #0D2743   /* Ecorobotix navy */

/* Neutrals */
--background      : #FFFFFF
--surface         : #FFFFFF
--surface-alt     : #F8FAFC
--border-subtle   : #E5E7EB
--text-primary    : #0D2743   /* re-uses brand navy */
--text-secondary  : #6B7280
--text-muted      : #9CA3AF

/* Semantic */
--success         : #4DC270
--warning         : #D97706   /* used for: high wind, frost, humidity-risk warnings */
--danger          : #B91C1C
--info            : #2563EB   /* precipitation, neutral weather info */
```

Wire these as CSS variables in `web/src/styles/tokens.css`, then map to Tailwind v4 `@theme` block.

### Typography
- **Inter** — body text, headings, all UI text
- **JetBrains Mono** — numeric values (temperatures, mm of rain, wind speeds) for vertical digit alignment

Load via Google Fonts in `index.html` or via Fontsource. Set `font-feature-settings: "tnum"` for tabular numbers on the mono font.

### Responsive breakpoints
- Mobile-first Tailwind (default scale, then `md:`, `lg:`)
- Test at 375px (mobile), 768px (tablet), 1280px (desktop)
- Mobile: bottom-tab navigation
- Desktop: left sidebar + main content area

### Key UI patterns
- **Site card**: icon + label + current temp/precip snapshot + heart toggle + delete affordance
- **Transposed daily chip table** (Phase 4): days in columns, metrics in rows, every cell a colour-graded chip. Sticky first column for metric labels; horizontal scroll on the table only (page scroll stays vertical on mobile). Day column is selectable as a whole, not just its header. Wind cells embed a small arrow rotated to point downwind.
- **Hourly drill-down** under a header card: prev/next day arrows + slice granularity toggle (3 h / 1 h) inline with the centred date label. Same chip language as the daily.
- **Hero header**: dark-navy band with title + back button + provider switcher dropdown on site detail
- **Empty state**: centered illustration / icon + two CTAs (Search / Use my location)

### Light mode only
No dark mode in MVP. Agents work in daylight; light theme is the right default. Listed in §14 as a future improvement.

---

## 10. Code Conventions

### TypeScript (`tsconfig.base.json`)
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Naming
- Files: `kebab-case.ts`
- React components: `PascalCase`
- Functions, variables: `camelCase`
- Types, interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` only for compile-time constants
- Zod schemas: suffix with `Schema` (e.g. `siteCreateSchema`)
- Inferred types from Zod: re-export with the plain noun (no `I` prefix)

### File organization
- One React component per file (exception: tiny presentational subcomponents inside the parent file)
- Feature-scoped folders in `web/src/features/<feature>/`: `components/`, `hooks/`, `api.ts`, `types.ts`
- Backend route plugins in `api/src/routes/<resource>.ts`, register via Fastify's plugin system
- Shared Zod schemas in `shared/src/<domain>.schema.ts`; types inferred from schemas, exported alongside

### Comments
- **Default: no comment.** Code with good names is self-documenting.
- Write a comment only when the **why** is non-obvious: a hidden constraint, a workaround, surprising behavior.
- Never explain **what** the code does — names should cover that.

### Imports
- Path aliases: `@/` for the local package (`web/src/` or `api/src/`), `@shared` for the shared package
- Group: external libs → `@shared` → local aliases → relative imports
- No unused imports (enforced by Biome)

### Commits — Conventional Commits (enforced by commitlint)
```
feat: add site CRUD
feat(weather): add Yr.no provider
fix: prevent duplicate site labels per user
refactor(api): extract weather adapter factory
test(site): cover label validation
docs: add README setup instructions
chore: bump dependencies
style: format with biome
perf(cache): tune LRU max entries
```
- One **clear intention** per commit
- No `wip`, no `stuff`, no fourre-tout
- Commits go **directly to `main`** (solo project, short timeline — no feature branches)
- Never force-push to `main`

---

## 11. Testing Strategy

**Principle**: meaningful coverage, not checkbox coverage. No coverage threshold.

### Vitest (unit + integration)
Priority targets:
- Temperature conversion (C ↔ F) — covers user preference application
- Weather data normalization (per-provider adapters mapping raw → unified types)
- Zod schema validation (site creation, auth, preferences)
- Cache TTL behavior (insertion, expiration, key construction)
- Date/timezone formatting helpers

### React Testing Library
Priority components:
- `SiteCard` — default/non-default states, heart toggle, delete
- `ForecastChart` — series toggling, day range switching
- `ProviderSwitcher` — only renders available providers, switches trigger refetch
- `SearchInput` — geocoding autocomplete, lat/lng manual mode
- `EmptyState` — first-login flow, geolocation CTA

### Playwright (E2E happy paths — 2 scenarios)
1. **Signup → add site → forecast → set default**
   Signup with email + password → auto-login → add a site via geocoding search → view its 7-day forecast → toggle the heart to set as default.
2. **Existing login → switch weather provider**
   Log in as the seeded user → open a site detail → switch from `open-meteo` to `yr-no` → assert that the displayed values change.

### What we deliberately do NOT test
- Trivial getters/setters
- shadcn primitive components (assumed to work)
- Third-party libraries (Prisma, Fastify, Auth.js)
- Visual regression (would require Chromatic/Percy — out of scope)

---

## 12. Constraints — "Don'ts"

These are explicit decisions. Do not introduce them.

- **Don't** add Next.js (no SSR need; App Router complexity rejected)
- **Don't** add Redux or Zustand (Context + URL state is sufficient — see §7)
- **Don't** add Redis to the MVP (in-memory `lru-cache` is intentional)
- **Don't** add Supabase or any BaaS
- **Don't** add magic links or SMTP — credentials auth is the chosen path
- **Don't** introduce feature branches (solo work, direct commits to `main`)
- **Don't** add comments that explain **what** the code does — names should suffice
- **Don't** add a coverage threshold — meaningful tests over volume
- **Don't** force-push to `main`
- **Don't** commit `.env`, secrets, `node_modules`, build artefacts, `sujet.md`, `points_restants.md` (all covered in `.gitignore`)
- **Don't** mix French and English in shipped code/docs — English only in shipped files
- **Don't** call weather provider APIs without going through the cache layer
- **Don't** bypass the Zod schemas in `shared/` — they are the source of truth for API contracts

---

## 13. Decisions Summary

| # | Decision | Short rationale |
|---|---|---|
| D1 | Email + password via `@fastify/secure-session` + bcrypt (originally planned with Auth.js, pivoted) | Ecorobotix uses Infomaniak/kSuite, not Google Workspace → OAuth Google would not work for their emails; passwordless adds setup friction; credentials = zero friction for reviewer. Auth.js is optimized for fullstack frameworks (Next.js); on a separate Fastify backend, `@fastify/secure-session` is the idiomatic native choice with the same security guarantees and ~10 lines of setup vs ~100 lines of glue code. |
| D2 | PostgreSQL in Docker Compose, no Supabase | 3 tables, no realtime/storage needs; Supabase oversizes the stack and complicates "clone + run" |
| D3 | `Site` model (not "Location") + dual search (geocoding + lat/lng) + Leaflet map view | Aligns with agri domain vocabulary; supports remote sites not in any geocoder; map view honors "track 10+ sites quickly" |
| D4 | 7-day daily forecast (extensible to 14), hourly drill-down, 4 toggleable metrics | 7d is the reliable horizon; hourly drill-down for same-day decisions; 4 metrics critical for agri (not just temperature) |
| D5 | Alerts/thresholds out of MVP scope, listed first in README improvements | 4-6h to implement properly; high product-thinking signal in README without dev cost |
| D6 | Multi-source weather via `WeatherProvider` interface, P1 = Open-Meteo + Yr.no. Multi-model Open-Meteo (4 curated: best_match / ECMWF / ICON / GFS) flattened into the switcher alongside Yr.no. P2 (Bright Sky / OpenWeatherMap / WeatherAPI) deferred. | Honors "multiple sources" intent; multi-models add cheap divergence visibility (ECMWF vs GFS on the same coord) without taking on a 3rd vendor's TOS and HTTP contract; switch (not consensus) keeps UX transparent. |
| D7 | Vite + React 19 + TS strict + TanStack Router + Fastify + Prisma + Node 22 LTS | Standard mainstream stack, no Next.js, Bun ruled out for ecosystem stability |
| D8 | TanStack Query (server state) + React Context (client state) + lru-cache (backend) — no Redux, no Zustand, no Redis | Server state ≠ client state; client surface too small; in-memory cache sufficient for single-instance backend |
| D9 | Tailwind v4 + shadcn/ui + Inter + brand palette extracted from Ecorobotix logo SVG | Customizable (no lock-in); colors authentic and defensible |
| D10 | Light monorepo (3 root dirs: `web/`, `api/`, `shared/`) with `file:` deps, no pnpm workspaces. OpenAPI auto-gen on API. | Shares Zod schemas without workspace complexity; backend remains reusable by future clients |
| D11 | Local-first deployment via Docker Compose, no wifi-mobile binding, Render cloud as stretch | Reviewer uses DevTools mobile mode; cloud only if time permits |
| D12 | Single default site, heart icon; no automatic fallback if the default is deleted | Respects user agency (US #6 explicit); singular ("a default") rules out multi-favorites in MVP |
| D13 | Vitest + RTL + Playwright (2 E2E); TS strict (minus `exactOptionalPropertyTypes`); Biome; Husky + lint-staged + commitlint; commits direct to `main` | Meaningful tests; quality enforced mechanically; solo workflow keeps velocity high |
| D14 | `WeatherProvider` shape matches UX granularity: `getCurrentAndDaily` bundle + `getHourly` drill-down (instead of 3 granular methods or a single combined endpoint). | One upstream call per dashboard view, internally-consistent snapshot, switcher refetch invalidates the right keys. |
| D15 | Yr.no owns its HTTP-aware cache inside its adapter (`If-Modified-Since` + 304 handling), NOT the generic `createCachedProvider` LRU+TTL decorator. | Met.no TOS require respecting `Last-Modified` / `Expires`; the generic decorator would defeat that contract. Open-Meteo (no native HTTP cache) still uses the decorator. |
| D16 | Tabular chip UI for the forecast (transposed daily with days in columns + chip per cell; hourly drill-down with same chip language + 3 h / 1 h slice toggle + prev/next day nav) — Recharts dropped from the stack. | Chips on a grid scan faster than a multi-series chart for the typical agri decision ("can I spray tomorrow morning?"); transposed layout keeps the table within the mobile viewport (horizontal scroll inside the table only, page scroll stays vertical); the same chip language carries between daily and hourly so the agent reads risk by hue without re-learning the scale. |

---

## 14. Out of MVP Scope (for the README's "Future improvements")

In rough priority order:

- **Threshold alerts** (rain > 15mm/24h, wind > 20km/h, humidity > 90% for 6h → mildew risk, overnight frost). Highest-value addition for agri context.
- **Polygon sites** (draw on satellite map, centroid + area). Currently sites are single GPS points.
- **Weather provider phase 2** (Bright Sky, OpenWeatherMap, WeatherAPI) — architecture ready, adapters pending.
- **Multi-series visual chart** (Recharts) overlaid with the chip table — the chip table covers the agri decision well, but a chart adds shape/trend reading for power users (peak detection, daily envelope). Originally planned, pivoted away from for the MVP after agri-context review.
- **Daily humidity mean from Yr.no** (currently null in Yr.no's daily — requires a circular mean over hourly entries, out of MVP scope).
- **Yr.no daily wind dominant direction** (same reason as above).
- **Redis** for multi-instance backend (currently in-memory LRU).
- **Password reset + email verification + rate-limiting + 2FA** on auth.
- **OAuth providers** (Google/Microsoft) as alternative login methods.
- **Multi-favorites** on top of the single default.
- **Soil moisture + UV index in the chart** (currently in current-conditions card only).
- **Dark mode**.
- **i18n** (currently English only).
- **Production deployment** (Render or Railway free tier).

---

## 15. Commands Cheatsheet

| Command | What it does |
|---|---|
| `pnpm dev` | Start `web` (Vite, port 5173) and `api` (Fastify, port 3000) in parallel |
| `pnpm run setup` | Install dependencies in `shared/`, `api/`, `web/`, then run migrations + seed |
| `pnpm build` | Build both `web` and `api` for production |
| `pnpm test` | Run Vitest in both packages |
| `pnpm test:e2e` | Run Playwright (requires `pnpm dev` running) |
| `pnpm lint` | Biome check on the whole repo |
| `pnpm format` | Biome format --write on the whole repo |
| `pnpm typecheck` | `tsc --noEmit` in each workspace |
| `pnpm verify` | Runs typecheck + lint + test in one go — what to run before every commit |
| `pnpm --filter api db:migrate` | Apply Prisma migrations |
| `pnpm --filter api db:seed` | Seed demo user + sample site |
| `pnpm --filter api db:studio` | Open Prisma Studio (DB GUI) |
| `pnpm --filter api db:reset` | Wipe + remigrate + reseed (dev only) |

### Quick "how to" recipes

**Add a new API endpoint**
1. Define / update the Zod schema in `shared/src/<domain>.schema.ts`
2. Add the route plugin in `api/src/routes/<resource>.ts`, validate body/params/query with the schema
3. OpenAPI doc and types update automatically
4. Frontend uses the schema for form validation (via `react-hook-form` + `zodResolver`)

**Add a new weather provider**
1. Implement the `WeatherProvider` interface in `api/src/weather/<provider-id>.ts`
2. Map the raw API response to the unified types in `shared/src/weather.types.ts`
3. Register the provider in the factory `api/src/weather/provider.ts`
4. If keyed: read the key from `env.ts` (Zod-validated), set `requiresApiKey: true`, `isAvailable: () => !!env.PROVIDER_KEY`
5. The frontend switcher updates automatically (provider is hidden if `isAvailable()` returns false)

**Add a new database column / table**
1. Edit `api/prisma/schema.prisma`
2. `pnpm --filter api db:migrate` — Prisma generates and applies the migration
3. Update the Zod schema in `shared/` if the new field is part of the API contract
4. Update the seed file if relevant

**Run a single test file**
```bash
pnpm --filter api test src/weather/open-meteo.test.ts
pnpm --filter web test src/features/sites/SiteCard.test.tsx
```

**Adding an export to `@agriwatch/shared`**
Just add it. Vite + Vitest + the TS server read the source directly via path aliases (`@agriwatch/shared` → `../shared/src/index.ts`), so there is no node_modules cache to bust and no pre-bundling to purge — saving a file in `shared/src/` is reflected on the next reload.

The aliasing lives in three places, all kept in sync:
- `web/vite.config.ts` (`resolve.alias`) — runtime
- `web/vitest.config.ts` and `api/vitest.config.ts` (`resolve.alias`) — tests
- `web/tsconfig.json` and `api/tsconfig.json` (`compilerOptions.paths`) — IDE / `tsc --noEmit`

All three also dedupe `zod` so the schema (imported from `shared/`) and the consumer share the same `ZodError` class instance — without it, `err instanceof ZodError` would fail because pnpm hoists a separate `zod` copy per package.

The `file:../shared` dep in each `package.json` stays only so `pnpm install` creates the symlink for tools that don't go through Vite/tsconfig paths (Biome, Prettier-via-Biome, etc.).

---

End of project bible. Build with care, ship with confidence.
