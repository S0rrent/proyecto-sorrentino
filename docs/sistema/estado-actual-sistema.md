# Sistema ReciboApp / Yatasto — Estado actual

**Lácteos Yatasto SA — Sistema de registro operativo de planta**
Documento técnico integral · Versión 1.1 · 2026-06-04
Estado del software: rama `main` (producción), con la Tanda A de guardrails (parcial) ya mergeada.

> Documento de referencia del sistema: qué es, cómo funciona, cómo se opera, qué riesgos tiene, qué protecciones existen hoy y en qué etapa está el proyecto. Describe el comportamiento **real y actual** de la aplicación, no el deseado. Cuando una protección no existe, se indica explícitamente.

---

## Índice

1. Resumen ejecutivo
2. Qué es el sistema y qué problemas resuelve
3. Arquitectura funcional
4. Módulos y pantallas
5. Roles y perfiles
6. Matriz de permisos
7. Operación diaria
8. Producción
9. Stock
10. Cierres, reapertura y saldo
11. Auditoría y trazabilidad
12. Riesgos / hazards detectados
13. Guardrails implementados (estado actual)
14. Documentación creada
15. Capacitación
16. Validación operativa
17. Estado actual del proyecto
18. Próximos pasos

---

## 1. Resumen ejecutivo

ReciboApp ("Yatasto") es la aplicación de registro operativo diario de la planta de Lácteos Yatasto SA. Reemplaza las planillas de papel: captura ingresos de leche cruda con parámetros de calidad, movimientos entre silos, cargas despachadas, lotes fortificados, registros de limpieza CIP, producción/envasado y stock por turno, sosteniendo un cálculo encadenado de saldo de silos día a día.

El sistema está **funcional y en uso**, con backend en la nube (Supabase) y operación offline-first (la planta tiene señal débil). La lógica de cálculo de litros y saldo es sólida y está documentada como zona protegida.

El proyecto completó una **auditoría de riesgos** (técnica y de uso humano) que catalogó 30 riesgos con identificador estable. La conclusión central: el motor calcula bien, pero **la interfaz no impedía la mayoría de los errores de carga humana**, y varios de esos errores corrompen datos de forma **silenciosa** (sin aviso). Sobre la hoja de ruta de mitigaciones conservadoras (guardrails) ya se incorporó una **primera tanda** (Tanda A, parcial) que cerró seis de esos riesgos; varios siguen abiertos. En paralelo se produjo documentación operativa, de capacitación y de validación.

El proyecto cruzó de la etapa de **prototipo** a la de **operación real**: las features grandes quedan congeladas y el foco pasa a observar el uso real en planta durante varios días antes de definir la próxima tanda de mejoras.

---

## 2. Qué es el sistema y qué problemas resuelve

**Problema que resuelve.** Antes, el registro de la operación (ingresos, movimientos, cargas, limpiezas, stock) se hacía en planillas de papel, con los problemas conocidos: pérdida de hojas, datos ilegibles, sin trazabilidad, sin consolidación, sin saldo de silos confiable, y sin control cruzado de calidad e inocuidad.

**Qué hace.** Un único sistema de registro operativo diario que:

- Captura **ingresos de leche cruda** con parámetros de calidad (pH, acidez, grasa butirosa/GB, SNG, densidad, proteína, temperatura, aguado) y silo destino.
- Registra **movimientos** de leche entre silos (con pérdida), **cargas** de despacho, **lotes fortificados** y registros **CIP** de limpieza (silos y camiones).
- Mantiene el **stock por turno** y un **saldo de silos encadenado** día a día desde un saldo base.
- Gestiona la **producción/envasado** (lotes en proceso y finalizados).
- Provee **dashboard/KPIs**, **exportación** (CSV/Excel), **auditoría** y **backup**.

**Objetivo de diseño.** Que cualquier operario, en piso de planta y con baja luz, pueda registrar una operación en menos de 30 segundos, sin error y sin entrenamiento previo. Es un objetivo todavía no alcanzado en varias pantallas (ver §12).

**Contexto de uso.** Operarios de turno, supervisores y jefe de planta. Uso mixto: celular/tablet en piso (registro) y escritorio en oficina (revisión, exportación, supervisión). Entorno industrial: manos húmedas, luz amarilla pobre, ruido, presión de tiempo, experiencia digital variable, señal inestable.

---

## 3. Arquitectura funcional

**Tipo de aplicación.** Aplicación web React de archivo único (`recibo_yatasto.jsx`), instalable como PWA (modo standalone, portrait, español, offline-capable mediante service worker). Interfaz mobile-first, tema oscuro (paleta OKLCH), pensada para lectura a distancia con luz pobre.

**Persistencia.** Backend Supabase, tabla clave-valor `yatasto_storage (key, value, updated_at)`. Todo pasa por un adaptador (`db.get/set/list/remove`). Las claves siguen el patrón `yatasto:YYYY-MM-DD:seccion` (fecha ISO, ordenable). El valor es siempre JSON.

**Offline-first.** Cuando una escritura falla por red, se encola localmente y se reintenta con backoff; la cola sobrevive recargas. El indicador de conexión muestra "Sincronizado" o la cantidad de cambios pendientes. El cierre del día se bloquea si hay cola pendiente, para proteger el saldo.

**Motor de cálculo (zona protegida).** Un conjunto de funciones sostiene el saldo de silos:

- `calcAutoLitros(date)`: calcula los litros netos por silo para una fecha, aplicando en orden ingresos (+), movimientos (origen −, destino +), cargas (−), fortificados (origen −, destino +) y producción finalizada (−).
- `SALDO_BASE_KEY`: ancla manual del saldo, cargada por supervisor/jefe; es la única fuente de verdad manual y nunca la sobrescribe el sistema.
- `SALDO_KEY`: saldo encadenado hasta ayer; es un cache derivado y reconstruible.
- `buildChainedSaldo` / `rebuildSaldoChain`: reconstruyen el saldo día a día desde el ancla.
- `runConsistencyChecks(date)`: red de seguridad que detecta inconsistencias (stock negativo, reservados que exceden el silo, rendimiento imposible, movimientos automáticos huérfanos, cadena truncada).

Estas funciones, la persistencia base y la cola offline son **zona protegida**: no se modifican sin pre-mortem y test de regresión de la cadena de saldo.

**Convención de fecha y turnos.** Fechas persistidas en ISO `YYYY-MM-DD`; se muestran en formato `dd/mm/yyyy`. Tres turnos: 07:00 (Mañana), 14:00 (Tarde), 21:00 (Noche). Limitación conocida: la fecha "hoy" se deriva hoy en UTC y rota a las 21:00 hora Argentina (riesgo T2, ver §12).

---

## 4. Módulos y pantallas

| Módulo / Pantalla | Función |
|---|---|
| **Ingresos** | Alta de ingresos de leche cruda por camión: litros (Fábrica/Tambo) y parámetros de calidad; silo destino. Pantalla más usada. |
| **Movimientos** | Transferencias de leche silo a silo (Desde/Hasta, litros, pérdida) y controles de calidad por silo. |
| **Carga** | Despachos de salida (CARGA 1/2/3): silo proveniente, litros, destino, producto. |
| **Fortificados** | Lotes fortificados: silo origen/destino, litros base y adiciones (producto + cantidad + unidad). |
| **CIP** | Registros de limpieza (Clean In Place) de silos y camiones: parámetros de lavado (alcalino, enjuague, ácido, temperatura), hora y responsable. Registro de inocuidad. |
| **Stock** | Niveles por silo y por turno (Mañana/Tarde/Noche); litros auto-calculados + producto inferido. |
| **Producción** | Lotes de envasado: en proceso ("envasando") e historial (finalizados). Reserva y descuenta litros del silo. |
| **Dashboard / KPIs** | Analítica de la jornada y exportación (CSV/Excel). Accesible a supervisor y jefe. |
| **Administración / Panel técnico** | Inconsistencias, reconstrucción de cadena de saldo, backup completo, auditoría detallada. **Solo jefe.** |
| **Shell (marco)** | Barra de navegación inferior (6 pestañas), selector de fecha, modal de identificación de responsable, cierre/reapertura de día, descarga de backup, indicador de conexión. |

> Nota sobre navegación: la barra inferior expone 6 pestañas (Ingresos · Movimientos · Carga · Fortificados · CIP · Stock). Producción, Dashboard y Administración se alcanzan fuera de esas 6. El rediseño de navegación (4 pestañas, home, login por PIN) está **planificado** pero **no implementado**.

---

## 5. Roles y perfiles

El sistema define **tres perfiles reales** en código, resueltos desde la sesión de Supabase Auth (no desde el dispositivo, para evitar escalado de privilegios):

| Rol operativo | Perfil en sistema | Dispositivo | Resumen |
|---|---|---|---|
| **Operario** | `operador` | Mobile (piso) | Registra la operación física del turno. No cierra día, no elimina, no entra a Producción/Dashboard/Admin. |
| **Supervisor** | `supervisor` | Mobile / tablet | Controla la jornada: corrige, elimina, autoriza desvíos, gestiona Producción, cierra el día, exporta. |
| **Jefe** | `jefe` | Desktop + mobile | Todo lo del supervisor + reabrir día, saldo base, panel técnico, backup completo, auditoría detallada. |
| **Oficina** | *(no es un perfil propio)* | Desktop | Administración / control de calidad: usa credenciales de supervisor o jefe en escritorio para revisar, exportar y verificar backups. |

> **Importante:** "Operario" y "Oficina" como roles diferenciados, junto con login por PIN y atribución individual por persona, están **planificados** (rediseño de perfiles) pero **no existen** en la versión actual. Hoy el rol del piso usa el perfil `operador`, y "Oficina" se cubre con un perfil existente desde escritorio.

---

## 6. Matriz de permisos

Permisos efectivos verificados en código (`✓` permitido · `✗` no permitido):

| Acción | `operador` | `supervisor` | `jefe` |
|---|:--:|:--:|:--:|
| Cargar/editar Ingresos · Movimientos · Carga · Fortificados | ✓ | ✓ | ✓ |
| Cargar Stock por turno · Registrar CIP · Identificarse | ✓ | ✓ | ✓ |
| Eliminar registro (Ingreso/Movimiento/Carga/Fortificado) | ✗ (oculto) | ✓ | ✓ |
| Forzar ingreso con **aguado** | ✓ (sin permiso) — no auditado | ✓ — no auditado | ✓ — no auditado |
| Forzar ingreso a silo **sucio / CIP pendiente** | ✗ | ✓ — auditado | ✓ — auditado |
| Producción: envasar / finalizar / eliminar lote | ✗ | ✓ | ✓ |
| Dashboard / KPIs · Exportar CSV/Excel | ✗ | ✓ | ✓ |
| Cerrar día · Descargar backup sugerido | ✗ | ✓ | ✓ |
| Cambiar Saldo Base Oficial | ✗ | ✓ | ✓ |
| Reabrir día | ✗ | ✗ | ✓ |
| Inconsistencias · Auditoría detallada · Panel técnico · Backup completo | ✗ | ✗ | ✓ |

> Los permisos se aplican **solo del lado del cliente** (ocultando o cortando botones). No son una barrera a nivel servidor (riesgo T6): un usuario autenticado podría, desde la consola del navegador, saltar la interfaz. El control efectivo hoy es el **acceso físico al dispositivo** y las credenciales.

---

## 7. Operación diaria

**Apertura.** Al abrir, el sistema resuelve el perfil desde la sesión, reconstruye el saldo encadenado hasta ayer y, si el turno actual no tiene responsable cargado, muestra el modal de identificación (que puede postergarse).

**Durante el día.** Cada acción de una sección **guarda de inmediato** (no hay botón de guardar a nivel sección ni debounce); con señal débil esto genera ráfagas de escritura que se encolan. Un sincronizador periódico (cada 10 s) refresca las secciones, actualiza el turno según la hora y detecta el cruce de día.

**Flujo típico del operario (por turno).** Identificarse como responsable → registrar cada camión en Ingresos → mover leche entre silos en Movimientos → despachar en Carga → cargar lotes en Fortificados → registrar limpiezas en CIP → al cierre de su turno, cargar el Stock de sus silos.

**Flujo típico del supervisor.** Revisar lo cargado → corregir/eliminar errores → autorizar desvíos (CIP pendiente, aguado) → gestionar Producción → esperar "Sincronizado" → cerrar el día → descargar y verificar el backup.

**Modo histórico.** Cuando la fecha seleccionada no es hoy, la aplicación entra en modo histórico (hoy señalizado de forma poco evidente — riesgo H7). Por el cálculo de fecha en UTC, durante el turno noche la app puede entrar en modo histórico aunque sea el turno en curso (riesgo T2).

---

## 8. Producción

El módulo de Producción gestiona lotes de envasado. Cada lote tiene estado (enviado / envasando / finalizado / cancelado), silos de origen, litros usados, destino del sobrante y cajas. Los lotes **en proceso** generan litros reservados sobre el silo; los lotes **finalizados** descuentan litros reales del silo.

La pantalla de **finalización** valida en línea: exige número de lote, al menos un silo origen con litros, litros usados no vacíos, no negativos y que no superen los enviados, y destino del sobrante si lo hay. Producción es el **único módulo que registra en auditoría las altas y ediciones** (no solo los borrados). Es el único lugar donde hoy se puede reconstruir de forma confiable quién creó o editó un registro.

Eliminar un lote **finalizado** restituye litros al silo (acción irreversible, exclusiva de la gestión, registrada en auditoría).

---

## 9. Stock

El módulo de Stock muestra el nivel de cada silo por turno (Mañana/Tarde/Noche). Los litros se auto-calculan a partir del saldo encadenado y de la operación del día; el producto de cada silo se infiere del último ingreso. Cada turno guarda su responsable (`resp`), que hoy es el único dato de atribución por persona.

Limitaciones conocidas en esta pantalla (ver §12): el guardado usa el turno del estado en memoria (que puede venir de una sesión previa) y el auto-relleno puede pisar el producto cargado a mano (riesgo TH6); un silo por encima de su capacidad se muestra al 100 % sin alerta de peligro (riesgo H9).

---

## 10. Cierres, reapertura y saldo

**Cierre del día (supervisor/jefe).** El cierre se **bloquea si hay escrituras pendientes** en la cola offline (hay que esperar "Sincronizado"), valida el perfil en el propio manejador, marca el día como cerrado, toma un **snapshot del saldo** y lo registra en auditoría. Si cierra hoy o ayer, ese saldo pasa a ser la base para mañana; un cierre retroactivo dispara la reconstrucción de la cadena. Tras cerrar, sugiere descargar el backup.

**Día cerrado.** Sobre un día cerrado, una capa visual ("Día cerrado") cubre el contenido y el guardado rechaza toda escritura a esa fecha. Limitación: la señal de solo-lectura no llega a los formularios internos de CIP ni de Movimientos (riesgo TH4), por lo que la protección efectiva depende de esa capa visual, no de los formularios.

**Reapertura (solo jefe).** Reabrir registra en auditoría. Limitación crítica (riesgo T7): reabrir un día de **hoy o ayer no recalcula el saldo**; si se edita tras reabrir, el saldo de mañana puede no reflejar el cambio hasta un nuevo cierre. Mitigación operativa: volver a cerrar el día.

**Saldo Base.** Es el ancla manual del saldo. Cambiarlo recalcula toda la cadena hasta hoy. Debe modificarse solo con un conteo físico verificado y en un día tranquilo. Hoy este cambio **no queda registrado en auditoría**.

---

## 11. Auditoría y trazabilidad

**Qué se registra hoy.** Auditoría por día con cada entrada `{ ts, acción, tipo, resumen, autor }`. Se auditan: cierre y reapertura de día, todos los borrados, el forzado de ingreso a silo con CIP pendiente, y **toda la actividad de Producción** (altas y ediciones). Existe además un log global de borrados (últimos 500).

**Qué NO se registra (huecos).**

- Altas y ediciones normales de Ingresos, Movimientos, Carga, Stock y Fortificados **no** generan auditoría. "Quién cargó o editó" no es reconstruible para la operación normal (salvo Producción).
- El **forzado de un ingreso con aguado no queda auditado** (a diferencia del forzado por CIP), pese a que el aviso promete lo contrario (riesgo TH10).
- El **cambio de Saldo Base** no queda auditado.
- Atribución por persona individual: hoy solo existe el responsable del turno (`resp`); en dispositivo compartido la atribución es ambigua (riesgo H6).

**Límites de integridad.** La auditoría se escribe leyendo-modificando-reescribiendo un blob; dos dispositivos escribiendo casi a la vez pueden pisarse y perder entradas (riesgo T5). Como los roles son client-side (riesgo T6), el registro no es a prueba de manipulación mientras la autorización no esté en el servidor.

---

## 12. Riesgos / hazards detectados

La auditoría catalogó **30 riesgos** con identificador estable, en tres familias. (Detalle completo en `docs/riesgos/registro-hazards.md`.)

- **T — Riesgos técnicos (7):** el sistema corrompe o falla por sí mismo. Casi todos en zona protegida.
- **H — Riesgos humano-operativos (13):** el código funciona, pero el diseño induce al error.
- **T+H — Zona gris (10):** carencias técnicas que se vuelven peligrosas por una acción humana razonable.

**Riesgos abiertos más urgentes por daño silencioso a datos productivos o inocuidad** (no mitigados por la Tanda A):

| ID | Riesgo | Pantalla |
|---|---|---|
| TH3 | Silo BIN seleccionable en Carga que el motor no contabiliza (despacho sin descuento) | Carga |
| TH8 | Unidad equivocada en Fortificados (kg se computa 1:1 como litros) | Fortificados |
| H1 | El punto verde de CIP indica "limpio" con solo hora o responsable, sin parámetros | CIP |
| T2 | La fecha se calcula en UTC y rota a las 21:00 hora Argentina (turno noche mal fechado) | Shell |
| TH4 | El bloqueo de día cerrado no llega a los formularios de CIP ni Movimientos | CIP, Movimientos |
| TH5 | CIP se guarda por tecla y el sync periódico pisa o revierte lo tipeado | CIP |
| TH6 | El auto-relleno de Stock pisa el producto manual y escribe en el turno equivocado | Stock |
| TH10 | Forzar un ingreso con aguado no queda auditado | Ingresos |
| T1 / T4 | La cola offline puede pisar la última carga y desactiva la guarda anti-conflicto | Transversal |
| T3 | El backup se trunca en silencio a 1000 registros y se marca como completo | Backup |
| T7 | Reabrir un día de hoy/ayer no recalcula el saldo | Shell |

**Mitigados por la Tanda A (ya en `main`):** TH1 (ahora se exige litros > 0), TH2 (se bloquea origen = destino), TH9 (el confirm de movimiento muestra el descuento total real), H8 (el botón Eliminar se oculta al operario), H3 (foco por defecto en "Cancelar" en confirmaciones destructivas), H4 (altura táctil mínima 48 px).

**Otros relevantes abiertos:** H2 (campo Litros sepultado entre 20+ campos), H5 (densidad/pH reinterpretados solos), H9 (silo sobrellenado sin alerta), H11 (destino de carga de texto libre / camiones duplicados), H12 (recarga por nueva versión borra el borrador), H13 (adiciones de Fortificados no borrables), T5/T6 (auditoría no atómica / roles client-side).

---

## 13. Guardrails implementados (estado actual)

Protecciones que **ya existen** en la versión de producción (`main`). No corresponden a la Tanda A propuesta (que aún no está mergeada); son las que están vivas hoy:

1. **Cierre bloqueado si hay cola pendiente** (espera "Sincronizado") — protege el saldo del cierre.
2. **Validación de perfil dentro de los manejadores críticos** (cerrar, reabrir, eliminar, saldo base) — no confía en el botón oculto.
3. **Capa "Día cerrado"** + rechazo de escritura a fecha cerrada en el guardado.
4. **Validación en línea al finalizar un lote** de Producción (litros usados no vacíos/negativos/mayores a enviados, destino de sobrante).
5. **Modales bloqueantes de aguado y de CIP pendiente** (obligan una decisión consciente; el forzado de CIP queda auditado).
6. **Auditoría** de borrados, cierre/reapertura, forzado de CIP y toda Producción.
7. **Confirmaciones** con estilo de peligro en acciones destructivas.
8. **Anti-pisado del sync:** Ingresos no recarga mientras hay un formulario abierto; Stock tiene una guarda de edición en curso.
9. **Ayudas de cálculo en Movimientos:** "Total descontado del origen" y disponible por silo.
10. **Tope de fecha = hoy** en el selector de Saldo Base y en el visor; **perfil derivado de Supabase Auth** (no de almacenamiento local).
11. **Detector de inconsistencias** (`runConsistencyChecks`) como red de seguridad (disponible para el jefe).

**Guardrails de la Tanda A (incorporados recientemente en `main`):**

12. **Validación de litros > 0** antes de guardar en Ingresos, Movimientos, Carga y Fortificados (cierra TH1).
13. **Bloqueo de origen = destino** en Movimientos (cierra TH2).
14. **Confirmación de movimiento con el descuento total real** (litros + pérdida) (cierra TH9).
15. **Botón Eliminar oculto para el operario** (cierra H8).
16. **Foco por defecto en "Cancelar"** en las confirmaciones destructivas (cierra H3).
17. **Altura táctil mínima de 48 px** en inputs, botones y pestañas (cierra H4).

> **Brecha conocida:** la Tanda A entró **parcial**. Siguen sin guardrail varios riesgos del §12 — entre ellos BIN en Carga (TH3), el punto verde de CIP (H1), el forzado de aguado sin auditar (TH10), el bloqueo de día cerrado en CIP/Movimientos (TH4), la unidad en Fortificados (TH8) y el tope de fecha en el selector principal (TH7) — además de los riesgos técnicos de zona protegida (T1–T7).

---

## 14. Documentación creada

El proyecto cuenta con documentación versionada en el repositorio:

| Área | Documentos |
|---|---|
| **Arquitectura** | `docs/arquitectura/`: modelo de datos, invariantes del motor de saldo (zona protegida), comportamiento offline. |
| **Operación** | `docs/operacion/`: runbook (ciclo real), guía del operario, procedimientos de supervisor/jefe, **matriz de tareas por rol** (`task-matrix-roles.md`). |
| **Riesgos** | `docs/riesgos/`: registro de hazards (fuente única, IDs T/H/TH), riesgos por pantalla, hoja de ruta de guardrails. |
| **Auditabilidad** | `docs/auditabilidad/`: qué se registra y qué no, y qué se puede reconstruir. |
| **Capacitación** | `docs/capacitacion/`: fichas por rol (primer día, checklist diario, top 10 errores) y tarjetas operativas imprimibles (A4) por rol. |
| **Validación** | `docs/validacion/`: checklist de validación operativa (escenarios) y plan de prueba operativa en planta. |
| **Sistema** | `docs/sistema/`: este documento y la guía visual de uso. |

---

## 15. Capacitación

El material de capacitación está orientado a uso real en planta (no manual corporativo): lenguaje directo, foco en gente cansada/apurada/con poca experiencia digital. Por cada rol (Operario, Supervisor, Oficina, Jefe) hay tres artefactos —**Primer día**, **Checklist diario** y **Top 10 errores**— y una **tarjeta operativa** de una hoja (A4 / WhatsApp / imprimible) para tener junto a la tablet.

El criterio transversal del material: **la app todavía no corrige varios errores de carga** (la Tanda A entró parcial; siguen abiertos BIN, punto verde de CIP, unidad en Fortificados, aguado, fecha en turno noche, entre otros), así que la capacitación insiste en los **chequeos manuales** antes de guardar y de cerrar.

---

## 16. Validación operativa

Antes de definir la próxima tanda de mejoras, el plan es **usar la app 3 a 7 días en operación real** y observar cómo trabaja la gente: fricciones, errores humanos, pasos confusos, qué se ignora, qué nunca se lee y qué "trucos" arma la gente para sobrevivir. No es QA técnico ni testing de oficina, sino **observación humana en planta**.

El plan (`docs/validacion/plan-prueba-operativa.md`) define: protocolo simple (3 turnos, observador que no rescata, foco en turno noche y mala señal), checklist de observación por pantalla, red flags, formato corto de registro de incidentes (1 línea, gravedad 🔴/🟡/🟢) y una matriz de priorización (Frecuencia × Daño, con regla de oro: el error silencioso va primero). Existe además un checklist de escenarios guionados para probar puntos concretos a propósito.

---

## 17. Estado actual del proyecto

- **Software:** en producción (`main`), funcional, con backend y offline operativos. El motor de saldo es sólido y está protegido.
- **Riesgos:** catalogados (30 IDs). La **Tanda A de guardrails entró parcial en `main`**, mitigando seis riesgos (TH1, TH2, TH9, H8, H3, H4); el resto de los riesgos humanos y de zona gris siguen **abiertos**.
- **Documentación:** completa para esta etapa (arquitectura, operación, riesgos, auditabilidad, capacitación, validación, sistema).
- **Etapa:** el proyecto cruzó de **prototipo** a **operación real**. Las features grandes quedan **congeladas**; el foco pasa a la validación operativa en planta.

---

## 18. Próximos pasos

1. **Correr la validación operativa** en planta (3–7 días) con el plan de observación. Juntar incidentes reales.
2. **Priorizar** con datos reales: agrupar lo observado por pantalla y por ID de riesgo; lo que no esté en el registro es un riesgo nuevo a analizar.
3. **Definir la próxima tanda** sobre evidencia, en este orden de criterio: primero completar lo que falta de la Tanda A y lo que corrompe datos en silencio (BIN/TH3, punto verde de CIP/H1, aguado/TH10, día cerrado/TH4, unidad/TH8, fecha futura/TH7), después la Tanda B y la fricción alta.
4. **Mitigaciones de fondo (zona protegida, con pre-mortem):** fecha local (T2), cola offline que no pise la última carga (T1/T4), backup paginado/avisado (T3), recálculo de saldo al reabrir (T7), auditoría atómica (T5) y **autorización por rol en el servidor** (T6).
5. **Luego de estabilizar:** rediseño de UX/navegación, perfil operario individual y login por PIN, SOP/manual formal, onboarding y permisos más finos.

> El criterio rector se mantiene: priorizar siempre operatividad y simplicidad para planta antes que sofisticación técnica. No se agregan features nuevas hasta tener datos reales de la operación.

---

*Documento generado a partir de la documentación técnica y operativa del repositorio (arquitectura, riesgos, auditabilidad, operación, capacitación y validación). Describe el estado real de la aplicación al 2026-06-04. No introduce funcionalidades nuevas.*
