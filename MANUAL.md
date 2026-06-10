# Manual del proyecto — Todo lo que se hizo para llegar a v1.0

Este documento es para **vos** (el dueño del proyecto). Explica todo el
trabajo de cierre del proyecto: qué se construyó, dónde vive cada cosa,
cómo se usa y cómo se verifica. Es el complemento técnico del
`RUNBOOK.md` (que es para el jefe de planta, no técnico).

---

## 1. Resumen ejecutivo

El proyecto pasó de "app funcional sin red de seguridad" a "app lista
para producción real" en 4 frentes:

| Frente | Antes | Ahora |
|---|---|---|
| **Tests** | 0 tests | **344 tests** en 25 archivos (~55s la suite completa) |
| **Calidad** | Sin lint, sin CI | ESLint 0 errores + Prettier + GitHub Actions bloqueante |
| **Pérdida de datos** | Fallos silenciosos (solo console.error) | Toast visible + descartes auditables + ErrorBoundary |
| **Identidad operario** | Perfil genérico ("Supervisor") | Login PIN por operario + audit trail "quién hizo qué" + step-up para acciones críticas |

Todo está en la rama `claude/eager-darwin-C1WmW`, dividido en ~35
commits chicos y autocontenidos (cada uno con su verificación).

---

## 2. Mapa del proyecto (qué hay ahora)

```
proyecto-sorrentino/
├── recibo_yatasto.jsx        ← la app (9.900 líneas; bajó de peso, ver §9)
├── main.jsx                  ← entry: ErrorBoundary > ToastProvider > App
├── db-adapter.js             ← Supabase + cola offline + descartes auditables
├── hooks.js                  ← useViewport, usePerfil, useOperarioActivo,
│                                useInactivityLock, useShiftChange
├── telemetry.js              ← telemetría opt-in (ya cableada al flujo de save)
├── tokens.js                 ← design tokens (sin cambios)
├── icons.js                  ← iconos lucide (sin cambios)
│
├── lib/                      ← LÓGICA PURA, SIN REACT (todo testeado)
│   ├── helpers.js            ← buildFortLabel, diffDays, calcSF, isSueroLike,
│   │                            adicionLitros, fortSourceDraws
│   ├── dates.js              ← getToday, getPreviousDate, addDay, fmtDate…
│   ├── density.js            ← normalizeDensity, validateDensity (Ecomilk 20-40)
│   ├── export-helpers.js     ← escapeHtml, escapeCsv (anti CSV-injection)
│   ├── resumen.js            ← buildResumen (confirmaciones + audit log)
│   ├── produccion.js         ← isLoteActivo, isLoteFinalizado…
│   ├── permisos.js           ← MATRIZ DE PERMISOS (4 perfiles × 26 acciones)
│   ├── pin.js                ← hashPin / verifyPin (SHA-256 + sal, const-time)
│   ├── operarios.js          ← CRUD de operarios (clave yatasto:operarios)
│   └── audit.js              ← stampOperario (trazabilidad por registro)
│
├── components/               ← COMPONENTES REACT NUEVOS
│   ├── Toast.jsx             ← notificaciones no bloqueantes
│   ├── ErrorBoundary.jsx     ← pantalla de recuperación anti-blanco
│   ├── PerfilProvider.jsx    ← contexto de identidad + <RequierePermiso>
│   ├── OperarioLogin.jsx     ← selector de chips + teclado PIN
│   ├── SecUsuarios.jsx       ← gestión de operarios (solo jefe)
│   └── StepUpPin.jsx         ← autorización con PIN en vivo
│
├── tests/                    ← 25 archivos, 344 tests
├── .github/workflows/ci.yml  ← lint + test + build en cada push/PR
├── eslint.config.js          ← flat config con react + react-hooks
├── .prettierrc                / .prettierignore
├── vitest.config.js          ← jsdom + plugin react + coverage
├── RUNBOOK.md                ← manual operativo para el jefe (no técnico)
├── MANUAL.md                 ← este documento
└── CLAUDE.md                 ← actualizado con toda la arquitectura nueva
```

---

## 3. Calidad de ingeniería (tests, lint, CI)

### Qué se hizo
- **Vitest + jsdom + React Testing Library** configurados desde cero.
- **ESLint** (flat config) con `react` + `react-hooks`. 0 errores; las
  ~120 warnings restantes son código muerto del monolito (no bloquean).
- **Prettier** con `.prettierrc` e ignore.
- **GitHub Actions** (`.github/workflows/ci.yml`): en cada push y PR a
  `main` corre `npm ci → lint → test → build`. Si algo falla, el PR no
  se puede mergear.

### Comandos
```bash
npm test              # 344 tests (~55s)
npm run test:watch    # modo watch para desarrollo
npm run test:coverage # reporte de cobertura (lib/, db-adapter, hooks)
npm run lint          # ESLint
npm run format        # Prettier sobre todo el repo
npm run build         # build de producción (verifica que nada rompa)
```

### Qué cubren los tests (por categoría)
| Categoría | Archivos | Qué garantizan |
|---|---|---|
| Funciones puras | helpers, dates, density, export-helpers, resumen, produccion | Cálculos de fechas (bisiestos, bordes de año), densidad Ecomilk, SF+N, conversión de unidades, predicados de lote |
| Dominio/seguridad | permisos, pin, operarios, audit, isPermanent4xx, is401 | La matriz de permisos completa, hash de PIN, CRUD de operarios, estampado de autoría, clasificación de errores HTTP |
| Cola offline | discarded, queue | Encolar, drenar, retry con backoff, descarte de 4xx, retención de 408/429 |
| UI | toast, perfilProvider, operarioLogin, errorBoundary | Ciclo de vida del toast, ocultar/deshabilitar por permiso, flujo completo de PIN, pantalla de recuperación |
| Hooks | useInactivityLock, useShiftChange, useOperarioActivo, useViewport | Timers de inactividad, ventanas de turno, sessionStorage, breakpoints |
| Integración | shift, operario-flow, telemetry | Flujo jefe-crea → operario-loguea → registro-estampado |

---

## 4. Robustez de datos (nunca más pérdida silenciosa)

### Problema que había
Si `save()` fallaba o la cola descartaba un registro por error de
validación del servidor, **solo quedaba en console.error**. El operario
seguía trabajando creyendo que todo se guardó.

### Qué se hizo

**a) Toast (`components/Toast.jsx`)**
- `useToast()` con API `{ ok, warn, error }`. Overlay flotante
  abajo-derecha, auto-dismiss 5s, máximo 3 visibles, accesible
  (`role="status"`, `aria-live="polite"`).
- Cableado: cuando `db.set()` encola por falta de red, el operario ve
  *"Sin conexión — el cambio quedó en cola para reintentar"* (con
  throttle de 8s para no spamear).

**b) Descartes auditables (`db-adapter.js`)**
- Cuando la cola descarta una entrada por error 4xx permanente
  (validación), ahora se guarda en `localStorage.__yatasto_discarded__`
  (cap 50) con key, status, mensaje y payload.
- La UI muestra: toast rojo + banner sticky con contador + modal "Ver
  detalle" con la lista completa y el payload colapsable.
- Botones "Marcar como visto" y "Limpiar todo".
- API: `onDiscarded(fn)`, `listDiscarded()`, `clearDiscarded()`.

**c) Conflicto multi-dispositivo (ya existía como C5, se mantuvo)**
- Si dos dispositivos editan la misma sección, el segundo recibe banner
  rojo "modificado desde otro dispositivo" con botón Recargar.

**d) ErrorBoundary (`components/ErrorBoundary.jsx`)**
- Si cualquier componente revienta en render, en vez de pantalla blanca
  el operario ve "Algo salió mal" + botón **Recargar la app**.
- El error se persiste en `localStorage.__yatasto_last_error__`. Para
  diagnóstico: abrir consola y ejecutar `window.__yatastoLastError()`.

---

## 5. Sistema operario completo

### El modelo
Dos capas de identidad:
1. **Sesión base** (Supabase Auth): supervisor / jefe / operador con
   email + contraseña. Es la que da acceso a los datos (RLS).
2. **Operario de turno** (capa nueva): sobre un dispositivo con sesión
   base activa, cada operario se identifica con su **chip + PIN de 4-6
   dígitos**. Vive en `sessionStorage` (muere al cerrar la pestaña).

### Flujo completo
1. **El jefe crea operarios**: Modal perfil (vaca) → *Gestionar
   operarios* → `+ Nuevo operario` (nombre, color del chip, rol, PIN).
   Todo en `components/SecUsuarios.jsx`, persiste en la clave
   `yatasto:operarios` (misma tabla Supabase, sin migración SQL).
2. **El operario loguea**: al abrir la app con operarios cargados,
   aparece `OperarioLogin` (chips grandes + teclado numérico 80×80px).
   3 PIN fallidos → chip bloqueado 60 segundos.
3. **Identidad visible**: chip con iniciales + nombre en el header.
   Click → cambiar de operario.
4. **Auto-lock**: 5 min sin tocar → toast de aviso; 10 min → vuelve al
   selector (la sesión base no se cierra). `useInactivityLock` en
   `hooks.js`.
5. **Cambio de turno**: en las ventanas 06:30-07:30 / 13:30-14:30 /
   20:30-21:30 aparece banner "¿Cambio de turno?" con botón Cambiar.
   `useShiftChange` en `hooks.js`.
6. **Salir del modo operario**: Modal perfil → "Salir del modo operario"
   (sin cerrar la sesión base). El logout completo también limpia el
   operario.

### Seguridad del PIN (`lib/pin.js`)
- SHA-256 con **sal aleatoria por usuario** (no rainbow tables).
- Formato almacenado: `sha256:<salt>:<hash>` — nunca el PIN en claro.
- Comparación en **tiempo constante** (no filtra información por timing).
- No se puede "ver" un PIN: solo resetear desde la ficha del operario.

---

## 6. Matriz de permisos (`lib/permisos.js`)

Una sola fuente de verdad: `PERMISOS_POR_PERFIL` con 4 perfiles
(jefe / supervisor / operador / oficina) × 26 acciones con formato
`seccion.verbo` (ej. `ingresos.eliminar`, `dia.cerrar`).

```js
import { ACCIONES, tienePermiso } from "./lib/permisos.js";
tienePermiso("operador", ACCIONES.INGRESOS_ELIMINAR)  // false
tienePermiso("supervisor", ACCIONES.DIA_CERRAR)        // true
tienePermiso("supervisor", ACCIONES.DIA_REABRIR)       // false (solo jefe)
```

- Los handlers de eliminar de Ingresos, Carga, Movimientos,
  Fortificados y el cierre de día ya usan `tienePermiso()` en vez de
  los checks inline `perfil === "supervisor" || ...`.
- Soporta **permisos extra por usuario** (`permisosExtra` en el
  operario): delegar una capacidad puntual sin promover de rol.
- Componente `<RequierePermiso accion="..." modo="disabled">`: muestra
  el botón deshabilitado con tooltip en vez de ocultarlo (el operario
  entiende que la acción existe pero no le corresponde).
- **Jerarquía verificada por tests**: operador ⊂ supervisor ⊂ jefe.

> Importante: esto es UX/visibilidad. La defensa real sigue siendo RLS
> en Supabase — un atacante con devtools no puede escalar permisos de
> datos, solo ver botones que el servidor le va a rechazar.

---

## 7. Step-up PIN — las 5 acciones críticas

Para acciones de alta consecuencia, la app pide el **PIN de un
supervisor/jefe en vivo** (modal `useStepUpPin()` de
`components/StepUpPin.jsx`). La autorización NO cambia quién está
logueado — solo desbloquea esa acción puntual, y el audit registra
**doble autoría**: `"Carlos R. (autorizado por Miguel J.)"`.

| # | Acción | Quién la dispara | Quién autoriza |
|---|---|---|---|
| 1 | Eliminar lote de producción **finalizado** (restituye litros al silo) | Supervisor | Jefe u otro supervisor con PIN |
| 2 | Reabrir un día cerrado de **más de 7 días** | Jefe | Otro supervisor/jefe con PIN |
| 3 | Modificar el **saldo base** oficial | Supervisor | Jefe u otro supervisor |
| 4 | Eliminar un ingreso de **día ya cerrado** (bypass auditado del cierre) | Supervisor/Jefe | Otro supervisor/jefe |
| 5 | **Forzar ingreso con CIP pendiente** (silo sucio) | Operario | Supervisor/jefe con PIN |

Detalles de implementación:
- 3 PIN fallidos en el modal → se cancela la operación.
- Si no hay ningún supervisor/jefe con PIN configurado en el sistema,
  el modal lo dice claramente ("Pedile al jefe que cree un autorizante").
- Caso #4 usa `save(date, sec, data, { bypassClosed: true })` — la
  única vía legítima para escribir sobre un día cerrado, y queda
  trackeada (`save_closed_bypass` en telemetría).

---

## 8. Audit trail — quién hizo qué

Cada registro de **Ingresos, Carga, Movimientos, Fortificados,
Producción y CIP** se estampa al guardarse (`lib/audit.js`):

```js
{
  ...datosDelRegistro,
  operarioId: "uuid-del-operario",
  operarioNombre: "Carlos R.",
  resp: "Carlos R.",            // visible en las cards (compatible con legacy)
  savedAt: "2026-06-10T14:30:00.000Z",
}
```

- Si **otro** operario edita un registro existente, se preservan
  `operarioIdOriginal` / `operarioNombreOriginal` (el creador no se
  pierde nunca, ni con N ediciones).
- Sin operario activo, `resp` cae al label del perfil ("Supervisor").
- Los datos históricos sin estampar siguen mostrándose con su `resp`
  legacy — **no se migró nada**, solo aplica a registros nuevos.

---

## 9. Refactor a `lib/` — por qué importa

Se extrajeron **10 módulos de lógica pura** del monolito de 9.900
líneas. Razones:

1. **Testeabilidad**: una función dentro del monolito no se puede
   importar en un test sin montar toda la app. En `lib/` sí.
2. **Documentación viva**: cada módulo tiene un header que explica el
   contexto operativo (ej. por qué la densidad acepta "28" — es lo que
   muestra el Ecomilk en planta).
3. **Cambios futuros más seguros**: tocar `adicionLitros` o
   `fortSourceDraws` (que alimentan el balance de silos) ahora rompe
   tests inmediatamente si se introduce una regresión.

La app importa todo desde `lib/` — cero duplicación, cero cambio de
comportamiento (verificado con build + suite completa en cada paso).

---

## 10. Telemetría (opt-in, ya cableada)

`telemetry.js` existía pero nadie llamaba `track()`. Ahora el flujo de
guardado emite eventos automáticamente:

| Evento | Cuándo |
|---|---|
| `save_ok` / `save_queued` / `save_failed` | cada guardado, por sección |
| `save_blocked_closed` / `save_closed_bypass` | intentos sobre día cerrado |
| `save_conflict` | conflicto multi-dispositivo |
| `discard_4xx` | descartes de la cola |
| `tab_open` | navegación por tabs |
| `operario_login` / `operario_login_skipped` / `operario_logout` | identidad |
| `operario_inactivity_warn` / `operario_inactivity_logout` | auto-lock |
| `shift_window_entered` | ventanas de cambio de turno |
| `stepup_*` | cada una de las 5 autorizaciones |

**Está apagada por defecto.** Para activar en un dispositivo:
```js
localStorage.setItem("yatasto:telemetry", "true")  // y recargar
```
Para leer: `await window.__yatastoTelemetry.dump(7)` (últimos 7 días).
Cap 500 eventos/día, retención 14 días, sin IDs de dispositivo.

> **Por qué importa**: el council del 2026-05-23 condicionó el rediseño
> del bottom nav (4 tabs) a tener **una semana de datos reales de uso**.
> Activá la telemetría cuando la app entre en producción y en una semana
> vas a tener la evidencia para decidir la nav con datos, no opiniones.

---

## 11. Accesibilidad (lo crítico, hecho)

- **Labels asociados**: el componente `F` ahora envuelve el input dentro
  del `<label>` (asociación implícita) — beneficia ~50 campos de una vez.
- **Focus visible**: outline 2px ámbar en `:focus-visible` global (solo
  teclado, no clicks).
- **`prefers-reduced-motion`**: todas las animaciones se desactivan si
  el usuario lo pide en su sistema operativo.
- **`aria-invalid`** en `Inp` y `Sel` (prop `error` opt-in, con borde
  rojo) — listo para cablear validación campo a campo.
- **Banner con semántica correcta**: error → `role="alert"` (interrumpe),
  warning/info → `role="status"` (no interrumpe).
- Componentes nuevos nacen accesibles: botones ≥44px, `role="dialog"`,
  `aria-modal`, `aria-label` en teclas del PIN.

---

## 12. Verificación rápida (checklist para vos)

```bash
# 1. Todo verde
npm test          # → 344 passed
npm run lint      # → 0 errors
npm run build     # → built sin errores

# 2. Probar el flujo operario en dev
npm run dev
# → loguear como jefe → modal perfil → Gestionar operarios → crear uno con PIN
# → recargar → aparece el selector de chips → PIN → chip en el header
# → crear un ingreso → la card muestra el nombre del operario

# 3. Probar el step-up
# → como operario, intentar guardar un ingreso a un silo "Sucio (vacío)"
# → la app pide PIN de supervisor → autorizar → el audit muestra doble autoría

# 4. Probar la robustez
# → DevTools → Network → Offline → guardar algo → toast "quedó en cola"
# → volver online → la cola drena sola (banner desaparece)
```

---

## 13. Qué queda para después (fuera de v1.0, decisión deliberada)

| Pendiente | Por qué quedó afuera | Cuándo encararlo |
|---|---|---|
| **Bottom nav V2 (4 tabs)** | El council lo condicionó a 1 semana de telemetría real | Tras 1 semana en producción con telemetría ON |
| **Migración `C.*` → CSS vars** (716 refs) | Mecánica pero enorme; el theme switch funciona hoy con reload | Cuando haya una semana tranquila |
| **`lib/saldo.js`** (extraer `calcAutoLitros` / `buildChainedSaldo`) | Es EL código más crítico; extraerlo sin smoke tests en planta es riesgo innecesario | Después de validar v1.0 en producción |
| **Sentry** | Necesita cuenta/DSN tuya; el ErrorBoundary + localStorage cubren lo esencial | Cuando quieras observabilidad remota |
| **Perfil "oficina"** | Definido en la matriz de permisos pero sin UI; nadie lo usa aún | Cuando la oficina pida acceso |
| **Modularizar SecDashboard/SecMovimientos** | Mantenibilidad, no funcionalidad | Próximo ciclo |

---

## 14. Documentos relacionados

- **`RUNBOOK.md`** — para el jefe de planta: cómo crear operarios, qué
  significa cada banner, qué NO hacer, checklist pre-producción.
- **`CLAUDE.md`** — para futuras sesiones de desarrollo: arquitectura,
  convenciones, claves de storage, patrón de cada cosa.
- **`UX-V2.md` / `UI-PLAN.md` / `PRODUCT.md`** — los planes originales
  (la §2.3 de UX-V2 está 100% implementada).
- **`docs/council/2026-05-23--bottom-nav-operario.md`** — la decisión
  que condiciona la nav V2 a telemetría.
