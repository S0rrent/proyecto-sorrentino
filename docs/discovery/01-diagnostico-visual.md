# 01 — Diagnóstico visual del frontend actual

> Exploración de diseño (discovery), 2026-07. Base de código: `main` @ `fe0b672`.
> Toda cita `archivo:línea` fue verificada contra el fuente en esta rama.
> Documentos hermanos: `02-sistema-visual-propuesto.md` (qué hacer), `03-propuestas-pantallas.md` (dónde).

## 0. Resumen en cinco líneas

1. La app está **funcionalmente sana y táctilmente endurecida** (UX_V2 flag activo, targets 48-64px, safe-area completo), pero visualmente sigue siendo **dark-first con light como parche condicional** (`_THEME === "light" ? ... : ...` desparramado en 20+ lugares).
2. La migración a tokens está **a mitad de camino de la peor manera**: `C` ya es alias de los tokens OKLCH (`recibo_yatasto.jsx:230-232`) pero se congela al cargar el módulo, por eso cambiar de tema requiere `location.reload()` (`recibo_yatasto.jsx:9831-9843`).
3. El dashboard usa el **paquete completo del anti-patrón hero-metric SaaS**: gradiente + círculo decorativo + número centrado + label 9px uppercase, repetido 7 veces en grid (`recibo_yatasto.jsx:5197-5229`, instancias en `6742-6751`).
4. Los anti-patrones "graves" del UI-PLAN ya fueron erradicados en su mayoría: **cero** `alert()`, **cero** `window.confirm()`, **cero** bounce easing. Lo que queda es decorativo (gradientes, glows, círculos) y de jerarquía (todo grita al mismo volumen).
5. Hay una capa de componentes que **funciona bien y no hay que tocar**: Banner, Toast, useConfirm, empty states, SiloSVG, Section colapsable, SmartDecInp.

---

## 1. Jerarquía visual

### 1.1 Dashboard (SecDashboard, `recibo_yatasto.jsx:5068-7889`)

El tab "Resumen" apila, en este orden: header con chips de usuarios online (6646-6658), tab bar de 8-10 tabs (6662-6697), hero card de capacidad con DonutChart (6709-6739), grid 2×2 de StatCards (6742-6747), grid 3×1 de StatCards (6748-6752), panel de producción, alertas activas (6820).

Problemas concretos:

| Problema | Evidencia |
|---|---|
| 7 StatCards idénticas compiten al mismo volumen visual: "Balance" (decisión operativa) pesa lo mismo que "Movim." (conteo trivial) | `6742-6751` |
| El número más grande de la pantalla (26px, `6723`) es el % de capacidad total, un agregado que no dispara ninguna acción directa; las alertas activas, que sí la disparan, están al fondo del scroll | `6723` vs `6820` |
| Tab bar interna de hasta 10 tabs con labels de 9px uppercase — más tabs que el bottom nav de la app entera | `6662-6697`, fontSize 9 en `6693` |
| Tab activo con gradiente + sombra glow ámbar (`0 4px 14px ${C.accent}44`) + texto `#000` puro | `6680-6688` |
| DonutChart usado como decoración de un dato que ya está en texto al lado ("78.2%" dentro del donut y "78.2k de 100k L" al lado) | `6721-6729` |

### 1.2 Stock (SecStock, `recibo_yatasto.jsx:3939-4298`)

La card por silo es la mejor pantalla de la app en jerarquía: SiloSVG 80px + acumulado del día 16px mono arriba a la derecha (4184-4189), barra de nivel con tramo reservado rayado (4202-4221), panel Total/Reservado/Disponible (4226-4241), botón ENVASAR 15px de alto completo (4275-4279). El patrón rayado del tramo reservado (`repeating-linear-gradient`, 4215) es **funcional**, no decorativo: distingue reservado de disponible sin depender solo del color. Conservar.

Problemas: glow `boxShadow: 0 0 6px ${fillColor}66` en la barra (4209, 4218); labels de 10px en el panel de litros (4228, 4233, 4238); 19 silos en un solo scroll sin agrupación visual entre silos principales y tanques.

### 1.3 Ingresos (SecIngresos `1960-2267`, IngresoForm `1495-1959`)

El form ya se dividió en 3 paneles colapsables ("1. Identificación" `1801`, "2. Litros & Destino" `1827`, "3. Calidad" `1841`) con contador filled/total y estado de error por panel (`Section`, 1446-1493). Eso es la implementación del PR3 de UX-V2 y funciona.

Problema restante: las cards de la lista no jerarquizan. Litros, tambo, hora y destino comparten tamaño; el dato que el supervisor escanea (litros) no domina. UI-PLAN §4.2 ya especifica la card correcta (litros 32px mono / 700).

### 1.4 Shell (header `9770-9930`, sidebar `9413-9468`, bottom bar `10036-10076`)

- Bottom bar: hasta 8 tabs (6 base `106-113` + Prod. + Superv. para supervisor/jefe, `8932-8942`). Con UX_V2: icon 28px, label 11px, minHeight 64 — el hardening de PR1 está hecho. Indicador activo: `borderTop 2.5px` + **glow drop-shadow en el ícono** (`filter: drop-shadow(0 0 6px ${C.accent}88)`, `10064`) — el glow es ornamental.
- Sidebar desktop (220px) ya existe y funciona, pero el indicador activo es `borderLeft: 3px solid` (`9440`) — exactamente el anti-patrón que UI-PLAN §5.9 pide reemplazar por fondo lleno.
- Header: botones de 34×34 en varias acciones (theme toggle `9830`, perfil `9878`) — debajo del mínimo 44px que la propia UX-V2 §10.2 fija.

---

## 2. Densidad y legibilidad

- **38 ocurrencias de `fontSize: 9-10`** en recibo_yatasto.jsx (muestra: 3426, 3797, 3800, 3809, 3878, 4159, 6625, 6693, 6717, 6734-6735, 7689). En una app que se lee con sol directo o luz amarilla pobre, 9px es ruido: o el dato importa (subirlo a 12) o no importa (sacarlo).
- Los labels base ya se corrigieron: `lbl` es 12px/600 (`248`) — el diagnóstico de UI-PLAN §1 ("labels en 10px") ya no aplica al átomo, pero sí a los usos ad-hoc listados arriba.
- Inputs: 16px, minHeight 48, mono (`240-247`). Correcto.
- Números operativos: mayormente en `FONT_MONO` (JetBrains Mono con fallback), pero conviven con 11 usos residuales de `'Courier New'` como fallback en el HTML exportado (5409, 5467, 5499, 5521, 5552, 5555, 5983, 6077, 6096, 6114, 6137-6139). Cosmético, no urgente.

---

## 3. Consistencia: C-legacy vs tokens

Medición real (sweep con ripgrep sobre esta rama):

| Patrón | Conteo | Notas |
|---|---|---|
| Usos de `C.` (legacy) en recibo_yatasto.jsx | **~745** | C.accent, C.bg, C.card, C.sub, etc. |
| Usos directos de tokens | **~26** | FONT_MONO ~20, EASE_OUT 4 (1014, 5037, 5279, 6731), DUR 2 (1014, 1441) |
| Import de tokens.js | 1 archivo | `recibo_yatasto.jsx:3` importa DARK, LIGHT, FONT_SANS, FONT_MONO, EASE_OUT, DUR |
| Condicionales `_THEME === "light"` inline | 20+ | 5201, 5207, 5252, 6600, 6606, 6610, 6635, 6682, 6710, 6775, 6806, 6818, 6897, 6939, 6950, 9419, 9775, 10042... |

El punto crítico: **la paleta ya migró, el mecanismo no.**

```js
// recibo_yatasto.jsx:229-232
const _THEME = (() => { try { return localStorage.getItem("yatasto:theme") || "dark"; } catch { return "dark"; } })();
const C_DARK  = DARK;      // ← alias directo a tokens.js
const C_LIGHT = LIGHT;
const C = _THEME === "light" ? C_LIGHT : C_DARK;
```

Consecuencias:
1. Cambiar tema = `location.reload()` con guardado de sesión previa (`9831-9843`). Esto **bloquea el auto-switch al turno noche** (decisión del dueño 2026-07-14): no podés recargarle la página a un operario a las 21:00 con un form abierto.
2. Cada lugar donde el light necesita algo distinto del dark se resuelve con un ternario inline en vez de un token (sombras 9419/9775/10042, fondos 6682, semánticos hardcodeados 6806/6818: `"#f0fdf4"`, `"#160808"`...).
3. `components/Toast.jsx` define sus propios OKLCH inline (Toast.jsx:96-114) en vez de consumir tokens — deriva ya visible.

---

## 4. Anti-patrones presentes (lista concreta)

Contra la lista prohibida de UI-PLAN §9 / UX-V2 §10.5:

| Anti-patrón | Estado | Evidencia (archivo:línea) |
|---|---|---|
| **Hero-metric SaaS completo** (gradiente + adorno + número + label mini) | PRESENTE | StatCard `5197-5229`: gradiente 145deg (5201-5203), círculo decorativo absoluto 50×50 (5209-5212), label 9px uppercase (5220), triángulos ▲▼ de trend (5224). 7 instancias en `6742-6751` |
| **Card grids idénticas** | PRESENTE | Grid 2×2 + grid 3×1 de la misma StatCard (`6742-6752`) |
| **Gradientes decorativos** | PRESENTE | StatCard 5201-5203; SiloBar 5252-5254 y 5278; hero capacidad 6710-6712; header dashboard 6600-6602 + patrón de puntos radial 6610-6612; tab activo 6681; informes HTML exportados con covers `linear-gradient(135deg, #0c1a3a...)` 5426, 6032 y gauges hardcodeados 5708-5710, 6308-6310 |
| **Glow / sombras ámbar** | PRESENTE | FAB `boxShadow 0 4px 24px ${C.accent}55` (~1213); tab activo 6688; icono nav activo `drop-shadow` 10064; barra stock 4209/4218; SiloBar 5257 |
| **border-left decorativo ≥2px** | PRESENTE (2) | Card de lote producción `3791` (3px), sidebar item activo `9440` (3px) |
| **#000 / #fff puros** | PRESENTE (17) | 251, 1213, 1226-1227, 1353, 5202, 5253, 6682, 6686, 8370, 8623, 9384, 9403, 9865 (¡#000 sobre `#3b82f6` hardcodeado!), 9963, 10144, 10174 |
| **fontSize 9-10 ad-hoc** | PRESENTE (38) | ver §2 |
| **Gradient text** | AUSENTE | — |
| **Glassmorphism** | AUSENTE | — |
| **Bounce/elastic easing** | AUSENTE | tokens.js:64-65 solo define ease-out-quart y ease-in-out; `cubic-bezier` con overshoot: 0 ocurrencias |
| **`alert()` para validación** | AUSENTE | 0 llamadas; el comentario en 1219 documenta el reemplazo |
| **`window.confirm()`** | AUSENTE | 0 llamadas; `useConfirm()` en 1341 con 8 usos (1969, 2558, 2816, 3019, 3569, 4591, 8446, 8924) |
| **Em-dash en copy de UI** | PRESENTE (menor) | ej. "Día cerrado — no se guardaron cambios" `9481`; UI-PLAN §9 lo prohíbe en copy |

Nota sobre los informes HTML exportados (5358-6560): tienen su propio CSS con gradientes y covers azul-marino hardcodeados. Son documentos imprimibles, no UI de la app — quedan fuera del alcance de este discovery, pero al pasar a light-first conviene alinear su paleta en una tanda posterior.

---

## 5. Deuda específica para light-first

Con la decisión del dueño (2026-07-14: LIGHT primario, DARK para turno noche), esto pasa de cosmético a bloqueante:

| Deuda | Evidencia | Impacto en light |
|---|---|---|
| SiloSVG con cuerpo hardcodeado dark | fondo `#1e2438` (1045), contorno/anillos/patas `#3a4460` (1068-1098), fallback barra `#3a4460` (4206) | El silo (firma visual) se ve "de noche" sobre fondo claro |
| LOGO_COLOR ternario | `4985`: light `#0f172a`, dark `#dc2626` | El rojo brand desaparece justo en el modo primario |
| Sombras/elevación por ternario inline | 9419, 9775, 10042, 5207, 6606 | Light necesita elevación por sombra sutil (tokens), hoy improvisada |
| Semánticos light hardcodeados | `#f0fdf4` (6806), `#fef2f2` (6818), `#fff` (6682) | Sin token `successBg`/`dangerBg`, cada pantalla inventa el suyo |
| tokens.js sin `warning` | tokens.js:10-38 solo success/danger; Banner usa `C.accent` como warning (1227) | Warning ámbar se confunde con brand ámbar en dark; en light el accent es rojo y un "warning" rojo = error |
| Default dark | `229` | Contradice la decisión light-first |

---

## 6. Lo que YA está bien — no tocar

| Pieza | Evidencia | Por qué se conserva |
|---|---|---|
| **SiloSVG** (firma visual) | 1011-1101: respeta `prefers-reduced-motion` (1012-1014), anima con `DUR.silo` + `EASE_OUT` de tokens, gradiente de llenado es *representación de líquido* (funcional, no decoración), silueta industrial reconocible | Es el elemento de identidad más fuerte de la app. Solo necesita variante light del cuerpo (§5) |
| **Banner** | 1224-1261: variantes error/warning/info, `role="alert"`/`aria-live` correctos, sticky opcional | API completa, accesible; reemplazó a alert() |
| **Toast** | components/Toast.jsx: ok/warn/error, máx 3, auto-dismiss, `aria-live="polite"`, safe-area (124) | Sólo debería consumir tokens en vez de OKLCH propios |
| **useConfirm** | 1341+, 8 usos | Modal con Promise API, patrón correcto |
| **Empty states** | 2128 ("Sin ingresos registrados hoy"), 2910, 6982, 7777, 7868, 8092, 8166 | Icono desaturado + mensaje + hint de acción, consistentes |
| **Section colapsable** | 1446-1493: header 56px, contador filled/total, `aria-expanded`, estado de error por panel | Resuelve el form de 20 campos en mobile |
| **SmartDecInp** | 1133-1180: coma/punto, inputMode decimal, formateo al blur | Diseñado para teclado iOS del operario |
| **Safe-area** | 11 usos de `env(safe-area-inset-*)`: 1211, 9358, 9386, 10043, Toast.jsx:124... | Completo, no repetir trabajo |
| **Touch hardening UX_V2** | flag `237`; inputs 48px (244), botones 48px (253/260), nav 64px (10054) | PR1 de UX-V2 ya mergeado |
| **Barra de reservado rayada** | 4212-4220 | Patrón visual funcional (no-solo-color) |
| **Telemetría** | telemetry.js + track() en `9959-9961` (section_enter/leave) y `10048` (tab_open) | Es la evidencia que el council exigió; ya está juntando |

---

## 7. Síntesis: los cinco problemas raíz

1. **Tema estático a nivel módulo** (229-237). Bloquea light-first, auto-switch nocturno y cualquier tema sin reload. Es el primer dominó: sin resolverlo, todo lo demás se implementa dos veces.
2. **El dashboard informa pero no prioriza.** 7 KPIs idénticos + 10 tabs + donut: el supervisor tiene que *buscar* la anomalía en vez de que la anomalía lo busque a él. Las alertas activas existen (6820) pero viven al fondo.
3. **Decoración heredada del dark**: gradientes, glows y círculos que en dark "iluminaban" y en light van a verse como manchas. Se van todos con el reemplazo del StatCard y la limpieza de sombras.
4. **Micro-tipografía ad-hoc** (38 × 9-10px) que contradice el propio sistema (TYPE_SCALE arranca en 12).
5. **Tokens sin vocabulario semántico**: falta warning, faltan fondos semánticos (successBg/dangerBg/warningBg), faltan estados operativos de silo (ok/reservado/crítico/sucio/limpio). Cada pantalla los improvisa con hex + alpha (`${col}18`, `#f0fdf4`...).

El documento 02 propone el sistema que resuelve 1, 3, 4 y 5; el documento 03 resuelve 2 pantalla por pantalla.
