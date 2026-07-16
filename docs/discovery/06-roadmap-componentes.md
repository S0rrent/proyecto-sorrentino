# 06 — Roadmap incremental y inventario de componentes

> Discovery frontend-dashboards-v2, 2026-07. Ejecuta la recomendación del doc 05
> en PRs chicos alineados a las tandas 11-15 del plan maestro:
> **11 light primario → 12 átomos/shell → 13 dashboards → 14 nav council → 15 pantallas.**
>
> Reglas de la casa que este roadmap respeta:
> - Workflow oficial: council → diseño → PR chico → audit → merge (CLAUDE.md).
> - Cada PR mergeable solo, reversible, ~80-300 líneas netas.
> - No se tocan cálculos ni props de `Sec*` (UX-V2 §0).
> - Checklist de conformidad del doc 02 §7 se corre en CADA PR de estas tandas.

---

## 1. Roadmap por tanda

### Tanda 11 — Light primario (el dominó de base, 01 §7.1)

| PR | Contenido | Depende de | Riesgo |
|---|---|---|---|
| 11.1 | `tokens.js`: agregar `warning`, `successBg/warningBg/dangerBg/infoBg`, `shadowCard/shadowSheet/focusRing` a DARK y LIGHT (02 §1.2). Cero consumo aún: solo exports + test de contraste | — | nulo |
| 11.2 | Tema por hora, Fase A (02 §4.2): `yatasto:theme` acepta `"auto"` (default), decide al cargar módulo; banner "Pasar a modo noche" si la app cruza las 21:00 abierta (reusa `saveSessionForReload` 9832) | 11.1 | bajo |
| 11.3 | Fase B: paleta a CSS custom properties en `:root`, `C` pasa a proxy de `var(--*)`, switch por atributo `data-theme` sin reload; `setInterval` 1 min para la franja 21-05 (patrón `useShiftChange`) | 11.2 | medio — es EL PR delicado de la tanda; smoke test en los 4 viewports |
| 11.4 | Barrido de ternarios `_THEME === "light"` (20+, lista en 01 §3) → tokens de 11.1; `components/Toast.jsx` consume tokens | 11.3 | bajo (mecánico) |
| 11.5 | SiloSVG variante light (cuerpo/contorno por token, 02 §5) + stroke para Leche Cruda + `LOGO_COLOR` resuelto | 11.3 | bajo |

**Gate de salida tanda 11:** light por defecto en horario diurno, dark automático
21-05, cero `location.reload()` para cambiar tema, cero ternarios de tema en
componentes.

### Tanda 12 — Átomos y shell

| PR | Contenido | Depende de | Riesgo |
|---|---|---|---|
| 12.1 | `components/Btn.jsx` (spec §2.1) + migrar `btnPrimary/btnSecondary` compartidos | 11.1 | bajo |
| 12.2 | `components/Sheet.jsx` adaptativo (spec §2.2): mobile = bottom-sheet actual, desktop = dialog centrado con focus trap/ESC. `Modal` queda como alias durante la migración | 12.1 | medio (focus trap + scroll lock ya resuelto antes, no romperlo) |
| 12.3 | Shell: header con targets 44px (34px actuales: 9830, 9878), sidebar activo por fondo lleno (muere `borderLeft 3px` 9440), muere el drop-shadow del ícono nav (10064) | 11.4 | bajo |
| 12.4 | Barrido tipográfico: 38 usos de fontSize 9-10 → 12 o eliminación (lista 01 §2); 17 usos de `#000`/`#fff` → tokens (lista 01 §4); em-dash fuera del copy visible | 11.4 | bajo (mecánico, PERO revisar cada 9px: algunos se eliminan, no se agrandan) |

**Gate de salida tanda 12:** ningún target < 44px, ningún fontSize < 12,
ningún hex puro, Btn/Sheet listos para que la tanda 13 no invente estilos.

### Tanda 13 — Dashboards (implementa 03 §2A/§3A/§7A + injertos del doc 05 §3)

| PR | Contenido | Depende de | Riesgo |
|---|---|---|---|
| 13.1 | `lib/alertas.js`: predicados puros + umbrales unificados (04 §3) con tests; consolida 5989-6000, CIP requerido y calidad fuera de rango. Sin UI todavía | — (paralelizable con tanda 12) | bajo |
| 13.2 | `StatCard` editorial + `MetricRow` (spec §2.3/§2.4): reemplaza el StatCard SaaS (5197-5229) y sus 7 instancias; muere el donut decorativo (6721-6729) | 12.1 | medio (pantalla más visible del supervisor) |
| 13.3 | Resumen reordenado: alertas arriba vía `AlertRow` (spec §2.5) consumiendo `lib/alertas.js`; bloque "solo jefe" (03 §3A) | 13.1, 13.2 | bajo |
| 13.4 | `DataTable` (spec §2.6) + migrar tabs calidad/difs/tambos/auditoría (hoy tablas ad-hoc: 7760, 7852, 8095, 8169, 8232) | 12.4 | medio |
| 13.5 | `SyncStatus` (spec §2.7) en header + Centro de alertas 7A (sheet/panel) + badge no-vistas + eventos `alert_open`/`alert_tap` (05 §4) | 13.1, 12.2 | bajo |

**Gate de salida tanda 13:** la anomalía se ve sin scroll en mobile y desktop;
dashboard sin gradientes/glow/donut; telemetría de alertas juntando datos.

### Tanda 14 — Nav del council (bajo flag, gobernada por datos)

| PR | Contenido | Depende de | Riesgo |
|---|---|---|---|
| 14.0 | **Gate de datos, no PR:** encender telemetría en dispositivos de planta, 2 semanas, analizar `tab_open`/`section_enter` (05 §4). El council lo exige antes de tocar nav | 13.5 | — |
| 14.1 | `NAV_V2 = [INGRESOS, STOCK, MOVIMIENTOS, MENÚ]` bajo flag `uxV2` (~80 líneas según dimensionó el Executor del council); MENÚ = sheet con CIP, Carga, Fortificados, Producción, cambiar día, sesión | 12.2 | bajo (flag = kill switch) |
| 14.2 | Variante supervisor/jefe: 4to slot = CONTROL (aterrizaje al dashboard, 03 §1A); routing de aterrizaje por perfil | 14.1 | bajo |
| 14.3 | Ajuste post-datos: si la telemetría contradice la jerarquía (ej. CIP > Movimientos), se cambia el slot ANTES de quitar el flag; recién después se retira el nav viejo | 14.0-14.2 | bajo |

**Gate de salida tanda 14:** 4 tabs de ≥90px de ancho @360px, STOCK a 1 tap,
paridad funcional con las 8 secciones, flag retirado solo con datos a favor.

### Tanda 15 — Pantallas (implementa doc 05: A + injertos de B)

| PR | Contenido | Depende de | Riesgo |
|---|---|---|---|
| 15.1 | Stock mobile 4A: agrupación `SILOS_GRUPO`/`PROCESO_GRUPO`, chips `SILO_STATE` (`lib/silo-estado.js` + tests), limpieza de glow | 11.5, 13.1 | bajo |
| 15.2 | Stock desktop master-detail (4B desktop): lista densa + panel detalle | 15.1, 12.2 | medio |
| 15.3 | Ingresos: card jerárquica (5A, UI-PLAN §4.2) + marca de calidad vía QUALITY_REFS | 12.4 | bajo |
| 15.4 | Ingresos desktop master-detail (5B desktop): form de 3 paneles inline en panel derecho + confirm de draft sucio | 15.3, 12.2 | medio |
| 15.5 | CIP B-lite (05 §2.6): bloque "requieren lavado" arriba + grid de fila alineada + dos columnas desktop | 13.1 | bajo |
| 15.6 | Franja de turno 1B + segunda ola de B (drill-down 2B, gestión jefe 3B, duplicar último 5B, umbrales editables 7B) — **cada una condicionada a su criterio de corte del doc 05 §4** | 14.3 + datos | por pieza |

---

## 2. Inventario de componentes

Convención general: todos consumen tokens (cero hex inline), aceptan `style`
override SOLO para layout (margin/grid-area), y viven en `components/` con test
RTL como los existentes (Toast, OperarioLogin).

### 2.1 `Btn`

Ya especificado en UI-PLAN §5.7; se confirma con dos agregados de planta
(`fullWidth`, `srLabel`).

```jsx
<Btn
  variant="primary"   // primary | secondary | ghost | danger
  size="md"           // sm 32 (solo desktop denso) | md 44 | lg 52
  leftIcon={Ingresos} // componente de icons.js, SW=1.75
  rightIcon={...}
  loading={false}     // spinner SVG, deshabilita, conserva ancho
  disabled={false}    // opacity .5 + cursor not-allowed + tooltip opcional
  fullWidth={false}
  srLabel="..."       // aria-label cuando el botón es solo ícono
  onClick={fn}
/>
```

Guardrail: `size="sm"` prohibido en mobile (lint manual en review).

### 2.2 `Sheet` (mobile) / `Dialog` (desktop) — wrapper adaptativo

Reemplaza a `Modal` manteniendo su API (migración por alias).

```jsx
<Sheet
  title="Nuevo ingreso"
  onClose={fn}
  zIndex={40}          // compat con stacking actual de Modal
  maxWidth={560}       // solo Dialog
  maxHeightVh={70}     // solo Sheet (UX-V2 §10.5: nunca >70%)
  dismissible={true}   // backdrop-click/ESC; false para flujos con draft sucio
  footer={<Btn.../>}   // barra de acciones sticky
>
```

Comportamiento: `useViewport()` decide cuerpo; Dialog agrega focus trap, ESC,
`role="dialog"` + `aria-modal` + `aria-labelledby`; ambos respetan
`prefers-reduced-motion` y safe-area. Incrementa/decrementa
`document.body.dataset.yatModalCount` (lo usa el guard de tema/SW, 9395-9399).

### 2.3 `StatCard` (editorial, 02 §3.3)

```jsx
<StatCard
  label="Balance del día"
  value={12450}
  format="litros"      // litros | pct | int | custom(fn) — mono tabular
  tone="success"       // neutral | success | danger | warning (SOLO el número)
  icon={Balance}       // 16px, sub, esquina superior derecha
  context="ingresado 86.150 · cargado 73.700"  // el "por qué", 12px sub
  onClick={fn}         // opcional: drill-down (2B); agrega estados hover/focus
/>
```

Guardrails integrados: alineada a la izquierda, sin gradiente/círculo/trend
suelto, y **máximo una por vista** (las demás métricas van en `MetricRow`) —
documentado en el JSDoc del componente para frenar el regreso del grid.

### 2.4 `MetricRow` (compañera de StatCard, doc 03 §2A)

```jsx
<MetricRow
  icon={CIP}
  label="CIP completados"
  sublabel="faltan: 60, LINEA 2"
  value="7"  unit="de 10"        // mono tabular, alineado derecha
  bar={0.62}                     // opcional: barra inline 96px (reemplaza donut)
  tone="neutral"
  onClick={fn}
/>
```

### 2.5 `AlertRow`

Consume el shape de `lib/alertas.js` (04 §3.3).

```jsx
<AlertRow
  sev="critico"        // critico | atencion | sistema → color+icono+fondo *Bg
  icon={AlertCircle}   // override opcional; default por sev
  titulo="Silo 80 al 92 por ciento"
  detalle="73.600 de 80.000 L · máx. recomendado 76.000"
  accion={{ label: "Ver stock", onTap: fn }}  // deep-link a la sección
  ts={Date}            // "hace 8 min" (7B)
  nueva={false}        // resalte "no vista" (7B); nunca reordena
/>
```

Alto mínimo 64px, grid `[24px icono | 1fr texto | auto acción]`; el botón de
acción es target propio ≥44px.

### 2.6 `DataTable`

Spec visual en 02 §3.2 (header sticky 12px, filas 44px, sin zebra, anomalía
solo en la celda).

```jsx
<DataTable
  columns={[
    { key: "param", label: "Parámetro" },
    { key: "prom",  label: "Promedio", align: "right", mono: true },
    { key: "ref",   label: "Referencia", align: "right", sub: true },
  ]}
  rows={rows}  rowKey="id"
  cellTone={(row, col) => "warning"}  // pinta LA CELDA (fondo *Bg + icono)
  onRowTap={fn}                        // opcional (drill-down)
  mobileMode="pairs"                   // pairs (lista clave-valor) | scroll (prohibido por defecto)
  empty="Sin registros hoy"
/>
```

### 2.7 `SyncStatus`

Chip de header. Fuentes verificadas en db-adapter: `onWriteQueueChange(fn)` →
`(pendingCount, isRetrying)`, `onDiscarded(fn)`, `listDiscarded()` (cap 50).

```jsx
<SyncStatus
  onTap={fn}   // abre Centro de alertas, grupo "sistema"
/>
// estados internos (derivados, sin props de datos):
// synced     → check verde  "Sincronizado"
// pending    → reloj ámbar  "3 sin guardar" (pendingCount > 0)
// retrying   → reloj ámbar animado (isRetrying)
// offline    → wifi-off sub "Sin conexión" (navigator.onLine === false)
// discarded  → alerta roja  "3 descartadas" (listDiscarded().length > seen)
```

Regla: color + icono + texto SIEMPRE (02 principio 3); el estado `discarded`
tiene prioridad visual sobre todos.

### 2.8 Módulos puros que acompañan (sin React, con tests)

| Módulo | Contenido | Tanda |
|---|---|---|
| `lib/alertas.js` | predicados + severidad + umbrales unificados (04 §3) | 13.1 |
| `lib/silo-estado.js` | derivación ok/reservado/critico/sucio/limpio (02 §1.3) | 15.1 |

---

## 3. Dependencias externas al roadmap

- **Tanda 14 no arranca sin el gate 14.0** (telemetría encendida en planta):
  responsabilidad del dueño/jefe, no de un PR.
- Los prototipos de `07-prototipos/` son la referencia visual de 13.2-13.5 y
  15.1; no son código a importar (HTML estático con datos ficticios).
- Los informes HTML exportados (5358-6560) quedan explícitamente FUERA de las
  tandas 11-15 (01 §4, nota final); alinear su paleta es una tanda posterior.
