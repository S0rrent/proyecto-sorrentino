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

## LLM Council Workflow

This repo includes the `llm-council` skill at `.claude/skills/llm-council/`
(adapted from Karpathy's LLM Council methodology). It spawns 5 advisor
sub-agents (Contrarian, First Principles, Expansionist, Outsider, Executor)
in parallel, runs anonymized peer review, and a chairman synthesizes a
verdict. Output: HTML report + markdown transcript in the workspace.

### Invocation

Triggers (only run when intent is clearly a decision with tradeoffs):
- Explicit: `council this`, `run the council`, `war room this`,
  `pressure-test this`, `stress-test this`, `debate this`
- Soft: `should I X or Y`, `which option`, `I'm torn between`, `validate
  this`, `is this the right move`

The skill will refuse to run on factual questions (`what's the capital
of...`), pure creation tasks (`write me a tweet`), or decisions already
made where the user is just seeking confirmation.

### When to use council in Yatasto

| Situation | Council? |
|---|---|
| UX architecture decisions (tabs, navigation, login flow) | YES |
| Pre-mortem before touching `calcAutoLitros`, `buildChainedSaldo`, `syncAutoMovSobrante` | YES |
| Migration strategy for historical data (batch vs stream, dates ranges) | YES |
| New feature scope (cut features, defer, redesign) | YES |
| Mobile vs desktop priority for any new section | YES |
| Permissions matrix decisions (operario can/can't do X) | YES |
| Pricing/scoping discussion with stakeholder | YES |
| "Should I merge PR #N?" — review obvious, no | NO |
| Bug with clear root cause and known fix | NO |
| Refactor where structure is dictated by code shape | NO |
| Naming/styling minutiae | NO |
| Library choice with clear winner | NO |

### Mandatory framing context for Yatasto council sessions

When invoking the council, always include this context block in the question
so advisors stay grounded in real plant operation:

```
Contexto operativo Yatasto:
- App industrial de planta lechera (Argentina)
- Mobile-first, operarios con manos grandes y guantes
- Iluminación pobre, ruido, estrés operativo
- Offline-first crítico (señal débil en planta)
- Prevención de errores humanos = prioridad de seguridad
- Datos productivos reales — corrupción de stock o saldo = costo alto
- 3 perfiles base (supervisor/jefe/admin) + perfil operario en diseño
```

Without this framing, advisors give SaaS-generic advice that doesn't
apply to plant operation.

### Cost considerations

- ~11 sub-agents per session (5 advisors + 5 reviewers + 1 chairman)
- Wall-clock: 3-5 minutes
- Token cost: estimated $0.30-0.80 USD per session on Opus
- Only use when the decision cost (rollback, rework, downtime) clearly
  exceeds the council cost

### Council vs Agents vs both

This repo uses 3 multi-agent patterns. Choose deliberately:

| Pattern | Purpose | Tools | Cost |
|---|---|---|---|
| **Agent (Explore)** | Find/read code, search keywords | Read, Grep, Glob | low |
| **Agent (Plan)** | Step-by-step implementation strategy | All read tools | low-med |
| **Agent (general-purpose)** | Multi-step research or execution | all tools | med |
| **Agent paralelos (multiple)** | Independent research in parallel (audits, scans) | all tools | med-high |
| **Council** | Decisions with multiple valid options and high cost-of-being-wrong | Sub-agents internally | high |

Use Agents (info-gathering) **before** Council (decision) when the council
needs grounded facts. Example: Explore agent finds "current bottom bar has
6 tabs at 51px width" → council uses that fact to decide 4 vs 5 tabs.

Avoid running Council + parallel Agents in the same turn — they fight for
context window and multiply cost without value.

### Best practices for this project

1. **Council before code, not after.** Once code is written, it's review
   (use code-review agent), not decision.
2. **One council per PR maximum.** If a PR has 3 sub-decisions, council the
   architectural one, decide the rest with normal judgement.
3. **Save important transcripts to `docs/council/`** with the convention in
   that folder's README. Discard exploratory or trivial ones.
4. **Reference council transcripts in PR descriptions** when the PR
   implements a council decision (e.g. "Implementa la decisión del council
   en `docs/council/2026-05-25--bottom-bar-4-vs-5-tabs.md`").
5. **Stray `council-*.html` and `council-*.md` in the repo root are
   gitignored** — they won't accidentally pollute commits.
6. **Don't council production fires.** When something is broken in prod,
   diagnose and fix; council comes later as a post-mortem.
7. **Run-the-council artifacts contain advisor opinions, not facts.**
   Treat as input, not as decision. The user (you) decides.

### Anti-patterns to avoid

- Counciling every decision (defeats the purpose, burns budget)
- Counciling things with a clear right answer (advisors will manufacture
  fake disagreement)
- Skipping framing context (advisors give generic SaaS takes that don't
  apply to plant operation)
- Counciling a PR review (that's what `code-review` agent is for)
- Using council to validate a decision you've already made (council might
  catch flaws you'd rather not see — only use when genuinely open)
