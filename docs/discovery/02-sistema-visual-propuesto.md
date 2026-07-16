# 02 — Sistema visual propuesto: industrial LIGHT-first

> Construido SOBRE `tokens.js` (se extiende, no se reemplaza). Decisión del dueño 2026-07-14:
> LIGHT pasa a ser el modo primario; DARK queda para el turno noche (21-05).
> Evidencia del estado actual en `01-diagnostico-visual.md`.

## 0. Principios (derivados de PRODUCT.md y del contexto de planta)

1. **El fondo claro es papel de trabajo, no showroom.** Superficies casi planas, elevación mínima, tinta oscura de alto contraste. El sol directo sobre el celular lava los grises intermedios: los datos operativos van en `text` (L 0.18), nunca en `sub` ni `muted`.
2. **El color es información o no está.** Paleta neutra + rojo brand contenido; el color saturado queda reservado a producto (PROD_COLOR) y a estado operativo (ok/reservado/crítico/sucio/limpio). Si un elemento tiene color y no codifica nada, se le quita.
3. **Una anomalía debe leerse a 2 metros.** Estados críticos = color + icono + texto, los tres siempre (PRODUCT.md: "no depender de color como único portador").
4. **Nada nuevo por fuera de tokens.js.** Todo valor de este documento entra como export de tokens.js; prohibido el hex inline y el ternario `_THEME === "light"` en componentes.

---

## 1. Extensión de tokens.js (propuesta concreta)

### 1.1 Sobre el hue del accent en light: contradicción a resolver

UI-PLAN §2.1 pide "eliminar la divergencia de hue (dark ámbar / light rojo): mantener el ámbar como hue único". Pero `tokens.js` — que es posterior y está mergeado — implementa deliberadamente `LIGHT.accent = oklch(0.60 0.14 22)` (rojo brand) con contraste calculado (comentario en tokens.js:8,30). **Este discovery recomienda quedarse con tokens.js y actualizar UI-PLAN**, por tres razones de planta:

- El rojo brand es la identidad física de Yatasto (el logo de la vaca es rojo `#dc2626` — recibo_yatasto.jsx:4985) y en light-first el brand vive en el modo diurno.
- El ámbar sobre fondo claro con sol directo tiene poco contraste; como acento primario diurno rinde peor que el rojo L 0.60.
- El ámbar queda como acento del modo noche, donde ya demostró legibilidad.

Consecuencia obligatoria: en light, **danger ≠ accent debe distinguirse por algo más que el hue** (ambos son rojos ~22-25). Regla: danger SIEMPRE aparece con icono de alerta + fondo `dangerBg`; el accent nunca lleva icono de alerta. Además danger es más saturado (C 0.22 vs 0.14). Esto ya está contemplado en tokens.js:37 ("más saturado que accent → diferenciable") — se eleva a regla de sistema.

### 1.2 Nuevos tokens (agregar a tokens.js, mismos nombres en DARK y LIGHT)

```js
// ─── SEMÁNTICOS FALTANTES ────────────────────────────────────
export const LIGHT_EXT = {
  warning:    "oklch(0.55 0.15 75)",   // ámbar oscuro legible sobre claro
  successBg:  "oklch(0.96 0.030 149)", // reemplaza "#f0fdf4" (6806)
  warningBg:  "oklch(0.96 0.045 85)",
  dangerBg:   "oklch(0.96 0.025 25)",  // reemplaza "#fef2f2" (6818)
  infoBg:     "oklch(0.96 0.015 250)",
  // elevación light (reemplaza ternarios 9419/9775/10042)
  shadowCard:  "0 1px 3px oklch(0.2 0.02 250 / 0.08)",
  shadowSheet: "0 -8px 32px oklch(0.2 0.02 250 / 0.16)",
  focusRing:   "0 0 0 2px oklch(0.60 0.14 22 / 0.55)",
};
export const DARK_EXT = {
  warning:    "oklch(0.80 0.16 78)",
  successBg:  "oklch(0.20 0.045 149)",
  warningBg:  "oklch(0.21 0.050 80)",
  dangerBg:   "oklch(0.19 0.050 25)",
  infoBg:     "oklch(0.20 0.020 250)",
  shadowCard:  "none",                 // dark: profundidad por surface tint, no sombra
  shadowSheet: "0 -8px 32px oklch(0 0 0 / 0.5)",
  focusRing:   "0 0 0 2px oklch(0.75 0.16 70 / 0.6)",
};
```

(Implementación: merge en los objetos DARK/LIGHT existentes; los nombres `_EXT` son solo para mostrar el diff acá.)

### 1.3 Estados operativos de silo (a partir de PROD_COLOR)

Hoy `PROD_COLOR` (recibo_yatasto.jsx:144-162) ya codifica dos estados dentro de la lista de productos: `"Sucio (vacío)": "#dc2626"` y `"Limpio": "#16a34a"`. Los estados restantes se improvisan por pantalla (`isAlert = pct > 88` en 5248, `isEmpty` en 5247, reservado rayado en 4215). Propuesta: un vocabulario único exportado desde tokens.js:

```js
// Estado operativo ≠ producto. El producto colorea el LÍQUIDO (PROD_COLOR);
// el estado colorea el MARCO de la card/fila y decide el icono.
export const SILO_STATE = {
  ok:        { color: "var success",  icon: "check",        label: "OK" },
  reservado: { color: "var accent",   icon: "lock",         label: "Reservado" },   // patrón rayado en barra (conservar 4215)
  critico:   { color: "var danger",   icon: "alert-circle", label: pct => pct > 88 ? "Lleno" : "Vacío inesperado" },
  sucio:     { color: "var danger",   icon: "spray-can",    label: "CIP pendiente" }, // hue de PROD_COLOR["Sucio (vacío)"]
  limpio:    { color: "var success",  icon: "sparkles",     label: "Limpio" },        // hue de PROD_COLOR["Limpio"]
};
```

Reglas de derivación (funciones puras, candidatas a `lib/silo-estado.js`):

| Estado | Condición (datos que ya existen) | Decisión que habilita |
|---|---|---|
| `critico` (lleno) | `litros/cap > 0.88` (umbral ya usado en 5248/6704) | descargar / mover antes del próximo ingreso |
| `critico` (vacío) | `litros <= 0` y hubo producto en el turno anterior | verificar si fue carga real o error de registro |
| `reservado` | `reservados[silo] > 0` de `calcAutoLitros` | no comprometer esos litros en carga |
| `sucio` | `producto === "Sucio (vacío)"` o CIP del día sin marcar para ese silo | prohibir ingreso sin step-up (guardrail existente "Forzar ingreso a silo sucio", 1908) |
| `limpio` | `producto === "Limpio"` o CIP marcado hoy | silo disponible como destino |
| `ok` | resto | ninguna acción |

Presentación: **borde 1px del color de estado + chip con icono + texto** (nunca border-left grueso, nunca solo color). En light el fondo de card permanece blanco; el estado NO tiñe el fondo (evita el efecto "semáforo de juguete" con 19 silos en pantalla).

### 1.4 Lo que NO se toca de tokens.js

`TYPE_SCALE`, `SPACE`, `DUR`, `EASE_OUT/EASE_INOUT`, `BP`, `FONT_SANS`, `FONT_MONO` quedan como están: son correctos y ya tienen consumo incipiente (01 §3).

---

## 2. Tipografía de datos

- **JetBrains Mono** (`FONT_MONO`, ya en tokens.js:42) para: litros, horas, parámetros químicos, porcentajes, contadores. Con `fontVariantNumeric: "tabular-nums"` **obligatorio en tablas y listas** (hoy solo lo usa el contador de Section, 1474).
- Jerarquía numérica fija (mapea a TYPE_SCALE):
  - `3xl` 40px/700: número hero único por pantalla (litros del silo en detalle).
  - `2xl` 32px/700: dato dominante de card editorial (balance del día).
  - `md` 16px/600: números en filas y tablas.
  - `xs` 12px/600: unidades y contexto ("L", "/ 100k").
- **Piso de 12px.** Los 38 usos de 9-10px (01 §2) se suben a 12 o se eliminan. Única excepción: sub-labels dentro de SVG exportado a impresión.
- Números alineados a la derecha en tablas (PRODUCT.md principio 4); unidad separada del número con espacio fino y en `sub`.
- Texto UI: Inter (`FONT_SANS`). Pesos 400/600/700 solamente (UI-PLAN §2.2); el `fontWeight: 800/900` presente en StatCard (5216) y logo se reduce a 700 salvo el logo brand (Arial Black es identidad, se conserva).

---

## 3. Superficies, tablas y cards

### 3.1 Elevación light (reemplaza la improvisación actual)

| Nivel | Uso | Receta |
|---|---|---|
| 0 | fondo de app | `bg` |
| 1 | cards, filas | `card` + borde 1px `border` + `shadowCard` |
| 2 | sheets/dialogs, dropdowns | `surface` + `shadowSheet` |

Sin glow, sin sombras de color, sin gradientes de fondo. Los 5 glows detectados (01 §4) se eliminan.

### 3.2 DataTable (componente nuevo, spec en 06)

Para Calidad, Diferencias, Tambos, Auditoría — hoy cada tab arma su tabla ad-hoc (7760, 7852, 8095, 8169, 8232).

- Header: 12px/600 uppercase `sub`, sticky.
- Filas: 44px mínimo (touch), separador 1px `border`, sin zebra (el zebra con sol directo empasta; el separador fino rinde mejor).
- Números: mono, tabular, derecha. Texto: izquierda.
- Fila anómala: icono de estado al inicio + valor en `danger`/`warning` + fondo `dangerBg`/`warningBg` **solo en la celda del valor**, no en toda la fila (escaneo por columna).
- Mobile: la misma tabla colapsa a lista de pares clave-valor por fila (no scroll horizontal, PRODUCT.md principio 3).

### 3.3 Card editorial (reemplazo del StatCard, spec completa en 06)

El StatCard actual (5197-5229) se reemplaza por una card **editorial y asimétrica**:

```
┌──────────────────────────────────────────┐
│ BALANCE DEL DÍA                    [icon]│  ← label 12px/600 sub, icono 16px sub
│ +12.450 L                                │  ← 32px mono/700 text (danger si negativo)
│ ingresado 86.2k · cargado 73.7k          │  ← contexto 12px sub — el "por qué" del número
└──────────────────────────────────────────┘
```

Diferencias contra el anti-patrón: alineada a la izquierda (no centrada), sin gradiente, sin círculo, sin trend ▲▼ suelto (el contexto va en palabras con los dos operandos), borde 1px neutro, y **no se repite en grid de idénticas**: por pantalla hay 1 card dominante y el resto son filas (ver 03). El color solo aparece en el número cuando codifica estado (balance negativo, alerta).

### 3.4 Chips de estado

Chip = icono 14px + texto 12px/600 + fondo `*Bg` + borde 1px del color. Ejemplos: `CIP pendiente` (dangerBg), `Reservado 12.000 L` (accentDim), `Día cerrado` (infoBg). Reemplaza los badges hex+alpha ad-hoc (5267, 8623).

---

## 4. Modo noche: auto-switch a DARK (21:00-05:00)

### 4.1 Comportamiento

- `yatasto:theme` pasa de `"dark" | "light"` a `"auto" | "light" | "dark"`. **Default: `"auto"`.**
- En `"auto"`: DARK si `hora >= 21 || hora < 5`, LIGHT en caso contrario. La franja 05-07 queda en light aposta: amanece y la recepción de camiones arranca 07:00 con luz.
- Toggle manual del header: cicla `auto → light → dark → auto` y muestra toast con el modo elegido. La elección manual **pinnea por 12 horas** (`yatasto:theme_pin` con timestamp) y después vuelve a `auto` — así el operario que fuerza light a las 22h no condena al turno noche de mañana.
- El cambio automático NUNCA ocurre con un modal/form abierto (mismo guard que ya usa el update del SW: `document.body.dataset.yatModalCount`, 9395-9399). Se difiere al próximo idle.

### 4.2 Implementación por fases (la restricción real es el reload, 01 §7.1)

- **Fase A (barata, 1 PR):** decidir el tema por hora *al cargar el módulo* (mismo patrón `_THEME` actual). Cubre el 90% del caso real: el dispositivo se desbloquea/recarga varias veces por turno y el SW ya fuerza reloads de actualización. Si la app queda abierta cruzando las 21:00, un banner discreto ofrece "Pasar a modo noche" (tap = reload con sesión guardada, mecanismo existente `saveSessionForReload`, 9832).
- **Fase B (correcta, tanda 11):** mover los valores de DARK/LIGHT a CSS custom properties en `:root` (`--bg`, `--accent`...); `C` pasa a ser un proxy que referencia `var(--*)`. El switch es cambiar un atributo `data-theme` en `<html>` sin reload ni re-render. Los ~745 usos de `C.*` no se tocan (el alias sigue funcionando), los 20+ ternarios `_THEME === "light"` se reemplazan por tokens de §1.2. Un `setInterval` de 1 min (mismo patrón que `useShiftChange`, hooks.js:191-211) evalúa la franja.

### 4.3 Qué cambia visualmente en noche

DARK actual de tokens.js queda tal cual (ya validado en planta). Dos ajustes: adopta los `*Bg`/`warning` nuevos (§1.2) y hereda el reemplazo del StatCard. El accent nocturno sigue siendo ámbar: de noche el ojo adaptado a oscuridad agradece el hue cálido y el brand rojo queda representado por el logo.

---

## 5. SiloSVG en light (conservar la firma, adaptar el cuerpo)

El dibujo, la animación y la semántica no cambian (01 §6). Cambios mínimos, parametrizados por tokens:

| Elemento | Hoy (hardcodeado) | Light | Dark (igual que hoy) |
|---|---|---|---|
| Fondo vacío | `#1e2438` (1045) | `oklch(0.93 0.008 250)` | `#1e2438` → token |
| Contorno/anillos/patas | `#3a4460` (1068+) | `oklch(0.55 0.02 250)` | `#3a4460` → token |
| Brillo líquido | `white 0.07` (1061) | `white 0.22` (sobre claro se pierde) | igual |
| Líquido | PROD_COLOR + gradiente horizontal | igual (es funcional) | igual |

Además: `PROD_COLOR["Leche Cruda"] = "#eeece8"` (145) es casi blanco — sobre el silo light es invisible. Para light se oscurece el borde del líquido crudo (stroke 1px `oklch(0.75 0.01 90)`) sin tocar el fill. Ninguna otra entrada de PROD_COLOR necesita ajuste (verificado contra fondo `0.93`: todos con ΔL suficiente).

---

## 6. Motion y feedback (sin cambios de fondo, consolidación)

- Tokens DUR/EASE existentes. Se agrega regla: **transición de tema = 0ms** (cambio seco; animar 200 colores a la vez en un Android de planta tira frames).
- Confirmación de guardado: check verde 200ms + toast (ya existe). Error: banner persistente (ya existe). No se agrega nada.
- `prefers-reduced-motion` ya respetado en SiloSVG (1012); extender la misma guarda a DonutChart→barra y a la barra de nivel (transiciones width 4208/5279/6731).

---

## 7. Checklist de conformidad (para revisar cada PR de las tandas 11-15)

- [ ] Ningún hex nuevo fuera de tokens.js / PROD_COLOR.
- [ ] Ningún `_THEME === "light"` nuevo en componentes.
- [ ] Ningún fontSize < 12.
- [ ] Ningún gradiente de fondo en UI (el de SiloSVG-líquido y el rayado de reservado están permitidos: son representación).
- [ ] Estado crítico = color + icono + texto (los tres).
- [ ] Números en mono tabular alineados a derecha en tablas.
- [ ] Touch target ≥44px (≥64 en bottom bar).
- [ ] Contraste AA general, ≥7:1 en números operativos (probar light con brillo al mínimo bajo sol: si el dato clave no se lee, falla).
- [ ] Sin em-dash en copy visible de UI.
