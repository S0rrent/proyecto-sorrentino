# 05 — Comparación A vs B y recomendación

> Discovery frontend-dashboards-v2, 2026-07. Compara las alternativas del doc 03
> pantalla por pantalla y recomienda. Criterios fijos, en este orden (derivados de
> PRODUCT.md, UX-V2 §0 y las reglas operativas de CLAUDE.md):
>
> 1. **Riesgo operativo** — ¿puede inducir un error de registro o de lectura?
> 2. **Manos y luz** — dedos grandes, guantes opcionales, luz amarilla pobre o sol
>    directo: targets, contraste, escaneo a 2 metros.
> 3. **Offline-first** — ¿degrada con señal débil? ¿miente con datos incompletos?
> 4. **Paridad mobile/desktop** — pedido explícito del dueño: desktop real, no
>    mobile estirado.
> 5. **Costo/reversibilidad** — PRs chicos, cada uno mergeable y reversible.
>
> La sofisticación técnica NO es criterio (regla operativa: si lo elegante suma
> riesgo o complejidad para el operario, se descarta).

---

## 1. Tabla ejecutiva

| Pantalla | A conservadora | B ambiciosa | Recomendación |
|---|---|---|---|
| Aterrizaje | routing por perfil, cero UI nueva | A + franja de turno transversal | **A ya; franja de B después, con telemetría** |
| Dashboard Supervisor | reordenar: alertas arriba, card editorial | 4 tabs + drill-down + master-detail | **A como PR inmediato; B es el norte (A ⊂ B)** |
| Dashboard Jefe | bloque "solo jefe" al final | vista de gestión semanal propia | **A ya; B recién con agregación multi-día probada** |
| Stock | agrupar + chips estado + light | filas densas + detalle master-detail | **Híbrido: A en mobile, master-detail de B en desktop** |
| Ingresos | jerarquía de card (UI-PLAN §4.2) | timeline + duplicar último + master-detail | **A ya + master-detail desktop de B; "duplicar" tras telemetría** |
| CIP | pendientes primero + grid alineada | tablero de estado sanitario | **B-lite: A + bloque "requieren lavado" arriba** |
| Centro de alertas | panel unificado solo lectura | + badge, visto, umbrales editables | **A ya; badge de B barato y útil; umbrales editables al final** |

---

## 2. Argumento por pantalla

### 2.1 Aterrizaje — A, con la franja de B en segunda ola

- La parte de routing de A es gratis y de riesgo casi nulo; respeta el council al
  pie de la letra (nada de HOME).
- La franja de turno de B es deseable (identidad + alertas visibles en cualquier
  pantalla) pero roba 56px de viewport en mobile a TODAS las secciones. En un
  form de 20 campos con teclado abierto, 56px duelen. Antes de fijarla, medir
  con telemetría si el operario realmente entra al Centro de alertas desde
  cualquier pantalla o solo desde el dashboard (§4).
- En desktop la franja de B es gratis (vive en el header): puede entrar antes.

### 2.2 Dashboard Supervisor — A es el primer PR de B

- A y B comparten el 80%: alertas arriba, card editorial única, filas, tabla de
  calidad. B agrega fusión de tabs y drill-down.
- Con luz pobre y de un vistazo, lo que salva al supervisor es A (jerarquía);
  el drill-down de B es comodidad, no seguridad. Por criterio 1-2, A primero.
- El drill-down de B introduce el único riesgo real: navegación por estado para
  "saltar con silo preseleccionado". El council ya marcó el back-button de
  Android como zona de bugs; B se hace después y bajo flag.
- La fusión de 8-10 tabs en 4 debe validarse con `tab_open` de la telemetría:
  si nadie abre `historial` (hipótesis), se fusiona sin pérdida; si el jefe lo
  usa a diario, la fusión lo esconde (§4).
- **El prototipo `07-prototipos/dashboard-supervisor-light.html` implementa A
  con el layout desktop de B** (2 columnas + alertas full-width): es el punto
  medio recomendado.

### 2.3 Dashboard Jefe — A ya, B cuando la agregación multi-día esté probada

- Todo el valor inmediato del jefe (merma, rendimiento, eliminaciones, descartes)
  es **YA** en el doc 04 y cabe en el bloque de A. Un PR chico.
- B depende de agregar 7-14 días por sección con señal débil. Es exactamente el
  tipo de lectura que la Tanda 2 (lecturas confiables) enseñó a tratar con
  respeto: sin cache de días cerrados + conteo explícito de "días leídos",
  B miente. Primero la infraestructura (06 §tanda 13), después la vista.
- J7 (step-ups) y J9 (uso real) son NUEVO/parcial: no bloquean ni A ni B.

### 2.4 Stock — híbrido deliberado

- Mobile: la card actual con SVG es la firma visual de la app y el operario ya
  la conoce; A la mejora sin reaprendizaje (agrupar + chips + light). La fila
  densa de B en mobile pierde el SVG y comprime targets: contra criterios 1-2.
- Desktop: el pedido del dueño es paridad real. El grid de A es correcto pero el
  master-detail de B es mejor uso del ancho (lista completa + detalle editable
  sin modal) y es el patrón que UI-PLAN §3.2 ya fija para desktop.
- Riesgo del híbrido: dos cuerpos para la misma pantalla. Mitigación: mismos
  componentes (card = detalle; fila desktop = resumen de card), spec en 06.
- **El prototipo `07-prototipos/stock-light.html` muestra el lado mobile del
  híbrido (A) con la agrupación y los chips de estado.**

### 2.5 Ingresos — A + desktop de B; "duplicar último" se gana con datos

- La card jerárquica de A ya está especificada (UI-PLAN §4.2) y ataca el problema
  medido (01 §1.3). Sin discusión.
- Master-detail desktop de B = paridad pedida; el form de 3 paneles ya existe y
  se reusa tal cual en el panel derecho. Entra.
- "Duplicar último" y la timeline por franjas son apuestas sobre el flujo del
  pico de recepción. Son atractivas pero: (a) duplicar identificación puede
  propagar un transportista equivocado justo en el momento de más estrés, y
  (b) no hay datos aún de cuántos ingresos consecutivos comparten transportista.
  `save_ok` + timestamps de la telemetría responden (b) en dos semanas (§4).

### 2.6 CIP — B-lite

- Único caso donde B (parcial) gana de entrada: mostrar "requieren lavado"
  arriba usa un flag que YA existe (4015/4088) y convierte la pantalla en la
  checklist que operativamente es. Costo ≈ A.
- La parte completa de B (estado "en uso" derivado de stock, flujo guiado) se
  difiere: depende de `calcAutoLitros` sano en el momento de render y agrega
  un modo de fallo nuevo (mostrar "limpio" con lecturas incompletas). El
  guardrail de degradación del doc 03 §6B es condición de entrada.

### 2.7 Centro de alertas — A ya; badge sí; configuración al final

- A es casi enteramente presentación de cálculos existentes (5989-6000, CIP,
  QUALITY_REFS, cola offline) unificados en `lib/alertas.js` (04 §3.3). Alto
  valor, bajo riesgo: la anomalía deja de vivir al fondo del scroll.
- El badge de B es barato (patrón `__yatasto_discarded_seen__` ya existe) y da
  la mitad del valor de B. Entra con A o inmediatamente después.
- Umbrales editables por el jefe: al final. Tocan `yatasto:config`, necesitan
  validación de rangos y el costo de equivocarse es "apagar las alertas de la
  planta". Se hace cuando el resto esté estable (y con el guardrail de rango
  válido del doc 03 §7B).

---

## 3. Recomendación central

**Secuencia: A en todas las pantallas primero (con los tres injertos de B que
son baratos y seguros), B como segunda ola gobernada por telemetría.**

Los tres injertos de B que entran en la primera ola:

1. Desktop master-detail en Stock e Ingresos (paridad pedida por el dueño; el
   patrón ya está fijado en UI-PLAN §3.2).
2. Bloque "requieren lavado" arriba en CIP (flag existente, costo ≈ A).
3. Badge de alertas no vistas en CONTROL (patrón existente).

Por qué no B directo: cada pieza exclusiva de B (drill-down, timeline, tablero
sanitario completo, agregación semanal, umbrales editables) o bien depende de
datos de uso que todavía no existen, o bien agrega un modo de fallo offline
nuevo. En esta planta el costo de un dashboard que miente con señal débil es
mayor que el de un dashboard menos ambicioso. A entrega el 80% del valor con
~20% del riesgo, y B queda como norte explícito, no descartado.

Orden de PRs y tandas: doc 06.

---

## 4. Qué validar con telemetría ANTES de fijar cada apuesta de B

Mandato del council 2026-05-23: "no empezar el rediseño sin esos datos". Los
eventos ya instrumentados (verificados en telemetry.js y sus llamadas):
`tab_open`, `section_enter/leave`, `save_ok/save_queued/save_failed`,
`save_fail(field)`, `panel_open/close`, `form_cancel`, `stepup_*`,
`operario_login/logout`. Opt-in, cap 500/día, retención 14 días, por dispositivo.

| Hipótesis a validar | Evento(s) | Decide sobre | Criterio de corte (2 semanas de datos) |
|---|---|---|---|
| Las tabs `historial`/`exportar`/`difs` del dashboard casi no se abren | `tab_open` | Fusión 8-10 → 4 tabs (2B) | Tab con < 2 aperturas/semana se fusiona |
| El operario consulta alertas fuera del dashboard | nuevo evento `alert_open` (origen: franja vs dashboard) | Franja de turno (1B) en mobile | > 30% de aperturas desde secciones ≠ dashboard justifica la franja |
| Ingresos consecutivos comparten transportista en el pico | timestamps de `save_ok` en sección ingresos + campo transportista (agregación local) | "Duplicar último" (5B) | > 40% de pares consecutivos con mismo transportista |
| El supervisor entra a Stock tras ver una alerta de silo | `alert_tap` (nuevo) + `section_enter` | Deep-links con silo preseleccionado (2B/4B) | Secuencia alerta→stock en > 50% de alertas de silo |
| Los 19 silos se escanean o se busca uno puntual | `panel_open` por silo (nuevo, barato) | Fila densa vs cards en mobile (4B) | Acceso concentrado en < 6 silos favorece cards + colapso del resto |
| El dashboard se consulta en mobile o en desktop | `section_enter` + viewport (agregar campo) | Cuánto invertir en drill-down mobile (2B) | Si > 70% desktop, el drill-down mobile baja de prioridad |
| Cuellos del form de ingreso persisten | `save_fail(field)`, `form_cancel` | Si 5B necesita más que jerarquía de card | Campo con > 20% de los fails amerita rediseño puntual |

Eventos nuevos requeridos: `alert_open`, `alert_tap` (y campo viewport en
`section_enter`). Son 3 llamadas a `track()` — entran en el primer PR de la
tanda 13 (06).

**Condición previa obvia pero crítica:** la telemetría es opt-in
(`yatasto:telemetry=true`) y hoy puede estar apagada en los dispositivos de
planta. Encenderla en los dispositivos reales es el paso 0 de cualquier
validación, y el dump sigue siendo manual (`window.__yatastoTelemetry.dump()`).
