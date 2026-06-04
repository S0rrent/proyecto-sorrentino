# Task Matrix operativa por rol — ReciboApp / Yatasto

Base para onboarding, capacitación, permisos, priorización y manuales. Describe **cómo cada persona hace su trabajo con la app**, no las pantallas.

**Estado del sistema:** branch `main`, 2026-06-04, **sin la Tanda A de guardrails mergeada**. La columna "Guardrails actuales" lista **solo lo que existe HOY en `main`** (verificado en código, con número de línea). Los IDs entre paréntesis (T#, H#, TH#) remiten a `docs/riesgos/registro-hazards.md` — no se reexplican acá.

**Perfiles reales en código (`recibo_yatasto.jsx:63`):** `operador`, `supervisor`, `jefe`. "Operario" = `operador`. **"Oficina" NO es un perfil**: es administración / control de calidad usando credenciales de supervisor o jefe en escritorio.

**Leyenda**
- Frecuencia: `Continua` · `Alta` (varias×/turno) · `Media` (1×/turno) · `Baja` (1×/día) · `Rara` (excepcional)
- Riesgo si falla: `Crítico` · `Alto` · `Medio` · `Bajo`
- Capacitación: `Máxima` · `Alta` · `Media` · `Básica`

---

## OPERARIO — perfil `operador`

**Cómo trabaja con la app (flujo real del turno):** entra a la tablet de planta → se identifica como responsable del turno (o saltea el modal) → cada camión que llega lo registra en **Ingresos** (litros + calidad) → durante el turno mueve leche entre silos en **Movimientos** y despacha en **Carga** → arma lotes en **Fortificados** → cuando limpia, registra **CIP** → al cierre de su turno carga el **Stock** de sus silos. La app abierta casi todo el turno, en piso, con apuro y manos húmedas. **No** cierra día, **no** elimina (el botón no hace nada para él), **no** envasa/finaliza Producción, **no** ve Dashboard ni Admin.

| Dimensión | Detalle |
|---|---|
| **Objetivos reales** | Que todo lo físico que pasa con la leche en su turno quede registrado fiel y rápido: entradas, trasvases, despachos, fortificados, limpiezas, stock. Es la **fuente primaria** del stock, el saldo y la trazabilidad de calidad/inocuidad. Reemplaza la planilla de papel. |
| **Tareas principales** | Ingresos de camión (pH, acidez, GB, SNG, densidad, proteína, aguado, litros). Movimientos silo→silo. Cargas de despacho (CARGA 1/2/3). Fortificados. CIP de silos y camiones. Stock por turno. Identificarse. |
| **Frecuencia** | **Continua / Alta.** Ingresos-Movimientos-Carga varias veces por turno (cada 5–15 min en picos). CIP 1–varias×/turno. Stock 1× al cierre de su turno. |
| **Riesgo si falla** | **Alto.** Casi todos los riesgos del registro nacen en sus pantallas. Un error suyo corrompe stock, saldo encadenado e inocuidad **en silencio**, sin que la app avise. |
| **Pantallas utilizadas** | Ingresos · Movimientos · Carga · Fortificados · CIP · Stock · Shell (fecha, identificación, conexión). |
| **Acciones críticas (deben salir bien)** | Cargar litros en **Litros Fábrica** (no Tambo) y revisar el número. Elegir bien **Desde/Hasta** en Movimientos. Elegir el **silo real** en Carga. Elegir la **unidad correcta** en Fortificados. Cargar **todos** los parámetros de CIP. Cargar el Stock en el **turno correcto**. Identificarse al iniciar turno. |
| **Acciones peligrosas** | **Forzar un ingreso con aguado** (lo ve y puede forzar **sin permiso**, y **NO queda auditado** — TH10). Guardar litros 0/negativos (TH1). Cargar en fecha de mañana en turno noche (T2) o en un día histórico por roce (H7). |
| **Qué NO debería tocar** | Selector de fecha del header (salvo que sepa qué hace). El banner "Actualizar" en medio de una carga (recarga y borra el borrador — H12). No insistir con "Eliminar" (es no-op para él — H8). No fuerza aguado sin avisar a un superior. |
| **Capacitación requerida** | **Alta (presencial).** No por la app (es fácil de tocar) sino porque **hoy no lo protege**: hay que entrenarlo en los chequeos manuales (revisar litros, Desde/Hasta, unidad, completar CIP, mirar la fecha de noche). ~1 turno acompañado + checklist "antes de guardar" (ver `docs/operacion/guia-operario.md`). Sin entrenamiento → error garantizado. |
| **Errores humanos probables** | Litros con un cero de más o en campo Tambo (TH1, H2). Desde/Hasta invertido (TH2). BIN como origen en Carga (TH3). kg por g en Fortificados (TH8). Punto verde de CIP sin parámetros (H1). Stock en el turno equivocado (TH6). Carga 21:10 → fecha de mañana (T2/H7). Densidad/pH reinterpretados sin notar (H5). Pierde lo cargado al tocar "Actualizar" (H12). |
| **Guardrails actuales que ayudan** | Validación de **campo no-vacío** y campo obligatorio `litrosFca` (débil: solo evita vacío). **Modal bloqueante de aguado** (frena y obliga decisión). **Modal de CIP pendiente** (forzado **sí** auditado). Ingresos **no recarga mientras hay un form abierto** (`:1923`, evita perder la edición por sync). Movimientos muestra **"Total descontado del origen" + "Disp."** por silo (`:2527`). Stock tiene **dirty-guard** que reduce el pisado del sync (`:3669`). Overlay **"Día cerrado"** impide editar un día cerrado. |
| **Qué sigue confuso / riesgoso** | **Todo el punto "errores" sigue sin red de seguridad:** litros sin validar (TH1), Desde/Hasta simétricos (TH2), BIN seleccionable (TH3), unidad ambigua (TH8), punto verde engañoso (H1), CIP pisado por sync (TH5), fecha UTC de noche (T2), modo histórico tenue (H7), targets <44px (H4), aguado forzado sin auditar (TH10). |

---

## SUPERVISOR — perfil `supervisor`

**Cómo trabaja con la app:** opera como el operario cuando hace falta, pero su trabajo real es **controlar la jornada**: revisa lo que se cargó, corrige o **elimina** errores, **autoriza desvíos** (forzar CIP pendiente, forzar aguado), maneja **Producción** (envasar desde Stock, finalizar lotes), mira **Dashboard/KPIs** y **exporta**, y al final del turno/jornada **cierra el día** esperando que la conexión diga "Sincronizado", y descarga el backup sugerido. Mobile/tablet. **No** puede reabrir día, **no** ve el panel técnico/inconsistencias ni el backup completo (todo eso es jefe-only).

| Dimensión | Detalle |
|---|---|
| **Objetivos reales** | Que lo cargado en el turno sea correcto y consistente **antes de cerrar**; autorizar desvíos verificados; gestionar producción/envasado; cerrar el día con el saldo correcto. Es el **último filtro humano** antes de congelar el día. |
| **Tareas principales** | Todo lo del operario + eliminar registros mal cargados · forzar ingresos autorizados · Producción (envasar/finalizar) · leer Dashboard/KPIs · exportar CSV/Excel · cerrar día · cambiar Saldo Base (permiso compartido con jefe) · descargar backup post-cierre. |
| **Frecuencia** | **Alta**, pero de control más que de carga. Revisa cada 15–30 min. Cierre 1×/día. Producción según envasado. |
| **Riesgo si falla** | **Alto.** Si cierra sin esperar sincronización o sin revisar, congela un saldo malo. Si confía en un punto verde de CIP (H1) o en un backup truncado (T3), da por buena información falsa. |
| **Pantallas utilizadas** | Las 6 operativas + Producción + Dashboard (tab "Superv.") con Exportar + Shell (cierre, backup sugerido). **No** ve Auditoría / Técnico / backup completo (jefe-only). |
| **Acciones críticas** | **Esperar "Sincronizado" antes de cerrar** (el sistema lo bloquea si hay cola). Finalizar lotes con litros usados correctos. Autorizar/forzar **solo** desvíos verificados. Corregir errores del operario antes del cierre. |
| **Acciones peligrosas** | **Eliminar registros** (queda auditado, pero el foco cae en el botón rojo — H3). **Forzar aguado** (NO auditado — TH10). **Cambiar Saldo Base** (recalcula toda la cadena; **NO auditado**). **Cerrar día** (congela el saldo; solo el jefe reabre). |
| **Qué NO debería tocar** | Saldo Base salvo con **conteo físico verificado** y en día tranquilo (aunque tenga permiso). No forzar aguado sin autorización real. No buscar atajos para cerrar con cola pendiente. |
| **Capacitación requerida** | **Alta.** Tiene que entender el **ciclo de cierre**, la diferencia entre forzado **auditado** (CIP) y **no auditado** (aguado), por qué esperar la sincronización, y que **el backup puede mentir** (T3). ~2–3 turnos + procedimiento de cierre (`docs/operacion/procedimientos-supervisor.md`). |
| **Errores humanos probables** | Cerrar sin revisar inconsistencias (**no tiene el panel** — ver abajo). Eliminar el registro equivocado por foco en el botón rojo (H3). Confiar en CIP verde falso-positivo (H1). Confiar en backup truncado / fecha de backup que miente (T3). Finalizar lote con rendimiento >105% sin notar (el warning vive en el panel jefe). |
| **Guardrails actuales que ayudan** | **Cierre bloqueado si hay cola pendiente** (`:8752`, fuerte). **Validación de perfil en el handler** de cierre (`:8769`, no confía en el botón oculto). **Finalizar lote valida inline** usados vacío/negativo/>enviados y sobrante (`:2941-2950`, fuerte). Eliminar pide **confirmación** y queda **auditado**. **Forzado de CIP auditado**. Overlay "Día cerrado" + `save()` rechaza escritura en día cerrado (`:8988`). Confirm `danger` en Saldo Base con aviso de recálculo (`:8169`). |
| **Qué sigue confuso / riesgoso** | **El supervisor NO tiene acceso al detector de inconsistencias** (`runConsistencyChecks` es **jefe-only**) → no puede chequear antes de cerrar; en la práctica depende del jefe. El **forzado de aguado no se audita** (TH10). **Saldo Base no se audita**. El backup post-cierre puede estar **truncado sin aviso** (T3). Foco en el botón destructivo (H3). Roles solo del lado del cliente (T6). |

---

## OFICINA — **no es un perfil** (supervisor o jefe en escritorio)

**Cómo trabaja con la app:** en una PC de oficina, con credenciales de **supervisor o jefe**. No carga datos de planta: **revisa, consolida y exporta**. Mira días pasados por fecha, lee Dashboard/KPIs, **exporta CSV/Excel** por rango para informes y control de calidad, **verifica backups** (abre el archivo y compara `total_registros`), y lee historial/auditoría. Sesiones largas (2–4 h). **Caveat duro: para backup completo, panel técnico, auditoría detallada o reabrir día tiene que entrar como JEFE.**

| Dimensión | Detalle |
|---|---|
| **Objetivos reales** | Control y consolidación: verificar que el día cierre, exportar para informes/calidad, auditar quién hizo qué (donde se pueda), resguardar backups confiables. |
| **Tareas principales** | Revisión histórica por fecha · lectura de Dashboard/KPIs · export CSV/Excel por rango · verificación de backup (`total_registros`) · lectura de historial/auditoría. |
| **Frecuencia** | **Baja en toques, alta en tiempo.** Sesiones largas, diarias o por lotes. Más lectura que acción. |
| **Riesgo si falla** | **Medio.** No corrompe datos en lectura, pero puede **informar o decidir sobre datos mal atribuidos** (turno noche por T2), exportar la fecha equivocada, o tomar un **backup truncado como respaldo válido** (T3). |
| **Pantallas utilizadas** | Dashboard/KPIs + Exportar (dentro del Dashboard) + Historial · visor de fecha · (como jefe) SecAdmin: backup completo, auditoría detallada, panel técnico. |
| **Acciones críticas** | **Verificar `total_registros` del backup antes de confiar** (T3). Exportar el rango/fecha correctos. Cruzar KPIs contra el Stock real por silo. |
| **Acciones peligrosas** | Si entra **como jefe**, hereda **todo** el poder del jefe (reabrir, Saldo Base, eliminar): el riesgo es usar credencial de jefe "para mirar" y tocar algo. Exportar/informar sobre datos de turno noche **mal fechados** (T2). |
| **Qué NO debería tocar** | Con credencial de jefe: **no** reabrir días, **no** Saldo Base, **no** eliminar — solo leer y exportar. Idealmente entrar **como supervisor**, salvo que necesite backup completo o auditoría. |
| **Capacitación requerida** | **Media.** Foco en **interpretación y límites de confianza**: qué audita la app y qué no, el backup que miente (T3), el turno noche mal fechado (T2). Poca capacitación de "uso", mucha de "qué creer". |
| **Errores humanos probables** | Tomar la columna **"Responsable"** del CSV como auditoría de autor (es texto autodeclarado del turno, puede venir vacío/mal escrito). Creer que el backup descargado está completo (T3). Exportar un día de turno noche atribuido a la fecha siguiente (T2). Buscar "quién cargó este ingreso" y no encontrarlo (**no se audita** salvo Producción). |
| **Guardrails actuales que ayudan** | **Tope de fecha = hoy** en el selector de Saldo Base y en el visor (`:8309`, `:8472`) — aunque el selector principal del Shell **no** lo tiene (TH7). Backup completo, auditoría y panel técnico **detrás de jefe** (acceso restringido). **Producción sí audita altas/ediciones** (lo único reconstruible por persona). |
| **Qué sigue confuso / riesgoso** | "Oficina" no existe como perfil → **permisos prestados** de supervisor/jefe (riesgo de exceso de poder; T6). **Backup truncado sin aviso** (T3). **Huecos de trazabilidad**: altas/ediciones normales (fuera de Producción) no se auditan. Turno noche mal fechado (T2). Modo histórico tenue (H7). |

---

## JEFE — perfil `jefe`

**Cómo trabaja con la app:** hace todo lo del supervisor **+ las palancas de control que recalculan la historia**: **reabre** días, corre el **detector de inconsistencias** y reconstruye la cadena de saldo (panel técnico/SecAdmin), cambia el **Saldo Base oficial**, descarga el **backup completo**, lee **auditoría detallada**, y **elimina lotes finalizados** de Producción (restituye litros al silo). Desktop + mobile. Es el único rol que puede mover lo que afecta toda la cadena.

| Dimensión | Detalle |
|---|---|
| **Objetivos reales** | **Integridad del sistema completo:** que el saldo encadenado sea correcto, que las inconsistencias se resuelvan, que haya respaldo confiable, y que las correcciones excepcionales no rompan la cadena. |
| **Tareas principales** | Todo lo del supervisor + reabrir día · `runConsistencyChecks` + rebuild de cadena (panel técnico) · cambiar Saldo Base · backup completo · auditoría detallada · eliminar lote finalizado. |
| **Frecuencia** | **Media** (control diario); acciones excepcionales (reapertura, Saldo Base) **Raras**. |
| **Riesgo si falla** | **Crítico.** Único que mueve las palancas que recalculan toda la historia. Un error suyo (reabrir y no recerrar; Saldo Base mal; eliminar finalizado por error) **propaga corrupción a toda la cadena**. |
| **Pantallas utilizadas** | Todas + SecAdmin (panel técnico, inconsistencias, backup completo) + SecJefeHub (tabs Dashboard / Oficina) + reapertura en el Shell (candado del header). |
| **Acciones críticas** | **Re-cerrar después de reabrir+editar hoy/ayer** (si no, el saldo de mañana no refleja el cambio — T7). Cargar Saldo Base **solo con conteo físico verificado**. Resolver inconsistencias antes de cerrar. Verificar el backup completo (`total_registros`) antes de confiar. |
| **Acciones peligrosas (las más del sistema)** | **Reabrir día** (T7: editar tras reabrir hoy/ayer no recalcula el saldo). **Cambiar Saldo Base** (recalcula toda la cadena, **NO auditado**). **Eliminar lote finalizado** (restitución **irreversible** de litros al silo). |
| **Qué NO debería tocar (sin protocolo)** | Saldo Base en medio de la operación (solo día tranquilo + conteo físico). Reapertura sin plan de **recerrar**. Nada por la consola del navegador (puede saltar UI y auditoría — T6). |
| **Capacitación requerida** | **Máxima.** Debe entender el **motor de saldo** (zona protegida), la **trampa T7** (reabrir → editar → recerrar), que el Saldo Base es el ancla y **no se audita**, y saber leer inconsistencias. Sostiene la integridad: sin capacitación técnica del ciclo → riesgo crítico. |
| **Errores humanos probables** | Reabrir hoy, editar y **olvidar recerrar** (T7). Cambiar Saldo Base sin conteo o en plena operación. Eliminar el lote finalizado equivocado por foco en el botón (H3). Confiar en backup completo truncado (T3). Cruce de medianoche a las 21:00 (T2). |
| **Guardrails actuales que ayudan** | **Reabrir es jefe-only y auditado** (`:8795`, `reopen_day`). Cierre/reapertura **registran en auditoría**. **Confirm `danger` en Saldo Base** con aviso de recálculo (`:8169`). **Eliminar lote finalizado queda auditado** (`eliminar_produccion_finalizada`). **`runConsistencyChecks`** como red de seguridad (la corre el jefe). Sobre un día cerrado el card de Producción **no abre** (gateado por `dayClosed`) → obliga a reabrir primero. |
| **Qué sigue confuso / riesgoso** | **T7**: reabrir hoy/ayer **no recalcula** el saldo — mitigación solo operativa (recerrar), **sin aviso en la UI**. **Saldo Base no auditado**. **Backup truncado sin aviso** (T3). Roles client-side (T6). Auditoría puede **perder entradas** por concurrencia (T5). Cruce de fecha UTC (T2). |

---

## Apéndice A — Matriz de permisos efectivos (perfiles reales, verificada en código)

`✓` = permitido · `✗` = no permitido · `✗ no-op` = el botón aparece pero el handler corta sin avisar.

| Acción | `operador` | `supervisor` | `jefe` |
|---|:---:|:---:|:---:|
| Cargar/editar Ingresos · Movimientos · Carga · Fortificados | ✓ | ✓ | ✓ |
| Cargar Stock por turno · Registrar CIP · Identificarse | ✓ | ✓ | ✓ |
| Eliminar Ingreso / Movimiento / Carga / Fortificado | ✗ no-op | ✓ | ✓ |
| **Forzar ingreso con AGUADO** | **✓ (sin permiso)** · **NO auditado** | ✓ · NO auditado | ✓ · NO auditado |
| **Forzar ingreso a silo SUCIO (CIP pendiente)** | ✗ ("solo supervisor") | ✓ · **auditado** | ✓ · **auditado** |
| Producción: envasar / finalizar lote | ✗ | ✓ | ✓ |
| Producción: eliminar lote (incl. finalizado → restituye litros) | ✗ | ✓ | ✓ |
| Dashboard / KPIs | ✗ (sin acceso) | ✓ | ✓ |
| Exportar CSV / Excel | ✗ | ✓ | ✓ |
| Cerrar día · Descargar backup sugerido | ✗ | ✓ | ✓ |
| Cambiar Saldo Base Oficial | ✗ | ✓ | ✓ |
| **Reabrir día** | ✗ | ✗ | ✓ |
| **Inconsistencias** (`runConsistencyChecks`) | ✗ | ✗ | ✓ |
| **Auditoría detallada** | ✗ | ✗ | ✓ |
| **Panel técnico / rebuild de cadena** | ✗ | ✗ | ✓ |
| **Backup completo** (SecAdmin) | ✗ | ✗ | ✓ |

> Nota: todos estos permisos se aplican **solo en el cliente** (ocultando/cortando botones). No son barrera server-side (T6): el control real es el acceso físico al dispositivo y las credenciales.

---

## Apéndice B — Inventario de guardrails reales en `main` + gaps prioritarios

**Guardrails que YA existen en `main` (no Tanda A):**
1. Cierre bloqueado si hay cola pendiente — espera "Sincronizado" (protege el saldo). `:8752`
2. Validación de perfil **dentro** de los handlers críticos (cerrar, reabrir, eliminar, Saldo Base) — no confía en el botón oculto. `:8769 / :8795 / :1948 / :8163`
3. Overlay "Día cerrado" + `save()` rechaza escritura en fecha cerrada. `:9362 / :8988`
4. Finalizar lote: validación inline (usados vacío/negativo/>enviados, sobrante). `:2941-2950`
5. Modales bloqueantes de **aguado** y de **CIP pendiente** (obligan una decisión consciente).
6. Auditoría de: **borrados**, **cierre/reapertura**, **forzado de CIP**, y **toda Producción** (altas/ediciones).
7. Confirmaciones (`askConfirm`) con estilo `danger` en acciones destructivas.
8. Ingresos no recarga con form abierto (`:1923`) y Stock con dirty-guard (`:3669`) — reducen el pisado por sync.
9. Movimientos muestra "Total descontado del origen" + "Disp." por silo. `:2527`
10. Tope de fecha = hoy en Saldo Base y visor; perfil derivado de Supabase Auth (no de localStorage).
11. `runConsistencyChecks` — red de seguridad del motor (la corre el jefe). `:901`

**Gaps prioritarios (cada uno = un guardrail de Tanda A/B sin mergear o una decisión de permisos):**
- **P0 — corrupción silenciosa:** litros sin validar >0 (TH1) · Desde/Hasta simétrico y sin validar (TH2) · BIN despacha sin descontar (TH3) · kg→L 1:1 (TH8) · punto verde CIP sin parámetros (H1) · fecha UTC en turno noche (T2) · CIP pisado por sync (TH5) · reabrir sin recalcular saldo (T7) · backup truncado sin aviso (T3) · aguado forzado **sin permiso y sin auditar** (TH10).
- **Permisos a revisar (decisión de negocio, no bug):** el operario puede **forzar aguado** · Saldo Base **no es jefe-only** · eliminar lote finalizado **no es jefe-only** · el supervisor **no puede ver inconsistencias** pero es quien cierra el día.

---

**Cómo usar esta matriz**
- **Onboarding / capacitación:** la fila "Cómo trabaja" + "Capacitación" + "Errores probables" define el guion de entrenamiento por rol; "Acciones críticas/peligrosas" + "Qué NO tocar" definen el checklist de planta.
- **Permisos:** Apéndice A es el estado real; Apéndice B (permisos a revisar) marca qué decidir.
- **Priorización:** Apéndice B (P0) ordena qué guardrail mergear primero.
- **Manuales:** una vez corrida la validación (`docs/validacion/checklist-validacion-operativa.md`), esta matriz da la estructura por rol de los manuales.
