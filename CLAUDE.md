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
- **Daily forecast over 7 days by default**, with a toggle to extend up to **14 days**.
- **Drill-down on hourly forecast** when a day is clicked.
- Display 4 toggleable metric series in a chart (Recharts): **Temperature, Precipitation, Wind, Humidity**.
- Series can be turned on/off; multiple series can overlap on the chart.
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
| Charts | Recharts | latest |
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
│   │   │   ├── sites/                # (Phase 2)
│   │   │   ├── weather/                # (Phase 3)
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
1. Define the `WeatherProvider` interface in `api/src/weather/provider.ts` (see §7.2).
2. Define unified types in `shared/src/weather.types.ts`: `CurrentWeather`, `DailyForecast`, `HourlyForecast`, `GeocodingResult`.
3. Implement `open-meteo.ts` adapter (current, daily, hourly, geocoding endpoints; map raw → unified types).
4. Implement `yr-no.ts` adapter (note: requires a User-Agent header per Yr.no policy).
5. Implement `cache/` wrapper around `lru-cache` with TTL config per data type (see §7.3).
6. Implement Fastify routes: `GET /api/weather/current`, `GET /api/weather/forecast`, with provider selection via query param `?provider=`.
7. Implement `GET /api/providers` returning available providers (omit those whose required API key is missing).
8. Set up `@fastify/swagger` + `fastify-type-provider-zod` on the API for auto-generated docs at `/docs`.
9. Tests: adapter normalization (one fixture per provider), provider availability detection, cache hit/miss/expiry.
10. Commit: `feat(weather): multi-provider abstraction + open-meteo + yr-no`.

### Phase 4 — Forecast UI + Chart
1. Build the site detail page: current conditions card + forecast chart + provider switcher dropdown.
2. Implement the provider switcher (only shows available providers; switching refetches via TanStack Query invalidation).
3. Build the Recharts multi-series chart: 4 toggleable metrics (temp, precip, wind, humidity), 7-day daily by default, 14-day toggle, drill-down to hourly on day click.
4. Implement temperature unit conversion at display time (read `UserPreferences.temperatureUnit`).
5. Build the dashboard view: grid of site cards with current snapshot (uses default site in highlight position).
6. Build the Leaflet map view: markers for each saved site with label tooltips. Use OpenStreetMap tiles, no API key.
7. Tests: unit conversion, chart series toggling, dashboard rendering with 0 / 1 / many sites.
8. Commit: `feat(weather): forecast UI, chart, map view, provider switcher`.

### Phase 5 — Preferences + Settings
1. Implement `GET /api/me/preferences` and `PATCH /api/me/preferences`.
2. Build the Settings page in `web/`: temperature unit toggle, default site selector, preferred provider selector.
3. Wire the preferences via TanStack Query mutations with optimistic update.
4. Tests: preferences persistence, default unit propagation.
5. Commit: `feat(preferences): user settings`.

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

### 7.2 WeatherProvider pattern — multi-source abstraction
The weather layer is built around an interface so additional providers plug in without touching the rest of the code.

```ts
// api/src/weather/provider.ts
export interface WeatherProvider {
  id: WeatherProviderId
  displayName: string
  requiresApiKey: boolean
  isAvailable: () => boolean

  getCurrent(lat: number, lng: number): Promise<CurrentWeather>
  getDailyForecast(lat: number, lng: number, days: number): Promise<DailyForecast[]>
  getHourlyForecast(lat: number, lng: number, date: Date): Promise<HourlyForecast[]>
  getGeocoding?(query: string): Promise<GeocodingResult[]>
}
```

Each implementation maps its raw API response to the **unified types** in `shared/src/weather.types.ts`.

**Provider availability** is determined at startup by reading env vars (for keyed providers). Exposed via `GET /api/providers`. The frontend switcher **hides** providers whose key is absent — not greys them out, to avoid frustration for users who cannot obtain a key.

**Switch behavior is per-request, one at a time** — no consensus/averaging across providers. Refrigerator-clear UX: the user sees the raw output of the selected source.

### 7.3 Caching strategy
External weather APIs are cached server-side via `lru-cache`:
- Cache key: `<providerId>:<endpoint>:<lat>:<lng>:<paramsHash>`
- TTL per data type:
  - `current` → 10 min
  - `daily forecast` → 30 min
  - `hourly forecast` → 15 min
  - `geocoding` → 24 h
- Frontend cache: TanStack Query (stale-while-revalidate, refetch on focus, default `staleTime` configured per query)

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
  id                String   @id @default(cuid())
  userId            String   @unique
  temperatureUnit   String   @default("celsius")        // "celsius" | "fahrenheit"
  defaultSiteId   String?                              // nullable, no auto-fallback on delete
  preferredProvider String   @default("open-meteo")
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
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
- **Metric strip**: horizontal scrollable bar of metric chips at the top of site detail (icon + label + value)
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
| D6 | Multi-source weather via `WeatherProvider` interface, P1 = Open-Meteo + Yr.no, P2 = +Bright Sky/OpenWeatherMap/WeatherAPI | Honors "multiple sources" intent; switch (not consensus) keeps UX transparent; phased to manage time risk |
| D7 | Vite + React 19 + TS strict + TanStack Router + Fastify + Prisma + Node 22 LTS | Standard mainstream stack, no Next.js, Bun ruled out for ecosystem stability |
| D8 | TanStack Query (server state) + React Context (client state) + lru-cache (backend) — no Redux, no Zustand, no Redis | Server state ≠ client state; client surface too small; in-memory cache sufficient for single-instance backend |
| D9 | Tailwind v4 + shadcn/ui + Inter + brand palette extracted from Ecorobotix logo SVG | Customizable (no lock-in); colors authentic and defensible |
| D10 | Light monorepo (3 root dirs: `web/`, `api/`, `shared/`) with `file:` deps, no pnpm workspaces. OpenAPI auto-gen on API. | Shares Zod schemas without workspace complexity; backend remains reusable by future clients |
| D11 | Local-first deployment via Docker Compose, no wifi-mobile binding, Render cloud as stretch | Reviewer uses DevTools mobile mode; cloud only if time permits |
| D12 | Single default site, heart icon; no automatic fallback if the default is deleted | Respects user agency (US #6 explicit); singular ("a default") rules out multi-favorites in MVP |
| D13 | Vitest + RTL + Playwright (2 E2E); TS strict (minus `exactOptionalPropertyTypes`); Biome; Husky + lint-staged + commitlint; commits direct to `main` | Meaningful tests; quality enforced mechanically; solo workflow keeps velocity high |

---

## 14. Out of MVP Scope (for the README's "Future improvements")

In rough priority order:

- **Threshold alerts** (rain > 15mm/24h, wind > 20km/h, humidity > 90% for 6h → mildew risk, overnight frost). Highest-value addition for agri context.
- **Polygon sites** (draw on satellite map, centroid + area). Currently sites are single GPS points.
- **Weather provider phase 2** (Bright Sky, OpenWeatherMap, WeatherAPI) — architecture ready, adapters pending.
- **HTTP-aware caching** (respect `Cache-Control`, `If-Modified-Since` revalidation for Yr.no).
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

---

End of project bible. Build with care, ship with confidence.
