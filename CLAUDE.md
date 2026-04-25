# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-file React app (`recibo_yatasto.jsx`) for dairy operations at Lacteos Yatasto SA (Argentina). Tracks daily milk intake (ingresos), CIP cleaning, truck loading (carga), silo movements, and shift stock.

The app runs inside **Antigravity** (a VS Code-based IDE) which provides `window.storage` — a key/value persistence API used instead of localStorage. All data access goes through `load(date, section, default)` and `save(date, section, data)` helpers.

## Architecture

The entire app is one JSX file. No build step, no package.json, no external dependencies beyond React (provided by the runtime).

**Storage keys** follow the pattern `yatasto:YYYY-MM-DD:section` where section is one of: `ingresos`, `cip`, `carga`, `movimientos`, `stock`.

**Section structure:**
- `SecIngresos` — milk truck arrivals with quality parameters (acidez, pH, GB, SNG, densidad, proteína, etc.)
- `SecCIP` — CIP (Cleaning In Place) records for silos and trucks
- `SecCarga` — outgoing truck loads
- `SecMovimientos` — silo-to-silo transfers and quality controls
- `SecStock` — per-shift silo stock levels (3 shifts: 05:00, 14:00, 21:00)

**Shared UI atoms** (`F`, `Inp`, `Sel`, `Pair`, `FAB`, `Modal`) and style constants (`C` for colors, `inp`/`lbl`/`card`/`panel`/`btn*` for shared styles) are defined at the top of the file and reused across all sections.

**State pattern:** Each section component loads its data in `useEffect` on date change, and persists on every user action via `persist()` helper that updates both React state and `window.storage`.

## Domain Constants

- `TAMBOS` — milk supplier farms with numeric IDs
- `SILOS` / `SILOS_TODOS` / `STOCK_SILOS` — different silo subsets used in different contexts
- `CIP_SILOS` — silo names for CIP records (different naming convention than storage silos)
- `CAMIONES_LIST` — truck names for CIP
- `TURNOS` — shift start times: `["05:00", "14:00", "21:00"]`

## Styling

All styles are inline JS objects. The color palette is in the `C` constant (dark theme, amber accent `#f59e0b`). UI uses Courier New monospace for numbers/times. No CSS files.
