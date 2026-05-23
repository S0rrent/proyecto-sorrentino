# UX V2 — Navegación por perfiles, mobile-first industrial

Plan de reorganización de navegación y permisos. Mobile-first para operario,
sin romper lógica de stock/saldos/producción.

> Lectura previa recomendada: `UI-PLAN.md` (sistema de diseño, tokens, motion)
> y `PRODUCT.md` (usuarios, principios).

---

## 0. Premisas no-negociables

1. **No tocar cálculos**: `calcAutoLitros`, `buildChainedSaldo`,
   `syncAutoMovSobrante`, `rebuildSaldoChain`, normalización de lotes, todos
   los handlers `save/load/persist` quedan idénticos.
2. **No tocar componentes Sec\***: las secciones (`SecIngresos`, `SecStock`,
   `SecProduccion`, etc.) se siguen renderizando con los mismos props.
   Lo que cambia es **quién las muestra y cómo se llega a ellas**.
3. **Mobile-first real**: cada decisión se valida primero en un Samsung A14 o
   iPhone SE, luego se escala a tablet/desktop. Si en mobile se siente "ERP
   comprimido", se rechaza.
4. **Operación en planta**: dedos grandes, guantes opcionales, luz amarilla
   pobre, ruido, estrés. Cada acción de un operario debe ser ≤3 toques desde
   abrir la app.
5. **Incremental, sin big bang**: roadmap por fases, cada fase mergeable sola
   sin romper producción. Reversible vía feature flag (`yatasto:config.uxV2`)
   durante las primeras 2 semanas.

---

## 1. Diagnóstico del estado actual

### 1.1 Bottom bar mobile

```
┌──────────────────────────────────────────────┐
│ [Ingr.] [Movim.] [Carga] [Fort.] [CIP] [Stock] [Sup.] │   ← hasta 7 ítems
│   📦      🔄      🚚      ⚗️    🧼   📊    👔   │   ← icon 20px
│  Ingr.   Movim.  Carga  Fort.  CIP  Stock  Sup. │   ← label 9px
└──────────────────────────────────────────────┘
```

| Problema | Evidencia | Impacto operario |
|---|---|---|
| 6-7 tabs en una sola barra | `NAV` + `produccion` + `supervisor` filtrados por perfil | Cada tab queda en ~50-55px de ancho en pantalla de 360px |
| Icon 20px + label 9px | `<n.Icon size={20}>`, `fontSize: 9` | Difícil de leer con luz pobre / dedos no precisos |
| Sin safe-area iOS | `position: fixed; bottom: 0` sin `env(safe-area-inset-bottom)` | Tab inferior queda debajo de la home indicator en iPhone |
| Sin separación visual entre grupos | Todos los tabs iguales, sin jerarquía | Operario debe leer cada label para encontrar Stock vs CIP |
| Toque de 10px de altura | `padding: "10px 0 13px"` con icon 20px = ~43px total | Borderline de target táctil (Apple HIG: 44, Material: 48) |

### 1.2 Sin perfil "operario"

```js
// recibo_yatasto.jsx:62
const PERFILES = {
  supervisor: { ... },
  jefe:       { ... },
  admin:      { ... },
};
```

No hay rol operario. Hoy un operario usa el perfil **supervisor** (o ninguno
si la app está sin login), lo que significa que:

- No hay trazabilidad por persona (quién cargó qué ingreso)
- No hay restricciones reales — un operario puede cerrar el día, abrir
  Producción, eliminar lotes finalizados
- El campo `resp` (responsable) en cada registro queda libre o vacío
- Auditoría logea `perfil: "supervisor"` para todos los operarios

### 1.3 Login actual

```
Modal → input usuario → input password → match contra PERFILES[k].usuario →
db.auth.signIn(email_internal, password) → sesión Supabase
```

- Solo 3 cuentas físicas (supervisor/jefe/admin), un password compartido
  cada una
- Sin selector visual de operario (escribir nombre cada vez)
- Sin PIN — password completo en teclado mobile
- Sin sesión rápida por turno (cambio de operario obliga logout + login con
  teclado)

### 1.4 Saturación de información en secciones existentes

- **Ingresos**: form de 20+ campos en una columna (acidez, pH, GB, SNG,
  proteína, temperatura, aguado, densidad, antibiótico, …). Operario tarda
  en encontrar "litros" entre todo eso.
- **Stock**: 8 silos principales + 11 silos de proceso = 19 silos en una
  vista. Útil para supervisor, abrumador para operario.
- **Producción**: ya separa "envasando" / "historial" — bien — pero el
  operario no necesita ver historial.
- **CIP**: 10 silos + 8 camiones + 1 panel de filtros. Necesita un primer
  toque para entrar y otro para elegir tab silos/camiones.

### 1.5 Lo que SÍ está bien y no hay que tocar

- `SecProduccion` con tabs "En envasado" / "Historial" — flujo claro
- Modal bottom-sheet — patrón nativo mobile, ya respeta `prefers-reduced-motion`
- `useViewport` + `BP` en tokens — base sólida para responsive
- Panel técnico (jefe) — ya escondido, no contamina al resto

---

## 2. Arquitectura de perfiles

### 2.1 Cuatro perfiles

| Perfil | Quién | Dispositivo principal | Frecuencia uso |
|---|---|---|---|
| **operario** | Operarios de planta (3–6 personas, cambian por turno) | Mobile (Android) | Cada 5–15 min durante turno |
| **supervisor** | Supervisor de turno | Mobile + tablet | Cada 15–30 min |
| **oficina** | Administración / control de calidad | Desktop + tablet | Sesiones largas (2–4h) |
| **jefe** | Jefe de planta + admin sistema | Desktop + mobile | Diaria, mixta |

> El perfil `admin` actual queda absorbido por `jefe`. La distinción técnica
> entre "jefe" (rol de negocio) y "admin" (rol sistema) se cubre con un flag
> interno `puedeGestionarUsuarios` dentro del perfil jefe.

### 2.2 Matriz de permisos por sección

| Sección | Operario | Supervisor | Oficina | Jefe |
|---|:---:|:---:|:---:|:---:|
| Home (nueva) | ✓ | ✓ | ✓ | ✓ |
| Ingresos — crear/editar | ✓ | ✓ | ✓ leer | ✓ |
| Ingresos — eliminar | ✗ | ✓ | ✗ | ✓ |
| Movimientos — crear/editar | ✓ | ✓ | ✓ leer | ✓ |
| Movimientos — eliminar | ✗ | ✓ | ✗ | ✓ |
| Carga — crear/editar | ✓ | ✓ | ✓ leer | ✓ |
| Carga — eliminar | ✗ | ✓ | ✗ | ✓ |
| Fortificados — crear/editar | ✓ | ✓ | ✓ leer | ✓ |
| Stock — leer | ✓ | ✓ | ✓ | ✓ |
| Stock — editar manualmente | ✗ | ✓ | ✗ | ✓ |
| CIP — registrar | ✓ | ✓ | ✗ | ✓ |
| Producción — ENVASAR | ✗ | ✓ | ✗ | ✓ |
| Producción — FINALIZAR | ✗ | ✓ | ✗ | ✓ |
| Producción — eliminar finalizado | ✗ | ✗ | ✗ | ✓ |
| Cerrar día | ✗ | ✓ | ✗ | ✓ |
| Reabrir día | ✗ | ✗ | ✗ | ✓ |
| Forzar ingreso con CIP pendiente | ✗ | ✓ | ✗ | ✓ |
| Saldo inicial | ✗ | ✗ | ✗ | ✓ |
| Dashboard/KPIs | ✗ | ✓ | ✓ | ✓ |
| Auditoría | ✗ | ✓ leer | ✓ leer | ✓ |
| Panel técnico | ✗ | ✗ | ✗ | ✓ |
| Gestión de usuarios | ✗ | ✗ | ✗ | ✓ |
| Exportación CSV/Excel | ✗ | ✓ | ✓ | ✓ |
| Cambiar fecha (volver a días pasados) | ✗ | ✓ | ✓ | ✓ |

> "✓ leer" = puede ver pero los botones de acción no aparecen / aparecen
> deshabilitados con tooltip "Permiso requerido".

### 2.3 Acciones críticas que requieren autorización explícita

Independiente del perfil, ciertas acciones piden **doble confirmación con
PIN del autorizante** aunque el perfil tenga el bit:

1. Eliminar un lote finalizado de producción (libera litros del silo)
2. Reabrir un día cerrado de más de 7 días atrás
3. Cambiar saldo inicial cuando ya hay saldo encadenado vivo
4. Cargar ingreso de leche con CIP pendiente del silo destino
5. Eliminar un ingreso de un día ya cerrado

El "autorizante" puede ser el mismo usuario logueado si su perfil tiene el
bit, o un supervisor/jefe presente físicamente que ingresa su PIN sin
desloguear al operario. Esto se llama **PIN-step-up** (patrón estándar de
TPV/POS industriales).

---

## 3. Navegación mobile-first

### 3.1 Bottom bar del operario — 4 tabs

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                                                        │
│              (contenido de la pantalla)                │
│                                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐         │
│   │  🏠  │    │  📋  │    │  🏭  │    │  ⋯   │         │
│   │      │    │      │    │      │    │      │         │
│   │ HOME │    │ OPER │    │ PROD │    │ MÁS  │         │
│   └──────┘    └──────┘    └──────┘    └──────┘         │
│                                                        │
│   ═══════════ safe-area-inset-bottom ═══════════      │
└────────────────────────────────────────────────────────┘
```

Especificaciones técnicas:

- 4 columnas iguales, `gridTemplateColumns: "repeat(4, 1fr)"`
- Altura total: `72px + env(safe-area-inset-bottom)`
- Touch target real por botón: **min 64×64px** (más allá del mínimo)
- Icon: **28px** (vs 20px actual)
- Label: **11px** (vs 9px), `font-weight: 700`
- Espacio icon→label: **4px**
- Indicador activo: pill de fondo `accentDim` debajo del icon + label,
  border-radius 14px, padding `8px 10px`. Sin glow exagerado.
- Animación de transición tab: 200ms `EASE_OUT`
- `padding-bottom: env(safe-area-inset-bottom)` en el contenedor

#### Comportamiento por tab

| Tab | Toque corto | Toque largo (long-press 500ms) |
|---|---|---|
| HOME | Vuelve a home. Si ya estás en home, scroll-top | Refresh manual (vibración) |
| OPER | Abre hub operaciones | Acceso directo al último sub-sección usada |
| PROD | Va a producción | — |
| MÁS | Despliega sheet con resto de opciones | — |

#### Variantes por perfil

| Perfil | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|---|---|---|---|---|
| **operario** | Home | Operaciones | Producción | Más |
| **supervisor** | Home | Operaciones | Producción | Control |
| **oficina** | Home | Operaciones | Reportes | Más |
| **jefe** | Home | Operaciones | Producción | Control |

> "Control" en supervisor/jefe reemplaza "Más" — abre directamente el
> dashboard de control con accesos a CIP, cierre de día, auditoría, panel
> técnico (jefe).

### 3.2 Hub OPERACIONES (operario)

Al tocar el tab OPER se abre una pantalla con 4 cards grandes:

```
┌─────────────────────────────────────────┐
│  Operaciones                  jueves 23  │
│  Turno mañana · Carlos R.               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │             │  │             │       │
│  │  🚛         │  │  🔄         │       │
│  │             │  │             │       │
│  │  INGRESOS   │  │ MOVIMIENTOS │       │
│  │             │  │             │       │
│  │  12 hoy     │  │  3 hoy      │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │             │  │             │       │
│  │  🚚         │  │  ⚗️         │       │
│  │             │  │             │       │
│  │   CARGA     │  │ FORTIFICADOS│       │
│  │             │  │             │       │
│  │  2 hoy      │  │  1 hoy      │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  + Nuevo ingreso         RÁPIDO │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- 2×2 grid de cards, card mínimo 160×160px en pantallas ≥360px
- Card: icon 40px arriba, label 16px medio, contador "X hoy" 12px abajo
- Botón "Nuevo ingreso RÁPIDO" full-width en bottom — atajo al alta más
  frecuente del operario
- Sin gradientes, sin animaciones de entrada elásticas
- Tap en card → mismo `SecIngresos` / `SecMovimientos` / etc. actuales

### 3.3 Sheet MÁS

Al tocar "Más" en operario, sube un bottom-sheet con lista vertical de
accesos (cada item ≥56px de alto):

```
┌─────────────────────────────────────┐
│           ──────                    │   ← handle
│                                     │
│  🧼  CIP                            │
│      Silos pendientes: 2  >          │
│                                     │
│  📊  Stock                          │
│      Ver niveles de silos       >    │
│                                     │
│  ⚙️  Mi turno                       │
│      Cambiar de operario        >    │
│                                     │
│  📞  Llamar supervisor              │
│      Aviso al jefe de turno     >    │
│                                     │
│  🚪  Cerrar sesión                  │
│                                     │
└─────────────────────────────────────┘
```

Notar:
- "Mi turno" abre el flujo de cambio de operario (cap 6)
- "Llamar supervisor" es un placeholder para una v2 — por ahora hace
  `tel:+54...` o un alert "Avisá personalmente"
- "Cerrar sesión" siempre al final

### 3.4 Hub CONTROL (supervisor + jefe)

Reemplaza "Más" en perfiles supervisor/jefe. Es un dashboard de acceso
rápido a herramientas de control:

```
┌─────────────────────────────────────────┐
│  Control                       Jefe MR  │
├─────────────────────────────────────────┤
│                                         │
│  ESTADO DEL DÍA                         │
│  ┌────────────────────────────────────┐ │
│  │  ✓ Día 2026-05-23 ABIERTO          │ │
│  │     12 ingr · 3 movs · 2 cargas    │ │
│  │  [ Cerrar día ]                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ATAJOS                                 │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 🧼 CIP       │  │ 📊 Dashboard │    │
│  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 📋 Auditoría │  │ ⚠️ Inconsist. │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  SOLO JEFE                              │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ 🔧 Técnico   │  │ 👥 Usuarios  │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

- Card "Estado del día" siempre arriba — feedback inmediato del estado
- Atajos en grid 2×N — bajo umbral cognitivo
- Sección "Solo jefe" segregada visualmente (header propio), con border
  punteado para sugerir "zona avanzada"
- Inconsistencias muestra **un badge rojo** con contador si
  `runConsistencyChecks` tiene resultados de severidad error

### 3.5 Comparación numérica con el estado actual

| Métrica | Actual | V2 |
|---|---|---|
| Tabs visibles en bottom bar | 6-7 | 4 |
| Ancho mínimo por tab @ 360px | 51px | 90px |
| Icon size en bottom bar | 20px | 28px |
| Label size | 9px | 11px |
| Touch target real | ~43px | 64px+ |
| Toques desde abrir app hasta "+ ingreso" | 2 (Ingresos → +) | 2 (Home → atajo) o 3 (Oper → Ingr → +) |
| Toques para abrir CIP (operario) | 1 (tab CIP) | 2 (Más → CIP) — degradación aceptable, CIP es <1×/turno |

---

## 4. HOME del operario — wireframe conceptual

```
┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐    │
│  │  jueves 23 may · 14:32                  │    │
│  │  Turno tarde · Carlos R.        [cambiar]│   │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ACCIONES                                       │
│  ┌────────────────────────────┐                 │
│  │                            │                 │
│  │       + INGRESO            │   ← botón H=72  │
│  │                            │                 │
│  └────────────────────────────┘                 │
│  ┌────────────┐  ┌────────────┐                 │
│  │ + MOVIM.   │  │ + CARGA    │   ← H=64       │
│  └────────────┘  └────────────┘                 │
│                                                 │
│  ESTADO DE PLANTA                               │
│  ┌─────────────────────────────────────────┐    │
│  │  Silos en uso         5 de 19           │    │
│  │  ████░░░░░░░░░░░░░░░░░  26%             │    │
│  │                                         │    │
│  │  100N  ████████░░  78k / 100k L         │    │
│  │  100V  ░░░░░░░░░░  0k                   │    │
│  │  80    ████░░░░░░  32k / 80k L          │    │
│  │  60    ██████░░░░  37k / 60k L          │    │
│  │  ... [ver todos]                        │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  LOTES ACTIVOS                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  ● Lote 045 · L. larga vida             │    │
│  │    Envasando · 12k L reservados         │    │
│  │  ● Lote 046 · Yogurt                    │    │
│  │    Envasando · 3k L reservados          │    │
│  │                                         │    │
│  │  [Ver producción]                       │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ÚLTIMAS 3 ACCIONES                             │
│  ┌─────────────────────────────────────────┐    │
│  │  14:25  Ingreso La Esperanza  8.2k L    │    │
│  │  13:58  Movim. 100N → 80     3.0k L    │    │
│  │  13:42  Ingreso San Juan    12.1k L    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [ ⚠️ Alerta CIP: silo 60 pendiente ]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.1 Reglas de diseño del HOME

- **Sin KPIs porcentuales abstractos**. Todo número que aparece debe poder
  traducirse a una acción ("ese silo está al 78%, ¿descargo o no?").
- **3-4 secciones máximo** scrolleables. Si una sección no cabe en una
  pantalla de 360×640, se prioriza colapsar la sección menos crítica.
- **Acciones arriba del fold**. El botón "+ INGRESO" tiene que ser tocable
  sin scroll desde la primera apertura.
- **Estado de planta = lectura rápida**. No es la pantalla de Stock — solo
  un resumen. Tap en "ver todos" lleva a Stock real.
- **Alertas como banner inferior**, no como popup. Si hay CIP pendiente o
  inconsistencias detectadas, banner naranja arriba del bottom bar.
- **No mostrar datos > 24h en HOME**. Histórico vive en "Ver producción" /
  "Stock" / sus respectivas secciones.

### 4.2 Lo que NO va en HOME del operario

- Dashboard de capacidad total / barra circular grande (eso es supervisor)
- KPIs de calidad (acidez promedio, pH, GB)
- Gráficos de semana
- Tabla de tambos / tendencias
- Saldo inicial / cierre de día
- Detalles de auditoría
- Cualquier control técnico

### 4.3 Diferencias del HOME por perfil

| Sección | Operario | Supervisor | Oficina | Jefe |
|---|:---:|:---:|:---:|:---:|
| Saludo + turno | ✓ | ✓ | ✓ | ✓ |
| Acciones rápidas (+ ingreso/mov/carga) | ✓ | ✓ | ✗ | ✓ |
| Estado de planta (silos) | ✓ resumen | ✓ completo | ✓ completo | ✓ completo |
| Lotes activos | ✓ resumen | ✓ + acciones | ✓ resumen | ✓ + acciones |
| Últimas 3 acciones | ✓ propias | ✓ todas | ✗ | ✓ todas |
| Alerta CIP | ✓ | ✓ | ✗ | ✓ |
| Inconsistencias | ✗ | ✓ contador | ✗ | ✓ contador + link |
| KPIs del día | ✗ | ✓ | ✓ | ✓ |
| Comparativa semanal | ✗ | ✗ | ✓ | ✓ |

---

## 5. Sistema de login y permisos

### 5.1 Modelo de datos propuesto

#### `yatasto:operarios` (Supabase key-value)

```json
[
  {
    "id": "op_carlos_r",
    "nombre": "Carlos R.",
    "rol": "operario",
    "pin_hash": "sha256:abc...",
    "activo": true,
    "permisos_extra": [],
    "creado_por": "user_jefe_mr",
    "creado_en": "2026-05-20T10:00:00Z",
    "ultimo_login": "2026-05-23T07:02:11Z",
    "color": "#3b82f6"
  },
  {
    "id": "op_lucia_g",
    "nombre": "Lucía G.",
    "rol": "supervisor",
    "pin_hash": "sha256:def...",
    "activo": true,
    "permisos_extra": ["aprobar_cip_forzado"],
    ...
  }
]
```

- PIN se guarda hasheado (SHA-256 + salt fijo de planta). No es seguridad
  fuerte pero suficiente para impedir lectura casual desde Supabase.
- `permisos_extra` permite delegar capacidades específicas sin promover a
  supervisor entero (ej: un operario senior puede aprobar carga con CIP
  pendiente).
- `color` se usa en el chip del usuario y en logs de auditoría para que el
  jefe identifique al toque quién hizo qué.

#### Compatibilidad con `PERFILES` actual

Los 3 perfiles actuales (supervisor / jefe / admin) quedan como
"super-usuarios fijos" con login por email+password vía Supabase Auth. Los
operarios son una capa nueva encima:

- Login email+password → entra como supervisor/jefe/admin
- Luego, en HOME, aparece un selector "Quién está operando ahora" → chips
  de operarios activos → PIN del operario seleccionado
- El operario activo se guarda en `sessionStorage` y se inyecta en el campo
  `resp` de cada save

Esto permite que un solo dispositivo en planta tenga la sesión "supervisor"
todo el día y los operarios solo introduzcan su PIN para identificarse —
no hacen logout completo.

### 5.2 Flujo de login en planta

```
┌──── Estado inicial: app abierta sin operario activo ────┐
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │            LACTEOS YATASTO                     │     │
│  │           Quién está operando                  │     │
│  ├────────────────────────────────────────────────┤     │
│  │                                                │     │
│  │   ┌────────┐  ┌────────┐  ┌────────┐           │     │
│  │   │   CR   │  │   LG   │  │   MR   │           │     │
│  │   │Carlos R│  │Lucía G │  │Miguel R│           │     │
│  │   └────────┘  └────────┘  └────────┘           │     │
│  │                                                │     │
│  │   ┌────────┐  ┌────────┐  ┌────────┐           │     │
│  │   │   JP   │  │   AB   │  │   +    │           │     │
│  │   │Juan P. │  │Ana B.  │  │ Otro   │           │     │
│  │   └────────┘  └────────┘  └────────┘           │     │
│  │                                                │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘

Toca chip → modal de PIN:

┌────────────────────────────────────┐
│  Carlos R.                         │
│  Ingresá tu PIN                    │
│                                    │
│   ●  ●  ●  ○                       │
│                                    │
│  ┌───┐ ┌───┐ ┌───┐                 │
│  │ 1 │ │ 2 │ │ 3 │                 │
│  └───┘ └───┘ └───┘                 │
│  ┌───┐ ┌───┐ ┌───┐                 │
│  │ 4 │ │ 5 │ │ 6 │                 │
│  └───┘ └───┘ └───┘                 │
│  ┌───┐ ┌───┐ ┌───┐                 │
│  │ 7 │ │ 8 │ │ 9 │                 │
│  └───┘ └───┘ └───┘                 │
│  ┌───┐ ┌───┐ ┌───┐                 │
│  │   │ │ 0 │ │ ⌫ │                 │
│  └───┘ └───┘ └───┘                 │
│                                    │
│  [ Cambiar de operario ]           │
└────────────────────────────────────┘
```

- Chip de operario: **72×72px** mínimo
- Iniciales en grande (24px), nombre abajo (12px)
- Color de fondo = `operario.color`
- Teclado numérico nativo del modal: botones **80×80px**, gap 12px
- PIN: 4 dígitos por defecto, configurable hasta 6
- Sin "Olvidé mi PIN" — reset solo por jefe desde gestión de usuarios

### 5.3 Sesión y bloqueo automático

| Evento | Acción |
|---|---|
| Tap correcto en chip + PIN | Operario activo, app interactiva |
| 5 min sin tocar | Banner amarillo "Sesión por inactividad — tocar para continuar" |
| 10 min sin tocar | Vuelve al selector de operario (sin desloguear supervisor base) |
| 3 PIN fallidos seguidos | Chip deshabilitado 60 segundos, mensaje "Pedile a un supervisor" |
| Cambio de turno (07:00 / 14:00 / 21:00 ± 30min) | Banner "¿Cambio de turno? Tocá para cambiar de operario" |
| Cerrar app | Operario se desactiva, supervisor base persiste 8h |

### 5.4 PIN-step-up para acciones críticas

Para las acciones listadas en §2.3, en lugar de simplemente bloquear, la
app pide un PIN-step-up:

```
┌────────────────────────────────────┐
│   Esta acción requiere autorización │
│                                    │
│   "Eliminar lote 045 finalizado    │
│   (libera 12,000 L del silo 100N)" │
│                                    │
│   PIN del supervisor o jefe:       │
│                                    │
│   ●  ●  ●  ●                       │
│                                    │
│   [Cancelar]   [Confirmar]         │
└────────────────────────────────────┘
```

- El PIN validado puede ser de **cualquier usuario con el bit** —
  típicamente el operario llama al supervisor para que ingrese el suyo
- El log de auditoría registra **ambos**: quien intentó (operario) y quien
  autorizó (supervisor)
- El PIN del autorizante NO cambia la sesión activa — el operario sigue
  logueado

### 5.5 Gestión de usuarios (jefe)

Pantalla dedicada bajo Control → Usuarios:

```
┌─────────────────────────────────────────────┐
│  Usuarios          [+ Nuevo operario]       │
├─────────────────────────────────────────────┤
│                                             │
│  OPERARIOS                                  │
│  ┌─────────────────────────────────────┐    │
│  │ CR  Carlos R.       Activo    >     │    │
│  │     Último login: hoy 07:02         │    │
│  ├─────────────────────────────────────┤    │
│  │ LG  Lucía G.        Supervisor   >  │    │
│  │     Último login: hoy 14:15         │    │
│  ├─────────────────────────────────────┤    │
│  │ JP  Juan P.         Inactivo  >     │    │
│  │     Sin login hace 3 meses          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Tap en usuario → ficha:                    │
│  - cambiar PIN                              │
│  - activar/desactivar                       │
│  - cambiar rol                              │
│  - asignar permisos extra                   │
│  - ver historial de actividad               │
└─────────────────────────────────────────────┘
```

### 5.6 Seguridad UX

Mecanismos defensivos contra toques accidentales y operaciones peligrosas:

1. **Confirmaciones inline (no `alert()`)**: reemplazar el patrón actual
   `alert("Sobraron 300L...")` por un banner inline rojo arriba del form,
   con botón "Entendido". El alert nativo en mobile bloquea el contexto.
2. **Slide-to-confirm para acciones destructivas**: eliminar lote, cerrar
   día, reabrir día → requieren arrastrar un botón de izquierda a derecha
   para confirmar (patrón iOS, conocido por operarios).
3. **Disabled visual claro**: botón gris + cursor "no permitido" + tooltip
   "Necesitás permiso de supervisor" en vez de ocultar.
4. **Doble tap para botones críticos en zonas de error**: si "Eliminar"
   está al lado de "Guardar", primer tap solo selecciona, segundo confirma.
5. **Hora visible siempre en el header**: si la app está abierta hace
   horas, el operario ve el desfase y entiende por qué los datos parecen
   viejos.

---

## 6. Roadmap incremental

Cada fase es un PR independiente, mergeable y revertible. Después de cada
fase: build limpio, smoke test mobile real, opcionalmente feature flag.

### Fase 0 — Infraestructura sin cambios visibles (PR ~200 líneas)

- Crear `useOperarioActivo()` hook que lee/escribe `sessionStorage`
- Crear `usePerfil()` hook que devuelve `{ perfil, operario, permisos[] }`
- Definir `PERMISOS` constante con la matriz de §2.2
- Crear `<RequierePermiso permiso="...">` wrapper
- Agregar nuevo perfil `operario` a `PERFILES` (sin login todavía)
- Sin tocar render. Cero impacto visible.
- **Test**: la app sigue funcionando exactamente igual.

### Fase 1 — Bottom bar V2 (PR ~150 líneas)

- Reemplazar bottom bar de 6 a 4 tabs
- `padding-bottom: env(safe-area-inset-bottom)`
- Icons 28px, labels 11px, touch target 64px+
- Mantener navegación a las mismas secciones (mapping):
  - HOME → nueva pantalla mínima (placeholder con título)
  - OPERACIONES → hub que linkea a las 4 sub-secciones
  - PRODUCCIÓN → `SecProduccion` existente
  - MÁS → bottom-sheet con CIP, Stock, Sup., Cerrar sesión
- Feature flag `yatasto:config.uxV2 = true` para alternar
- **Test**: las 6 secciones siguen accesibles. Bottom bar más grande.

### Fase 2 — HOME del operario (PR ~300 líneas)

- Implementar pantalla HOME con saludo, acciones rápidas, estado de planta
  resumido, lotes activos, últimas acciones
- Sin tocar `calcAutoLitros` — solo lee
- Variantes condicionales por perfil (§4.3)
- **Test**: HOME carga en <500ms con datos cacheados

### Fase 3 — Hub OPERACIONES (PR ~120 líneas)

- Pantalla con 4 cards grandes + botón "+ Ingreso rápido"
- Cards muestran contador del día (lee mismos datos que las secciones)
- Tap navega a la sección existente sin tocarla
- **Test**: contadores coinciden con los de cada sección

### Fase 4 — Login PIN + sesión de operario (PR ~400 líneas)

- Selector de operario (chips) + PIN modal
- `yatasto:operarios` con seed inicial vacío
- Operario activo en `sessionStorage`
- Inyectar `operario.nombre` en `resp` de cada save
- Login email+password sigue funcionando para supervisor/jefe/admin como
  "sesión base"; operario es capa encima
- **Test**: login funciona, operario activo aparece en header, sin operario
  los chips bloquean acciones

### Fase 5 — Gestión de usuarios (jefe) (PR ~250 líneas)

- Pantalla Usuarios bajo Control
- CRUD de operarios (crear/editar/activar)
- Cambio de PIN
- Asignación de permisos extra
- **Test**: jefe puede crear un operario y loguearse como ese operario

### Fase 6 — Matriz de permisos en handlers (PR ~200 líneas)

- Cada handler crítico chequea `tienePermiso("...")` además del perfil
- Botones disabled con tooltip en lugar de ocultos
- **Test**: operario ve "Eliminar" deshabilitado, no faltante

### Fase 7 — PIN-step-up para acciones críticas (PR ~180 líneas)

- Implementar modal de step-up
- Aplicar a las 5 acciones de §2.3
- Auditoría registra `usuario_origen` + `usuario_autorizador`
- **Test**: operario intenta eliminar lote → pide PIN supervisor →
  supervisor ingresa → operación se ejecuta, audit muestra ambos nombres

### Fase 8 — Control hub para supervisor/jefe (PR ~250 líneas)

- Pantalla Control con estado del día, atajos, sección "Solo jefe"
- Reemplaza tab "Más" para supervisor/jefe (operario sigue con "Más")
- **Test**: jefe ve sus 6 atajos, supervisor ve solo 4

### Fase 9 — Bloqueo automático + cambio de turno (PR ~150 líneas)

- Timer de inactividad 5/10 min
- Detección de cambio de turno
- Banners no intrusivos
- **Test**: simular inactividad → banner aparece a los 5 min

### Fase 10 — Migración de perfiles legacy (PR ~80 líneas)

- Script que migra sesiones `supervisor`/`jefe`/`admin` existentes
- Quita feature flag `uxV2` — V2 pasa a default
- Borra código del bottom bar viejo
- **Test**: sesión existente sigue funcionando sin re-login

**Total estimado: 10 PRs, ~2,080 líneas, 4-6 semanas con QA real entre fases**

---

## 7. Quick wins de bajo riesgo (ejecutables en paralelo)

Cambios chicos que no requieren V2 completa y se pueden hacer ya:

| QW | Cambio | Líneas | Riesgo |
|---|---|---|---|
| 1 | Bottom bar: subir icon a 24px, label a 11px, padding a 14px | ~10 | bajo |
| 2 | `padding-bottom: env(safe-area-inset-bottom)` en bottom bar | ~3 | nulo |
| 3 | Header: subir touch target de botones de 34 a 44px | ~15 | bajo |
| 4 | Reemplazar `alert()` de validación por banner inline rojo (1 sección de prueba: Ingresos) | ~40 | medio |
| 5 | Color de fondo distinto en zonas de jefe (sutil tint accent) | ~5 | nulo |
| 6 | Vibración háptica en tap de botones primarios (`navigator.vibrate(10)`) | ~5 | nulo |
| 7 | Mostrar nombre del operario activo en header (cuando exista) | ~20 | bajo |
| 8 | Skeleton loaders en lugar de "Cargando..." | ~30 | bajo |

Recomendación: hacer QW 1+2+3 en un solo PR como "preludio" a la V2.
Es bajo riesgo, mejora la sensación táctil inmediata, y prepara el terreno.

---

## 8. Cambios que requieren migración o son irreversibles

| Cambio | Por qué | Mitigación |
|---|---|---|
| Agregar `operario` a `PERFILES` | Las sesiones existentes no lo conocen | Default a perfil legacy si no se setea |
| `resp` ahora contiene nombre de operario en vez de "Supervisor" | Histórico tiene strings genéricos | No migrar histórico — solo aplicar a registros nuevos |
| `permisos_extra` en operario | Estructura nueva en `yatasto:operarios` | Init de `[]` si la tabla está vacía |
| Quitar tab "supervisor" del bottom bar | Operario lo usaba sin querer | Banner "esa función se movió a Control" durante 2 semanas |
| Hashear PIN | No se puede reverse engineering | Documentación: PIN reset solo por jefe |

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Operarios resisten el cambio | Alta | Medio | Fase de prueba 1 semana con feature flag, sesión presencial de 30min |
| PIN compartido entre operarios | Alta | Alto | Jefe puede ver "último login" y rotar PINs; auditoría registra dispositivo |
| Doble login (sesión base + operario) confunde | Media | Medio | UX clara: en header siempre se ve "Carlos R. (Supervisor)" |
| Cambio de turno olvidado | Alta | Bajo | Banner automático en 07/14/21h ± 30min |
| Performance al cargar HOME (varios queries) | Media | Medio | Paralelizar; cache 30s; skeleton mientras carga |
| Gestión de usuarios escala mal con >20 operarios | Baja | Bajo | Buscador + filtro activo/inactivo desde el inicio |
| Operarios sin smartphone propio | Baja | Alto | Reutilizar dispositivo de planta — sesión rápida (PIN, no logout) es la mitigación |
| Bug en step-up bloquea acción crítica | Media | Crítico | Bypass de emergencia: PIN del jefe + tap en logo 5 veces |

---

## 10. Recomendaciones UI industriales

### 10.1 Visuales

- **Modo oscuro por defecto** (ya está). Planta lechera tiene iluminación
  amarilla pobre.
- **Sin animaciones elásticas**. Solo `ease-out` 150-250ms.
- **Sin gradientes de texto**. Sin glassmorphism.
- **Contraste mínimo 7:1 en texto principal**. WCAG AAA.
- **Border-radius 8-12px** en cards, 14px en botones, 24px en chips de
  operario. Sin bordes filosos pero sin píldoras infantiles.
- **Sombras casi nulas**. Profundidad por background tint, no por sombra.

### 10.2 Táctiles

- **44×44px mínimo en cualquier botón** (Apple HIG)
- **48×48px en zonas de operación rápida** (Material Design)
- **64×64px en bottom bar y chips de operario**
- **80×80px en teclado PIN**
- Gap mínimo entre botones interactivos: **8px** (16px en zonas críticas)
- Vibración háptica `10ms` en confirmaciones, `30ms` en errores

### 10.3 Tipográficas

- Texto operativo: **15-16px** (no 13-14)
- Labels: **11-12px** (no 9-10)
- Números grandes: **24-32px** monoespaciado
- Sin all-caps en strings de más de 1 palabra (labels de bottom bar OK)
- Line-height **1.4** en texto, **1.1** en números

### 10.4 Sonido y feedback

- Sin sonidos (planta es ruidosa, se pierden)
- Vibración háptica (`navigator.vibrate`) sí
- Animación de confirmación: check verde 200ms + auto-dismiss
- Animación de error: shake horizontal 4px + banner persistente

### 10.5 Anti-patrones a evitar (recordatorio de UI-PLAN.md)

- `border-left ≥ 2px` decorativo
- Gradient text
- Glassmorphism
- KPI hero card SaaS
- Bounce/elastic
- `#000` / `#fff` puros
- `alert()` para validación
- Dropdowns de >7 opciones sin buscador
- Bottom sheets que ocupan >70% del viewport
- Modales sobre modales sin scroll lock (ya resuelto en sprint anterior)

---

## 11. Métricas de éxito (post-rollout)

Objetivos medibles para evaluar si la V2 funcionó. Se miden a la 2da semana
después del rollout completo:

| Métrica | Baseline actual (estimado) | Target V2 |
|---|---|---|
| Tiempo promedio "abrir app → guardar ingreso" | ~25s | <12s |
| Tasa de toques erróneos (tap en tab equivocado, medido por navegación inmediata back) | ~15% | <5% |
| Cantidad de `alert()` triggereados por día | ~30 | <5 |
| % de saves con `resp` no vacío | ~40% | >95% |
| Tasa de cierre de día sin chequear inconsistencias | ~70% | <30% (banner forzaría chequeo) |
| Quejas verbales de operarios por sesión semanal | varias | <1 |

---

## 12. Decisiones que requieren input del jefe

Antes de empezar a codear la Fase 0, necesito que confirmes:

1. **Operarios existentes en planta**: nombres, cantidad, turnos típicos.
   Sin esa lista no puedo seedear `yatasto:operarios`.
2. **PIN: 4 o 6 dígitos**. 4 es estándar bancos, 6 más seguro pero más
   lento.
3. **Estilo de los chips de operario**: ¿iniciales + nombre completo o solo
   nombre? ¿foto opcional?
4. **¿Mantener sesión base supervisor/jefe entre días?** O ¿logout
   automático al cerrar día?
5. **Inactividad: 5/10 min OK o ajustamos?** Operarios pueden estar 30 min
   en una tarea sin tocar la pantalla.
6. **¿Llamar supervisor desde el sheet "Más" debe hacer algo real
   (telefonía)?** O ¿es solo placeholder?
7. **¿Oficina ya está usando la app?** Si no, postergo Fase 7+ y prioritizo
   operario.
8. **¿Cuándo está disponible un operario real para probar?** Idealmente la
   Fase 1 se valida con un operario presencial antes de mergear.

---

## 13. Resumen ejecutivo en una página

**Problema**: la app actual está técnicamente sana pero la UX mobile sigue
sintiéndose como un ERP comprimido. No hay perfil "operario", la bottom
bar tiene 7 tabs microscópicos, no hay trazabilidad por persona, y
operaciones peligrosas están a un toque de cualquier usuario.

**Solución V2**:
- 4 tabs grandes en bottom bar (HOME / OPER / PROD / MÁS|CONTROL)
- HOME nuevo con acciones rápidas + estado de planta resumido
- Nuevo perfil "operario" con login PIN sobre sesión base supervisor
- Matriz de permisos por sección y por acción
- PIN-step-up para 5 acciones críticas
- Gestión de usuarios bajo control del jefe

**No-objetivos**:
- No reescribir cálculos
- No tocar componentes Sec\*
- No reemplazar Supabase Auth
- No agregar features nuevas (solo reorganización)

**Roadmap**: 10 fases (PRs) de ~200 líneas cada una, 4-6 semanas. Cada
fase mergeable sola, revertible vía feature flag.

**Primera acción concreta**: confirmar los 8 puntos de §12 y arrancar
Fase 0 (infraestructura de permisos sin cambios visibles).
