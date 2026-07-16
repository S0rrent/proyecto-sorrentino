# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file React app (`recibo_yatasto.jsx`) for dairy operations at Lacteos Yatasto SA (Argentina). Tracks daily milk intake (ingresos), CIP cleaning, truck loading (carga), silo movements, shift stock, and fortified milk batches (fortificados).

The app runs inside **Antigravity** (a VS Code-based IDE). Data persists to Supabase via `db-adapter.js`. `main.jsx` polyfills `window.storage` with `localStorage` for standalone preview only — the app itself always calls `db.*`.

## Project docs

Read these before working on the area they cover — don't re-derive context that already exists on disk:

- `PRODUCT.md` — product scope, perfiles, operational priorities
- `UX-V2.md` — current UX redesign plan (mobile-first, operario flows)
- `UI-PLAN.md` — design system migration plan and anti-patterns
- `supabase-schema.sql` — DB schema for `yatasto_storage` and related tables
- `docs/council/` — saved decision transcripts (only the ones worth keeping)

## Date convention

Section storage keys are formatted `yatasto:YYYY-MM-DD:section` (ISO 8601, ASCII-sortable). All date-keyed reads/writes and cross-section helpers (e.g. `calcAutoLitros(date)`) expect this format. The UI displays dates in `es-AR` (`dd/mm/yyyy`) but **never** persists in that form — convert at the UI boundary.

## Commands

```bash
cp .env.example .env  # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first
npm run dev           # start Vite dev server (entry: main.jsx)
npm run build         # build to dist/
npm run preview       # preview built dist/
```

`index.html` loads `/main.jsx` directly. Vite bundles `main.jsx` → `recibo_yatasto.jsx`. Deployment is via Vercel (`vercel.json`) — `npm run build` and serve `dist/`. Vercel headers enforce CSP, set `Cache-Control: no-cache` on the service worker and manifest, and HTML is served with `NetworkFirst` so the SW never pins stale asset hashes.

**PWA / service worker:** `vite-plugin-pwa` is wired in `vite.config.js` with `registerType: "autoUpdate"` + `skipWaiting`. Workbox precaches built assets and adds runtime caching for Google Fonts (CacheFirst, 1y) and Supabase (`*.supabase.co`, NetworkFirst with 10s timeout, 24h). Manifest is `standalone`, portrait, `es-AR`, theme `#f59e0b`. Service worker only registers on the built site — `npm run dev` does not run it.

## Architecture

**Core files:**
- `recibo_yatasto.jsx` — entire app: constants, UI atoms, section components, cross-section logic
- `main.jsx` — React entry point; wraps `<App />` with `<ToastProvider>`; polyfills `window.storage` with `localStorage` for standalone preview
- `db-adapter.js` — Supabase persistence: `db.get/set/remove/list` + `db.auth.signIn/signOut/getSession/onAuthStateChange`; offline queue with retry/backoff; reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from env. Also exports `onDiscarded` listener for 4xx-permanent items dropped from the queue.
- `tokens.js` — design system primitives: `DARK`/`LIGHT` OKLCH palettes, `TYPE_SCALE`, `SPACE`, motion tokens (`DUR`, `EASE_OUT`, `EASE_INOUT`), `BP` breakpoints
- `hooks.js` — `useViewport`, `useOperarioActivo`, `usePerfil`, `useInactivityLock`, `useShiftChange`, `isShiftChangeWindow`
- `icons.js` — centralises all `lucide-react` imports with semantic aliases (e.g. `Truck as Ingresos`); exports `SW = 1.75` (standard stroke width)
- `telemetry.js` — opt-in telemetry (localStorage flag `yatasto:telemetry=true`). `track(event, value, field)` instrumented in `save()` flow + nav taps; `dumpTelemetry(days)` exporta vía `window.__yatastoTelemetry.dump()`.

**`lib/` (puros, sin React):**
- `lib/helpers.js` — `buildFortLabel`, `diffDays`, `calcSF`, `isSueroLike`, `shouldShowSF`, `adicionLitros`, `fortSourceDraws(fort, siloKeyMap)`
- `lib/dates.js` — `getToday(now?)`, `getPreviousDate(iso)`, `addDay(iso)`, `getLastNDays(n, now?)`, `getDaysInRange(from, to)`, `fmtDate(iso)`, `getNow(now?)`
- `lib/density.js` — `isEcomilkDensity`, `normalizeDensity`, `formatDensity`, `validateDensity` (tolera Ecomilk 20-40 o técnico 1.020-1.040, coma o punto decimal)
- `lib/export-helpers.js` — `escapeHtml`, `escapeCsv` (protección CSV injection)
- `lib/resumen.js` — `buildResumen(tipo, item)` para confirmaciones de borrado + audit log
- `lib/produccion.js` — predicados de estado de lote: `isLoteActivo`, `isLoteFinalizado`, `isLoteLegacyCancelado`
- `lib/permisos.js` — `ACCIONES`, `PERMISOS_POR_PERFIL`, `tienePermiso(perfil, accion, permisosExtra?)`, `tieneAlguno`
- `lib/pin.js` — `hashPin(pin)` → `"sha256:<salt>:<hash>"`, `verifyPin(pin, storedHash)` con comparación tiempo constante
- `lib/operarios.js` — CRUD sobre clave `yatasto:operarios`: `loadOperarios`, `saveOperarios`, `createOperario`, `updateOperario`, `setPin`, `desactivarOperario`/`reactivarOperario`, `verifyOperarioPin`, `recordLogin`, `iniciales`
- `lib/audit.js` — `respFor(operario, perfil, label)`, `stampOperario(item, ctx)`, `stampLote(items, ctx)`, `describirResp(item)`

**`components/` (React, .jsx):**
- `components/Toast.jsx` — `ToastProvider` + `useToast()` con `{ ok, warn, error }` API
- `components/PerfilProvider.jsx` — `PerfilProvider` + `RequierePermiso` wrapper
- `components/OperarioLogin.jsx` — modal selector + teclado PIN para identidad de turno
- `components/SecUsuarios.jsx` — CRUD de operarios (solo jefe)
- `components/StepUpPin.jsx` — `useStepUpPin()` retorna `[ui, askStepUp(opts)]`. Modal para autorizar acciones críticas con PIN de supervisor/jefe en vivo.

**`tests/`:** vitest + jsdom + @testing-library/react. `npm test` corre todos (~55s). Cobertura por archivo:
- helpers, dates, density, export-helpers, resumen, produccion (puros).
- permisos, pin, operarios, audit, isPermanent4xx, is401 (lógica de dominio + seguridad).
- discarded, queue (cola offline con escenarios reales de timing).
- toast, perfilProvider, operarioLogin (UI con RTL).
- useInactivityLock, useShiftChange, useOperarioActivo, useViewport (hooks con fake timers).
- shift, operario-flow, telemetry (integración).

**Storage keys** (all go through `db.get/set`):
- Section data: `yatasto:YYYY-MM-DD:section` where section ∈ `ingresos | cip | carga | movimientos | stock | fortificados`
- Config (custom tambos/camiones): `yatasto:config` — loaded/saved via `loadCfg()` / `saveCfg()`
- `yatasto:usuarios` — active session tracking per device
- `yatasto:saldo-silos` — cached silo balance carried forward from previous dates
- `yatasto:eliminados` — deletion audit log (capped at 300 entries), appended by `logElim()`
- `yatasto:operarios` — lista JSON de operarios con `{ id, nombre, color, rol, pinHash, activo, permisosExtra, creadoEn, ultimoLogin }`; CRUD vía `lib/operarios.js`
- `yatasto:telemetry:YYYY-MM-DD` — eventos del día (cap 500, retención 14 días); sólo si telemetría está enabled (opt-in)

**localStorage (lado cliente, no Supabase):**
- `__yatasto_wq__` — cola offline de escrituras pendientes (drena con backoff 2→16s)
- `__yatasto_discarded__` — entradas descartadas por 4xx permanente (cap 50)
- `__yatasto_discarded_seen__` — contador "marcado como visto" del banner de descartes

**sessionStorage:**
- `yatasto:operario_activo` — `{ id, nombre, rol }` del operario logueado; se va al cerrar tab

**Section components** (each receives only `{ date }`):
- `SecIngresos` — milk truck arrivals; each entry has quality params (acidez, pH, GB, SNG, densidad, proteína, etc.) and a silo destination; concentrated products (`PRODS_CONCENTRADOS`) use a simplified form
- `SecCIP` — CIP (Cleaning In Place) records, split into silos tab and camiones tab; includes a separate filter-cleaning panel
- `SecCarga` — outgoing truck loads; labeled CARGA 1/2/3
- `SecMovimientos` — silo-to-silo transfers (movs tab) and quality controls per silo (ctrls tab)
- `SecStock` — per-shift silo stock levels (3 shifts: 07:00, 14:00, 21:00); auto-populates litros from `calcAutoLitros()` and infers product per silo from the latest ingreso
- `SecFortificados` — fortified milk batches with dynamic additions list (product + quantity + unit)
- `SecDashboard` — supervisor/jefe-only analytics; receives `{ date, perfil, perfilLabel, syncKey }`; accessible via the "supervisor" nav tab

**State pattern:** Each section loads in `useEffect` on date change. Every user action calls `persist()` which updates React state and calls `db.set()` immediately — no debounce, no submit button for section-level saves.

**Validation pattern:** Required fields are checked on the "Guardar" button click using an inline array of `[key, label]` pairs; missing fields are collected and shown as an inline `Banner` (no `alert()`). Confirmations use the `useConfirm()` hook (modal with Promise API) — never `window.confirm()`.

**Item IDs:** All list items use `id: crypto.randomUUID()` as a unique key.

**Authentication:** `PERFILES` defines three roles — `supervisor`, `jefe`, and `operador` — each mapped to an internal email (`supervisor@yatasto.internal`, `jefe@yatasto.internal`, `operador@yatasto.app`). The login form only resolves the username to an internal email client-side; the password is validated **server-side by Supabase Auth** (`db.auth.signIn(email, password)`). RLS on `yatasto_storage` restricts reads/writes to authenticated sessions. Role determines which UI actions are exposed (delete buttons, `SecDashboard` access, etc.).

**Operario (identidad de turno):** Capa adicional sobre la sesión base. El jefe crea operarios desde `SecUsuarios` (`Modal perfil → Gestionar operarios`). Cada operario tiene PIN hasheado (SHA-256 con sal). Cuando hay operarios activos en `yatasto:operarios`, la app abre `OperarioLogin` (chips + teclado PIN) automáticamente al loguearse el supervisor/jefe; la identidad queda en `sessionStorage`. Inactividad 5/10 min → warn + auto-logout del operario (`useInactivityLock`). Ventana ±30min de 07/14/21h muestra banner "¿Cambio de turno?".

**Audit trail (quién hizo qué):** Cada item de Ingresos / Carga / Movimientos / Fortificados / Producción se estampa con `stampOperario(item, { operario, perfil, perfilLabel })` al persistir. Inyecta `{ operarioId, operarioNombre, resp, savedAt }` y preserva `operarioIdOriginal` cuando otro operario edita un registro previo. Datos legacy sin `operarioId` siguen mostrándose con `resp` original.

**Permisos:** La matriz vive en `lib/permisos.js`. Los handlers `onDelete` siguen usando checks inline `perfil === "supervisor" || perfil === "jefe"` como segunda línea de defensa hasta el refactor a `tienePermiso()`. La defensa principal es RLS en Supabase.

**Step-up PIN:** Para acciones críticas (UX-V2 §2.3: eliminar lote finalizado, reabrir día >7d, cambiar saldo base, forzar CIP, eliminar ingreso de día cerrado) se puede pedir PIN de supervisor/jefe en vivo con `useStepUpPin()`. La autorización NO cambia la sesión activa, sólo desbloquea la acción y queda auditada (operario solicitante + supervisor autorizante).

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
- Turnos — viven en `lib/turnos.js` con vigencia por día operativo (`TURNOS_VIGENCIA_DESDE`): legacy `["07:00","14:00","21:00"]` para fechas históricas, `["05:00","13:00","21:00"]` desde la vigencia. Usar `turnosDe(date)` / `turnoLabelsDe(date)` / `turnoCierreDe(date)`; el día operativo corta a las 05:00 (`getToday()` en `lib/dates.js`, TZ America/Argentina/Buenos_Aires)
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

### Reglas operativas del proyecto Yatasto

Reglas decididas para este proyecto (no son del skill upstream, son
nuestras):

**Autoridad de decisión**

1. El council NO toma decisiones automáticamente.
2. El council propone escenarios, riesgos y tradeoffs.
3. La decisión final siempre la toma el usuario según contexto real de
   planta.
4. Priorizar siempre **operatividad y simplicidad** antes que sofisticación
   técnica.
5. Si una solución es más "elegante" pero aumenta riesgo operativo o
   complejidad para operarios, se descarta.
6. Contexto **industrial / mobile / offline-first** siempre tiene prioridad
   sobre patrones SaaS tradicionales.

**Cuándo NO usar council (resumen ejecutivo)**

- Fixes obvios
- Refactors mecánicos
- Bugs ya diagnosticados con causa raíz clara
- Cambios menores visuales (color, padding, label)
- PR reviews (usar agent `code-review`)

**Cuándo SÍ usar council**

- Navegación principal de UX-V2
- Login y permisos
- Arquitectura offline / sync
- Cambios en cálculos de stock / saldo
- Decisiones difíciles con tradeoffs reales
- Features que afecten operación de planta

**Antes de cada council importante**

- Leer `UX-V2.md`
- Leer `PRODUCT.md`
- Leer `CLAUDE.md` (este archivo)
- Asumir siempre en el framing:
  > "operarios con manos grandes, poca luz, estrés operativo, señal
  > inestable y necesidad de minimizar errores humanos"

**Después de cada council importante**

- Resumir la decisión real tomada (no la opinión del chairman — la decisión
  humana)
- Guardar solo decisiones relevantes en `docs/council/` con el formato del
  README de esa carpeta
- Evitar acumular transcripts inútiles (descartar los exploratorios)

**Workflow oficial**

```
council  →  diseño  →  PR chico  →  audit  →  merge
```

NO:

```
council eterno  →  sobreingeniería  →  features gigantes
```

Cada council debe terminar en una decisión accionable en ≤2 semanas. Si
una decisión queda "para más adelante", se descarta el transcript — fue
exploración, no decisión.
