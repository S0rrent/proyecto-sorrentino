# 03 — Propuestas por pantalla (A conservadora / B ambiciosa)

> Discovery frontend-dashboards-v2, 2026-07. Hermanos: `01` (diagnóstico), `02` (sistema),
> `04` (métricas), `05` (comparación y recomendación), `07-prototipos/` (HTML).
>
> **Reglas duras que gobiernan todo este documento:**
> 1. Council 2026-05-23 (`docs/council/2026-05-23--bottom-nav-operario.md`): **NO existe
>    home nuevo del operario**. Nav final: 4 tabs planos `INGRESOS / STOCK / MOVIMIENTOS / MENÚ`
>    (supervisor/jefe: el 4to slot es `CONTROL`). Sin hub OPER, sin pantalla HOME.
>    El wireframe HOME de UX-V2 §4 queda **superseded** por esa decisión.
> 2. Decisión del dueño 2026-07-14: LIGHT primario, DARK para turno noche, y **paridad
>    mobile/desktop real** (desktop no es mobile estirado; PRODUCT.md principio 3).
> 3. UX-V2 §0: no se tocan cálculos (`calcAutoLitros`, `buildChainedSaldo`, ...) ni los
>    props de los `Sec*`. Todo lo de acá es capa de presentación + lectura.
> 4. Sistema visual: doc 02. Anti-patrones: UI-PLAN §9. Nada de lo dibujado acá los viola.
>
> Convención de wireframes: `[x]` acción tocable, `▓░` barra de nivel, `▒` tramo
> reservado rayado, `(!)` icono de alerta, `✓` icono check. Los números son ficticios.

---

## Índice

1. [Aterrizaje](#1-aterrizaje)
2. [Dashboard Supervisor](#2-dashboard-supervisor)
3. [Dashboard Jefe](#3-dashboard-jefe)
4. [Stock](#4-stock)
5. [Ingresos](#5-ingresos)
6. [CIP](#6-cip)
7. [Centro de alertas](#7-centro-de-alertas)

---

## 1. Aterrizaje

**Estado actual:** la app abre en la última tab o en Ingresos; el supervisor tiene que
navegar hasta el tab "supervisor" (bottom bar de hasta 8 tabs, `recibo_yatasto.jsx:8932-8942`)
para ver el dashboard. No hay concepto explícito de "pantalla de aterrizaje por perfil".

**Regla dura:** el council prohibió el HOME del operario. "Aterrizaje" acá significa
únicamente **a qué sección existente te deja la app al abrir**, no una pantalla nueva.

### 1A — Conservadora: aterrizaje = primera tab del perfil

Cero pantallas nuevas. Al autenticar (sesión base + PIN de operario si aplica):

| Perfil | Aterriza en | Por qué |
|---|---|---|
| operario | `INGRESOS` (tab 1) | Es la acción más frecuente del turno (UX-V2 §2.1: cada 5-15 min). El pico de recepción arranca 07:00: la app abre lista para registrar. |
| supervisor / jefe | Dashboard (tab `CONTROL`) | El council lo permite explícitamente; su primera pregunta del día es "¿está todo bien?", no "registrar". |

**Mobile (operario, 07:12):**

```
┌────────────────────────────────────┐
│ YATASTO   mié 15 jul   ✓sync  [CD] │  header actual (CD = chip operario)
├────────────────────────────────────┤
│ INGRESOS DE HOY               14   │
│ ┌────────────────────────────────┐ │
│ │ 🚛 LOS TILOS · 13      13:42   │ │   (cards actuales de SecIngresos,
│ │ 12.450 L  → Silo 100 N         │ │    jerarquía nueva en pantalla §5)
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ...                            │ │
│                              (+)   │  FAB actual
├────────────────────────────────────┤
│ [INGRESOS] [STOCK] [MOVIM.] [MENÚ] │  4 tabs council, 64px, pill activa
└────────────────────────────────────┘
```

**Desktop (supervisor, mismo aterrizaje pero al dashboard):**

```
┌──────────┬─────────────────────────────────────────────┐
│ YATASTO  │ Panel de control        mié 15 jul  ✓sync   │
│          ├─────────────────────────────────────────────┤
│ Ingresos │  ALERTAS ACTIVAS (3)                        │
│ Stock    │  (!) Silo 80 al 92%           [Ver stock]   │
│ Movim.   │  ...                                        │
│ ▐Control │  BALANCE DEL DÍA   +12.450 L                │
│          │  ...(dashboard §2)...                       │
│ Laura S. │                                             │
└──────────┴─────────────────────────────────────────────┘
```

- **Qué va arriba y por qué:** nada nuevo arriba; el contenido de la sección de
  aterrizaje manda. La decisión es solo de *routing*.
- **Acciones:** las de la sección destino. Ninguna nueva.
- **Guardrails:**
  - Recordar la última tab **solo dentro de la misma sesión** (sessionStorage);
    al abrir la app de cero, siempre la tab del perfil. Evita aterrizar en una
    pantalla de hace 8 horas con datos viejos (UX-V2 §5.6.5: hora visible siempre).
  - Si `calcAutoLitros` reporta `_lecturasFallidas` (retorno verificado,
    `recibo_yatasto.jsx:580-783`), el dashboard de aterrizaje muestra el banner de
    lecturas fallidas ANTES que cualquier número: nunca aterrizar sobre datos que
    parecen completos y no lo son.

### 1B — Ambiciosa: aterrizaje A + franja de turno transversal

Igual routing que A, más una **franja de contexto de 56px** persistente arriba del
contenido en TODAS las secciones (no es una pantalla; es un componente, como el
banner de día cerrado actual `9481`). Es la respuesta barata a lo que HOME quería
resolver, sin violar el council.

**Mobile (cualquier sección):**

```
┌────────────────────────────────────┐
│ YATASTO   mié 15 jul   ✓sync  [CD] │
├────────────────────────────────────┤
│ Turno tarde · Carla D.   (!)2  ▲   │  ← franja: turno + operario +
├────────────────────────────────────┤    badge alertas + colapsar
│  ...contenido de la sección...     │
```

- Tap en `(!)2` abre el Centro de alertas (§7) como sheet.
- En ventana de cambio de turno (±30 min de 07/14/21, `hooks.js isShiftChangeWindow`)
  la franja muta al banner de cambio de turno existente: no hay dos banners apilados.
- Colapsable por el usuario; recuerda el estado por dispositivo.

**Desktop:** la franja vive en el header (hay ancho): `Turno tarde · Carla D. · (!)2`
a la derecha del breadcrumb. Cero altura extra.

- **Qué va arriba y por qué:** el turno y las alertas son el único contexto
  transversal que el operario necesita en cualquier pantalla; todo lo demás
  (silos, lotes, últimas acciones) ya vive en sus secciones a 1 tap.
- **Acciones:** tap badge → Centro de alertas; tap nombre → flujo cambio de operario
  (OperarioLogin existente).
- **Guardrails:**
  - La franja **lee** de estado ya cargado (operario en sessionStorage, count de
    alertas calculado por el hook del §7); si no hay datos, muestra solo turno y
    hora. Nunca bloquea el render de la sección (offline-first).
  - Prohibido meterle métricas (litros, balance): eso es scope creep hacia el HOME
    que el council rechazó. Turno + identidad + badge + sync, nada más.

---

## 2. Dashboard Supervisor

**Estado actual** (`SecDashboard`, 5068-7889): tab "Resumen" apila header con chips,
tab bar interna de 8-10 tabs (6662-6697), hero de capacidad con donut (6709-6739),
7 StatCards idénticas (6742-6752), panel de producción (6754-6799) y recién al fondo
las alertas activas (6820, calculadas en 5989-6000). Diagnóstico 01 §7.2: "el
dashboard informa pero no prioriza; la anomalía hay que buscarla".

Las 4 alertas que YA se computan (5989-6000): silo >90% (warn), saldo de silo
negativo (err), aguado >0 (err), diferencia Fca/Tbo >150 L (warn).

### 2A — Conservadora: reordenar y desengordar lo que existe

Mismas tabs internas, mismos cálculos. Tres movimientos:

1. **Alertas suben del fondo (6820) al tope** del tab Resumen.
2. **StatCard SaaS → card editorial** (02 §3.3): 1 dominante (Balance) + el resto
   como filas `metric-row`. Muere el grid 2×2 + 3×1 (6742-6752), el donut
   decorativo (6721-6729) pasa a barra inline.
3. Tab bar interna: mismas 8-10 tabs pero a 12px y sin gradiente/glow (6680-6688).

**Mobile:**

```
┌────────────────────────────────────┐
│ Resumen Silos Calidad Difs Sem …   │  ← tabs actuales, 12px, scroll-x
├────────────────────────────────────┤
│ ALERTAS ACTIVAS (3)                │
│ ┌─(!)─Silo 80 al 92%──[Ver stock]┐ │
│ ┌─(!)─CIP pendiente: 60──[Ir]────┐ │
│ ┌─(!)─Dif +180 L LOS TILOS─[Ver]─┐ │
│                                    │
│ ┌ BALANCE DEL DÍA ───────────────┐ │
│ │ +12.450 L                      │ │  ← 32px mono, única card grande
│ │ ingresado 86.150 · cargado 73.7│ │
│ └────────────────────────────────┘ │
│ EL DÍA EN NÚMEROS                  │
│ │ Ingresos            14 · 13:42 │ │
│ │ Cargas          2 · 34.000 L   │ │  ← filas 48px, mono derecha
│ │ Movimientos                6   │ │
│ │ CIP                  7 de 10   │ │
│ │ Capacidad  ▓▓▓▓▓░░░  62 %      │ │
│                                    │
│ PRODUCCIÓN (panel actual, filas)   │
└────────────────────────────────────┘
```

**Desktop:** mismo contenido en 2 columnas (alertas full-width arriba; izquierda
balance + filas + producción, derecha silos + calidad), max-width 1200. Sin
master-detail: es lectura, no edición.

- **Qué va arriba y por qué:** las alertas. Son el único contenido que dispara
  acción inmediata; todo lo demás es contexto. El balance es la segunda lectura
  ("¿cómo viene el día?") y por eso es la única card grande.
- **Acciones:** cada alerta con botón que navega a la sección que la resuelve
  (stock / CIP / ingreso puntual). Exportar y demás quedan en sus tabs.
- **Guardrails:**
  - Alertas calculadas con los mismos umbrales existentes (5989-6000); unificar
    el doble umbral 88/90 (SiloBar usa >88 en 5248, alertas usan >90 en 5992) en
    UNA constante exportada, propuesta en 04 §3.
  - Si `_lecturasFallidas`, banner rojo reemplaza la zona de alertas: "No se
    pudieron leer todos los días previos, los saldos pueden estar incompletos"
    (patrón ya existente de Tanda 2).
  - Sin auto-refresh agresivo: refresco al entrar + pull-to-refresh; un dashboard
    que repinta solo bajo señal débil miente dos veces.

### 2B — Ambiciosa: sala de control con drill-down

Reestructura las 8-10 tabs internas en **4 vistas**: `Resumen` (el de 2A),
`Silos`, `Calidad` (absorbe Difs y Tambos como sub-filtros de una DataTable),
`Datos` (Semana, Historial, Exportar). Auditoría y Técnico se van al perfil
jefe (§3). El Resumen gana interactividad: cada fila/alerta abre un panel de
detalle sin salir del dashboard.

**Mobile:**

```
┌────────────────────────────────────┐
│ [Resumen] [Silos] [Calidad] [Datos]│  ← 4 tabs fijas, sin scroll-x
├────────────────────────────────────┤
│ (igual a 2A arriba)                │
│ ...                                │
│ tap en "Silo 80 al 92%" ⇒ sheet:   │
│ ┌────────────────────────────────┐ │
│ │ SILO 80 · Leche Cruda          │ │
│ │ 73.600 / 80.000 L  (máx 76.000)│ │
│ │ ▓▓▓▓▓▓▓▓▓░ 92%                 │ │
│ │ Últimos: +8.2k 11:40 · -4k ... │ │
│ │ [Ir a Stock]  [Ir a Movim.]    │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Desktop (master-detail real, paridad pedida por el dueño):**

```
┌──────────┬───────────────────────────────┬──────────────────┐
│ sidebar  │ ALERTAS (3)  full-width       │                  │
│          ├───────────────┬───────────────┤   DETALLE        │
│          │ BALANCE       │ SILOS (strip) │   (lo que esté   │
│          │ +12.450 L     │ 100N ▓▓▓▓▒░   │   seleccionado:  │
│          │               │ 80   ▓▓▓▓▓(!) │   silo, alerta,  │
│          │ EL DÍA EN Nº  │ ...           │   parámetro)     │
│          │ filas...      │ CALIDAD tabla │                  │
└──────────┴───────────────┴───────────────┴──────────────────┘
```

- **Qué va arriba y por qué:** igual que 2A (alertas). La diferencia es qué pasa
  *después* del primer vistazo: en B el supervisor resuelve la duda sin cambiar
  de sección (drill-down), en A navega.
- **Acciones:** filas y alertas tocables (sheet en mobile, panel en desktop);
  acciones de salto directo ("Ir a Movimientos" con el silo preseleccionado).
- **Guardrails:**
  - El drill-down es **solo lectura**. Editar siempre manda a la sección real:
    un solo lugar donde se escribe cada dato (evita duplicar validaciones y
    permisos del `Sec*`).
  - Fusionar tabs no puede perder funciones: Exportar y Historial quedan en
    `Datos` con las mismas capacidades (los informes HTML 5358-6560 no se tocan).
  - Preseleccionar silo al saltar usa navegación por estado en memoria, no query
    params nuevos (sin router; el switch de App es un string plano, ver council
    sobre back-button).

---

## 3. Dashboard Jefe

**Estado actual:** el jefe ve el MISMO dashboard que el supervisor más las tabs
`auditoria` y `tecnico` (6673-6674) y la gestión de usuarios (SecUsuarios vía
modal perfil). No hay vista de gestión: merma, rendimiento (6756-6770), semana y
tambos existen pero desperdigados en tabs.

El jefe usa sobre todo desktop (UX-V2 §2.1) pero la paridad mobile es pedido
explícito del dueño.

### 3A — Conservadora: el dashboard del supervisor + bloque jefe

El jefe aterriza en el mismo Resumen de §2, con un bloque extra al final y sus
tabs extra. Cero pantallas nuevas.

**Mobile:**

```
┌────────────────────────────────────┐
│ (todo el Resumen del supervisor)   │
│ ...                                │
│ SOLO JEFE                          │
│ │ Rendimiento envasado   96.8 %  │ │
│ │ Merma hoy           412 L (1.2%)│ │
│ │ Eliminaciones hoy           2  │ │  ← lee yatasto:eliminados
│ │ Escrituras descartadas      0  │ │  ← listDiscarded() de db-adapter
│ │ [Auditoría] [Técnico] [Usuarios]│ │
└────────────────────────────────────┘
```

**Desktop:** mismo layout 2 columnas de 2A; el bloque SOLO JEFE ocupa la columna
derecha debajo de calidad.

- **Qué va arriba y por qué:** idéntico al supervisor (las alertas mandan para
  cualquiera que pueda actuar). Lo del jefe es cola, no cabeza: sus decisiones
  (auditoría, merma) son de ritmo diario, no de minuto.
- **Acciones:** atajos a Auditoría / Técnico / Usuarios (pantallas existentes).
- **Guardrails:**
  - El bloque jefe se renderiza solo con `perfil === "jefe"` + `tienePermiso`
    (segunda línea, la primera es RLS, como documenta CLAUDE.md).
  - "Eliminaciones hoy" es conteo del log (`yatasto:eliminados`, shape verificado
    `505-516`); el detalle vive en la tab Auditoría, no acá.

### 3B — Ambiciosa: vista de gestión semanal propia

El jefe deja de ver "el día del supervisor con extras" y gana un Resumen propio
orientado a tendencia: hoy vs promedio 7 días, salud del sistema y control.

**Mobile:**

```
┌────────────────────────────────────┐
│ [Gestión] [Día] [Auditoría] [Téc.] │   Día = el resumen del supervisor
├────────────────────────────────────┤
│ ALERTAS DEL SISTEMA (1)            │
│ ┌(!)─3 escrituras descartadas──[>]┐│
│                                    │
│ ┌ RECIBIDO HOY vs PROM 7D ───────┐ │
│ │ 86.150 L   (prom 81.4k, +5.8%) │ │
│ │ ▁▃▄▃▆▅▇   14 días              │ │   sparkline sobria (UI-PLAN §4.8)
│ └────────────────────────────────┘ │
│ SEMANA                             │
│ │ Rendimiento envasado    96.8 % │ │
│ │ Merma acumulada 7d   2.9k L    │ │
│ │ Tambos activos       19 de 31  │ │
│ │ Dif Fca/Tbo prom      +42 L    │ │
│ CONTROL                            │
│ │ Eliminaciones 7d           9   │ │
│ │ Step-ups usados 7d         3   │ │  ← telemetría, ver guardrail
│ │ Días sin cerrar            1   │ │
│ │ [Usuarios] [Técnico] [Export]  │ │
└────────────────────────────────────┘
```

**Desktop:**

```
┌──────────┬──────────────────────┬──────────────────────┐
│ sidebar  │ ALERTAS DEL SISTEMA (full-width)            │
│          ├──────────────────────┬──────────────────────┤
│          │ RECIBIDO 14D (chart) │ SEMANA (filas)       │
│          │                      │ CONTROL (filas)      │
│          ├──────────────────────┴──────────────────────┤
│          │ POR TAMBO (DataTable: litros, GB, dif, ...) │
└──────────┴─────────────────────────────────────────────┘
```

- **Qué va arriba y por qué:** para el jefe la anomalía de HOY ya la cubre el
  supervisor; lo que nadie más mira es la salud del sistema (descartes, días sin
  cerrar, eliminaciones). Por eso "alertas del sistema" encabeza.
- **Acciones:** drill a Auditoría con filtro aplicado; export semanal; usuarios.
- **Guardrails:**
  - Los agregados 7/14 días leen N claves por sección (`getLastNDays` ya existe,
    `lib/dates.js`); hacerlo con `Promise.all` + cache de días cerrados
    (inmutables) para no colgar el aterrizaje con señal débil. Si falta un día,
    mostrar "6 de 7 días leídos", nunca un promedio silenciosamente incompleto.
  - "Step-ups usados" sale de telemetría (`stepup_*` events) que es **opt-in y
    por dispositivo** (telemetry.js): mostrar SOLO si está habilitada, con
    leyenda "solo este dispositivo". Métrica global requiere trabajo nuevo (04 §2).
  - Sparkline sin gradiente ni relleno; trazo 1.5 (UI-PLAN §4.8).

---

## 4. Stock

**Estado actual** (`SecStock` 3939-4298): la mejor pantalla de la app (01 §1.2).
Selector de 3 turnos, cards por silo con SiloSVG 80px, acumulado mono, barra con
tramo reservado rayado (4202-4221), panel Total/Reservado/Disponible (4226-4241),
botón ENVASAR (4275-4279). Problemas: 19 silos en un scroll sin agrupar, glows en
barras (4209/4218), labels 10px (4228+), desktop = mobile estirado.

### 4A — Conservadora: agrupar, estados, light

Misma card, cuatro cambios: agrupación visual `SILOS_GRUPO` / `PROCESO_GRUPO`
(constantes ya existentes, 91-92), chip de estado operativo (02 §1.3), limpieza
de glow y micro-tipografía, y SiloSVG en variante light (02 §5).

**Mobile:**

```
┌────────────────────────────────────┐
│ [☀ 07:00] [▓14:00▓] [☾ 21:00]      │  ← turnos actuales, 48px
│ Total 128.4k L · Resv 12k · Disp…  │  ← franja resumen, mono
├────────────────────────────────────┤
│ SILOS PRINCIPALES (8)              │
│ ┌────────────────────────────────┐ │
│ │ ▐SVG▌  100 N        78.200 L   │ │  ← litros 24px mono
│ │ ▐███▌  Leche Cruda  /100k      │ │
│ │        ▓▓▓▓▓▓▓▓▒▒░░  78%       │ │  ← ▒ reservado rayado (se conserva)
│ │        [⛒ Reservado 12.000 L]  │ │  ← chip estado: icono+texto+color
│ │        Total·Resv·Disp (panel) │ │
│ │        [      ENVASAR      ]   │ │
│ └────────────────────────────────┘ │
│ ┌ 80 · (!) Lleno 92% ────────────┐ │
│ ┌ 60 · (!) CIP pendiente ────────┐ │
│ │ ...                            │ │
│ TANQUES DE PROCESO (11)     [ver]  │  ← colapsado por defecto
├────────────────────────────────────┤
│ [INGRESOS] [▓STOCK▓] [MOVIM.] [MENÚ]│
└────────────────────────────────────┘
```

**Desktop:** grid de 4 columnas de la misma card (SVG 140px), grupos como
secciones con header sticky; franja resumen fija arriba.

```
┌──────────┬─────────────────────────────────────────────┐
│ sidebar  │ [07][14][21]   Total 128.4k · Resv 12k      │
│          │ SILOS PRINCIPALES                           │
│          │ ┌100 N ┐ ┌100 V ┐ ┌ 80(!)┐ ┌ 60(!)┐         │
│          │ │ SVG  │ │ SVG  │ │ SVG  │ │ SVG  │         │
│          │ │78.2k │ │  0   │ │73.6k │ │  0   │         │
│          │ └──────┘ └──────┘ └──────┘ └──────┘         │
│          │ ┌ 42   ┐ ┌ 40F  ┐ ┌ 20   ┐ ┌ 15   ┐         │
│          │ TANQUES DE PROCESO                          │
│          │ ┌TQ6┐┌TQ7┐┌TINA┐... (cards chicas, sin SVG) │
└──────────┴─────────────────────────────────────────────┘
```

- **Qué va arriba y por qué:** el selector de turno (define QUÉ estás mirando) y
  el total de planta (la lectura de 2 segundos antes de aceptar un camión).
  Silos con estado crítico NO se reordenan arriba: el operario tiene memoria
  espacial del orden físico de los silos; el estado se marca, no se reordena.
- **Acciones:** las actuales (editar producto/responsable, ENVASAR con permiso);
  tap en chip CIP pendiente → CIP.
- **Guardrails:**
  - `calcAutoLitros` intocable; el estado del chip deriva de datos ya retornados
    (`totals`, `reservados`, `productosBase`) con funciones puras
    (`lib/silo-estado.js` propuesto en 02 §1.3).
  - ENVASAR sigue detrás de permiso (matriz UX-V2 §2.2: operario no envasa).
  - El tramo reservado rayado se conserva tal cual (funcional, 01 §6).

### 4B — Ambiciosa: tablero de planta con detalle lateral

La lista se comprime a filas densas escaneables (todo el estado de planta en una
pantalla sin scroll en desktop, un scroll corto en mobile) y el detalle completo
(SVG grande, panel de litros, controles del silo, últimos movimientos) se abre
por selección.

**Mobile:**

```
┌────────────────────────────────────┐
│ [07:00] [▓14:00▓] [21:00]  128.4k L│
├────────────────────────────────────┤
│ 100 N  ▓▓▓▓▓▓▓▓▒▒░  78.2k  L.Cruda │  ← fila 52px, tap abre sheet
│ 100 V  ░░░░░░░░░░░      0  ✓Limpio │
│ 80 (!) ▓▓▓▓▓▓▓▓▓▓░  73.6k  L.Cruda │
│ 60 (!) ░░░░░░░░░░░      0  CIP pend│
│ 42     ▓▓▓▓▓░░░░░░  18.9k  L.Descr │
│ ...                                │
│ TQ6    ▓▓▓▓▓▓░░░░░   8.4k  Crema   │
│────────────────────────────────────│
│ tap 100 N ⇒ sheet con la card 4A   │
│ completa (SVG + panel + ENVASAR +  │
│ últimos movimientos del silo)      │
└────────────────────────────────────┘
```

**Desktop (master-detail):**

```
┌──────────┬──────────────────────┬──────────────────────┐
│ sidebar  │ [07][14][21] 128.4k  │  SILO 100 N          │
│          │ 100 N ▓▓▓▓▒▒░ 78.2k  │  ▐ SVG grande ▌      │
│          │ 100 V ░░░░░░░     0  │  78.200 L (40px mono)│
│          │ 80(!) ▓▓▓▓▓▓░ 73.6k  │  Total·Resv·Disp     │
│          │ 60(!) ░░░░░░░     0  │  producto, resp, pH  │
│          │ 42    ▓▓▓░░░░ 18.9k  │  Últimos movimientos │
│          │ ...                  │  [ENVASAR] [Ir Movim]│
└──────────┴──────────────────────┴──────────────────────┘
```

- **Qué va arriba y por qué:** igual que A. La apuesta de B es densidad: el
  supervisor ve los 19 silos de un vistazo (hoy: ~5 pantallas de scroll).
- **Acciones:** fila → detalle; en detalle, ENVASAR y salto a Movimientos con
  silo origen precargado.
- **Guardrails:**
  - La fila comprimida DEBE mantener color + icono + texto para estados (02
    principio 3); a 52px de alto el chip se reduce a icono + texto corto.
  - La edición (producto, responsable, controles) vive SOLO en el detalle, nunca
    inline en la fila: una fila densa con inputs es error de tap garantizado.
  - El sheet mobile no supera 70% del viewport (UX-V2 §10.5).

---

## 5. Ingresos

**Estado actual** (`SecIngresos` 1960-2267, `IngresoForm` 1495-1959): el form ya
está resuelto (3 paneles colapsables con contador y error por panel, 1446-1493;
PR3 de UX-V2). Lo que falta: las cards de la lista no jerarquizan (litros = tambo
= hora, 01 §1.3) y desktop es mobile estirado.

### 5A — Conservadora: jerarquía de card + agrupación por estado del día

Implementa la card que UI-PLAN §4.2 ya especifica, con el dato dominante (litros)
en 32px mono. Desktop: la misma lista en 2 columnas + form en Dialog (no
master-detail todavía).

**Mobile:**

```
┌────────────────────────────────────┐
│ INGRESOS · mié 15 jul         14   │
│ ┌────────────────────────────────┐ │
│ │ 🚛 LOS TILOS · 13        13:42 │ │  ← 16px/600 + hora 12px sub
│ │ 12.450 L                       │ │  ← 32px mono/700
│ │ Leche Cruda → Silo 100 N       │ │  ← 14px
│ │ pH 6.7 · 16.2°D · GB 3.4  (!)T │ │  ← 12px mono muted; (!) si fuera
│ └────────────────────────────────┘ │     de QUALITY_REFS (455-460)
│ ┌ EL OMBÚ · 7 ── 12.900 L ──────┐ │
│ │ ...                            │ │
│                              (+)   │
└────────────────────────────────────┘
```

**Desktop:**

```
┌──────────┬─────────────────────────────────────────────┐
│ sidebar  │ INGRESOS      [filtro tambo][silo]  [+Nuevo]│
│          │ ┌ card ─────────────┐ ┌ card ──────────────┐│
│          │ │ 12.450 L LOS TILOS│ │ 12.900 L EL OMBÚ   ││
│          │ └───────────────────┘ └────────────────────┘│
│          │ ...2 columnas...                            │
│          │ [+Nuevo] abre Dialog centrado con el form   │
│          │ de 3 paneles actual (max-width 560)         │
└──────────┴─────────────────────────────────────────────┘
```

- **Qué va arriba y por qué:** el contador del día y la card más reciente. El
  supervisor escanea litros (por eso 32px mono); el operario busca "¿ya cargué el
  de las 13:42?" (por eso hora arriba a la derecha).
- **Acciones:** FAB (mobile) / +Nuevo (desktop); tap card → editar en el form
  existente. Eliminar sigue por permiso + confirm + `logDelete` (505-516).
- **Guardrails:**
  - El indicador `(!)` de calidad usa QUALITY_REFS existente (rangos verificados:
    pH 6.6-6.8, acidez 14-18, GB 3-4, temp 3-8, aguado critical); color + icono +
    texto en el detalle, nunca solo color en la card.
  - No tocar IngresoForm: ya pasó por PR3 y funciona.

### 5B — Ambiciosa: recepción en vivo + master-detail desktop

La lista se vuelve una **línea de tiempo de recepción**: agrupada por franja
horaria, con acciones rápidas pensadas para el pico de camiones ("duplicar
último": mismo transportista/tambo, litros nuevos; TRANSPORTISTAS 74-80 ya mapea
transportista → tambos habituales).

**Mobile:**

```
┌────────────────────────────────────┐
│ INGRESOS  14 hoy · últ 13:42       │
│ MAÑANA (07-14) ── 9 ingresos ───── │
│ │ 12.450 L LOS TILOS·13    13:42 │ │
│ │ 12.900 L EL OMBÚ·7       11:20 │ │
│ │ ...                            │ │
│ TARDE (14-21) ── 5 ingresos ────── │
│ │ ...                            │ │
│ ┌────────────────────────────────┐ │
│ │ (+) NUEVO      [⧉ como último] │ │  ← duplicar: transportista+tambo
│ └────────────────────────────────┘ │     precargados, litros vacíos
└────────────────────────────────────┘
```

**Desktop (master-detail, UI-PLAN §4.2 desktop):**

```
┌──────────┬──────────────────────┬──────────────────────┐
│ sidebar  │ lista (40%)          │ DETALLE / FORM (60%) │
│          │ 13:42 12.450 L LOS T │ form de 3 paneles    │
│          │ 11:20 12.900 L EL OM │ SIEMPRE visible,     │
│          │ 09:14 (!)dif +180 L  │ edición inline del   │
│          │ ...                  │ ingreso seleccionado │
│          │ [+ Nuevo ingreso]    │ sin modal            │
└──────────┴──────────────────────┴──────────────────────┘
```

- **Qué va arriba y por qué:** el ritmo ("14 hoy · último 13:42") responde la
  pregunta del supervisor sin abrir nada; las franjas mapean el mapa mental por
  turnos que ya existe en la planta (TURNOS 94-96).
- **Acciones:** duplicar último; filtros por tambo/silo (desktop); edición inline
  en panel derecho.
- **Guardrails:**
  - "Duplicar" precarga SOLO identificación (transportista, tambo, num); litros y
    calidad SIEMPRE vacíos. Precargar litros = inventar datos productivos.
  - La edición inline usa el mismo `persist()` + `stampOperario` que el modal
    (audit trail intacto, CLAUDE.md).
  - Si hay un draft sin guardar en el panel y se selecciona otro ingreso, confirm
    antes de descartar (mis-tap mid-registration, blind spot #4 del council).

---

## 6. CIP

**Estado actual** (`SecCIP` 2268-2340): tabs silos/camiones + panel filtros.
CIPRow con hora/resp/obs + parámetros de lavado (alcConc, alcTiempo, alcTemp,
enjuague, ácido semanal...). Un CIP cuenta como "hecho" si tiene `hora` (2210).
El concepto "silo requiere lavado" ya existe (4015, 4088: silo vaciado sin CIP
del día). No hay noción de CIP vencido por tiempo.

### 6A — Conservadora: pendientes visibles + grid alineada

Mantiene tabs y CIPRow. Agrega: contador de pendientes por tab, orden "pendientes
primero" DENTRO de cada tab, y la grid de fila que UI-PLAN §4.6 pide.

**Mobile:**

```
┌────────────────────────────────────┐
│ [▓SILOS 2 pend▓] [CAMIONES 1 pend] │
├────────────────────────────────────┤
│ PENDIENTES                         │
│ │ ☐  60        (!)vaciado 11:20  │ │  ← fila [check 32][nombre 1fr][hora 80]
│ │ ☐  LINEA 2                     │ │
│ HECHOS HOY                         │
│ │ ✓  100 N     07:40 · Carla D.  │ │
│ │ ✓  80        08:15 · Martín P. │ │
│ │ ...                            │ │
│ FILTROS                     [panel]│
└────────────────────────────────────┘
```

**Desktop:** dos columnas (silos | camiones) sin tabs + filtros como banda
inferior (UI-PLAN §4.6 desktop, ya especificado).

- **Qué va arriba y por qué:** los pendientes. CIP es una checklist de ritual de
  turno; lo hecho es archivo, lo pendiente es tarea.
- **Acciones:** tap en fila abre el detalle de parámetros del lavado (hora, resp,
  concentraciones); check rápido pide como mínimo hora + responsable.
- **Guardrails:**
  - "Pendiente" reusa la regla existente (sin `hora` hoy, más el flag "requiere
    lavado" de 4015/4088). No inventar una noción nueva de vencimiento.
  - El check rápido NUNCA autocompleta parámetros de lavado (concentración,
    temperatura): eso es registro sanitario, se completa o queda vacío visible.

### 6B — Ambiciosa: checklist de turno con estado sanitario por equipo

CIP deja de ser dos listas y pasa a un tablero de estado sanitario: cada equipo
(silo, línea, camión) tiene estado `limpio / en uso / requiere CIP`, derivado de
ingresos + stock + CIP del día. El registro de lavado es un flujo guiado corto.

**Mobile:**

```
┌────────────────────────────────────┐
│ CIP · turno tarde     2 requeridos │
│ REQUIEREN LAVADO                   │
│ ┌ (!) SILO 60 ───────────────────┐ │
│ │ vaciado 11:20 · sin CIP hoy    │ │
│ │ [ REGISTRAR LAVADO ]  (48px)   │ │
│ └────────────────────────────────┘ │
│ ┌ (!) CAMIÓN RUTA 5 (ficticio) ──┐ │
│ EN USO (no lavar)                  │
│ │ 100 N · Leche Cruda 78.2k      │ │
│ │ 80 · Leche Cruda 73.6k         │ │
│ LIMPIOS HOY                        │
│ │ ✓ 100 V 07:40 ✓ LINEA 1 09:10  │ │
└────────────────────────────────────┘
   REGISTRAR ⇒ sheet: hora (auto,
   editable) → resp (operario activo
   precargado) → alc/enj/ácido → ✓
```

**Desktop:** tres columnas: requeridos | en uso | limpios; el flujo de registro
en Dialog. Filtros como cuarta banda.

- **Qué va arriba y por qué:** "requieren lavado" es la única lista accionable;
  "en uso" existe para que nadie lave un silo con producto (error caro).
- **Acciones:** REGISTRAR LAVADO (flujo guiado); tap en "en uso" → Stock.
- **Guardrails:**
  - El estado "en uso" deriva de `calcAutoLitros().totals` (litros > 0): si las
    lecturas fallaron (`_lecturasFallidas`), el tablero degrada a las listas
    planas de 6A con banner; nunca mostrar "limpio" con datos incompletos.
  - Forzar ingreso a silo con CIP requerido sigue detrás de step-up
    (`stepup_forzar_cip` ya instrumentado en telemetría).
  - El flujo guiado escribe el MISMO shape CIPRow existente (2268-2340): cero
    migración de datos.

---

## 7. Centro de alertas

**Estado actual:** no existe como pantalla. Las alertas activas se computan en
5989-6000 (4 tipos) y se listan al fondo del dashboard (6820). Los descartes de
la cola offline tienen banner propio (`onDiscarded`, db-adapter). El resto de las
"anomalías" (calidad fuera de rango, CIP requerido, lote envasando viejo) se ven
solo si entrás a la sección correcta.

### 7A — Conservadora: panel de alertas unificado, solo lectura

Una vista única (sheet desde el badge de la franja 1B, o primera sección del
dashboard) que agrega lo que YA se computa, sin persistencia nueva:

- Las 4 alertas del dashboard (5989-6000).
- CIP requerido (4015/4088).
- Calidad fuera de QUALITY_REFS en ingresos del día.
- Estado de sync: pendientes (`onWriteQueueChange`) y descartes (`listDiscarded`).

**Mobile (sheet):**

```
┌────────────────────────────────────┐
│ Alertas de hoy · 15 jul        [×] │
│ CRÍTICAS (2)                       │
│ ┌(!) Saldo negativo TQ7──[Stock]─┐ │
│ ┌(!) Aguado 0.4 · LA MATERA──[>]─┐ │
│ ATENCIÓN (3)                       │
│ ┌(!) Silo 80 al 92%──────[Stock]─┐ │
│ ┌(!) CIP requerido: 60────[CIP]──┐ │
│ ┌(!) Dif +180 L LOS TILOS──[>]───┐ │
│ SISTEMA (1)                        │
│ ┌(!) 3 escrituras sin guardar────┐ │
│ │    reintentando... 12:04       │ │
└────────────────────────────────────┘
```

**Desktop:** panel lateral derecho fijo de 320px en el dashboard (siempre
visible: en desktop hay ancho para que la anomalía viva en pantalla).

- **Qué va arriba y por qué:** severidad (crítico > atención > sistema), y dentro
  de cada grupo, más reciente primero. Crítico = corrompe datos o producto
  (saldo negativo, aguado); atención = requiere acción hoy; sistema = salud de
  la app.
- **Acciones:** cada fila deep-linkea a la sección que resuelve (mismo patrón
  navegación por estado de 2B).
- **Guardrails:**
  - Recalcula al abrir; NO hay estado persistido de alertas (no hay "marcar como
    resuelta"): la alerta desaparece cuando la condición desaparece. Verdad
    derivada de datos, imposible de desincronizar.
  - Severidad reusa los tipos existentes err/warn (5992-5998); mapeo único en
    `lib/alertas.js` propuesto (04 §3).

### 7B — Ambiciosa: centro con badge, visto y reglas configurables

Sobre 7A agrega: badge numérico en la nav (tab CONTROL para supervisor/jefe;
franja 1B para operario), estado "visto" por dispositivo (patrón ya existente:
`__yatasto_discarded_seen__`), y umbrales editables por el jefe (panel técnico):
% de silo lleno, litros de diferencia, horas máximas de lote envasando.

**Mobile:**

```
┌────────────────────────────────────┐
│ (igual a 7A, más:)                 │
│ ┌(!) Silo 80 al 92%──────[Stock]─┐ │
│ │    nuevo · hace 8 min          │ │  ← "nuevo" hasta abrir el centro
│ ...                                │
│ ── ya vistas (2) ──────────────────│
├────────────────────────────────────┤
│ [INGR.] [STOCK] [MOVIM.] [CONTROL²]│  ← badge = count de no vistas
└────────────────────────────────────┘
```

**Desktop:** igual panel fijo de 7A + badge en el ítem Control del sidebar;
umbrales en Técnico:

```
│ UMBRALES DE ALERTA (solo jefe)     │
│ Silo lleno         [ 88 ] %        │
│ Dif Fca/Tbo        [ 150 ] L       │
│ Lote envasando máx [ 24 ] h        │
```

- **Qué va arriba y por qué:** igual a 7A; "visto" solo cambia el badge, nunca
  el orden (una alerta crítica vista sigue arriba: verla no la resuelve).
- **Acciones:** las de 7A + editar umbrales (jefe, en panel técnico).
- **Guardrails:**
  - "Visto" es cosmético y local (localStorage por dispositivo): jamás filtra ni
    archiva; si el dispositivo cambia, se ven todas de nuevo. Costo de error: cero.
  - Umbrales configurables viven en `yatasto:config` con defaults = valores
    actuales del código; validación de rango (silo lleno 70-95%) para que un
    fat-finger no apague las alertas de la planta.
  - El badge cuenta alertas activas no vistas, con cap visual "9+".

---

## Nota transversal: estados vacíos y de error

Toda pantalla de este documento hereda los tres estados obligatorios:

1. **Vacío feliz** ("Sin alertas activas" con check verde): ya hay patrón (01 §6).
2. **Datos incompletos** (`_lecturasFallidas` o cola con descartes): banner antes
   que números, en TODAS las vistas que agregan datos de varios días.
3. **Offline**: chip de sync en header (SyncStatus, spec en 06); los dashboards
   muestran la última lectura con timestamp, nunca un spinner infinito.
