# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file React app (`recibo_yatasto.jsx`) for dairy operations at Lacteos Yatasto SA (Argentina). Tracks daily milk intake (ingresos), CIP cleaning, truck loading (carga), silo movements, shift stock, and fortified milk batches (fortificados).

The app runs inside **Antigravity** (a VS Code-based IDE). Data persists to Supabase via `db-adapter.js`. `main.jsx` polyfills `window.storage` with `localStorage` for standalone preview only — the app itself always calls `db.*`.

## Commands

```bash
cp .env.example .env  # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first
npm run dev           # start Vite dev server (entry: main.jsx)
npm run build         # build to dist/
npm run preview       # preview built dist/
```

`index.html` loads `/main.jsx` directly. Vite bundles `main.jsx` → `recibo_yatasto.jsx`. Deployed to Netlify via `netlify.toml` (`npm run build`, publishes `dist/`).

## Architecture

**Core files:**
- `recibo_yatasto.jsx` — entire app: constants, UI atoms, section components, cross-section logic
- `main.jsx` — React entry point; polyfills `window.storage` with `localStorage` for standalone preview
- `db-adapter.js` — Supabase persistence: `db.get/set/remove/list` + `db.auth.signIn/signOut/getSession/onAuthStateChange`; reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from env
- `tokens.js` — design system primitives: `DARK`/`LIGHT` OKLCH palettes, `TYPE_SCALE`, `SPACE`, motion tokens (`DUR`, `EASE_OUT`, `EASE_INOUT`), `BP` breakpoints
- `hooks.js` — `useViewport()` returns `{ isMobile, isTablet, isDesktop, width }` based on `window.matchMedia`; SSR-safe
- `icons.js` — centralises all `lucide-react` imports with semantic aliases (e.g. `Truck as Ingresos`); exports `SW = 1.75` (standard stroke width)

**Storage keys** (all go through `db.get/set`):
- Section data: `yatasto:YYYY-MM-DD:section` where section ∈ `ingresos | cip | carga | movimientos | stock | fortificados`
- Config (custom tambos/camiones): `yatasto:config` — loaded/saved via `loadCfg()` / `saveCfg()`
- `yatasto:usuarios` — active session tracking per device
- `yatasto:saldo-silos` — cached silo balance carried forward from previous dates
- `yatasto:eliminados` — deletion audit log (capped at 300 entries), appended by `logElim()`

**Section components** (each receives only `{ date }`):
- `SecIngresos` — milk truck arrivals; each entry has quality params (acidez, pH, GB, SNG, densidad, proteína, etc.) and a silo destination; concentrated products (`PRODS_CONCENTRADOS`) use a simplified form
- `SecCIP` — CIP (Cleaning In Place) records, split into silos tab and camiones tab; includes a separate filter-cleaning panel
- `SecCarga` — outgoing truck loads; labeled CARGA 1/2/3
- `SecMovimientos` — silo-to-silo transfers (movs tab) and quality controls per silo (ctrls tab)
- `SecStock` — per-shift silo stock levels (3 shifts: 07:00, 14:00, 21:00); auto-populates litros from `calcAutoLitros()` and infers product per silo from the latest ingreso
- `SecFortificados` — fortified milk batches with dynamic additions list (product + quantity + unit)
- `SecDashboard` — supervisor/jefe-only analytics; receives `{ date, perfil, perfilLabel, syncKey }`; accessible via the "supervisor" nav tab

**State pattern:** Each section loads in `useEffect` on date change. Every user action calls `persist()` which updates React state and calls `db.set()` immediately — no debounce, no submit button for section-level saves.

**Validation pattern:** Required fields are checked on the "Guardar" button click using an inline array of `[key, label]` pairs; missing fields are collected and shown via `alert()`.

**Item IDs:** All list items use `id: Date.now()` as a unique key.

**Authentication:** `PERFILES` defines two roles — `supervisor` and `jefe` — each mapped to an internal email (`supervisor@yatasto.internal`, `jefe@yatasto.internal`). Login validates the username/password client-side against hardcoded credentials, then calls `db.auth.signIn(email, password)` to establish a Supabase session. Role determines which actions are available (e.g. delete button, `SecDashboard` access).

## Cross-Section Computation

`calcAutoLitros(date)` reads ingresos + movimientos + carga + fortificados simultaneously and returns a `{ [siloKey]: litros }` map. `SecStock` calls this on every date change to display accumulated volume per silo. When you modify how litros flow between sections you must update this function.

## Domain Constants

- `TAMBOS_BASE` — base list of milk supplier farms `{ num, nombre }`; users can append custom tambos stored in `yatasto:config`
- `CAMIONES_BASE` — base truck names for CIP; users can append custom camiones via config
- `SILOS` — 8 main storage silos used as ingreso destinations (includes "20")
- `SILOS_TODOS` — all silos + tanks (TQ1–TQ9, POSTRE, TINA, DULCE) used in movimientos and carga
- `STOCK_SILOS` — 10-silo subset tracked in stock view (`["100 N","100 V","80","60","42","40F","20","15","TQ6","TQ7"]`)
- `CIP_SILOS` — silo names for CIP records (abbreviated convention: "100 N", "100 V", "LINEA 1", etc.)
- `SILO_STOCK_KEY` — normalises varying silo name spellings to the canonical `STOCK_SILOS` keys
- `SILO_CAP` — real capacity in litres per silo key
- `SILO_MIN` / `SILO_MAX` — recommended minimum and maximum fill levels per silo
- `PROD_COLOR` — hex fill colour per product type, used by `SiloSVG` and the stock level bar
- `TURNOS` — `["07:00", "14:00", "21:00"]`; `TURNO_LABELS` maps to "Mañana/Tarde/Noche"; `TURNO_CIERRE` maps each to its closing hour
- `PRODUCTOS` — product options for ingresos dropdown
- `PRODS_STOCK` — extended product list for the stock silo product selector
- `CARGA_PRODUCTOS_BASE` — products available for truck dispatch
- `PRODS_CONCENTRADOS` — products that use the simplified ingreso form (`["Lactosa","Suero","Concentrado"]`)
- `FORT_DESTINOS` — destinations for fortified batches (Tetra, Ultra, Yogur, Postre, Acción Correctiva)
- `UNIDADES_FORT` — `["kg","g","L","mL","mg","cc"]` for fortified-milk additions
- `NAV` — navigation tabs array `{ id, label, icon }`

## Shared UI Atoms

Defined once at the top of `recibo_yatasto.jsx` and reused everywhere:

- `F` — labelled field wrapper
- `Inp` — styled `<input>` (text/number, supports `readOnly`)
- `Sel` — styled `<select>` with optional placeholder option
- `Pair` — two-column input for Fábrica / Tambo dual readings
- `FAB` — fixed floating action button (bottom-right "+")
- `Modal` — bottom-sheet overlay with title and close button; `zIndex` prop for stacking
- `SiloSVG` — animated SVG silo diagram; takes `{ siloKey, litros, producto }` and draws fill level + product colour with min/max indicators

## Styling

All styles are inline JS objects. No CSS files.

**Migration in progress:** `recibo_yatasto.jsx` still uses the legacy `C` object (dark theme, amber `#f59e0b`) with shared style objects `inp`, `lbl`, `secTitle`, `btnPrimary`, `btnSecondary`, `card`, `panel`. New code should consume `tokens.js` (`DARK`/`LIGHT` OKLCH palettes) and `hooks.js` (`useViewport`) instead of extending the `C` object. Numbers and times use `'Courier New', monospace` (being migrated to JetBrains Mono via `FONT_MONO` in tokens).

**Design anti-patterns to avoid** (per `UI-PLAN.md`): `border-left` ≥2px as decorative accent, gradient text, glassmorphism, hero-metric SaaS card grids, bounce/elastic easing, pure `#000`/`#fff`, `alert()` for validation (replace with inline banners). Every element must serve an operational decision — zero ornamental flourish.

**Responsive:** `BP` in `tokens.js` defines `sm/md/lg/xl` breakpoints. Desktop (≥`lg`, 1024px) uses sidebar nav + master-detail layouts; mobile uses bottom tab bar + bottom-sheet modals. Use `useViewport()` to branch; never stretch mobile layouts to desktop.

## Supabase backend

`db-adapter.js` is the live backend. Table: `yatasto_storage (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)` — see `supabase-schema.sql`. Data migration from localStorage: `migrateToSupabase()` exported from `db-adapter.js` (run once from the browser console).
