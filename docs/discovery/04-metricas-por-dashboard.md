# 04 — Métricas por dashboard: decisión, fuente y umbral

> Discovery frontend-dashboards-v2, 2026-07. Cada fila fue verificada contra
> `recibo_yatasto.jsx` en esta rama (`main` @ `fe0b672`); las citas `archivo:línea`
> apuntan a donde el dato existe HOY.
>
> **Regla de admisión** (PRODUCT.md principio 1 y UX-V2 §4.1): una métrica entra al
> dashboard solo si habilita una decisión operativa concreta. "Interesante" no es
> criterio; "¿descargo el silo o no?" sí.
>
> Leyenda de la columna Fuente:
> - **YA** — computable hoy con datos y funciones existentes (solo presentación).
> - **YA·L** — computable hoy pero con trabajo liviano (agregación multi-día, función pura nueva).
> - **NUEVO** — requiere instrumentación o datos que hoy no existen.

---

## 1. Dashboard Supervisor (decisiones de HOY, ritmo minuto/hora)

### 1.1 Alertas activas (cabecera de la pantalla, doc 03 §2)

| # | Métrica / condición | (a) Decisión que habilita | (b) De dónde sale HOY | (c) Umbral propuesto |
|---|---|---|---|---|
| S1 | Silo sobre capacidad segura | Ordenar movimiento o carga antes del próximo camión | **YA** — alerta existente `l/cap > 90%` (5992); también `isAlert = pct > 88` en SiloBar (5248). `totals` de `calcAutoLitros` (580-783) + `SILO_CAP` (116-123) | **Unificar en >88%** (§3.1); crítica al superar `SILO_MAX` (134-141) |
| S2 | Saldo de silo negativo | Auditar registro del día: hay un ingreso/movimiento/carga mal cargado | **YA** — alerta existente `l < 0` tipo err (5993) | `< 0` (sin margen: un litro negativo ya es dato corrupto) |
| S3 | Aguado detectado | Retener/derivar la leche del tambo; acción correctiva | **YA** — alerta existente `aguadoFca > 0` tipo err (5995); `QUALITY_REFS.Aguado` es `critical` (459) | `> 0` (se mantiene; es binario y crítico) |
| S4 | Diferencia litros Fca/Tbo | Reclamo a transportista/tambo; recalibrar medición | **YA** — alerta existente `abs(litrosFca - litrosTbo) > 150` (5998); ojo: `DIFF_FIELDS.Litros.thresh = 100` (462) usa OTRO umbral | **Unificar en 150 L** para alerta, 100 L para marca amarilla en la card (§3.1) |
| S5 | CIP requerido (silo vaciado sin lavado) | Ordenar lavado antes de aceptar ingreso a ese silo | **YA** — flag "requiere lavado CIP" (4015, 4088); CIP "hecho" = fila con `hora` (2210) | Vaciado hoy sin CIP hoy = atención; intentar ingreso con CIP requerido = crítico (ya bloquea con step-up `stepup_forzar_cip`) |
| S6 | Calidad fuera de referencia | Retener camión, avisar a calidad, registrar acción | **YA·L** — por ingreso: campos `acidezFca/phFca/gbFca/sngFca/protFca/tC` (emptyIng 1419-1427) vs `QUALITY_REFS` (455-460). Falta SOLO el conteo agregado del día (función pura) | 1+ ingresos fuera de rango = atención; cualquier parámetro `critical` = crítico |
| S7 | Escrituras sin sincronizar / descartadas | Confiar o no en los números; no cerrar día con cola sucia | **YA** — `onWriteQueueChange(pendingCount, isRetrying)` y `listDiscarded()` de db-adapter | Descartes > 0 = crítico; pendientes > 0 sostenido > 2 min = atención |

### 1.2 Lectura del día (cuerpo del resumen)

| # | Métrica | (a) Decisión que habilita | (b) De dónde sale HOY | (c) Umbral propuesto |
|---|---|---|---|---|
| S8 | Balance del día (ingresado - cargado) | ¿Hay margen para más recepción? ¿Hay que despachar? | **YA** — `totalIngresados` (suma `litrosFca`, 5173), `totalCargados` (5174), `balance` (5175) | Negativo = revisar (cargar más de lo que entró implica consumo de saldo previo: correcto solo si el stock inicial lo cubría); sin alerta automática, solo color |
| S9 | Capacidad ocupada total (%) | Aceptar o programar los próximos camiones | **YA** — `capPct` (6703): suma `totals` / suma `SILO_CAP` | > 80% = atención (queda menos de un camión grande de margen: cisternas de ~30k vs ~93k L libres al 80% de 465k instalados) |
| S10 | Ingresos de hoy (conteo + hora del último) | Ritmo de recepción; detectar camión esperado que no llegó | **YA** — largo de `yatasto:FECHA:ingresos` + max `hora` | Sin umbral automático en v1 (el "esperado" no existe como dato; ver J8) |
| S11 | Cargas del día (conteo + litros) | Confirmar despachos comprometidos | **YA** — `yatasto:FECHA:carga`, campo `litros` (emptyCarga 2402) | Sin umbral; informativo |
| S12 | Movimientos del día | Contexto de trazabilidad del día | **YA** — largo de `yatasto:FECHA:movimientos` | Sin umbral; fila secundaria |
| S13 | CIP completados (X de N) | Planificar lavados restantes del turno | **YA** — filas CIP con `hora` (2210) vs total `CIP_SILOS` (90) + camiones | Ver S5; el conteo en sí es informativo |
| S14 | Reservado por producción (L por silo) | No comprometer litros reservados en una carga | **YA** — `reservados` retornado por `calcAutoLitros` (760-765: lotes `envasando` reservan sin descontar) | Disponible (total - reservado) < 0 = crítico (sobre-compromiso) |
| S15 | Lotes envasando (conteo + antigüedad) | Seguir el envasado; liberar reservas colgadas | **YA·L** — lotes `estado === "envasando"` (2992-3006); antigüedad = hoy - `hora`/fecha del lote (comparación simple) | Envasando > 24 h = atención (probable lote sin cerrar; umbral editable, doc 03 §7B) |
| S16 | Calidad promedio del día (tabla) | Tendencia intra-día; confirmar S6 con contexto | **YA** — `qualFields` ya calcula prom/min/max/n (5178-5181, tab calidad 6878) | Celda fuera de `QUALITY_REFS` = marca amarilla en la celda (02 §3.2) |

---

## 2. Dashboard Jefe (decisiones de gestión, ritmo día/semana)

Hereda TODO lo del supervisor (el jefe puede actuar sobre lo urgente) y agrega:

| # | Métrica | (a) Decisión que habilita | (b) De dónde sale HOY | (c) Umbral propuesto |
|---|---|---|---|---|
| J1 | Recibido hoy vs promedio 7/14 días | Detectar caída de recepción; negociar con tambos | **YA·L** — tab `semana` ya lee días previos (6668); generalizar con `getLastNDays` (lib/dates.js) + suma `litrosFca` por día. Cache: días cerrados son inmutables | Hoy < 80% del promedio 7d = atención |
| J2 | Litros y calidad por tambo (ranking) | Priorizar proveedores; pago por calidad; reclamos | **YA** — tab `tambos` existente (6669); por-ingreso `tambo` + calidad (1419-1427) | Tambo con 2+ días consecutivos fuera de rango = atención |
| J3 | Rendimiento de envasado (%) | Investigar pérdidas de proceso | **YA** — envasado/consumido (6769); consumido = `litrosUsados` o `origenes` (6757-6768) | < 95% = atención; < 90% = crítico (editable) |
| J4 | Merma del día / semana (L) | Cuantificar pérdida; decidir intervención en proceso | **YA** (día: 6768) / **YA·L** (semana: agregación J1) | Merma > 2% del consumido = atención |
| J5 | Diferencia Fca/Tbo promedio semanal | Sesgo sistemático de medición (no un evento puntual) | **YA·L** — mismos campos de S4 agregados por semana | Promedio con el mismo signo > 50 L/día durante 7d = atención |
| J6 | Eliminaciones (hoy / 7 días) | Detectar corrección excesiva o manipulación; abrir Auditoría | **YA** — `yatasto:eliminados`, shape `{fecha, hora, tipo, resumen, by}` (505-516, cap 500) | > 3 en un día = atención (revisar en Auditoría quién y qué) |
| J7 | Step-ups usados (7 días) | Revisar autorizaciones críticas (quién forzó qué) | **NUEVO** — los eventos `stepup_*` existen SOLO en telemetría opt-in por dispositivo (telemetry.js). Métrica confiable requiere registrar el step-up en el item o en un log central (el audit de StepUpPin ya estampa solicitante+autorizante en el ITEM; falta el índice global) | Cualquier step-up = fila visible; > 2/semana del mismo tipo = atención |
| J8 | Salud del sistema (descartes, lecturas fallidas, días sin cerrar) | Pausar cierre de día; revisar red/datos antes de confiar en reportes | **YA** — `listDiscarded()` (cap 50), `_lecturasFallidas` de `calcAutoLitros`; estado de día cerrado ya existe (banner 9481, step-up `stepup_reabrir_dia`) — verificar clave exacta al implementar | Descartes > 0 = crítico; > 1 día hábil sin cerrar = atención |
| J9 | Uso real de la app (taps por tab, por perfil) | Validar la nav del council ANTES de fijarla (mandato explícito del council 2026-05-23) | **NUEVO·parcial** — `tab_open`, `section_enter/leave` ya instrumentados (telemetry.js) pero opt-in, cap 500/día, retención 14d, POR DISPOSITIVO; el dump es manual (`window.__yatastoTelemetry.dump()`). Falta: activarla en los dispositivos de planta y agregar los días | No es métrica de dashboard: es insumo del análisis de la tanda 14 (doc 06) |
| J10 | Capacidad ociosa por silo (7 días) | Decidir asignación de silos / mantenimiento programado | **YA·L** — `totals` por día (J1) vs `SILO_CAP` | Silo < 10% de uso durante 7d = informativo (candidato a CIP profundo/mantenimiento) |

**Qué NO entra (y por qué):**

- "Usuarios online" (chips actuales 6646-6658): no habilita ninguna decisión del
  jefe; queda en el header como está, fuera del cuerpo de métricas.
- Donut de capacidad (6721-6729): el dato queda (S9), la forma muere (01 §4).
- KPIs porcentuales sin denominador visible: prohibidos por UX-V2 §4.1 ("todo
  número debe poder traducirse a una acción").

---

## 3. Umbrales: unificación y propiedad

### 3.1 Conflictos actuales a resolver (mismo concepto, dos números)

| Concepto | Valor A | Valor B | Propuesta |
|---|---|---|---|
| Silo lleno | `pct > 88` (SiloBar, 5248) | `> 90%` (alerta, 5992) | **88%** único, exportado de `lib/alertas.js`; 88 está alineado con `SILO_MAX` ≈ 95% de `SILO_CAP` (133-141) dejando margen de reacción |
| Dif litros Fca/Tbo | `thresh: 100` (DIFF_FIELDS, 462) | `> 150` (alerta, 5998) | Dos niveles explícitos: **100 = marca en card** (ya es el comportamiento de DIFF_FIELDS), **150 = alerta activa**. Documentar que son dos escalones del mismo concepto |

### 3.2 Tabla de referencia (defaults propuestos, editables por jefe en 7B)

| Umbral | Default | Editable | Rango válido |
|---|---|---|---|
| Silo lleno (atención) | 88% | sí | 70-95% |
| Silo lleno (crítico) | > `SILO_MAX[silo]` | no (es dato físico) | — |
| Dif Fca/Tbo (alerta) | 150 L | sí | 50-500 L |
| Aguado | > 0 | no (crítico sanitario) | — |
| Lote envasando viejo | 24 h | sí | 6-72 h |
| Capacidad total | 80% | sí | 60-95% |
| Descartes de escritura | > 0 | no (integridad) | — |
| Rendimiento envasado | < 95% atención / < 90% crítico | sí | — |

### 3.3 Reglas de implementación

1. Todos los umbrales y predicados en **`lib/alertas.js`** (funciones puras, sin
   React, testeables como el resto de `lib/`): `alertasDelDia(datos, config)`
   retorna `[{ id, sev: "critico"|"atencion"|"sistema", titulo, detalle, seccion }]`.
2. El dashboard y el Centro de alertas (doc 03 §7) consumen LA MISMA función:
   una sola verdad, imposible que el badge diga 3 y la lista muestre 2.
3. Defaults en código; overrides del jefe en `yatasto:config` (mismo canal que
   tambos/camiones custom). Si el override está fuera del rango válido, se ignora
   y se loguea a consola: un umbral corrupto no puede apagar las alertas.
4. Severidad se presenta SIEMPRE color + icono + texto (02 principio 3).
