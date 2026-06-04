# Capacitación — fichas operativas por rol

Material para **capacitación real en planta**, no manual formal. Estilo directo, para imprimir/laminar y tener a mano. Describe **cómo cada persona hace su trabajo con la app tal cual está hoy** (branch `main`, sin los guardrails de Tanda A).

Cada ficha tiene **3 artefactos**:
1. **Primer día usando la app** — onboarding: qué pantallas, qué hace, qué no tocar, errores comunes, cómo pensar la app.
2. **Checklist operativo diario** — tarjeta de planta: antes del turno · durante · antes de guardar · antes de cerrar · si algo parece raro.
3. **Top 10 errores humanos reales** — errores plausibles bajo estrés/cansancio/mala señal: cómo detectarlos y cómo evitarlos.

| Rol | Perfil real | Ficha |
|---|---|---|
| Operario | `operador` | [operario.md](operario.md) |
| Supervisor | `supervisor` | [supervisor.md](supervisor.md) |
| Oficina | supervisor/jefe en escritorio (no es perfil propio) | [oficina.md](oficina.md) |
| Jefe | `jefe` | [jefe.md](jefe.md) |

**Base:** `docs/operacion/task-matrix-roles.md` (roles, permisos, guardrails reales), `docs/riesgos/registro-hazards.md` (IDs T/H/TH citados en los Top 10) y `docs/validacion/checklist-validacion-operativa.md`.

**Secuencia del proyecto:** validación operativa → *(estás acá)* capacitación → manual formal / onboarding / SOP / PDFs.

> Recordatorio transversal: la app **no corrige** los errores de carga (los guardrails de Tanda A no están mergeados). Por eso estas fichas insisten en los **chequeos manuales** antes de guardar y cerrar.
