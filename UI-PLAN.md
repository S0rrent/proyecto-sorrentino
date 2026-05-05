# Plan de Mejora UI/UX — Yatasto Recibo

Plan integral para llevar la app de un layout puramente móvil (estirado en escritorio) a una experiencia responsive profesional, con sistema de diseño consistente, iconografía SVG, tipografía moderna y arquitectura por componentes/pantallas/perfiles.

> Referencias: `PRODUCT.md` (estrategia, usuarios, principios). Las decisiones acá derivan de esos principios — leer primero ese archivo si hay duda sobre prioridades.

---

## 1. Diagnóstico del estado actual

| Área | Problema | Evidencia |
|---|---|---|
| Layout | 100% mobile estirado a desktop | Sin `@media`, sin breakpoints, sin grids que cambien por viewport |
| Sistema | Sin tokens; estilos inline duplicados por componente | `inp`, `lbl`, `btnPrimary` repetidos; cada `Sec*` redefine `padding`, `gap`, colores |
| Iconografía | 12+ emojis distintos como íconos primarios | 🚛 🔄 🚚 ⚗️ 🧼 📊 👔 👑 📅 📄 ☀️ 🌙 — render inconsistente entre OS, sin a11y |
| Tipografía | Courier New para números, font-stack genérico para texto | `'Courier New', monospace`, `-apple-system, 'Segoe UI', sans-serif` |
| Densidad | Labels en 10px en una app que usan operarios mayores | `lbl.fontSize = 10` |
| Touch targets | Botones de header en 34×34px (mínimo recomendado 44×44) | Header de `App` (línea 4267 aprox.) |
| Navegación | Bottom nav fija con 6-7 columnas | `gridTemplateColumns: repeat(${navItems.length},1fr)` se va angostando |
| Modales | Únicamente bottom-sheet (patrón mobile) | `Modal` en línea 428 |
| Motion | Bezier elástico en silos, sin respeto a `prefers-reduced-motion` | `cubic-bezier(0.34,1.08,0.64,1)` en `SiloSVG` |
| Color | Dark usa ámbar, light usa rojo — distintos hues por modo | `C_DARK.accent = #f59e0b`, `C_LIGHT.accent = #dc2626` |
| Forms | Todo en un solo modal scrolleable largo | `IngresoForm` con 20+ campos en una columna |
| Estados | "Cargando..." de texto plano, sin skeletons | `if (loading) return <div>Cargando...</div>` repetido |

---

## 2. Fundamentos del sistema de diseño

### 2.1 Color (OKLCH, estrategia *Restrained*)

Tinta brand única (ámbar industrial), neutros tintados al brand-hue, semánticos solo para alertar. Sin `#000`/`#fff`. Sin gradientes en texto.

**Modo oscuro** (default — operación nocturna en planta):
```
brand:        oklch(0.75 0.16 70)    /* ámbar legible */
brand-dim:    oklch(0.30 0.06 70)    /* fondo de chips activos */
brand-strong: oklch(0.62 0.18 65)    /* hover/pressed */

bg:           oklch(0.18 0.012 250)  /* casi negro tintado al brand */
surface:      oklch(0.22 0.014 250)
card:         oklch(0.26 0.016 250)
border:       oklch(0.34 0.020 250)
muted:        oklch(0.42 0.020 250)

text:         oklch(0.96 0.005 250)  /* contraste 14:1 sobre bg */
text-sub:     oklch(0.72 0.018 250)
text-mute:    oklch(0.55 0.020 250)

success:      oklch(0.72 0.16 145)
warning:      oklch(0.80 0.16 78)
danger:       oklch(0.65 0.22 25)
```

**Modo claro** (luz diurna, oficina):
```
brand:        oklch(0.62 0.16 60)    /* mismo hue que dark, distinta L */
bg:           oklch(0.98 0.005 250)
surface:      oklch(1.00 0.000 0)
card:         oklch(0.99 0.005 250)
border:       oklch(0.88 0.010 250)
text:         oklch(0.18 0.012 250)
```

> **Eliminar la divergencia de hue actual** (dark = ámbar, light = rojo). Mantener el ámbar como hue único; cambiar solo *lightness* y *chroma* entre modos. La identidad de la marca no debería cambiar de color.

### 2.2 Tipografía

Reemplazar el stack actual.

| Rol | Antes | Después |
|---|---|---|
| UI sans | `-apple-system,'Segoe UI',sans-serif` | **Inter Variable** (Google Fonts, soporta español, ligaduras útiles para números) |
| Mono (litros, parámetros, horas) | `'Courier New', monospace` | **JetBrains Mono Variable** (proporción tabular, ítalica útil, mucho más legible que Courier) |

**Escala (ratio 1.25, 7 pasos)**:
```
xs:  12px   /* labels minúsculas, captions */
sm:  14px   /* secondary text */
md:  16px   /* body, inputs */
lg:  20px   /* card titles */
xl:  25px   /* section titles */
2xl: 32px   /* dashboard stats */
3xl: 40px   /* hero numbers (silos en stock detalle) */
```

**Reglas**:
- Body base 16px en mobile y desktop (no bajar a 14 en desktop, los operarios mayores usan zoom).
- Labels mínimo 12px (subir desde 10px actual). Letter-spacing `0.06em`, weight 600. Mayúsculas opcional, no obligatorio.
- Números operativos siempre en mono, alineados a la derecha en tablas, peso 600.
- Line-length máximo 70ch en bloques de texto descriptivo.
- Pesos: 400 (body), 600 (labels, énfasis), 700 (titles, números importantes). Nunca 800/900 — agresivo.

### 2.3 Espaciado

Escala basada en 4: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64`.

**Densidad por viewport**:
- Mobile (<768px): padding sección 16, gap atomos 12, padding card 14
- Desktop (≥1024px): padding sección 24-32, gap atomos 16, padding card 20

Variar el rítmo: no usar el mismo `padding: 12` en cada elemento. Headers más aireados que listas, listas más densas que dashboards.

### 2.4 Iconografía — eliminar emojis

Adoptar **Lucide** (`lucide-react`) — íconos SVG consistentes, controlables por `stroke`, accesibles.

| Hoy | Nuevo (Lucide) | Donde |
|---|---|---|
| 🚛 Ingresos | `Truck` | NAV, header sección |
| 🔄 Movimientos | `ArrowLeftRight` | NAV |
| 🚚 Carga | `TruckIcon` (variante) | NAV |
| ⚗️ Fortificados | `FlaskConical` | NAV |
| 🧼 CIP | `SprayCan` | NAV |
| 📊 Stock | `BarChart3` | NAV |
| 👔 Supervisor | `UserCog` | Perfil |
| 👑 Jefe | `Crown` | Perfil |
| 📅 Fecha | `Calendar` | Header |
| 📄 Informe | `FileText` | Header |
| ☀️/🌙 Tema | `Sun` / `Moon` | Header |
| 📵 Sin storage | `WifiOff` | Banner |
| 🧪 Form simplificado | `FlaskConical` (sm) | IngresoForm |
| 🔴 Silo vaciado | `AlertCircle` (con color danger) | SecStock |
| ✓ Activo | `Check` | Botones turno |

**Mantener** como SVG custom: `YataLogo` y `CowIcon` (son brand y están bien diseñados).

**Reglas**:
- Tamaño consistente con el texto adyacente: `1em` o múltiplos (16/20/24).
- `stroke-width="1.75"` para look moderno minimalista (no `2` que es por default y se ve genérico).
- Nunca usar emoji decorativo en el cuerpo de un componente UI.

### 2.5 Motion

Tokens:
```
duration-fast:    120ms   /* hover, focus */
duration-normal:  200ms   /* button press, tab change */
duration-slow:    320ms   /* modal open, slide-in */
duration-silo:    600ms   /* SiloSVG fill animation */

ease-out:    cubic-bezier(0.16, 1, 0.3, 1)        /* ease-out-quart */
ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)        /* solo para reverso */
```

**Reglas**:
- Eliminar el bezier elástico actual de `SiloSVG` (`0.34,1.08,0.64,1` — provoca bounce).
- Nunca animar `width`, `height`, `top`, `left`, `padding`. Solo `transform` y `opacity`.
- Respetar `prefers-reduced-motion: reduce` → todas las animaciones a 0ms.

### 2.6 Elevación y bordes

- Cards: borde 1px tinta + leve fondo del nivel siguiente. Sin sombra.
- Modal/Dialog: una sola sombra `0 20px 40px -8px oklch(0 0 0 / 0.4)`.
- Bottom nav / sidebar: borde 1px, sin sombra.
- **Prohibido**: `border-left` o `border-right` ≥2px como acento decorativo (anti-patrón).

---

## 3. Arquitectura responsive

### 3.1 Breakpoints

```
sm:  640px    /* ya cabe sidebar lateral angosta */
md:  768px    /* tablet */
lg:  1024px   /* desktop — sidebar nav, layouts master-detail */
xl:  1280px   /* desktop ancho */
```

Hook utilitario `useViewport()` que retorna `{ isMobile, isTablet, isDesktop }` basado en `window.matchMedia`.

### 3.2 Componentes con dos cuerpos

| Componente | Mobile (<lg) | Desktop (≥lg) |
|---|---|---|
| Navegación | Bottom tab bar (actual) | Sidebar fija 240px, ítems en columna |
| Header | Logo + 4 íconos compactos | Logo + breadcrumb sección + acciones + perfil con nombre+rol |
| Modal | Bottom sheet (actual) | Dialog centrado, max-width 560px, fade + scale, ESC cierra, focus trap |
| FAB | Botón flotante 64×64 | **No usar FAB** — botón "Nuevo" en header de sección |
| Listado de sección | Stack vertical | Master-detail: lista 40% / detalle 60% |
| Form | Modal scrolleable | Panel lateral siempre visible cuando hay selección |

### 3.3 Layouts por sección en desktop

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (logo · breadcrumb · acciones · perfil)             │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ SIDEBAR  │  CONTENT (master-detail / grid / dashboard)      │
│  240px   │                                                  │
│          │                                                  │
│ Ingresos │  ┌─────────────┬───────────────────────────────┐ │
│ Movim.   │  │             │                               │ │
│ Carga    │  │   LISTA     │      DETALLE / FORM           │ │
│ Fort.    │  │   40%       │      60%                      │ │
│ CIP      │  │             │                               │ │
│ Stock    │  └─────────────┴───────────────────────────────┘ │
│ Dashb.   │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 4. Plan por pantalla y por perfil

### 4.1 Login / Identificación

**Componentes**: `App` (modales `initModal` y `perfilModal`).

**Cambios mobile**:
- Modal de identificación de turno: subir tipografía (título 20px, body 16px), input con padding 14px, botones 48px alto.
- Modal login: misma jerarquía, agregar mostrar/ocultar contraseña (icono `Eye`/`EyeOff`).

**Cambios desktop**:
- Modal pasa a Dialog centrado.
- En login, el panel muestra a la izquierda el logo + nombre de empresa grande, a la derecha el form. Ratio 1:1.
- Mostrar versión y fecha del sistema en el footer del dialog.

**Per perfil**: el login solo lo necesitan supervisor y jefe. Operarios no se loguean.

### 4.2 SecIngresos (todos los perfiles, pantalla más usada)

**Funcionalidad**: lista de ingresos del día + form modal para nuevo. Forma simplificada para concentrados.

**Componentes**: `SecIngresos`, `IngresoForm`, list cards (inline).

**Mobile**:
- Cards reescritas con jerarquía:
  ```
  ┌─────────────────────────────────────┐
  │ [Truck icon]  TAMBO X — 13          │   ← título 16px / 600
  │               08:42 hs.             │   ← timestamp 12px sub
  │                                     │
  │   12 450 L                          │   ← litros 32px mono / 700
  │   Leche Cruda → Silo 100N           │   ← producto + destino 14px
  │                                     │
  │   pH 6.7 · Acidez 16.2 · GB 3.4     │   ← químicos 12px mono / muted
  └─────────────────────────────────────┘
  ```
- FAB abre form en bottom-sheet (mantener), pero el form se divide en **3 pasos** (wizard): "Datos básicos" → "Calidad fábrica" → "Calidad tambo + observaciones". Reduce fatiga del operario en celular.
- En el form, el badge "Formulario simplificado" se reemplaza por icono `FlaskConical` + texto, sin fondo decorativo.

**Desktop**:
- Layout master-detail. Lista a la izquierda (40%), form/detalle a la derecha (60%). Sin wizard — todos los campos visibles agrupados en secciones colapsables.
- Click en una card de la lista carga ese ingreso en el panel derecho para edición inline.
- Botón "Nuevo ingreso" en header de la sección, no FAB.
- Filtros visibles arriba de la lista: por tambo, por silo, por hora.

**`IngresoForm`** (mejoras transversales):
- `Pair` (Fca/Tbo): header "Fábrica · Tambo" sutil sobre los dos inputs. Diff inline en una pill pequeña debajo si excede `DIFF_FIELDS.thresh`. La pill usa color `warning` o `danger` según `critical`.
- Indicadores `QUALITY_REFS`: actualmente texto "Ref: 3 – 8 °C" en gris debajo. Mantener pero agregar indicador visual: cuando el valor sale del rango, el input toma borde `warning`; si es `critical` (Aguado), borde `danger`.
- Reemplazar `alert()` de validación por banner inline arriba del form, con lista de campos faltantes y scroll automático al primero.

**Per perfil**:
- Operario: form completo, sin alertas de desvío, sin botón eliminar.
- Supervisor: ve alertas `DIFF_FIELDS`, puede editar.
- Jefe: igual a supervisor + botón eliminar (con confirmación + log a `ELIM_KEY`).

### 4.3 SecMovimientos

**Funcionalidad**: 2 tabs — `movs` (silo→silo) / `ctrls` (controles de calidad por silo).

**Mobile**: tabs arriba (mantener). Cards con flecha visual entre silos:
```
┌─────────────────────────────┐
│  Silo 100N  →  Silo 80      │   ← flecha SVG, no emoji
│  4 200 L                    │
│  09:15 · Pre-fortificación  │
└─────────────────────────────┘
```

**Desktop**: dos columnas paralelas — movimientos a la izquierda, controles a la derecha. Sin tabs (tabs son anti-patrón de mobile cuando hay espacio horizontal).

**Botón nuevo**: en mobile FAB con menú dual (split button: "Movimiento" / "Control"). En desktop, dos botones en headers de cada columna.

**Per perfil**: igual para todos. Jefe puede eliminar.

### 4.4 SecCarga

**Funcionalidad**: hasta 3 cargas fijas (CARGA 1 / 2 / 3).

**Mobile**: 3 cards verticales. Cada una con badge "VACÍA" gris si no hay datos, o resumen si los hay. Tap abre el form.

**Desktop**: 3 columnas paralelas, cada una con su carga editable inline. Sin modal — la edición es directa en cada panel. Patrón de "tres tarjetas siempre visibles" más eficiente que abrir modales sucesivos.

**Per perfil**: igual. Jefe puede eliminar registros.

### 4.5 SecFortificados

**Funcionalidad**: lotes con lista dinámica de adiciones (producto + cantidad + unidad).

**Mobile**: lista + bottom sheet (mantener). Pero el sheet con muchas adiciones se vuelve incómodo. Mejorar:
- Sección "Adiciones" como tabla compacta de 3 columnas: producto / cantidad / unidad.
- Cada fila con botón `Trash2` a la derecha para borrar.
- Botón "+ Agregar adición" como secondary, no primary.

**Desktop**: master-detail.
- Lista de lotes a la izquierda.
- Detalle a la derecha con dos columnas internas: parámetros del lote arriba, tabla de adiciones abajo en su propio panel.

**Per perfil**: igual.

### 4.6 SecCIP

**Funcionalidad**: tabs `silos` / `camiones` + panel separado para limpieza de filtros.

**Mobile**: tabs (mantener). `CIPRow` actual: input nombre + checkbox + hora. Compactar a una sola fila bien alineada con grid `[checkbox 32px] [nombre 1fr] [hora 80px]`.

**Desktop**: dos columnas (silos | camiones), panel filtros como tercera columna estrecha o como banda inferior. Eliminar tabs.

**Per perfil**: igual.

### 4.7 SecStock

**Funcionalidad**: 3 turnos × 10 silos. SVG de silo + producto + responsable + nivel auto-calculado.

**Mobile**:
- Selector de turno arriba: 3 botones grandes (mantener), pero subir tipografía y agregar ícono `Sun` / `CloudSun` / `Moon` por turno.
- Lista vertical de silos. Cada item:
  ```
  ┌──────────────────────────────────────┐
  │  [SVG]  Silo 100N                    │
  │   sm    Leche Cruda                  │
  │         12 450 L  /  100 000 L  12%  │
  │         ───────                      │  ← barra horizontal nivel
  └──────────────────────────────────────┘
  ```
  El SVG actual es alto — en lista, usar versión compacta horizontal con altura fija 64px.

**Desktop**:
- Selector de turno como tabs arriba.
- Grid de silos: 4-5 columnas, cada celda con SVG mediano (140×220), número de litros grande debajo, producto y % en línea final.
- Click en una celda abre panel lateral con detalle editable (pH, grasa, responsable).

**`SiloSVG`** mejoras:
- Texto overlay con litros centrado sobre el silo (16px mono, blanco con sombra suave).
- Líneas de min/max más sutiles (stroke 0.5, opacity 0.3) con label minúsculo "min" / "max" al lado derecho.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`, duración 600ms.
- `prefers-reduced-motion: reduce` → `transition: none`.

**Per perfil**:
- Operario: edita su turno actual.
- Supervisor: edita cualquier turno, ve histórico de % por turno (sparkline al lado de cada silo).
- Jefe: igual + acceso a configurar capacidades / mins / maxs (actualmente hardcoded).

### 4.8 SecDashboard (solo supervisor / jefe)

**Funcionalidad**: tabs resumen / semana / tambos / calidad / historial / etc.

**Mobile**:
- Tab bar horizontal con scroll.
- StatCards apiladas en una columna.

**Desktop**:
- Tab bar horizontal, sin scroll (caben todas).
- Grid principal:
  ```
  ┌──── KPIs (4 columnas) ────────────────────────────┐
  │ Ingresados | Cargados | Balance | Tambos         │
  └───────────────────────────────────────────────────┘
  ┌──── Sparkline 14 días ────┬──── Top tambos ─────┐
  │                            │                     │
  └────────────────────────────┴─────────────────────┘
  ┌──── Calidad promedio ────┬──── Alertas/Desvíos ──┐
  │  pH · Acidez · GB · ...   │  Lista de critical   │
  └───────────────────────────┴───────────────────────┘
  ```

**`StatCard`** rediseñar:
- Quitar el círculo decorativo absoluto en la esquina (anti-patrón "hero metric template").
- Layout editorial: número grande arriba (32px mono / 700), label minúscula abajo (12px / 600 / muted), trend inline a la derecha como sparkline pequeña (no donut).
- Sin gradient background — solo borde + tinta sutil del color asociado.
- Border-left de 1px (no 4px decorativo).

**`DonutChart`** revisar caso por caso. Donut vacío sin contexto es decorativo. Reemplazar:
- Cuando representa progreso/objetivo → barra horizontal con porcentaje.
- Cuando representa parts-of-whole de pocos elementos → mantener pero rediseñar para no parecer SaaS template.

**`Sparkline`** mantener, ajustar trazo (`stroke-width: 1.5`, `stroke-linecap: round`).

**Per perfil**:
- Supervisor: ve resumen, semana, tambos, calidad. No edita ni elimina.
- Jefe: igual + acciones admin (gestión de usuarios, configuración global, papelera con `ELIM_KEY`, exportar histórico completo).

---

## 5. Plan por átomo / molécula

### 5.1 `Inp`
- Padding 14px (era 11px).
- Focus: borde 2px brand + outline 2px offset 2px (actualmente solo cambia a `outline:none`).
- Variantes: `Inp`, `InpNumber` (con stepper opcional), `InpTime`, `InpDate`.
- Estados: `error` (borde danger + mensaje 12px debajo), `readOnly` (mantener), `disabled` (opacity 0.5, cursor not-allowed).
- `aria-invalid` cuando hay error, `aria-describedby` apuntando al mensaje.

### 5.2 `Sel`
- En mobile: `<select>` nativo (mantener — mejor UX touch).
- En desktop: dropdown custom con search box arriba para listas largas (>10 items, ej. tambos).
- Mantener API actual `{ value, onChange, options, placeholder }`.

### 5.3 `Pair`
- Header explicativo arriba: "Fábrica · Tambo" en `text-sub` 12px.
- Ambos inputs con placeholder explícito y `aria-label`.
- Diff inline pill abajo cuando aplica (ver 4.2).

### 5.4 `FAB`
- Mobile: 64×64 (era 56×56), shadow más suave (no glow ámbar fuerte que actual `boxShadow: 0 4px 24px ${C.accent}55`).
- Desktop: ocultar — se usa botón en header.

### 5.5 `Modal` → renombrar a `Sheet` (mobile) y crear `Dialog` (desktop)
- Wrapper `Modal` adaptativo internamente: detecta viewport y renderiza `Sheet` o `Dialog`.
- API igual: `{ title, onClose, children, zIndex }`.
- `Dialog` agrega: `max-width` (default 560), focus trap (con `focus-trap-react` o manual), ESC para cerrar, click en backdrop cierra (configurable), `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.

### 5.6 `Card`
- Variantes: `default`, `interactive` (cursor pointer + hover sutil de borde brand), `selected` (borde brand + leve tinta).
- Quitar `marginBottom: 8` inline — usar `gap` en contenedor padre.

### 5.7 Botones
- `Btn` con props `{ variant, size, leftIcon, rightIcon, loading, disabled }`.
- `variant`: `primary` / `secondary` / `ghost` / `danger`.
- `size`: `sm` (32px), `md` (44px — mobile default), `lg` (52px).
- `loading`: muestra spinner SVG (no texto "Guardando...").

### 5.8 Header
- Mobile: actual con tweaks (botones 40×40 mínimo, mejor contraste de íconos).
- Desktop: variante con breadcrumb. Botón perfil pasa a chip horizontal: ícono + nombre + rol.

### 5.9 Bottom nav (mobile) → Sidebar (desktop)
- `<Nav variant="bottom">` y `<Nav variant="sidebar">` que comparten misma fuente de datos `navItems`.
- Sidebar: ítems en columna, label visible siempre, indicador activo como **fondo lleno** + texto brand (no `border-left` decorativo).
- Sidebar es scroll independiente del contenido.

### 5.10 Logo / iconos
- Mantener `YataLogo` y `CowIcon`.
- Crear archivo `icons/index.ts` que reexporta los íconos Lucide usados (centralización + tree-shaking).

---

## 6. Accesibilidad — checklist sistemático

- [ ] Foco visible 2px brand + offset 2px en todos los interactivos.
- [ ] `aria-label` en todo botón sin texto visible (íconos solos).
- [ ] `prefers-reduced-motion: reduce` honrado en silos, modales, transiciones.
- [ ] Contraste mínimo WCAG AA en texto, AAA (≥7:1) en números operativos críticos.
- [ ] Order de tabulación lógico (verificar manualmente con Tab).
- [ ] Errores con `role="alert"` o `aria-live="assertive"`.
- [ ] Inputs con `<label htmlFor>` asociado por id (actualmente label es `<label>` suelto).
- [ ] Mensaje de error visible inline + `aria-describedby` + `aria-invalid`.
- [ ] Soporte zoom 200% sin clipping (probar manualmente).
- [ ] Color nunca como única señal: silo lleno usa color + ícono + texto del nivel.

---

## 7. Fases de implementación (orden sugerido)

| Fase | Trabajo | Estimación |
|---|---|---|
| **1. Foundation** | Tokens en `src/tokens.js`, fuentes Inter + JetBrains Mono via `@font-face` o link, hook `useViewport`, paleta OKLCH | 1-2 días |
| **2. Iconografía** | Instalar `lucide-react`, archivo central `icons.ts`, reemplazar emojis en NAV / Header / SecStock / SecIngresos badge / banners | medio día |
| **3. Átomos** | Refactor `Inp`, `Sel`, `Pair`, `Modal` (→ adaptivo), `FAB`, sistema `Btn` | 1 día |
| **4. Shell responsive** | Header desktop, Sidebar nav, container con max-width, layout master-detail wrapper | 1 día |
| **5. Pantallas** | En orden de uso: Ingresos → Stock → Movimientos → Carga → Fortificados → CIP → Dashboard | 1 día c/u |
| **6. Polish** | Skeletons, empty states, transiciones entre secciones, hardening | 1 día |
| **7. Auditoría** | Correr `/impeccable audit`, fixes de a11y/perf/responsive, screenshot regression | medio día |

**Total estimado**: 12-14 días con un solo desarrollador, en orden secuencial.

---

## 8. Verificación por fase

Después de cada fase, ejecutar:
- `/impeccable audit` — checks de a11y, performance, responsive, theming, anti-patterns.
- Smoke test manual en 4 viewports: 375px (iPhone SE), 768px (iPad), 1280px (laptop), 1920px (monitor planta).
- Test con `prefers-reduced-motion`.
- Test con zoom 200% — operario con vista cansada.
- Test con teclado puro (sin mouse) — usuario en escritorio.

---

## 9. Anti-patrones a evitar (recordatorio explícito)

Estos son rechazados sin excepción durante todo el plan:
- **Stripe borders** (`border-left: 4px solid`) como acento decorativo en cards, alerts, list items.
- **Gradient text** (`background-clip: text` con gradient).
- **Glassmorphism** decorativo (blur sin propósito).
- **Hero-metric template SaaS** (número grande + sublabel + sparkline + gradient — el patrón completo).
- **Card grids idénticas** (4 cards iguales, ícono + heading + texto).
- **Em dashes** (`—`) en copy. Usar coma, dos puntos, o paréntesis.
- **Modal como primer reflejo** — agotar inline / progressive antes.
- **Bounce / elastic easing**.
- **`#000` o `#fff` puros**.

Cada decisión de implementación debe pasar la pregunta: *"¿alguien diría sin dudar que esto fue hecho por una IA genérica?"* Si sí, rehacer.
