# Operational Validation Checklist — ReciboApp / Yatasto

## 0. Proposito y alcance

Este documento sirve para **probar la app con usuarios reales de planta y detectar friccion, confusion, errores de carga y problemas de flujo ANTES de congelar la UX y ANTES de escribir los manuales finales**. No es un manual de usuario: es un conjunto de escenarios de prueba para mirar como se comporta un operario, supervisor, jefe o usuario de control (Oficina) frente a la app tal cual esta hoy.

**Estado validado:** branch `main`, 2026-06-04, **sin la Tanda A de guardrails (A1..A8) mergeada**. Esto significa que **todos los riesgos del registro `docs/riesgos/registro-hazards.md` (T1..T7, H1..H13, TH1..TH10) estan VIVOS y sin mitigar**. Se valida la app con los bugs presentes.

> **Aclaracion clave sobre "lo esperado":** en cada escenario, el campo "Que deberia pasar (hoy)" describe el **comportamiento ACTUAL REAL**, que muchas veces **ES el bug**, no el ideal. Cuando una proteccion no existe, se dice explicito ("hoy la app NO valida X", "hoy NO queda auditado"). No tratamos el `alert()` ni un punto verde ni un modal como si fueran garantias: muchas validaciones simplemente no existen.

### Mapeo de roles a perfiles reales

En el codigo (`recibo_yatasto.jsx`, linea 63) existen **solo tres perfiles**: `supervisor`, `jefe`, `operador`. No existe perfil "operario" ni "oficina" implementado.

| Rol de prueba | Perfil real en codigo | Notas |
|---|---|---|
| Operario | `operador` | Rol del piso. No cierra/reabre dia, no entra a Dashboard ni Admin, no envasa/finaliza Produccion. Los botones Eliminar son no-op para el (el guard corta en el handler). |
| Supervisor | `supervisor` | No puede reabrir dia (es jefe-only), no ve el panel tecnico ni el backup completo (jefe-only). Si cierra dia y cambia Saldo Base. |
| Jefe | `jefe` | Hace todo lo del supervisor + reabrir dia, panel tecnico con rebuild de cadena, backup completo, auditoria detallada. |
| **Oficina** | **NO es un perfil propio** | **CAVEAT OBLIGATORIO:** "Oficina" (administracion / control de calidad) **no existe como perfil**. Se entra con credenciales de **supervisor o jefe desde una PC de escritorio** para revision, export, lectura de auditoria y verificacion de backups. El backup completo, el panel tecnico, la auditoria detallada y la reapertura de dia son **jefe-only**: si la prueba requiere esas pantallas, hay que loguear como JEFE. No inventar permisos propios de "oficina". |

> **Advertencia transversal (T6):** los roles se aplican **solo del lado del cliente** (se ocultan botones). No son barrera real server-side: un usuario autenticado puede saltar la UI desde la consola del navegador. El control real es el acceso fisico al dispositivo y las credenciales.

> **Auditoria — verdad de terreno:** **ninguna alta/edicion normal de Ingresos, Movimientos, Carga, Stock ni Fortificados queda en `logAudit`**. Solo Produccion audita altas/ediciones. El resto solo audita **borrados, cierre/reapertura de dia y el forzado por CIP**. El `track(...)` que aparece en varios handlers es **telemetria** (`telemetry.js`), **NO auditoria**.

---

## 1. Como correr cada sesion de prueba

### Setup

- **Dispositivo real de planta**: la tablet/telefono Android que se usa en piso, con el brillo real de planta (no el de una oficina iluminada). Para los roles de escritorio (Oficina/Jefe en PC), la PC real de la oficina con mouse y teclado.
- **Usuario real del rol**: un operario para los escenarios de Operario, un supervisor real para Supervisor, etc. No un sustituto que ya conoce la app.
- **Un observador que NO ayuda ni habla**: no rescata, no sugiere, no completa frases. Su trabajo es mirar y anotar.
- **Cronometro** y **planilla de observacion** (seccion 7).
- **Una tarea por vez**, sin pistas. Se le da la consigna y se lo deja solo.
- **Pensar en voz alta permitido** (incluso recomendado): el usuario puede narrar lo que hace y lo que duda.

### Reglas del observador

- **No rescatar.** Aunque el usuario se trabe o vaya a cometer un error, dejarlo (salvo riesgo fisico real, que no aplica aca).
- **Registrar**: tiempo por tarea, taps totales, taps innecesarios, dudas verbalizadas, errores, si pidio ayuda, citas textuales.
- **Dejar que el error ocurra** para ver si el sistema lo atrapa. **Casi siempre no lo atrapa** — ese es justamente el hallazgo. Si el usuario carga litros en el campo equivocado, mueve un silo al reves o fuerza un aguado, no intervenir: anotar que paso y si la app aviso o no.
- **Tiempo real, no percibido**: el cronometro para cuando el dato quedo **efectivamente guardado**, no cuando el usuario cree que guardo.

---

## 2. Pantallas de mayor riesgo operativo

| Pantalla | Nivel | Por que | Riesgos |
|---|---|---|---|
| **CIP (limpieza)** — SecCIP | ALTO | El punto verde de "limpio" se enciende apenas hay hora O responsable: se puede cerrar una fila sin alcalino, enjuague, acido ni temperatura y queda como CIP verificada (inocuidad). El guardado es por tecla y el sync de 10s pisa o revierte lo tipeado sin aviso (sin dirty-guard, a diferencia de Stock). El bloqueo de solo-lectura no llega a CIP. | H1, TH5, TH4, H11 |
| **Movimientos (silo a silo)** — SecMovimientos | ALTO | Desde y Hasta son desplegables identicos, misma lista, sin asimetria visual, y no se valida origen != destino: el trasvase se puede invertir. Litros y perdida aceptan 0 y negativos (el chequeo de saldo se evade con <=0). El confirm de saldo insuficiente muestra una cifra menor al descuento real (no suma la perdida). El bloqueo de dia cerrado no llega a los formularios. | TH2, TH1, TH9, TH4, H3 |
| **Carga (despacho)** — SecCarga | ALTO | El desplegable de origen ofrece BIN, que NO esta en `SILO_STOCK_KEY`: el despacho se guarda, ningun silo baja y el chequeo de saldo da OK (sobreestimacion permanente y silenciosa). Editar una carga y cambiarle el silo re-suma litros al nuevo (falso OK). Litros sin validacion numerica. No muestra el disponible del origen. Destino de texto libre rompe trazabilidad. | TH3, TH1, H11 |
| **Ingresos (la mas usada)** — SecIngresos | ALTO | Pantalla mas frecuente, meta <30s. La validacion solo chequea no-vacio, nunca rango ni tipo. El campo Litros queda sepultado entre 20+ campos de calidad (hay dos litros gemelos, Fabrica y Tambo). Densidad y pH se reinterpretan solos al perder foco (28 -> 1.028, 68 -> 6,8). Forzar un ingreso con aguado NO queda auditado. Boton Eliminar visible para perfiles sin permiso (no-op silencioso). | TH1, H2, H5, TH10, H8 |
| **Fortificados** — SecFortificados | ALTO | El selector de unidad mezcla kg, g, mg, L, mL, cc casi indistinguibles bajo luz pobre y la conversion masa->volumen es 1 a 1 oculta: una adicion en kg se suma como litros e infla miles de litros sin aviso. Las tres adiciones por defecto (Lactosa, Variolac, Agua) no se pueden borrar y exigen cantidad: el operario pone 0 para destrabar y deja basura. Cantidades aceptan 0, negativos y texto. | TH8, H13, TH1, H3 |
| **Stock** — SecStock | ALTO | El guardado usa el turno del estado (puede haber quedado de una sesion previa), con las tarjetas lejos del selector de turno y sin recordatorio del turno que se edita. El auto-relleno pisa el producto que el operario eligio a mano, sin aviso. Silo sobrellenado se muestra al 100% sin color de peligro. Targets chicos en grilla densa con nombres parecidos. | TH6, H9, H4 |
| **Shell y navegacion** (fecha, identidad, conexion, cierre/reapertura, backup, banner update) | ALTO | La fecha se calcula en UTC y rota a las 21:00 hora Argentina: el turno noche queda archivado bajo la fecha del dia siguiente y en modo historico aunque sea el turno en curso. El aviso de modo historico es una linea tenue de bajo contraste. El selector de fecha permite el futuro sin tope. Identidad de turno ambigua en dispositivo compartido. El banner Actualizar recarga y borra el borrador. | T2, H7, TH7, H6, H12 |
| **Cola offline / sync** (transversal) | ALTO | Dano silencioso y tecnico (zona protegida). La cola offline puede resucitar un valor viejo y pisar la ultima carga al hacer flush con red recuperada (peor en claves compartidas: saldo-silos, stock). Encolar desactiva la guarda anti-conflicto entre dispositivos. logAudit/logDelete pierden entradas por escritura concurrente. Ningun error visible con senal debil. | T1, T4, T5 |
| **Reapertura de dia** (solo jefe, en Shell) y dia cerrado | MEDIO | Reabrir un dia de hoy o ayer NO recalcula SALDO_KEY: si se edita tras reabrir hoy, el saldo de manana puede no reflejar el cambio hasta un nuevo cierre. La mitigacion es operativa (volver a cerrar). El bloqueo de solo-lectura de dia cerrado no llega a CIP ni Movimientos. Frecuencia rara, impacto medio-alto sobre el saldo encadenado. | T7, TH4 |
| **Backup / Admin** (SecAdmin, jefe-only) | MEDIO | El backup se trunca en silencio a 1000 registros y se marca como completo: omite dias enteros sin error ni alerta. Si se restaura desde ese archivo faltan datos reales. Es la red de recuperacion ultima. | T3 |
| **UI transversal** (atomos: Sel, Banner, Inp, confirmaciones) | MEDIO | Las confirmaciones destructivas enfocan por defecto el boton de accion (Eliminar / Guardar igual): un Enter reflejo o doble toque borra o acepta un saldo negativo sin leer. El banner de error aparece arriba de un formulario largo sin tomar foco. Desplegables sin flecha, confundibles con campos de texto. Targets por debajo de 44px. | H3, H10, H4, H5 |
| **Produccion / Dashboard** (lectura/analitica, supervisor-jefe; "Oficina") | BAJO | Pantallas de lectura usadas por administracion/calidad. **Oficina NO es un perfil real** (supervisor o jefe en escritorio). No corrompen datos por si mismas en lectura, pero un supervisor da por buena una CIP en verde falso-positivo (H1) o un stock sobreestimado (TH3) que llegan desde las pantallas operativas. | TH3, H1 |

---

## 3. Priorizacion P0 / P1

### P0 — bloqueante antes de congelar UX

- **TH1** — Validar que litros/cantidades/perdida sean numero > 0 (perdida >= 0) en Ingresos, Movimientos, Carga y Fortificados antes de guardar. Hoy la app solo chequea no-vacio y el chequeo de saldo da OK con <=0, generando movimientos fantasma o de signo invertido que corrompen stock y saldo en silencio.
- **TH3** — Confirmar que elegir BIN como origen en Carga/Produccion guarda el despacho sin descontar ningun silo (BIN no esta en `SILO_STOCK_KEY`, `recibo_yatasto.jsx:174-182`) y que editar el silo de una carga re-suma litros (falso OK). Hoy el stock queda sobreestimado permanente y silenciosamente.
- **TH8** — Confirmar que en Fortificados una adicion en kg se suma 1 a 1 como litros al silo destino (conversion masa->volumen oculta). Hoy una unidad equivocada infla o desinfla miles de litros sin aviso.
- **TH2** — Validar que invertir Desde/Hasta (o elegir origen == destino) descuenta del silo equivocado sin bloqueo. Hoy no se valida origen != destino y los dos desplegables son identicos.
- **T2** — Validar el ingreso de un camion a las 21:10 hora Argentina y verificar que queda archivado bajo la fecha del dia siguiente y atribuido al turno/responsable anterior. Hoy la fecha se calcula en UTC y rota a las 21:00.
- **T1/T4** — Validar offline-then-online en una clave compartida (saldo-silos o stock): encolar una escritura, reeditar con red recuperada y verificar si el flush resucita el valor viejo y pisa la ultima carga. Hoy la cola puede borrar la ultima carga y encolar desactiva la guarda anti-conflicto, sin error visible.
- **H1** — Validar que cerrar una fila de CIP con solo hora o solo responsable enciende el punto verde sin parametros de lavado. Hoy queda un registro de inocuidad falso-positivo que el supervisor lee como verificado.
- **TH10** — Validar que forzar un ingreso con aguado NO genera ninguna entrada de auditoria (a diferencia del forzado de CIP, que si audita). Hoy un ingreso con indicio de adulteracion se fuerza sin rastro de quien lo autorizo (responsabilidad legal).
- **TH4** — Validar que entrar a "mirar" un dia cerrado en CIP y en los formularios de Movimientos permite reescribir un registro por un roce. Hoy el bloqueo de solo-lectura no recibe la senal de dia cerrado en esas pantallas. (Nota: sobre un dia **cerrado** hay un overlay a nivel Shell que tapa el contenido; el camino realmente abierto es un dia **pasado ABIERTO** — ver escenarios.)
- **TH5** — Validar que al tipear concentracion/temperatura en CIP con red debil el sync de 10s pisa o revierte el caracter recien escrito sin aviso. Hoy el operario cree que cargo y quedo vacio (inocuidad).
- **T7** — Validar el ciclo reabrir-hoy + editar + no recerrar y verificar que SALDO_KEY no se recalcula y el saldo de manana no refleja el cambio. Mitigacion solo operativa (recerrar).
- **T3** — Validar el backup con mas de 1000 claves y verificar que se trunca a 1000, se marca como completo y omite dias enteros sin alerta. Hoy una restauracion desde ese archivo pierde datos reales sin que nadie lo note.
- **TH6** — Validar que el guardado de Stock usa el turno del estado (que puede venir de una sesion previa) y que el auto-relleno pisa el producto cargado a mano. Hoy se escribe producto/pH en el turno equivocado sin aviso.
- **T6** — Validar (con criterio de seguridad, no de UI) que los roles se aplican solo ocultando botones y que el handler corta tarde; documentar que un usuario autenticado podria escribir desde consola saltando UI/auditoria. Caveat: "oficina" no es perfil real; "operario" = perfil "operador".

### P1 — friccion alta

- **H2** — Medir tiempo y scrolls para encontrar y completar el campo Litros en Ingresos, enterrado entre 20+ campos. Hoy choca con la meta de <30s sin entrenamiento.
- **H5** — Validar si el operario nota o no la reinterpretacion silenciosa de densidad (28 -> 1.028) y pH (68 -> 6,8) al salir del campo. Hoy el parametro corrupto solo se ve en auditoria.
- **TH9** — Validar que el confirm de saldo insuficiente en Movimientos muestra "se mueven X litros" pero al origen se le resta X mas la perdida. Hoy la cifra confirmada no representa el descuento real.
- **H3** — Validar que en las confirmaciones destructivas el foco cae por defecto en el boton de accion y que un Enter o doble toque reflejo confirma sin leer.
- **H8** — Validar que el boton Eliminar se renderiza para perfiles sin permiso y el toque no hace nada (no-op silencioso). Hoy el operador reintenta, cree que la app se colgo y deja el dato malo.
- **H6** — Validar en tablet compartida que al cambiar de turno el modal de identificacion se puede saltear y se hereda el responsable anterior.
- **H7** — Validar que el operario apurado no advierte el modo historico (linea tenue) al navegar a un dia pasado.
- **H10** — Validar que el banner de error aparece fuera de la vista sin tomar foco en formularios largos y que los desplegables sin flecha se confunden con campos de texto.
- **H4** — Medir errores de toque (input gemelo, seccion o fila equivocada) con dedo poco preciso o mano humeda en grillas densas. Hoy los targets quedan por debajo de 44px.
- **H13** — Validar que las tres adiciones por defecto de Fortificados (Lactosa, Variolac, Agua) no se pueden borrar y exigen cantidad. Hoy el operario escribe 0 para destrabar y deja basura.
- **H9** — Validar que un silo con mas litros que su capacidad muestra barra llena y 100% sin color de peligro.
- **H11** — Validar que el Destino de carga de texto libre deja el mismo cliente escrito de varias formas y que el alta de camion sin deduplicar parte la CIP en dos filas.
- **H12** — Validar que tocar el banner "Actualizar" (o el toggle de tema) recarga la app y borra el formulario a medio cargar.

---

## 4. Escenarios por rol

### Operario

**Caveat del rol:** "Operario" del piso usa el perfil REAL `operador` (`recibo_yatasto.jsx:63`). El operador **NO** cierra ni reabre dia, **NO** entra a Dashboard ni Admin, **NO** envasa/finaliza Produccion, y los **botones Eliminar son no-op** para el (el guard de permiso corta recien en el handler: `onDelete` en SecIngresos:1946-1951 y SecCarga:2429-2434). Recordar que **ninguna alta/edicion normal de Ingresos, Movimientos, Carga, Stock ni Fortificados queda en `logAudit`** (solo Produccion audita; el resto solo audita borrados, cierre/reapertura y forzado por CIP). El campo "que deberia pasar" describe el comportamiento ACTUAL REAL, que muchas veces ES el bug.

#### [OP-ING-01] Carga rapida de ingreso de camion: encontrar Litros y guardar sin error de tipeo
- **Pantalla / Prioridad / Riesgos:** Ingresos / P0 / H2, TH1, H5
- **Objetivo:** Descubrir si el operario, apurado, encuentra el campo Litros enterrado entre 20+ campos de calidad, si carga el numero principal en el campo correcto (Litros Fabrica y no Litros Tambo) y si nota que un cero de mas o un valor invalido entra al stock sin que la app avise.
- **Tarea:** Llego el camion del tambo La Esperanza (numero 14) con 12.000 litros. Cargalo y guardalo.
- **Que deberia pasar (hoy):** El formulario abre con muchos campos; Litros Fabrica no esta arriba, hay que scrollear (H2). La app NO valida rango ni tipo: si tipea 120.000 o 1200 o un valor invalido, igual guarda mientras el campo no este vacio (TH1). Hay dos campos de litros SEPARADOS, "Litros Fabrica" y "Litros Tambo", y solo Litros Fabrica es obligatorio (TH1): si carga el numero en Litros Tambo, el total del dia (que suma solo `litrosFca`) queda en 0 y el silo no suma esos litros. Si toca densidad o pH, al salir del campo el valor se reinterpreta solo (28 -> 1.028, 68 -> 6,8) sin pedir confirmacion (H5). Guarda sin alerta. El alta de un ingreso **NO queda en auditoria**.
- **Que observar:**
  - Cuanto tarda en encontrar el campo Litros Fabrica (segundos desde que abre el form).
  - Cuanto scrollea para llegar a Litros y si pasa de largo.
  - Si carga el numero en Litros Fabrica o lo pone por error en Litros Tambo.
  - Si toca densidad/pH y si mira el valor despues de salir del campo.
  - Si revisa el total del dia (arriba) antes de cerrar.
  - Donde busca el boton Guardar.
- **Senales de confusion:**
  - Scroll de arriba a abajo varias veces buscando el campo.
  - Se queda mirando la pantalla sin tocar nada.
  - Pregunta en voz alta cual es el campo de litros o si va en Fabrica o en Tambo.
  - Tipea, borra y vuelve a tipear el numero.
  - Toca el campo Litros Tambo y despues lo corrige al Fabrica.
- **Errores criticos posibles:**
  - Litros cargados en "Litros Tambo" en vez de "Litros Fabrica": el total del dia queda en 0 y el silo no suma esos litros (TH1).
  - Un cero de mas (120.000 en vez de 12.000) entra al stock y al saldo encadenado sin ninguna senal (TH1).
  - Densidad 28 guardada como 1.028 o pH 68 como 6,8 sin que el operario lo note; el parametro queda 10x mal y solo se ve en auditoria (H5).
- **Preguntas post-tarea:**
  - Donde esperabas encontrar el campo de litros?
  - Que diferencia hay entre "Litros Fabrica" y "Litros Tambo"? Cual hay que usar?
  - Como supiste que se guardo el ingreso?
  - Cuando cargaste la densidad/pH, el numero que quedo es el que vos tipeaste?
- **Metricas:**
  - Tiempo total (s). Segundos hasta encontrar Litros Fabrica. Numero de scrolls hasta Litros. Taps totales. Dudas verbalizadas. Si cargo en Fabrica o Tambo (correcto/incorrecto). Si pidio ayuda.

#### [OP-ING-02] Ingreso con aguado detectado: forzar el guardado y ver que no queda auditado
- **Pantalla / Prioridad / Riesgos:** Ingresos / P0 / TH10, H8
- **Objetivo:** Descubrir como reacciona el operario ante el modal bloqueante de aguado, si entiende que esta forzando un dato de posible adulteracion, y confirmar que hoy ese forzado no deja rastro de quien lo autorizo (a diferencia del forzado por CIP, que si audita).
- **Tarea:** Carga el ingreso del camion del tambo San Roque: 9.500 litros, y en el control de calidad vino con Aguado Fabrica 0,3. Completa y guarda.
- **Que deberia pasar (hoy):** Al tocar Guardar con aguado mayor a 0 salta un modal bloqueante "⚠ Aguado detectado" (`recibo_yatasto.jsx:1886`). El texto promete que "el registro quedara en el historial". Pero el boton "Guardar de todas formas" (linea 1901) llama a `track('save_ok','forzado_aguado')` —que es TELEMETRIA, no auditoria— y despues a `onSave(f)` SIN `_forzadoCIP`, asi que **NO se ejecuta `logAudit`**: hoy la app NO deja rastro de quien autorizo el ingreso aguado (TH10). El boton de forzar **NO esta condicionado al perfil**: cualquier usuario, incluido el operador, lo ve y puede forzar. Si despues intenta eliminar el ingreso para corregir, el boton Eliminar es no-op silencioso para el operador (el guard corta en el handler, SecIngresos:1948) (H8).
- **Que observar:**
  - Si lee el modal de aguado o lo cierra de reflejo.
  - Cual boton del modal toca ("Corregir valores" vs "Guardar de todas formas").
  - Si avisa a alguien o pregunta antes de forzar.
  - Si despues intenta borrar/corregir el ingreso y que hace el boton Eliminar.
  - Cuanto duda frente al cartel rojo.
- **Senales de confusion:**
  - Toca el boton rojo de forzar sin leer el texto.
  - Pregunta que tiene que hacer con el aviso de aguado.
  - Cierra y reabre el modal.
  - Toca Eliminar varias veces porque "no pasa nada".
  - Se queda esperando que la app haga algo despues de forzar.
- **Errores criticos posibles:**
  - Ingreso con indicio de adulteracion forzado y guardado sin ninguna entrada en `logAudit`: no se puede reconstruir quien lo autorizo (TH10).
  - El operario asume que "quedo registrado" porque el modal lo prometia, y no avisa al supervisor en persona.
  - Reintentos sobre Eliminar (no-op) que lo hacen creer que la app se colgo y deja el dato malo (H8).
- **Preguntas post-tarea:**
  - Que entendiste que pasaba cuando tocaste "Guardar de todas formas"?
  - Pensas que quedo registrado quien autorizo este ingreso? Donde se veria eso?
  - Que harias si te equivocaste y queres borrar este ingreso?
  - Le avisarias a alguien? A quien y como?
- **Metricas:**
  - Tiempo (s). Si leyo el modal (si/no observado). Taps en el boton de forzar. Taps en Eliminar (no-op). Si pidio ayuda o aviso a alguien. Dudas verbalizadas.

#### [OP-MOV-01] Trasvase silo a silo: riesgo de invertir Desde/Hasta
- **Pantalla / Prioridad / Riesgos:** Movimientos / P0 / TH2, TH1, H3
- **Objetivo:** Descubrir si el operario, con luz pobre y apuro, invierte los desplegables Desde y Hasta (identicos, misma lista, sin asimetria visual), si la app lo deja mover origen igual a destino, y si confirma un movimiento sin leer por el foco en el boton de accion.
- **Tarea:** Pasa 5.000 litros del silo 80 al silo 60. Carga el movimiento (motivo: trasvase) y guardalo.
- **Que deberia pasar (hoy):** Desde y Hasta son dos `Sel` identicos con la misma lista `SILOS_TODOS` (`recibo_yatasto.jsx:2511` y 2515), sin diferencia visual fuerte de "sale" vs "entra". La app NO valida que origen sea distinto de destino (TH2): si pone el mismo silo en los dos, deja guardar. Si invierte Desde/Hasta, descuenta del silo que debia recibir. Hay una card en vivo "Total descontado del origen" (linea 2527) y un "Disp." por silo que ayudan, pero el operario apurado puede no leerlas. Litros acepta 0/negativos y el chequeo de saldo se evade con litros <=0 (TH1). Si salta el confirm de saldo insuficiente, el foco cae por defecto en el boton de accion ("Guardar igual") (H3).
- **Que observar:**
  - Cual desplegable toca primero y si lo corrige.
  - Si lee la card "Total descontado del origen" y el "Disp." de cada silo.
  - Si entiende que Desde es de donde SALE y Hasta a donde ENTRA.
  - Cuanto tarda en elegir los dos silos.
  - Si en la confirmacion lee o toca rapido el boton enfocado.
- **Senales de confusion:**
  - Toca un desplegable, elige, y despues lo cambia al otro.
  - Pregunta cual era el origen y cual el destino.
  - Mira la card de total y duda si esta bien.
  - Vuelve atras para revisar despues de elegir.
  - Confirma con doble toque reflejo sin leer.
- **Errores criticos posibles:**
  - Desde y Hasta invertidos: se descuenta del silo 60 (que debia recibir) y se suma al 80; dos silos descuadrados que nadie nota hasta el conteo fisico (TH2).
  - Mismo silo en Desde y Hasta: movimiento sin sentido aceptado sin aviso (TH2).
  - Litros en 0 o negativo: movimiento fantasma o de signo invertido, con el chequeo de saldo dando OK (TH1).
  - Confirmacion de saldo insuficiente aceptada sin leer por foco en el boton de accion (H3).
- **Preguntas post-tarea:**
  - Cual silo entendiste que pierde leche y cual la recibe?
  - Que te dice la card grande del medio ("Total descontado del origen")?
  - Como supiste que el movimiento iba para el lado correcto?
  - Que pasaria si ponias el mismo silo arriba y abajo?
- **Metricas:**
  - Tiempo (s). Direccion final (correcta/invertida). Veces que cambio un desplegable. Dudas verbalizadas. Si leyo la card de total (si/no). Taps totales. Si pidio ayuda.

#### [OP-MOV-02] Movimiento con perdida: entender que el descuento real es mayor que la cifra principal
- **Pantalla / Prioridad / Riesgos:** Movimientos / P1 / TH9, TH1
- **Objetivo:** Descubrir si el operario entiende que cuando hay perdida cargada, el descuento al silo origen es litros mas perdida, y si el mensaje de saldo insuficiente lo confunde mostrando una cifra que no es el descuento real.
- **Tarea:** Pasa 3.000 litros del silo 42 al TQ6, con una perdida de 400 litros en el trasvase. Carga y guarda.
- **Que deberia pasar (hoy):** La card en vivo del form SI suma litros mas perdida ("Total descontado del origen" = 3.400 L, `recibo_yatasto.jsx:2527`) y muestra el detalle "3.000 L movidos + 400 L perdida". Pero el descuento real al origen tambien es litros+perdida (`impactoOrigen`, linea 2649), y si el saldo no alcanza el confirm de saldo insuficiente dice "Se mueven: {item.litros}" usando SOLO los litros, no litros+perdida (linea 2654): el operario valida mentalmente con la cifra de litros movidos y no con el descuento total, asi que el silo queda mas negativo de lo que entendio (TH9). Litros y perdida aceptan 0/negativos (TH1).
- **Que observar:**
  - Si nota que la perdida se suma al descuento.
  - Si lee la card "X L movidos + Y L perdida".
  - Si entiende cuanto sale realmente del silo 42 (3.400 L).
  - Que hace si salta el aviso de saldo insuficiente.
  - Si confirma mirando la cifra correcta.
- **Senales de confusion:**
  - Pregunta si la perdida se descuenta o no del silo.
  - Se queda mirando la card del total dudando.
  - Confirma el aviso de saldo sin releer los numeros.
  - Pregunta por que el silo quedo mas bajo de lo que esperaba.
- **Errores criticos posibles:**
  - Valida con la cifra "Se mueven" (solo litros) del confirm y deja el silo origen mas negativo de lo entendido, porque el confirm no muestra el descuento total real (TH9).
  - Perdida cargada en negativo o en 0 que distorsiona el descuento sin aviso (TH1).
- **Preguntas post-tarea:**
  - Cuantos litros salieron en total del silo 42?
  - La perdida se descuenta del silo o no?
  - Cuando salto el aviso de saldo, que numero miraste para decidir?
  - Te quedo claro cuanto quedaba en el silo despues?
- **Metricas:**
  - Tiempo (s). Si identifico el descuento real (3.400) en la pregunta post (si/no). Dudas verbalizadas. Taps. Si pidio ayuda.

#### [OP-CAR-01] Despacho de camion: elegir el silo proveniente sin caer en BIN ni en destino mal escrito
- **Pantalla / Prioridad / Riesgos:** Carga / P0 / TH3, H11, TH1
- **Objetivo:** Descubrir si el operario elige un silo real como origen del despacho o cae en BIN (que esta mezclado en la lista y NO descuenta stock), si nota que Carga no muestra el disponible del silo origen, y como escribe el destino de texto libre.
- **Tarea:** Despacha una carga (CARGA 1) de 8.000 litros de leche al cliente La Serenisima, que sale del silo 100 V. Cargala y guarda.
- **Que deberia pasar (hoy):** El desplegable de silo proveniente ofrece BIN entre los silos reales (`SILOS_TODOS` incluye "BIN", linea 69); BIN NO esta en `SILO_STOCK_KEY`, asi que si lo elige el despacho se guarda, ningun silo baja y el chequeo de saldo da OK (TH3). A diferencia de Movimientos, Carga NO muestra el "Disp." del silo origen. El Destino es texto libre (H11): el mismo cliente puede quedar escrito de varias formas en el dia. Litros sin validacion de rango (TH1). Si despues edita la carga y le cambia el silo, se re-suman los litros al silo nuevo (falso OK) y el viejo queda sobre-descontado (TH3). El alta de carga no queda en auditoria.
- **Que observar:**
  - Si elige el silo real (100 V) o toca BIN por error.
  - Si busca el disponible del silo y no lo encuentra (en Carga no esta).
  - Como escribe el nombre del cliente (abreviado, con typo, distinto a otras cargas).
  - Cuanto tarda en encontrar el silo en la lista.
  - Si revisa los litros antes de guardar.
- **Senales de confusion:**
  - Recorre la lista de silos buscando y duda en BIN.
  - Pregunta cual es el silo o si BIN sirve.
  - Busca un numero de disponible que no aparece.
  - Escribe el cliente, lo borra y lo reescribe distinto.
  - Se queda mirando la lista larga de silos.
- **Errores criticos posibles:**
  - Elegir BIN como origen: la carga se registra, ningun silo baja y el saldo da OK; la planta cree que sigue teniendo leche que ya salio (TH3).
  - Destino escrito de tres formas distintas para el mismo cliente: trazabilidad partida (H11).
  - Litros con un cero de mas o invalido aceptados sin aviso (TH1).
  - Editar la carga y cambiar el silo: falso OK que descuadra dos silos permanente (TH3).
- **Preguntas post-tarea:**
  - Que es BIN en esa lista? Lo usarias para un despacho?
  - Como supiste cuanto quedaba en el silo del que sacaste la leche?
  - Como escribiste el nombre del cliente? Lo escribis siempre igual?
  - Como confirmaste que la carga descontaba del silo correcto?
- **Metricas:**
  - Tiempo (s). Silo origen elegido (real/BIN). Scrolls/taps en la lista de silos. Variantes de escritura del cliente (conteo). Dudas verbalizadas. Si pidio ayuda.

#### [OP-FORT-01] Lote fortificado: elegir bien la unidad (kg vs g) y lidiar con las tres adiciones que no se borran
- **Pantalla / Prioridad / Riesgos:** Fortificados / P0 / TH8, H13, TH1
- **Objetivo:** Descubrir si el operario elige la unidad correcta en el selector chico y ambiguo (kg, g, mg, L, mL, cc), si nota que una unidad equivocada infla el silo destino sumando masa como litros 1 a 1, y como resuelve las tres adiciones precargadas que no puede borrar.
- **Tarea:** Arma un lote fortificado para Tetra desde el silo 80: base 5.000 litros, y agregale 25 kg de Lactosa. Guardalo.
- **Que deberia pasar (hoy):** Las tres adiciones (Lactosa, Variolac, Agua) vienen precargadas (lineas 4030-4032), no se pueden borrar —solo las adiciones agregadas a mano, idx>=3, tienen boton x (linea 4222)— y la validacion exige cantidad en TODAS (linea 4280, H13): el operario que no usa Variolac y Agua tiende a escribir 0 para destrabar, dejando datos basura. El selector de unidad mezcla kg, g, mg, L, mL, cc (`UNIDADES_FORT`, linea 4017) casi indistinguibles bajo luz pobre; una adicion en kg se suma 1 a 1 como litros al silo destino (TH8): si confunde g con kg, infla o desinfla miles de litros sin aviso. Cantidades aceptan 0, negativos y texto (TH1). Si el saldo no alcanza, el confirm de saldo insuficiente enfoca por defecto "Guardar igual" (H3 transversal).
- **Que observar:**
  - Que unidad deja seleccionada en la adicion de Lactosa.
  - Si revisa la unidad antes de guardar.
  - Que hace con las filas Variolac y Agua que no usa (las completa con 0, escribe basura).
  - Cuanto tarda en el selector de unidad.
  - Si entiende que kg se suma como litros al silo.
- **Senales de confusion:**
  - Toca el selector de unidad varias veces sin estar seguro.
  - Pregunta que pone en las filas que no usa.
  - Escribe 0 en Variolac/Agua para poder guardar.
  - Se queda mirando el selector chico de unidad.
  - Pregunta por que el silo quedo con mas litros.
- **Errores criticos posibles:**
  - Unidad equivocada (g elegido como kg o viceversa): la adicion infla o desinfla miles de litros en el silo destino sin aviso (TH8).
  - Filas Variolac/Agua completadas con 0 o datos inventados para destrabar: basura permanente que confunde la auditoria (H13).
  - Cantidad en 0/negativa/texto aceptada sin validacion de rango (TH1).
- **Preguntas post-tarea:**
  - Que unidad usaste para la Lactosa? Como te aseguraste?
  - Que pusiste en las filas de Variolac y Agua que no usabas? Por que?
  - Que le pasa al silo si en vez de kg eligo gramos?
  - Como supiste cuanto le agregaste al silo?
- **Metricas:**
  - Tiempo (s). Unidad final (correcta/incorrecta). Que cargo en las filas no usadas (vacio/0/basura). Taps en el selector de unidad. Dudas verbalizadas. Si pidio ayuda.

#### [OP-CIP-01] Registro CIP de limpieza: punto verde sin parametros y senal debil que pisa el tecleo
- **Pantalla / Prioridad / Riesgos:** CIP / P0 / H1, TH5, H11
- **Objetivo:** Descubrir si el operario completa todos los parametros de limpieza o cierra la fila con solo hora/responsable creyendo que el punto verde garantiza CIP completa, y si con senal debil el sync de 10s le pisa o revierte lo que esta escribiendo sin avisar.
- **Tarea:** Registra la limpieza CIP del silo 100 N de este turno: alcalino, enjuague, acido, temperatura, hora y tu nombre como responsable. Deja la fila guardada.
- **Que deberia pasar (hoy):** La fila colapsada muestra punto verde apenas hay hora O responsable (`recibo_yatasto.jsx:2099` `hasData = data.hora || data.resp`; punto verde en linea 2105), aunque concentracion/tiempo/temperatura de alcalino, enjuague y acido esten vacios (H1): queda un registro de inocuidad falso-positivo que el supervisor lee como verificado. CIP guarda por tecla (cada `onChange` llama save, lineas 2179-2180) y NO tiene dirty-guard (a diferencia de Stock, que usa `useRef` en SiloField, linea 3669): el reload por `syncKey` cada 10s puede pisar lo que el operario escribe; si un guardado falla, se revierte el caracter recien tipeado sin aviso (TH5). El alta de camion no deduplica, asi que una CIP de camion puede quedar partida en dos filas (H11).
- **Que observar:**
  - Si completa todos los parametros o solo hora/responsable.
  - Si mira el punto verde y lo interpreta como "limpio/completo".
  - Si con senal debil revisa que el dato quedo escrito.
  - Si algun caracter desaparece mientras escribe.
  - Cuanto tarda por parametro y si se frustra.
- **Senales de confusion:**
  - Cierra la fila con punto verde sin cargar todos los parametros.
  - Pregunta si ya esta listo porque ve el punto verde.
  - Reescribe un valor que se borro solo.
  - Toca el campo y el numero no queda.
  - Se queda mirando la fila dudando si se guardo.
- **Errores criticos posibles:**
  - Fila CIP con punto verde pero parametros de lavado vacios: registro de inocuidad falso-positivo que el supervisor da por verificado (H1).
  - Un caracter de temperatura o concentracion revertido por el sync sin aviso: el operario cree que cargo y quedo vacio (TH5).
  - CIP de camion partida en dos filas por alta duplicada sin deduplicacion (H11).
- **Preguntas post-tarea:**
  - Que significa el punto verde de la fila? Garantiza que la limpieza esta completa?
  - Como supiste que todos los parametros quedaron guardados?
  - Alguna vez se te borro algo mientras escribias? Como te diste cuenta?
  - Si dejas solo tu nombre y la hora, queda como CIP hecha?
- **Metricas:**
  - Tiempo (s). Cantidad de parametros realmente cargados (de los exigidos). Si interpreto el punto verde como completo (si/no). Valores que tuvo que reescribir. Dudas verbalizadas. Si pidio ayuda.

#### [OP-STK-01] Carga de stock por turno: turno equivocado heredado y auto-relleno que pisa el producto manual
- **Pantalla / Prioridad / Riesgos:** Stock / P0 / TH6, H9, H4
- **Objetivo:** Descubrir si el operario carga el stock en el turno correcto cuando el selector quedo en otro turno de una sesion previa, y si nota que el auto-relleno le pisa el producto que eligio a mano y que un silo sobrellenado se muestra al 100% sin alerta.
- **Tarea:** Estas en el turno Noche. Carga en Stock el producto y el pH del silo 60. Es leche entera, pH 6,7.
- **Que deberia pasar (hoy):** El estado "turno" arranca en `getCurrentTurno()` pero puede haber quedado en Manana o Tarde de una interaccion previa; las tarjetas de silo estan debajo del selector y NO muestran en cada tarjeta que turno se esta editando (TH6, lineas 3811-3826): el operario carga en el turno equivocado sin darse cuenta. El auto-relleno (`calcAutoLitros`) recalcula y reemplaza el producto que el operario eligio a mano, sin aviso (TH6). Un silo con mas litros que su capacidad se muestra con barra llena y 100% sin color de peligro (H9). Targets chicos en una grilla densa de silos con nombres parecidos (H4). La carga de stock no queda en auditoria.
- **Que observar:**
  - Si verifica el selector de turno antes de cargar (Manana/Tarde/Noche).
  - Si scrollea lejos del selector y pierde de vista el turno.
  - Si el producto que cargo a mano se mantiene o desaparece.
  - Si nota un silo lleno/raro (sobrellenado) o lo pasa por alto.
  - Si toca la tarjeta de silo equivocada en la grilla densa.
- **Senales de confusion:**
  - Carga sin mirar el selector de turno.
  - Vuelve arriba a chequear en que turno estaba.
  - Pregunta por que el producto que puso cambio solo.
  - Toca una tarjeta de silo y se da cuenta que era otra.
  - Mira un silo lleno y duda si esta bien.
- **Errores criticos posibles:**
  - Producto y pH cargados en el turno equivocado (heredado del estado) porque la tarjeta no muestra el turno editado (TH6).
  - Producto manual pisado por el auto-relleno sin aviso (TH6).
  - Silo sobrellenado leido como 100% normal; rebalse no detectado (H9).
  - Toca el silo equivocado en la grilla densa con target chico (H4).
- **Preguntas post-tarea:**
  - En que turno estabas cargando? Como lo supiste?
  - El producto que pusiste a mano quedo o cambio?
  - Viste algun silo que pareciera lleno o raro? Que significaba?
  - Te costo tocar el silo correcto en la grilla?
- **Metricas:**
  - Tiempo (s). Turno en el que cargo (correcto/incorrecto). Si verifico el selector antes (si/no). Taps en silo equivocado. Dudas verbalizadas. Si pidio ayuda.

#### [OP-SHELL-01] Apertura de turno noche a las 21:10: fecha rotada, modo historico poco evidente e identidad heredada
- **Pantalla / Prioridad / Riesgos:** Shell / P0 / T2, H7, H6
- **Objetivo:** Descubrir si el operario que abre la app en turno noche nota que la fecha roto a manana (bug UTC) y que esta en modo historico, y si verifica que el responsable de turno es el suyo y no el heredado del turno anterior en la tablet compartida.
- **Tarea:** Son las 21:10. Abri la app para empezar tu turno noche y carga el ingreso del camion que acaba de llegar (tambo El Trebol, 6.000 litros).
- **Que deberia pasar (hoy):** `getToday()` usa `new Date().toISOString()` (UTC, `recibo_yatasto.jsx:230`), asi que a partir de las 21:00 hora Argentina la fecha del dia rota a manana mientras el turno se deriva por hora local con `getCurrentTurno` (linea 237) (T2): el turno noche en curso queda archivado bajo la fecha del dia siguiente y la app entra en modo historico (`isToday=false`) aunque sea el turno actual. El unico aviso de modo historico es el banner de bajo contraste "Viendo registros del ..." (fondo accent al ~8%, lineas 9342-9356) (H7). En tablet compartida el modal de identificacion solo aparece si el turno actual no tiene responsable cargado (lineas 8704-8710) y trae una X para cerrarlo sin completar (H6): el operario nuevo puede heredar la sesion y el responsable del turno anterior, asi lo que carga queda atribuido a quien no lo hizo. Ademas, el alta del ingreso no queda en `logAudit`.
- **Que observar:**
  - Si mira la fecha del header al abrir y nota que dice manana.
  - Si nota el banner tenue de modo historico.
  - Si verifica quien figura como responsable del turno.
  - Si aparece el modal de identificacion o si lo cierra con la X.
  - Si carga el ingreso sin reparar en la fecha/identidad.
- **Senales de confusion:**
  - Carga directo sin mirar la fecha.
  - Se queda mirando la fecha dudando si es hoy.
  - Pregunta por que dice otra fecha.
  - No nota el banner de modo historico.
  - Cierra el modal de identificacion o deja el nombre anterior.
- **Errores criticos posibles:**
  - Ingreso del turno noche cargado bajo la fecha del dia siguiente (UTC) y leido como modo historico; litros y saldo atribuidos al dia equivocado (T2).
  - Operario no detecta el modo historico por el banner de bajo contraste y carga creyendo que es hoy (H7).
  - Carga atribuida al responsable del turno anterior en tablet compartida (H6).
- **Preguntas post-tarea:**
  - Que fecha decia arriba cuando abriste? Era la de hoy?
  - Como te diste cuenta (o no) de que estabas en otro dia?
  - Quien figuraba como responsable del turno? Eras vos?
  - Que harias si la fecha no es la que esperabas?
- **Metricas:**
  - Tiempo hasta empezar a cargar (s). Si noto la fecha rotada (si/no). Si noto el modo historico (si/no). Si verifico/corrigio el responsable (si/no). Dudas verbalizadas. Si pidio ayuda.

#### [OP-SHELL-02] Banner de actualizacion y fecha futura: perder el borrador y registrar en el futuro
- **Pantalla / Prioridad / Riesgos:** Shell / P1 / H12, TH7
- **Objetivo:** Descubrir si el operario, con un formulario a medio cargar, toca por reflejo el banner de Actualizar (que recarga y borra el borrador) creyendo que es el boton de avanzar, y si un toque impreciso en el selector de fecha lo deja registrando en una fecha futura sin tope.
- **Tarea:** Empeza a cargar un ingreso (tambo La Lomada, completa varios campos pero no termines). Mientras tanto, si aparece el aviso de Actualizar en pantalla, segui trabajando como lo harias normalmente. Despues, cambia la fecha para mirar otro dia.
- **Que deberia pasar (hoy):** El banner "Nueva version disponible / Actualizar →" (`recibo_yatasto.jsx:8906-8927`) llama a `updateServiceWorker(true)` que recarga la app (y el toggle de tema tambien recarga); el restore de sesion NO recupera el formulario a medio cargar (H12). El operario apurado toca el banner por reflejo porque parece el boton de avanzar y pierde lo que estaba cargando. El selector de fecha del header (linea 9334, `input type=date` sin atributo `max`) NO tiene tope: permite elegir una fecha futura (TH7); lo registrado en el futuro no entra en la cadena de saldo (el arrastre llega solo hasta ayer) y "desaparece" hasta una auditoria.
- **Que observar:**
  - Si toca el banner de Actualizar mientras tiene el form abierto.
  - Si se da cuenta que perdio lo cargado tras la recarga.
  - Como usa el selector de fecha y si llega a tocar un dia futuro.
  - Si nota que eligio una fecha que no es valida operativamente.
  - Cuanto tarda en recuperarse de la perdida del borrador.
- **Senales de confusion:**
  - Toca el banner de Actualizar de reflejo.
  - Busca lo que estaba cargando y no lo encuentra.
  - Pregunta por que se borro lo que tenia.
  - Elige una fecha futura sin notarlo.
  - Se queda mirando el calendario dudando.
- **Errores criticos posibles:**
  - Borrador del ingreso perdido al tocar el banner de Actualizar (o el toggle de tema), sin recuperacion (H12).
  - Registro cargado en una fecha futura (selector sin `max`) que no entra en la cadena de saldo y desaparece hasta una auditoria (TH7).
- **Preguntas post-tarea:**
  - Que pensaste que hacia el boton de "Actualizar"?
  - Que paso con lo que estabas cargando despues de tocarlo?
  - Hasta que fecha te deja elegir el calendario? Probaste manana?
  - Como sabes que estas cargando en el dia correcto?
- **Metricas:**
  - Tiempo (s). Si toco el banner con form abierto (si/no). Si perdio el borrador (si/no). Si llego a seleccionar fecha futura (si/no). Dudas verbalizadas. Si pidio ayuda.

#### [OP-CIP-02] Mirar un dia cerrado en CIP/Movimientos: reescribir un registro auditado por un roce
- **Pantalla / Prioridad / Riesgos:** CIP / P1 / TH4, H4
- **Objetivo:** Descubrir si el operario que entra a "mirar" un dia ya cerrado o historico reescribe sin querer un registro de inocuidad o un movimiento, porque la senal de solo-lectura/dia cerrado NO se propaga a los inputs de CIP ni a los formularios de Movimientos (TH4).
- **Tarea:** El supervisor te pide que revises como quedo la limpieza CIP del silo 80 de ayer (un dia ya cerrado). Entra, miralo y deciles si esta completo.
- **Que deberia pasar (hoy):** Verdad de terreno (TH4): la senal de dia cerrado/solo-lectura NO llega a SecCIP (`recibo_yatasto.jsx:9395` lo invoca sin la prop `readOnly`, asi que `readOnly` queda en false por defecto) ni a los formularios de Movimientos; cerrar el dia solo oculta el FAB de alta. Sobre un dia **CERRADO explicitamente** (`loadEstado.closed=true`) hay un overlay a nivel Shell que cubre el contenido con el cartel "Dia cerrado" e intercepta los toques (lineas 9362-9391), y si un guardado igual llega a disparar, `save()` lo bloquea y muestra el banner transitorio "Dia cerrado — no se guardaron cambios" (lineas 8631-8634, 8988-8998). PERO sobre un dia **HISTORICO que NO fue cerrado** (solo pasado) no hay overlay: los inputs de CIP siguen plenamente editables y un roce reescribe un registro de inocuidad de una jornada pasada, sin aviso ni cartel sobre los inputs. Targets chicos aumentan el roce accidental (H4). Conviene correr este escenario en las **dos variantes**: dia cerrado (con overlay) y dia historico no cerrado (sin overlay).
- **Que observar:**
  - Si entiende que esta en un dia cerrado/historico (y cual de los dos).
  - Si aparece o no el overlay "Dia cerrado" sobre el contenido.
  - Si solo mira o toca los campos de CIP.
  - Si algun valor cambia por un roce mientras revisa.
  - Como navega la fila densa con el dedo (targets chicos).
- **Senales de confusion:**
  - Toca un campo creyendo que es solo de lectura.
  - Modifica un valor sin querer y no lo nota.
  - Pregunta si puede tocar o no.
  - Busca un cartel de "cerrado" sobre los inputs de CIP y no lo encuentra (en dia historico no cerrado).
  - Roza el campo equivocado por target chico.
- **Errores criticos posibles:**
  - Dia historico NO cerrado: registro de inocuidad CIP reescrito por un roce, sin bloqueo ni aviso, porque la senal `readOnly` no llega a SecCIP (TH4).
  - Movimiento de una jornada pasada modificado igual porque el form de Movimientos no recibe la senal de dia cerrado (TH4).
  - Roce accidental por target chico en la grilla densa (H4).
- **Preguntas post-tarea:**
  - Te diste cuenta de que ese dia ya estaba cerrado o solo era un dia pasado? Como?
  - Pudiste tocar los campos de CIP? Pensabas que se podia?
  - Cambiaste algo sin querer? Como lo sabrias?
  - Que esperarias que pase si tocas un campo de un dia cerrado?
- **Metricas:**
  - Tiempo (s). Si identifico cerrado vs historico (si/no). Si aparecio el overlay "Dia cerrado" (si/no). Campos de CIP que toco/modifico mientras "miraba". Modificaciones accidentales detectadas. Si pidio ayuda.

---

### Supervisor

**Caveat del rol:** "Supervisor" usa el perfil REAL `supervisor` (`recibo_yatasto.jsx:63`). Limites reales verificados contra el codigo: **(1)** El supervisor **NO puede reabrir** un dia cerrado (`handleReabrirDia`, linea 8793, valida `perfil === "jefe"`); el candado del header tiene `onClick=undefined` cuando el dia esta cerrado y el tooltip dice "Dia cerrado por X" — **hay aviso**, no es no-op silencioso. **(2)** El panel tecnico del Dashboard (tab "tecnico", con `runConsistencyChecks`) es **SOLO-JEFE** (lineas 4782/4790): el supervisor NO ve inconsistencias (stock negativo, rendimiento imposible). **(3)** El boton "Descargar backup completo" vive en SecAdmin (linea 7578), **SOLO-JEFE**: el supervisor NO lo ve; solo accede al backup por el boton post-cierre en el overlay "Dia cerrado" (linea 9375). **(4)** Al cerrar un dia hay un **overlay a pantalla completa "Dia cerrado"** (linea 9362) que cubre todas las secciones salvo el Dashboard y BLOQUEA la edicion fisicamente; el riesgo TH4 de edicion accidental se da realmente en un dia **PASADO ABIERTO** (modo historico, H7), no en uno cerrado. **(5)** Los roles son solo client-side (T6). El cierre de dia y el cambio de Saldo Base los puede hacer supervisor O jefe.

#### [SUP-SHELL-01] Cerrar el dia con cola pendiente y, despues, cerrar sin haber mirado inconsistencias
- **Pantalla / Prioridad / Riesgos:** Shell (cierre de dia) / P0 / T1, T5, TH7
- **Objetivo:** Descubrir si el supervisor entiende el gating de cola ("Sincronizado") y, sobre todo, si cierra el dia SIN haber revisado inconsistencias antes (hoy nada lo obliga ni se lo recuerda en el flujo de cierre, y ademas el panel que las detecta es solo-jefe). Ver si confia en "Sincronizado" como sinonimo de "datos correctos".
- **Tarea:** Es fin de turno noche. Cerra el dia de hoy en la app para que quede listo para el turno siguiente. La planta tuvo senal intermitente toda la tarde.
- **Que deberia pasar (hoy):** Si hay escrituras en la cola offline (`queueLen > 0`), `handleCerrarDia` (linea 8751) NO deja cerrar: muestra un modal "Cambios pendientes de sincronizar" y pide esperar a "Sincronizado". PERO una vez que la cola llega a cero, el cierre procede pidiendo una sola confirmacion y guarda estado `closed` + snapshot de saldo en auditoria (`close_day`, linea 8778) como base `SALDO_KEY` para manana (linea 8782). Hoy la app NO obliga ni recuerda correr ningun chequeo de consistencia antes de cerrar: el supervisor puede cerrar con stock negativo o lotes mal cargados sin ver ningun aviso. Ademas el detector de inconsistencias (`runConsistencyChecks`) solo se expone en el panel tecnico del Dashboard, **SOLO-JEFE** (lineas 4782/4790): el supervisor ni siquiera tiene donde mirarlas. "Sincronizado" solo significa cola vacia, no datos integros.
- **Que observar:**
  - Si lee el modal de cola pendiente o lo descarta por reflejo.
  - Si busca el indicador de conexion antes de cerrar o cierra directo.
  - Si en algun momento abre el Dashboard a buscar un resumen antes de cerrar.
  - Cuanto tarda desde que decide cerrar hasta que confirma.
  - Donde toca primero al querer cerrar (busca el candado en el header).
  - Si confunde "Sincronizado" con "todo bien".
- **Senales de confusion:**
  - Toca el candado de cerrar varias veces esperando que pase mientras hay cola.
  - Pregunta "por que no me deja cerrar".
  - Se queda mirando el icono de conexion sin entender el estado.
  - No busca inconsistencias en ningun momento.
  - Cierra y despues pregunta si tenia que mirar algo antes.
- **Errores criticos posibles:**
  - Cierra el dia con stock negativo o lote inconsistente sin verlo; el snapshot de saldo congela datos corruptos como base de `SALDO_KEY` para manana (linea 8782).
  - Si cierra apenas baja la cola pero quedaba una escritura por flushear, T1 puede resucitar un valor viejo y el snapshot queda tomado sobre dato pisado.
  - La perdida concurrente de auditoria (T5) puede hacer que el propio `close_day` o un delete previo no quede registrado.
- **Preguntas post-tarea:**
  - Como supiste que ya se podia cerrar el dia?
  - Que entendiste que pasa con los datos al cerrar?
  - Antes de cerrar, hay algo que mires o revises? Que?
  - Que significa para vos que diga Sincronizado?
- **Metricas:**
  - Tiempo total. Si reviso algun resumen antes de cerrar (si/no). Taps en el candado antes de lograrlo. Dudas verbalizadas. Si pidio ayuda.

#### [SUP-SHELL-02] Descargar el backup sugerido al cerrar el dia (truncado a 1000 y fecha que miente)
- **Pantalla / Prioridad / Riesgos:** Shell (backup post-cierre) / P0 / T3
- **Objetivo:** Descubrir si el supervisor verifica el backup o lo da por bueno. Ver si entiende que el backup que la app sugiere descargar despues de cerrar el dia no garantiza estar completo, y si abriria el archivo a chequear `total_registros`.
- **Tarea:** Cerraste el dia y la app te sugiere descargar un respaldo. Descarga el backup que ofrece y dejalo guardado.
- **Que deberia pasar (hoy):** Tras cerrar el dia, en el overlay "Dia cerrado" aparece el boton "Descargar backup del dia" (linea 9375) que llama a `generateBackup` (linea 531). Esa funcion hace `db.list("yatasto:")` que NO pagina y se corta en 1000 filas por el limite del servidor (PostgREST max-rows). El JSON pone `total_registros = rows.length` (linea 538) que sera 1000 aunque falten claves, y NO hay aviso de truncamiento. Encima, linea 549 escribe la fecha de ultimo backup SIEMPRE, aunque el backup este truncado o la descarga se cancele. **NOTA:** el cartel verde "Backup del dia descargado" y el boton "Descargar backup completo" viven en SecAdmin (lineas 8097/8113), panel SOLO-JEFE; el supervisor NO los ve. El supervisor solo tiene este boton del overlay y no recibe ninguna senal de si el respaldo quedo completo.
- **Que observar:**
  - Si abre el archivo descargado o lo da por bueno apenas se descarga.
  - Si mira `total_registros` en algun lado (no esta en la UI).
  - Cuanto tarda y si repite el tap del boton.
  - Si guarda el archivo fuera de la tablet o lo deja ahi.
  - Que mira para confirmar que "se guardo".
- **Senales de confusion:**
  - Da por terminada la tarea apenas el boton dice "Generando backup…" y vuelve.
  - Pregunta "ya esta?" sin abrir el archivo.
  - No sabe donde quedo el archivo descargado.
  - Toca el boton de backup dos veces por las dudas.
- **Errores criticos posibles:**
  - Se confia en un backup truncado a 1000 registros que omite dias enteros de ingresos, cargas, stock, saldo y auditoria sin ninguna senal (T3); si se restaura desde ese archivo faltan datos reales.
  - La fecha de ultimo backup queda marcada como hecha aunque el respaldo este incompleto o la descarga se haya cancelado (T3), creando falsa sensacion de cobertura.
- **Preguntas post-tarea:**
  - Como supiste que el backup se descargo bien?
  - Como sabrias si a este backup le falta algo?
  - Donde quedo guardado el archivo? Lo moverias a otro lado?
  - Quien mas en la planta puede hacer un backup, y desde donde?
- **Metricas:**
  - Tiempo. Si abrio/verifico el archivo (si/no). Si reviso `total_registros` (si/no). Taps en el boton de backup. Si guardo el archivo fuera del dispositivo.

#### [SUP-ING-03] Forzar un ingreso con aguado detectado (override NO auditado)
- **Pantalla / Prioridad / Riesgos:** Ingresos / P0 / TH10, H3
- **Objetivo:** Descubrir si el supervisor entiende que al forzar un ingreso con aguado esta autorizando una posible adulteracion, y validar que hoy ese override NO queda auditado (a diferencia del forzado por CIP). Ver si el foco del modal lo lleva a confirmar sin leer.
- **Tarea:** Llego un camion del tambo La Esperanza con 11.500 L. Carga el ingreso con estos datos de calidad: acidez 16, pH 6,7, GB 3,5, y aguado 0,4. Guardalo para que entre al stock del dia.
- **Que deberia pasar (hoy):** Al guardar con aguado > 0, salta el modal bloqueante "Aguado detectado" (linea 1886) que dice que el ingreso no deberia procesarse sin autorizacion del supervisor/jefe. Este modal **NO esta gateado por perfil**: muestra siempre dos botones, "Corregir valores" (gris) y "Guardar de todas formas" (rojo, lineas 1901/1902) — el boton dice literalmente "Guardar de todas formas", NO "Autorizar y forzar ingreso" (esa etiqueta es la del modal de CIP, otro flujo). Si fuerza, linea 1901 llama `track("save_ok","forzado_aguado",...)` y `onSave(f)` SIN el flag `_forzadoCIP`. En `onSave` (linea 1934) solo se llama a `logAudit` cuando `forzado === _forzadoCIP` (CIP). Por lo tanto HOY el override de aguado NO llama a `logAudit`: el ingreso adulterado entra al stock y al saldo SIN rastro de quien lo autorizo (TH10). El modal igual promete "El registro quedara en el historial": miente.
- **Que observar:**
  - Si lee el texto del modal de aguado o va directo al boton.
  - Sobre que boton cae el foco/pulgar primero (rojo "Guardar de todas formas" vs gris "Corregir valores").
  - Si duda entre corregir o forzar.
  - Cuanto tarda en decidir.
  - Si busca en algun lado registrar por que lo autorizo.
  - Si nota que despues no hay constancia de la autorizacion.
- **Senales de confusion:**
  - Toca "Guardar de todas formas" sin leer el aviso de adulteracion.
  - Doble toque reflejo sobre el boton rojo.
  - Pregunta "esto queda guardado quien lo autorizo?".
  - Busca un campo de motivo/observacion y no lo encuentra.
  - Se queda mirando sin entender la diferencia entre corregir y guardar igual.
- **Errores criticos posibles:**
  - Un ingreso con indicio de adulteracion se guarda sin entrada de auditoria: no hay rastro de quien lo autorizo (TH10), con impacto de responsabilidad legal.
  - El foco en el boton de accion (H3) puede hacer que confirme el forzado sin leer.
  - Litros mal tipeados igual entran porque la validacion solo chequea no-vacio (relacionado TH1).
- **Preguntas post-tarea:**
  - Que entendiste que pasaba al tocar Guardar de todas formas?
  - Quedo registrado en algun lado que vos autorizaste este ingreso? Como lo comprobarias?
  - En que se diferenciaba este aviso de uno normal?
  - Volverias a forzar o corregirias? Por que?
- **Metricas:**
  - Tiempo en decidir forzar vs corregir. Si leyo el modal completo (observado). Sobre que boton cayo el primer toque. Dudas verbalizadas. Si busco donde queda registrada la autorizacion.

#### [SUP-CIP-04] Revisar limpieza CIP del turno confiando en el punto verde
- **Pantalla / Prioridad / Riesgos:** CIP / P0 / H1, TH5
- **Objetivo:** Descubrir si el supervisor interpreta el punto verde como "CIP verificada" cuando puede estar sin alcalino, enjuague, acido ni temperatura. Ver si abre las filas a controlar parametros o se queda con el color. Probar si el sync de 10s le pisa lo que corrige.
- **Tarea:** Antes de habilitar los silos para el proximo ingreso, revisa en la pantalla de CIP que las limpiezas del turno (dia de hoy) esten hechas. Si ves alguna que no, completala vos.
- **Que deberia pasar (hoy):** La lista muestra punto verde apenas hay hora O responsable, aunque alcalino/enjuague/acido/temperatura esten vacios (H1): falso-positivo que el supervisor lee como verificado. Hoy la app NO exige completitud para pintar verde. Si el supervisor abre una fila a completar un parametro, el sync de CIP cada 10s puede recargar y pisar lo que esta escribiendo: SecCIP recarga en cada tick de `syncKey` (`useEffect` linea 2172, deps `[date, syncKey]`) y NO tiene el dirty-guard con `useRef` que si tiene Stock (linea 3669); si un guardado falla se revierte el caracter recien tipeado sin aviso (TH5). **ACLARACION:** esto aplica al dia de HOY (abierto). En un dia CERRADO no puede editar CIP porque el overlay "Dia cerrado" cubre la seccion (linea 9362).
- **Que observar:**
  - Si abre las filas colapsadas o se queda mirando los puntos verdes.
  - Cuanto tiempo dedica a "revisar" antes de dar el ok.
  - Si nota filas verdes con parametros vacios.
  - Si al escribir un parametro el campo se le borra o revierte solo.
  - Cada cuanto la lista "parpadea"/recarga mientras escribe.
- **Senales de confusion:**
  - Da por buena la CIP solo por ver verde, sin abrir filas.
  - Pregunta "si esta en verde ya esta limpio no?".
  - Escribe un valor, mira, y vuelve a escribir porque "se borro".
  - Se frustra porque "se mueve solo" mientras carga.
  - Toca varias veces el mismo campo.
- **Errores criticos posibles:**
  - Da por verificada una limpieza incompleta (punto verde sin parametros): registro de inocuidad falso-positivo (H1) y se habilita un silo posiblemente sucio.
  - Un parametro que cree haber cargado queda vacio porque el sync de 10s lo piso o revirtio sin aviso (TH5).
- **Preguntas post-tarea:**
  - Como supiste que esa limpieza estaba hecha de verdad?
  - Que significa para vos el punto verde?
  - Paso que algo que escribiste se borrara? Que hiciste?
  - Que parametros mirarias para dar una CIP por buena?
- **Metricas:**
  - Filas que abrio vs dejo colapsadas. Tiempo de revision. Si detecto alguna verde-incompleta (si/no). Reescrituras por reversion del sync. Dudas verbalizadas.

#### [SUP-MOV-05] Verificar y corregir un movimiento de un dia PASADO todavia abierto (modo historico poco evidente)
- **Pantalla / Prioridad / Riesgos:** Movimientos (modo historico) / P0 / H7, TH2, TH9, TH4
- **Objetivo:** Descubrir si el supervisor percibe que esta operando sobre un dia pasado (modo historico) y no sobre hoy, y si al editar un movimiento existente confunde el silo origen con el destino. Validar que mientras el dia pasado NO este cerrado, los formularios de Movimientos siguen totalmente editables.
- **Tarea:** Te avisan que en el dia de ayer quedo mal anotado un trasvase: dice que se movieron 5.000 L del silo 80 al 60 pero fueron 3.000 L. Entra a ese dia, encontra ese movimiento y corregilo a 3.000 L.
- **Que deberia pasar (hoy):** Al navegar a ayer, el unico aviso de estar en un dia que no es hoy es un banner tenue "Viendo registros del DD/MM" (linea 9342) — modo historico poco evidente (H7). Si ese dia NO esta cerrado, los movimientos son totalmente editables: el supervisor abre el movimiento, edita litros y al guardar se reescribe ese dia y se recalcula su saldo. Riesgos al editar: los desplegables Desde y Hasta son identicos, con la misma lista y sin asimetria visual (TH2): puede invertir el trasvase. Si hay perdida cargada, el confirm de saldo insuficiente dice "se mueven X litros" pero al origen se le resta X mas la perdida (TH9). **NOTA sobre dia CERRADO:** si el dia estuviera cerrado, NO podria editar — un overlay "Dia cerrado" a pantalla completa (linea 9362) bloquea toda la seccion con un cartel claro; el riesgo TH4 (inputs editables por detras) existe a nivel codigo pero el overlay impide tocarlos.
- **Que observar:**
  - Si percibe que esta en un dia pasado (lee el banner tenue) o cree que es hoy.
  - Si encuentra el movimiento a corregir o se pierde.
  - Si al editar confunde Desde con Hasta.
  - Si revisa que silo bajo y cual subio despues de corregir.
  - Si aparece el confirm de saldo y que cifra lee.
- **Senales de confusion:**
  - No registra que el dia es ayer (sigue como si fuera hoy).
  - Duda sobre cual desplegable es el origen y cual el destino.
  - Pregunta "este movimiento es de hoy o de ayer?".
  - Edita, se arrepiente y deshace.
  - Confirma el saldo mirando solo la cifra de litros sin la perdida.
- **Errores criticos posibles:**
  - Edita el dia equivocado por no notar el modo historico (H7).
  - Al editar Desde/Hasta invierte el trasvase (TH2) y descuadra dos silos.
  - El confirm de saldo (si salta) muestra una cifra que no incluye la perdida (TH9).
- **Preguntas post-tarea:**
  - Sobre que dia estabas trabajando? Como te diste cuenta?
  - Cual era el silo de origen y cual el de destino en ese movimiento?
  - Si el dia hubiera estado cerrado, podrias haberlo editado? Que viste?
  - La cifra que confirmaste, era el total que iba a bajar del silo?
- **Metricas:**
  - Si detecto que el dia era ayer (si/no). Dudas sobre Desde/Hasta. Si invirtio el trasvase (si/no). Tiempo. Si leyo la cifra del confirm completa (si/no).

#### [SUP-CARGA-06] Despachar leche desde BIN (origen no contabilizado por el motor)
- **Pantalla / Prioridad / Riesgos:** Carga / P0 / TH3, TH1
- **Objetivo:** Descubrir si el supervisor distingue BIN del resto de los silos en el desplegable de origen y si nota que el despacho no descuenta de ningun silo. Carga no muestra el disponible del origen.
- **Tarea:** Despacha una carga de salida de 9.000 L para el cliente La Serenisima. La leche sale de BIN. Registrala como CARGA 1.
- **Que deberia pasar (hoy):** El desplegable de origen es "Silo Proveniente" y usa `SILOS_TODOS` (linea 2333), que incluye BIN al final (linea 69) mezclado con los silos reales, sin distinguirlo (TH3). BIN no esta en `SILO_STOCK_KEY` (lineas 174-182), asi que el motor NO lo contabiliza: el despacho se registra, el chequeo de saldo da OK y NINGUN silo baja. A diferencia de Movimientos, Carga no muestra el disponible del silo origen, asi que no hay senal de que algo no descuenta. Hoy la app NO marca ni filtra BIN. La planta queda creyendo que tiene leche que ya salio (stock sobreestimado, permanente y silencioso). Si ademas tipea litros raros (0/negativo/texto), la validacion solo chequea no-vacio (linea 2361/2362, TH1).
- **Que observar:**
  - Si duda al elegir BIN o lo toma como un silo mas.
  - Si busca el stock disponible del origen (no esta en Carga).
  - Si nota que despues del despacho ningun silo bajo.
  - Cuanto tarda en encontrar el campo Silo Proveniente.
  - Si revisa Stock despues para confirmar el descuento.
- **Senales de confusion:**
  - Elige BIN sin dudar, como si fuera un silo normal.
  - Pregunta "cuanto tiene BIN?" y no encuentra el dato.
  - Despues del despacho dice "el stock quedo igual?".
  - Vuelve a la pantalla de Carga creyendo que no guardo.
  - Scroll de ida y vuelta buscando el disponible.
- **Errores criticos posibles:**
  - Despacho desde BIN se registra sin descontar de ningun silo (TH3): el stock queda sobreestimado de forma permanente y silenciosa.
  - Editar despues esa carga y cambiarle el silo re-suma los litros originales al silo nuevo (falso OK) y deja el viejo sobre-descontado (TH3).
  - Litros en 0/negativo/texto generan un despacho fantasma o invertido sin senal (TH1).
- **Preguntas post-tarea:**
  - De donde salio esa leche segun la app? Quedo descontada?
  - Como comprobarias que el stock se actualizo despues del despacho?
  - Que es BIN para vos? Lo usarias como cualquier silo?
  - Donde mirarias el disponible del silo de origen?
- **Metricas:**
  - Tiempo. Si dudo al elegir BIN (si/no). Si verifico el descuento en Stock despues (si/no). Taps innecesarios buscando el disponible. Dudas verbalizadas.

#### [SUP-PROD-07] Finalizar un lote de Produccion y leer el rendimiento sin chequear inconsistencias
- **Pantalla / Prioridad / Riesgos:** Produccion / P1 / TH3
- **Objetivo:** Descubrir si el supervisor completa litros usados/cajas de forma coherente al finalizar un lote y si nota cuando el rendimiento es imposible (>100%). Validar que el formulario SI bloquea algunos errores, pero que el warning de rendimiento imposible es invisible para el supervisor (vive en el panel solo-jefe).
- **Tarea:** El lote de Postre que estaba envasando ya termino. Finaliza el lote: cargo 3.200 L del silo POSTRE y salieron 28 cajas. Dejalo finalizado.
- **Que deberia pasar (hoy):** Al finalizar (`doConfirmarFinalizacion`, linea 2931) el formulario SI valida en el momento, para cualquier perfil: bloquea si los litros usados estan vacios (linea 2941), si son negativos (linea 2942) o si superan a los enviados (linea 2943, error rojo inline). Tambien pide confirmacion (linea 2952) y exige indicar destino del sobrante. POSTRE esta en `SILO_STOCK_KEY` (linea 181), asi que SI descuenta del silo. Lo que el supervisor NO ve es el chequeo de rendimiento imposible: si carga demasiadas cajas para los litros usados (cajas x volumen > 105% de litros usados), `runConsistencyChecks` lo marca como warning (linea 977), PERO ese detector vive en el panel tecnico que es **SOLO-JEFE** (lineas 4782/4790). Hoy la app deja finalizar un lote con rendimiento >100% sin avisarle al supervisor. **NOTA:** si en otro lote se eligiera un origen tipo BIN (no contabilizado), el saldo no reflejaria el consumo (TH3); con POSTRE no pasa.
- **Que observar:**
  - Si carga litros usados coherentes con los origenes envasados.
  - Si nota algo raro cuando cajas x volumen no cuadra con litros.
  - Si busca en algun lado el rendimiento del lote.
  - Cuanto tarda en encontrar el flujo finalizar.
  - Si confunde litros enviados con litros usados.
- **Senales de confusion:**
  - Intenta finalizar dejando litros usados en blanco y se topa con el error inline.
  - Pregunta "cuantas cajas tenia que poner?".
  - No reacciona ante un rendimiento imposible (no tiene donde verlo).
  - Duda entre enviados y usados.
  - Toca finalizar y despues quiere deshacer.
- **Errores criticos posibles:**
  - Lote finalizado con rendimiento >100% (cajas x volumen mucho mayor a litros usados): error de carga real que el supervisor no ve porque el detector es solo-jefe (linea 977).
  - Origen no contabilizado (BIN) en el lote haria que el saldo no reflejara el consumo real (TH3); no aplica a POSTRE.
  - Rendimiento >100% pasa al cierre sin aviso al supervisor.
- **Preguntas post-tarea:**
  - Que diferencia hay entre litros enviados y litros usados?
  - Como sabrias si los numeros del lote cierran bien?
  - Donde verias el rendimiento de este lote?
  - Algo te parecio raro al finalizar?
- **Metricas:**
  - Tiempo. Si cargo litros usados coherentes (si/no). Si detecto incoherencia de rendimiento (si/no). Dudas enviados/usados. Si pidio ayuda.

#### [SUP-SHELL-08] Identificarse en tablet compartida al tomar el turno (identidad heredada)
- **Pantalla / Prioridad / Riesgos:** Shell (identificacion de turno) / P1 / H6, T6
- **Objetivo:** Descubrir si, al entrar a operar en una tablet que venia usando el turno anterior, el supervisor carga su responsable de turno o hereda el del turno previo sin darse cuenta. Hoy todo lo que cargue queda atribuido a quien figure como responsable.
- **Tarea:** Llegaste a tomar el turno. Agarra la tablet de planta (la dejo el turno anterior) y empeza a operar normalmente: revisa los ingresos del turno.
- **Que deberia pasar (hoy):** El modal de identificacion (linea 8703) solo aparece si el turno ACTUAL no tiene responsable cargado (chequea `d[t].resp` en `:stock`, lineas 8707-8708). Como la tablet venia del turno anterior y el responsable del turno persiste en `:stock`, lo mas probable es que NO salte ningun pedido de identidad: el supervisor opera heredando el responsable del turno anterior (H6). Hoy la app NO re-pide responsable al cambio de turno. El unico dato de identidad por operacion es el campo `resp` del turno; no hay atribucion por persona individual en main. Todo lo que cargue queda atribuido a quien figure como `resp`. Ademas los roles son client-side (T6).
- **Que observar:**
  - Si verifica quien figura como responsable antes de operar.
  - Si busca un nombre/rol en el header.
  - Si carga su identidad en algun lado o asume que ya esta.
  - Cuanto tarda en empezar a operar.
  - Si nota que sigue la sesion del turno anterior.
- **Senales de confusion:**
  - Empieza a operar sin mirar quien es el responsable activo.
  - Pregunta "esto sale a mi nombre?".
  - Busca su nombre en el header y no lo encuentra claro.
  - No le aparece el modal y no sabe como cambiar de responsable.
  - Asume que la app "sabe" quien es.
- **Errores criticos posibles:**
  - Opera con el responsable del turno anterior heredado (H6): lo que carga queda atribuido a quien no lo hizo.
  - Si el turno actual quedara sin responsable, la trazabilidad por persona se pierde.
  - La atribucion fina no existe en main y los roles son client-side (T6).
- **Preguntas post-tarea:**
  - A nombre de quien estaba la app cuando la agarraste?
  - Como cambiarias el responsable del turno?
  - Donde ves quien esta operando ahora mismo?
  - Lo que cargues, a quien queda atribuido?
- **Metricas:**
  - Si cargo/cambio el responsable al tomar el turno (si/no). Tiempo hasta empezar a operar. Si verifico la identidad activa (si/no). Dudas sobre atribucion. Si pidio ayuda.

#### [SUP-SHELL-09] Intentar reabrir un dia cerrado siendo supervisor (permiso solo-jefe)
- **Pantalla / Prioridad / Riesgos:** Shell (reapertura de dia) / P1 / T7, T6, H7
- **Objetivo:** Descubrir que hace el supervisor cuando necesita corregir algo de un dia ya cerrado: si entiende que no puede reabrir, si encuentra el control de candado, y como reacciona al aviso de que solo el jefe reabre. Validar el limite real de su autoridad.
- **Tarea:** Te das cuenta de que el dia de ayer (cerrado) tiene un ingreso mal cargado y hay que corregirlo. Intenta reabrir el dia para poder editarlo.
- **Que deberia pasar (hoy):** `handleReabrirDia` (linea 8793) valida `perfil === "jefe"`: el supervisor NO puede reabrir. El control de candado del header se renderiza para supervisor y jefe (linea 9291), pero cuando el dia esta cerrado y el perfil NO es jefe, el `onClick` queda en undefined y el cursor en default (lineas 9293/9300): tocarlo no hace NADA y el tooltip dice "Dia cerrado por X" (linea 9294) — **no es un no-op silencioso confuso, hay aviso**. Ademas, el overlay "Dia cerrado" que cubre la seccion dice explicitamente "Solo el jefe puede reabrir el dia" (linea 9373). Hoy la app SI le explica al supervisor que reabrir es solo del jefe. Donde queda el hueco: el supervisor no puede corregir el dato y depende del jefe; si recurre a un dia pasado ABIERTO confunde modo historico (H7). Si finalmente un jefe reabre hoy y se edita, T7: reabrir hoy NO recalcula `SALDO_KEY` hasta un nuevo cierre. Por T6 este permiso no es barrera real server-side.
- **Que observar:**
  - Si encuentra el candado en el header y lo toca.
  - Si al tocarlo entiende que no pasa nada y por que (lee el tooltip / el overlay).
  - Que hace cuando no puede: pide al jefe, reintenta, abandona.
  - Cuanto tarda en entender que no le corresponde.
  - Si intenta editar el dato por otra via.
- **Senales de confusion:**
  - Toca el candado varias veces esperando que abra.
  - Busca otro boton de reabrir y no lo encuentra.
  - Pregunta "por que no puedo reabrir?".
  - Intenta corregir el dato sin reabrir.
  - No lee el cartel del overlay que dice quien puede reabrir.
- **Errores criticos posibles:**
  - El supervisor no puede corregir el dato del dia cerrado y, si no avisa al jefe, el dato malo queda sin corregir.
  - Si un jefe reabre hoy y se edita, T7 deja el saldo de manana desactualizado salvo nuevo cierre.
  - Por T6 cualquier sesion valida podria forzar la reapertura saltando la UI (riesgo de seguridad, no de friccion).
- **Preguntas post-tarea:**
  - Pudiste reabrir el dia? Que paso cuando lo intentaste?
  - Quien penses que puede reabrir un dia? La app te lo dijo?
  - Como corregirias ese ingreso si no podes reabrir?
  - Que te mostro la app cuando tocaste el candado?
- **Metricas:**
  - Si encontro el candado (si/no). Si entendio por que no podia reabrir (si/no). Tiempo hasta entender el limite de permiso. Si intento una via alternativa (si/no). Si pidio ayuda al jefe.

#### [SUP-DASH-10] Exportar CSV de un rango de fechas para control de calidad / oficina
- **Pantalla / Prioridad / Riesgos:** Dashboard (Exportar) / P2 / T6, TH3, TH10
- **Objetivo:** Descubrir si el supervisor arma el rango de fechas correcto y entiende que el CSV refleja los datos tal como estan (incluidos los errores no detectados). Probar el flujo de exportacion en escritorio para revision tipo oficina.
- **Tarea:** Te piden desde calidad un CSV con los ingresos de la ultima semana para revisar. Genera y descarga ese archivo desde el Dashboard.
- **Que deberia pasar (hoy):** En el tab Exportar del Dashboard (accesible al supervisor por la nav "supervisor") el supervisor define `exportFrom`/`exportTo` (default = `date`, lineas 4763-4764) con dos selectores de fecha (lineas 6785/6789) y dispara `doExportCSV` (linea 5006). El CSV se genera con BOM UTF-8 para Excel. Hoy la app NO valida la coherencia de los datos exportados: si hubo despachos desde BIN no descontados (TH3), ingresos forzados sin auditar (TH10) o stock negativo, el CSV los refleja tal cual o los omite sin marca. **CAVEAT de mapeo:** "Oficina"/calidad NO es un perfil real; aca el supervisor exporta en escritorio para que calidad lea — no inventar permisos propios de "oficina". Por T6 cualquier sesion valida podria exportar/alterar datos saltando la UI.
- **Que observar:**
  - Si configura bien el rango de fechas (desde/hasta) o exporta solo el dia.
  - Si encuentra el tab Exportar rapido.
  - Cuanto tarda en armar el rango.
  - Si abre el CSV para verificar que trajo lo pedido.
  - Si confunde exportar ingresos con exportar otra cosa.
- **Senales de confusion:**
  - Exporta solo el dia actual creyendo que es la semana.
  - No encuentra como cambiar el rango de fechas.
  - Pregunta "esto trae toda la semana?".
  - Descarga varias veces por las dudas.
  - Confunde los botones de exportar (CSV vs otro formato).
- **Errores criticos posibles:**
  - Exporta un rango equivocado y calidad revisa datos incompletos sin saberlo.
  - El CSV refleja datos corruptos no detectados (TH3, TH10) como si fueran validos, dando falsa confianza a calidad.
  - Por T6 la integridad del export no esta garantizada server-side.
- **Preguntas post-tarea:**
  - Que rango de fechas exportaste? Como lo elegiste?
  - Como comprobas que el archivo trae lo que te pidieron?
  - Para quien es este archivo y como se lo pasarias?
  - El CSV garantiza que los datos esten bien?
- **Metricas:**
  - Tiempo. Si configuro el rango correcto (si/no). Taps para armar el rango. Si verifico el contenido del CSV (si/no). Exportaciones repetidas.

---

### Oficina

**Caveat OBLIGATORIO de mapeo de rol:** "Oficina" **no existe como perfil implementado** en main (2026-06-04). En codigo solo hay tres perfiles: `supervisor`, `jefe`, `operador` (`recibo_yatasto.jsx:63-67`). "Oficina" es administracion / control de calidad usando un perfil existente (supervisor o jefe) **en escritorio** para revision, export, lectura de auditoria y verificacion de backups. Confusiones a evitar al armar las sesiones: **(1)** el backup COMPLETO del sistema, el panel tecnico, la auditoria detallada y la reapertura de dia son **jefe-only** — si la prueba requiere esas pantallas, hay que loguear como JEFE, no como supervisor; **(2)** el tab "Oficina" del jefe ES literalmente SecAdmin (`recibo_yatasto.jsx:8537`), no una pantalla nueva. En main, supervisor ve SecDashboard (resumen/KPIs/silos/calidad/difs/semana/tambos/historial/exportar) y jefe ve SecJefeHub con dos tabs: "Dashboard" (=SecDashboard, que ademas agrega los tabs jefe-only "Auditoria" y "Tecnico") y "Oficina" (=SecAdmin). Segun T6, los roles solo se aplican en el cliente. Todo se prueba TAL CUAL esta hoy, con la Tanda A sin mergear: todos los riesgos T#/H#/TH# estan VIVOS. Recordar este caveat en cada sesion con el usuario de Oficina.

#### [OF-BKP-01] Backup completo truncado a 1000 sin aviso: verificar total_registros antes de confiar
- **Pantalla / Prioridad / Riesgos:** SecAdmin / tab "Oficina" del jefe (boton "Descargar backup completo", `recibo_yatasto.jsx:8113`; `generateBackup` linea 531). Pantalla **jefe-only**. / P0 / T3
- **Objetivo:** Descubrir si el usuario de Oficina (logueado como JEFE, unico perfil con acceso al backup completo), sin que se le adelante nada, detecta por su cuenta que un backup puede venir incompleto: si abre el archivo, busca `total_registros` y lo compara contra la cantidad real de claves, o si confia ciegamente en el "✓ Descargado" y en la fecha de ultimo backup.
- **Tarea:** Es fin de mes. Entra como jefe al panel de Oficina/Administracion, genera el backup completo del sistema con el boton "Descargar backup completo" y guardalo en la carpeta de respaldos del servidor de la oficina. Dejalo listo y avisanos cuando este guardado y verificado.
- **Que deberia pasar (hoy):** El boton "Descargar backup completo" (linea 8113) solo aparece dentro de SecAdmin, que es jefe-only (se llega por el tab "Oficina" del SecJefeHub). `generateBackup` (linea 531) descarga un JSON con todas las claves `yatasto:*` SIN paginar: `db.list` corta alrededor de 1000 filas (limite PostgREST), pone `total_registros = rows.length` y NO avisa que esta truncado. El boton pasa a "✓ Descargado" (linea 8107) y se estampa `yatasto:ultimo-backup-date` igual aunque el backup este incompleto o la descarga se cancele (linea 549). La app NO valida ni compara nada: si hay mas de 1000 claves, faltan dias enteros (ingresos, cargas, stock, saldo, auditoria) sin ninguna senal. La unica defensa es que la persona abra el .json y mire `total_registros` a mano.
- **Que observar:**
  - Si encuentra el boton (esta dentro del tab "Oficina" del jefe, no en la vista de supervisor).
  - Si abre el archivo .json o se queda solo con el "✓ Descargado".
  - Si busca el campo `total_registros` dentro del JSON.
  - Contra que compara ese numero.
  - Cuanto tarda desde que toca el boton hasta que da el backup por bueno.
  - Si mira la leyenda de "ultimo backup" y la toma como prueba de completitud.
  - Si guarda el archivo fuera del dispositivo o lo deja solo en la PC.
- **Senales de confusion:**
  - No encuentra el boton porque entro como supervisor (no jefe).
  - Dice "listo, ya esta" apenas ve el "✓ Descargado".
  - Pregunta "como se si descargo todo".
  - No abre el archivo en ningun momento.
  - Busca un mensaje de confirmacion de cantidad y no lo encuentra.
  - Confunde la fecha de ultimo backup con una garantia de integridad.
- **Errores criticos posibles:**
  - Da por bueno un backup truncado a 1000: si despues hay que restaurar, faltan dias completos sin que nadie lo sepa (T3).
  - Borra o pisa el backup anterior bueno confiando en uno truncado.
  - Reporta "backup OK" basandose solo en el "✓ Descargado" y en `yatasto:ultimo-backup-date`, que se estampa aunque el backup este incompleto o se cancele.
- **Preguntas post-tarea:**
  - Como supiste que el backup estaba completo?
  - Que numero del archivo mirarias para estar seguro de que no falta nada?
  - Si manana hay que restaurar desde este archivo, te quedas tranquilo? Por que?
  - Que significa para vos la fecha de "ultimo backup" que muestra la app?
- **Metricas:**
  - Tiempo total. Abrio el archivo (si/no). Encontro `total_registros` (si/no). Taps hasta dar por hecho el backup. Pidio ayuda (si/no). Guardo el archivo fuera del dispositivo (si/no).

#### [OF-HIST-01] Modo historico poco evidente al revisar un dia pasado en escritorio
- **Pantalla / Prioridad / Riesgos:** Shell (selector de fecha `recibo_yatasto.jsx:9334` y banner historico linea 9342, fondo `C.accent14`) + Ingresos/Movimientos en lectura / P0 / H7, TH4, T2
- **Objetivo:** Descubrir si, en una sesion larga de revision, el usuario nota que esta parado en un dia que no es hoy. El banner historico es de bajo contraste. Ver si lo registra o si, creyendo que esta en hoy, llega a tocar/reescribir un registro de una jornada pasada que sigue ABIERTA (sin proteccion de solo-lectura), o de una cerrada donde TH4 deja CIP y Movimientos sin la senal.
- **Tarea:** El jefe dice que el martes pasado un tambo reclamo que le anotamos menos litros de los que entrego. Entra al sistema, busca el ingreso de ese tambo del martes y deci si los litros que figuran coinciden con el remito que te paso (que dice 12.400 L de fabrica).
- **Que deberia pasar (hoy):** Al elegir el martes en el selector, todas las secciones cambian al dia historico, pero el unico aviso es un banner tenue "Viendo registros del dd/mm/yyyy" con fondo `C.accent14` (linea 9342) y el boton de fecha que cambia de "Hoy" al texto de la fecha (linea 9324). El bloqueo de edicion NO depende de que el dia sea pasado, sino de que este CERRADO: si el martes quedo cerrado, aparece un overlay "Dia cerrado" (linea 9362) que tapa las secciones operativas; pero por TH4 ese overlay es la unica defensa, porque a CIP (linea 9395, render sin prop `readOnly`/`dayClosed`) y a los formularios de Movimientos no se les propaga la senal. Si el martes quedo ABIERTO, no hay ninguna proteccion de solo-lectura: un roce en un input puede reescribir un registro de un dia pasado sin cartel claro. Ademas, si revisa cerca de un turno noche, por T2 la atribucion de fecha pudo haber rotado a las 21:00 hora Argentina y el dato del martes a la noche puede estar archivado bajo el miercoles.
- **Que observar:**
  - Si lee el banner historico o lo pasa de largo.
  - Cuanto tarda en darse cuenta de en que dia esta parado.
  - Si vuelve a "Hoy" al terminar o deja la sesion en el martes.
  - Si toca algun input de la ficha del ingreso mientras la lee (riesgo de reescritura si el dia esta abierto).
  - Donde busca la fecha activa (header, banner, boton).
  - Si confunde `litrosFca` y `litrosTbo` al comparar contra el remito.
- **Senales de confusion:**
  - Scrollea arriba y abajo buscando que dia esta viendo.
  - Pregunta "esto es de hoy o del martes?".
  - Toca el boton de fecha varias veces para confirmar.
  - Se queda mirando el banner sin entender si esta editando o solo mirando.
  - Empieza a cargar/corregir un dato creyendo que es el dia actual.
- **Errores criticos posibles:**
  - Edita o reescribe un registro de un dia pasado y ABIERTO creyendo que esta en hoy, sin aviso; o, si el dia esta cerrado, reescribe en CIP/Movimientos porque TH4 deja esos formularios sin la senal (TH4).
  - Saca una conclusion del reclamo sobre el dia equivocado porque la atribucion de fecha rota a las 21:00 por T2.
  - Deja la sesion en el martes y el siguiente que use la PC carga sobre el dia historico.
- **Preguntas post-tarea:**
  - Como supiste que dia estabas viendo en cada momento?
  - En algun momento dudaste de si estabas mirando o editando? Cuando?
  - Que te dice el cartelito de arriba? Lo viste?
  - Si quisieras volver al dia de hoy, como lo harias?
- **Metricas:**
  - Tiempo hasta identificar correctamente el dia activo. Leyo el banner historico (si/no observado). Dudas sobre la fecha. Toco algun input editable del dia historico (si/no). Volvio a Hoy al terminar (si/no).

#### [OF-FECHA-01] Selector de fecha principal sin tope: exportar contra una fecha futura
- **Pantalla / Prioridad / Riesgos:** Shell (selector de fecha principal, `recibo_yatasto.jsx:9334`, `input type=date` SIN atributo `max`) / P0 / TH7, H7
- **Objetivo:** Descubrir si un toque/click impreciso en el calendario deja a la persona parada en una fecha futura sin que lo note. El selector principal del Shell NO tiene `max`, a diferencia del de SecAdmin "Fecha a consultar" (linea 8472), que si tiene `max={getToday()}`. Ver si detecta que esta en el futuro y si entiende que exportar/cargar ahi deja datos fuera de la cadena de saldo.
- **Tarea:** Necesitamos el parte del dia de hoy para mandarlo a gerencia. Abri el calendario de fecha del Shell, asegurate de estar en el dia de hoy y descarga el informe (CSV) del dia desde el Dashboard. El mes pasado alguien mando un parte vacio, asi que fijate bien antes de exportar.
- **Que deberia pasar (hoy):** El selector de fecha principal del Shell (linea 9334) es un `input type=date` SIN `max`, asi que permite elegir cualquier dia futuro (el de SecAdmin si tiene `max`, linea 8472). Si la persona, al abrir el calendario, toca un dia del mes siguiente o se equivoca de mes, queda parada en una fecha futura: el informe del Dashboard sale vacio o con datos que no entran en la cadena de saldo (el arrastre llega solo hasta ayer). Aparece el banner "no es hoy" pero es tenue (H7) y, para una fecha sin datos, el Dashboard muestra todo en cero. La app NO impide elegir futuro ni avisa que esa fecha no tiene datos validos.
- **Que observar:**
  - Como navega el calendario nativo y si se le va de mes con el click.
  - Si nota que el boton de fecha dejo de decir "Hoy".
  - Si el informe vacio le hace sospechar la fecha o piensa que "no se cargo nada hoy".
  - Cuanto tarda en volver a "Hoy" si se desvio.
  - Si usa el boton "Hoy" de atajo (linea 9336) o navega a mano.
- **Senales de confusion:**
  - Click repetido en el calendario buscando el dia correcto.
  - Pregunta "por que sale vacio el parte?".
  - Vuelve a abrir el selector varias veces.
  - Se queda mirando el banner sin asociarlo a "estoy en otro dia".
  - Reintenta la exportacion sin corregir la fecha.
- **Errores criticos posibles:**
  - Exporta y manda a gerencia un parte de una fecha futura, vacio o sin sentido, creyendo que es el de hoy (TH7).
  - Si ademas cargara algo en esa fecha futura, los litros quedan fuera de la cadena de saldo y "desaparecen" hasta una auditoria (TH7).
  - Cerrar/operar un dia futuro contaminaria la clave de saldo.
- **Preguntas post-tarea:**
  - Como confirmaste que estabas en el dia de hoy antes de exportar?
  - Que pensaste cuando viste el informe? Era lo que esperabas?
  - El calendario te dejo elegir cualquier dia? Eso te parecio normal?
  - Como volverias rapido al dia de hoy?
- **Metricas:**
  - Tiempo. Termino en fecha correcta (si/no). Aperturas del selector. Detecto que estaba en otra fecha (si/no, en cuanto tiempo). Uso el atajo "Hoy" (si/no).

#### [OF-EXP-01] Export CSV/Excel de un rango: integridad, dia mal atribuido (turno noche) y "Responsable" autodeclarado
- **Pantalla / Prioridad / Riesgos:** Dashboard / Export (`doExportCSV` linea 5006, `doExportXLS` linea 5049; selector de rango `exportFrom`/`exportTo`) / P1 / T2, T5, H7
- **Objetivo:** Descubrir si el usuario de Oficina arma bien el rango de fechas, entiende que el export refleja como quedo atribuido el dato (no como sucedio fisicamente) y si nota que cargas del turno noche pueden haber caido en la fecha del dia siguiente por T2. Tambien si confunde la columna "Responsable" del CSV (texto libre que el operario escribe a mano, puede quedar vacio) con una prueba real de quien cargo el registro, cuando la auditoria de altas/ediciones fuera de Produccion no existe.
- **Tarea:** Gerencia pide el informe de ingresos y cargas de toda la semana pasada (lunes a domingo) en un solo archivo para la reunion. Generalo en Excel y deci cuantos litros entraron y cuantos salieron en la semana.
- **Que deberia pasar (hoy):** El export recorre el rango `exportFrom..exportTo` dia por dia (`getDaysInRange`) y vuelca INGRESOS, CARGAS y MOVIMIENTOS leyendo cada seccion tal cual quedo guardada por fecha (lineas 5016-5040). Suma `litrosFca` / `litros`. NO recalcula nada: si por T2 una carga del turno noche quedo archivada en la fecha del dia siguiente, en el CSV aparece en el dia equivocado y los totales por dia salen corridos, sin aviso. El archivo SI trae una columna "Responsable" por fila (lineas 5015, 5020, 5024, 5029, 5033, 5038), pero es un campo de TEXTO LIBRE que el operario tipea a mano al cargar (puede estar vacio, mal escrito o ser el mismo de todo el turno); NO es un audit de quien realmente cargo/edito el registro. La auditoria fina de altas/ediciones fuera de Produccion no existe. Si dos dispositivos escribieron auditoria a la vez, el log pudo perder entradas (T5).
- **Que observar:**
  - Como define el rango (toca `exportFrom` y `exportTo`, o exporta un solo dia por error).
  - Si revisa que el rango cubra lunes a domingo completo.
  - Si mira los totales por dia y nota algun dia con cargas corridas (efecto T2 en turno noche).
  - Si ve la columna "Responsable" y la toma como prueba de autor, o nota que puede venir vacia/escrita a mano.
  - Cuanto tarda en armar el rango y cuantos taps usa.
  - Si elige CSV o Excel y si abre el archivo para verificar.
- **Senales de confusion:**
  - Exporta un solo dia y se da cuenta tarde que falto el rango.
  - Pregunta "por que el domingo a la noche figura el lunes?" o no lo nota.
  - Encuentra la columna "Responsable" vacia y no sabe si es un error o si nunca se cargo.
  - Reabre el selector de rango varias veces.
  - Suma a mano y no le cierra contra el total que esperaba.
- **Errores criticos posibles:**
  - Reporta totales por dia corridos porque cargas de turno noche cayeron en el dia siguiente por T2, sin saberlo.
  - Toma la columna "Responsable" del CSV como prueba firme de quien cargo un ingreso/carga, cuando es texto libre autodeclarado y no un audit.
  - Toma el CSV como registro completo de auditoria sin saber que entradas del log pudieron perderse por T5.
- **Preguntas post-tarea:**
  - Como te aseguraste de que el rango cubria toda la semana?
  - Si te preguntan quien cargo este ingreso, este archivo te lo prueba? De donde sale ese nombre?
  - Viste algun dia con numeros raros? Que pensaste?
  - Confias en que estos totales son exactamente lo que paso en planta? Por que?
- **Metricas:**
  - Tiempo. Rango correcto al primer intento (si/no). Taps para armar el rango. Detecto algun dia corrido por T2 (si/no). Interpreto bien la columna "Responsable" (autodeclarada, no audit) (si/no). Pidio ayuda (si/no).

#### [OF-KPI-01] Lectura del Dashboard/KPIs y cruce contra Stock real por silo
- **Pantalla / Prioridad / Riesgos:** Dashboard (SecDashboard: KPIs `totalIngresados`/`totalCargados`/`balance` lineas 4864-4866; `SiloBar` por silo linea 4922) + Stock / P1 / H9, TH3, TH1
- **Objetivo:** Descubrir si el usuario de Oficina interpreta correctamente los KPIs y los saldos por silo, y si detecta sintomas de datos corruptos arrastrados (silo inflado por carga desde BIN que no descuenta -TH3-, o movimiento fantasma por litros en 0/negativo -TH1-). Ver si toma el numero como verdad o si lo cruza con el conteo fisico.
- **Tarea:** Antes de la reunion de produccion, mira el panel del dia de ayer y deci: cuantos litros entraron, cuantos salieron, y si hay algun silo que se vea raro (con mas o menos litros de lo que deberia). Marca cualquier cosa que no te cierre.
- **Que deberia pasar (hoy):** El Dashboard muestra `totalIngresados` (suma de `litrosFca`, linea 4864), `totalCargados` (suma de `litros` de carga, linea 4865) y `balance = entrada - salida` (linea 4866), mas una barra por silo (`SiloBar`, linea 4922) con litros de `calcAutoLitros`. El pct de la barra se clampea a 100 (linea 4927: `Math.min(100,...)`) y se marca alerta (color accent) solo cuando pct > 88 (linea 4939); un silo por encima del 100% se dibuja al 100% sin color de peligro real (H9). Si hubo una carga desde BIN (no contabilizado, TH3) el silo origen queda sobreestimado de forma permanente y el panel lo muestra como saldo normal. Un movimiento con litros 0/negativo (TH1) tampoco salta. El panel puede mostrar un saldo corrupto como si fuera correcto; ninguna alerta lo distingue.
- **Que observar:**
  - Si lee los tres KPIs de arriba o va directo a los silos.
  - Como interpreta "balance" (entiende entrada menos salida?).
  - Si nota un silo por encima de su capacidad y si le llama la atencion que no este en rojo.
  - Si cruza el numero del panel con algun conteo fisico o lo toma como verdad.
  - Donde toca para ver el detalle de un silo (`modalProd`).
  - Cuanto tarda en dar un veredicto.
- **Senales de confusion:**
  - Lee "balance" negativo y no sabe si es entrada o salida.
  - Se queda mirando un silo lleno sin decidir si esta bien.
  - Pregunta "este silo tiene mas litros de los que entra?".
  - Toca varios silos buscando el detalle y se pierde.
  - Confunde litros reservados con disponibles.
- **Errores criticos posibles:**
  - Da por bueno un saldo de silo inflado por una carga desde BIN que no descuento (TH3), y la planta planifica creyendo que tiene leche que ya salio.
  - No detecta un silo sobre capacidad porque la barra se clampea al 100% sin color de peligro (H9).
  - Toma el balance del panel como cuadre real cuando arrastra un movimiento fantasma de litros 0/negativo (TH1).
- **Preguntas post-tarea:**
  - Que significa para vos el numero "balance"?
  - Como te darias cuenta si un silo tiene mas litros de los que fisicamente puede?
  - Cuando un numero del panel no te cierra, que harias para confirmarlo?
  - Confias en estos numeros para tomar una decision? Que mas mirarias?
- **Metricas:**
  - Tiempo. Interpreto bien entrada/salida/balance (si/no). Detecto el silo sobre capacidad sin rojo (si/no). Cruzo contra dato fisico o lo tomo como verdad (cual). Dudas. Pidio ayuda (si/no).

#### [OF-AUD-01] Lectura del historial de auditoria: que se puede reconstruir y que no
- **Pantalla / Prioridad / Riesgos:** Dashboard (tab "Historial" para todos y tab "Auditoria" solo jefe; `auditLog` cargado en linea 4825; `AUDIT_LABEL` linea 4884) / P1 / T5, TH10, H6, H8
- **Objetivo:** Descubrir si el usuario de Oficina entiende los limites reales del log: que solo se auditan borrados, cierre/reapertura, forzado por CIP y TODA Produccion; que NO se audita quien cargo/edito un ingreso, movimiento, carga, stock o fortificado; que un ingreso con aguado forzado NO deja rastro (TH10); y que en dispositivo compartido la atribucion por persona es ambigua (H6). Ver si concluye de mas a partir de un log incompleto.
- **Tarea:** Calidad sospecha que ayer alguien forzo un ingreso de un tambo que dio aguado y quiere saber quien lo autorizo. Entra al historial del dia de ayer y deci quien cargo ese ingreso y quien autorizo el forzado.
- **Que deberia pasar (hoy):** El historial muestra entradas de `logAudit`: delete, `close_day`, `reopen_day`, forzado por CIP (action `forzar_ingreso_silo_sucio`, linea 1938) y actividad de Produccion. El forzado de un ingreso con AGUADO NO llama a `logAudit` (linea 1901: el override de aguado hace `onSave(f)` sin marca `_forzadoCIP`, asi que no entra a la rama de auditoria de linea 1937; solo deja un `track()` de analitica) — confirma TH10: no hay ninguna entrada de quien lo autorizo. Tampoco hay entrada de alta de un ingreso normal. La unica pista de identidad es el campo `by` (etiqueta de perfil: Supervisor/Jefe de Planta/Operador) y el `resp` del turno, que en dispositivo compartido puede ser de otra persona (H6). Ademas, por T5, si dos dispositivos escribieron auditoria a la vez, pudieron perderse entradas. La respuesta honesta hoy es "no se puede reconstruir quien autorizo el aguado", pero la app no lo dice: el usuario tiene que inferir el hueco.
- **Que observar:**
  - Donde busca el ingreso aguado dentro del historial (y no lo encuentra).
  - Si interpreta la ausencia de entrada como "no paso" o como "no quedo registrado".
  - Si toma el `by` (Supervisor/Jefe de Planta/Operador) como nombre de persona.
  - Cuanto tiempo busca antes de concluir.
  - Si nota que las altas normales de ingreso no figuran en el log.
- **Senales de confusion:**
  - Scrollea el historial varias veces buscando el ingreso y no aparece.
  - Pregunta "por que no esta el aguado aca?".
  - Asume que "Operador" es una persona concreta.
  - Concluye "no se forzo nada" por no ver la entrada.
  - Se queda esperando un detalle de autor que no existe.
- **Errores criticos posibles:**
  - Concluye que nadie forzo el aguado porque no hay entrada, cuando en realidad el forzado de aguado no se audita (TH10): falso negativo en un caso de responsabilidad legal/inocuidad.
  - Atribuye el ingreso a una persona equivocada leyendo `by`/`resp` en dispositivo compartido (H6).
  - Asume que el log es exhaustivo cuando pudo perder entradas por escritura concurrente (T5).
- **Preguntas post-tarea:**
  - Pudiste decir quien autorizo el forzado? Como llegaste a esa respuesta?
  - Si no aparece en el historial, que significa para vos: que no paso, o que no quedo registrado?
  - El `by` que figura, es una persona o un tipo de usuario?
  - Confiarias en este historial para un reclamo formal? Por que?
- **Metricas:**
  - Tiempo. Concluyo correctamente "no reconstruible" (si/no). Interpreto el hueco como "no paso" por error (si/no). Confundio `by` con persona individual (si/no). Scrolls/busquedas. Pidio ayuda (si/no).

#### [OF-TEC-01] Panel tecnico (solo jefe): correr inconsistencias y entender el recalculo de saldo
- **Pantalla / Prioridad / Riesgos:** Dashboard / tab "Tecnico" (SecDashboard, solo jefe; `runConsistencyChecks` linea 4795, `rebuildSaldoChain` linea 4803, `techQueueLen`) + reapertura de dia en Shell (linea 8793, solo jefe) / P1 / T7, T5, T1
- **Objetivo:** Descubrir si el jefe en escritorio sabe encontrar y usar el panel tecnico: correr el chequeo de inconsistencias antes de cerrar, leer la cola pendiente, y entender cuando hace falta recalcular la cadena de saldo (tras una reapertura por T7). Ver si entiende que reabrir HOY o AYER no recalcula solo, y si el panel le da senales claras o lo deja adivinar.
- **Tarea:** Como jefe, vas a cerrar el dia. Antes de cerrar, revisa que no haya inconsistencias en los silos y que no haya cambios pendientes de sincronizar. Si algo quedo mal, dejalo en condiciones de cerrar.
- **Que deberia pasar (hoy):** El tab "Tecnico" (linea 6365, visible solo con perfil jefe) corre `runConsistencyChecks(date)` y lista errores/warnings, muestra el largo de la cola (`techQueueLen`, linea 4776) y permite recalcular la cadena (`rebuildSaldoChain` via `runTechRecalculate`, lineas 4801-4809). La app NO obliga a correr el chequeo antes de cerrar: es facil cerrar sin haberlo mirado. El cierre SI se bloquea si hay cambios en la cola: `handleCerrarDia` corta con un aviso "Cambios pendientes de sincronizar" cuando `queueLen > 0` (linea 8752). En cambio, si antes hubo una reapertura de HOY o AYER, el saldo NO se recalcula solo: `handleReabrirDia` solo agenda `rebuildSaldoChain` cuando el dia es retroactivo (date < ayer, linea 8811); reabrir hoy/ayer deja el `SALDO_KEY` congelado del cierre sin reflejar el cambio hasta un nuevo cierre (T7), y el panel no lo grita: el jefe tiene que saber que debe recalcular o re-cerrar.
- **Que observar:**
  - Si encuentra el tab "Tecnico" o lo busca (solo aparece como jefe, lineas 6363-6366).
  - Si corre el chequeo de inconsistencias por iniciativa propia o solo intenta cerrar.
  - Como interpreta un warning (lo entiende, lo ignora, pregunta).
  - Si mira el indicador de cola / "sincronizado" antes de cerrar.
  - Si asocia una reapertura previa de hoy/ayer con la necesidad de recalcular (T7).
  - Cuanto tarda en dejar el dia "en condiciones".
- **Senales de confusion:**
  - No encuentra el panel tecnico y navega de mas.
  - Lee un warning y pregunta "esto que quiere decir?".
  - Intenta cerrar directo sin correr el chequeo.
  - Entiende por que la app no lo deja cerrar (cola pendiente) o reintenta sin esperar la sincronizacion.
  - Toca "recalcular" sin saber si hacia falta o lo evita por miedo.
- **Errores criticos posibles:**
  - Cierra el dia sin correr el chequeo y arrastra un stock negativo o una cadena truncada al saldo del dia siguiente.
  - Tras reabrir HOY o AYER y editar, no recalcula ni re-cierra, y el saldo de manana no refleja el cambio (T7).
  - Asume que el estado tecnico es exhaustivo cuando la auditoria pudo perder entradas por T5 o la cola pisar la ultima carga por T1.
- **Preguntas post-tarea:**
  - Que hiciste para asegurarte de que no habia inconsistencias antes de cerrar?
  - Cuando viste un aviso, supiste que significaba y que hacer?
  - Si recien reabriste y editaste el dia de hoy, que tenes que hacer para que el saldo quede bien?
  - Por que pensas que la app no te dejaba cerrar en algun momento?
- **Metricas:**
  - Tiempo. Corrio el chequeo sin que se le pidiera (si/no). Encontro el panel tecnico solo (si/no, en cuanto). Entendio los warnings (si/parcial/no). Reconocio la necesidad de recalcular tras reapertura de hoy/ayer (si/no). Pidio ayuda (si/no).

#### [OF-RESP-01] Responsable de turno faltante o heredado al revisar la jornada
- **Pantalla / Prioridad / Riesgos:** Shell (modal de identificacion, `recibo_yatasto.jsx:8703` y `guardarResponsable` linea 8743) + Stock (campo `resp` por turno, linea 3831) + Dashboard / P1 / H6, T2
- **Objetivo:** Descubrir si el usuario de Oficina, en el control de calidad diario, detecta turnos sin responsable cargado o con un responsable heredado del turno anterior (dispositivo compartido). Ver si nota el hueco de atribucion y como lo trata, sin adelantarle que el dato puede estar mal.
- **Tarea:** Parte del control diario: verifica que los tres turnos de ayer (Manana, Tarde y Noche) tengan cargado el responsable que firmo cada turno. Anota cualquier turno que no tenga responsable o que te parezca que quedo mal asignado.
- **Que deberia pasar (hoy):** El responsable del turno se guarda en la clave `:stock` por turno (campo `resp`, linea 8747 y editable en Stock linea 3831) y se ve en el Stock y en el Dashboard. El modal de identificacion solo aparece al inicio si el turno actual no tiene responsable (linea 8703), asi que el campo puede quedar vacio (H6). En dispositivo compartido, la sesion y el `resp` persisten entre personas: un turno puede mostrar el responsable del turno anterior, atribuyendo trabajo a quien no lo hizo, sin ninguna marca. Ademas, por T2, el turno noche pudo quedar archivado bajo la fecha del dia siguiente, asi que "el turno noche de ayer" puede no estar donde la persona lo busca. La app NO valida que cada turno tenga su propio responsable.
- **Que observar:**
  - Donde busca el responsable de cada turno (Stock, Dashboard).
  - Si nota un turno sin responsable o no lo distingue de uno cargado.
  - Si sospecha cuando dos turnos seguidos tienen el mismo responsable.
  - Si busca el turno noche en la fecha correcta o se le "corre" por T2.
  - Cuanto tarda en revisar los tres turnos.
- **Senales de confusion:**
  - Pregunta "donde veo quien firmo este turno?".
  - No distingue un campo vacio de uno cargado.
  - Da por bueno un responsable heredado sin dudar.
  - Busca el turno noche y no lo encuentra (efecto T2).
  - Confunde el responsable del turno con el perfil de la sesion (Supervisor/Jefe/Operador).
- **Errores criticos posibles:**
  - Valida como correcto un turno cuyo responsable es heredado del turno anterior, atribuyendo trabajo a quien no lo hizo (H6).
  - Da por completo un control donde el turno noche en realidad quedo bajo otra fecha por T2 y no lo reviso.
  - Toma el perfil de sesion (Supervisor/Jefe de Planta/Operador) como si fuera el nombre del responsable.
- **Preguntas post-tarea:**
  - Como supiste quien era el responsable de cada turno?
  - Si dos turnos seguidos tienen el mismo nombre, que pensarias?
  - Encontraste los tres turnos donde esperabas? El de la noche estaba?
  - Que diferencia hay entre el responsable del turno y el usuario con el que entraste?
- **Metricas:**
  - Tiempo. Detecto turno sin responsable (si/no). Detecto responsable heredado/sospechoso (si/no). Ubico el turno noche en la fecha correcta (si/no). Dudas. Pidio ayuda (si/no).

#### [OF-RESP-02] Vista de escritorio: responsive real, no mobile estirado, legibilidad a 60 cm
- **Pantalla / Prioridad / Riesgos:** Shell + Dashboard + SecAdmin (layout desktop, `useViewport`/`isDesktop` `recibo_yatasto.jsx:8547`; SecAdmin linea 7578; `SIDEBAR_W` linea 8543) / P2 / H4
- **Objetivo:** Descubrir si en una sesion larga de oficina (2-4 h) en PC con pantalla grande, mouse y teclado, la app se siente como una vista de escritorio real o como una pantalla de celular estirada. Ver friccion de legibilidad y aprovechamiento del ancho: texto chico a 60 cm, contenido centrado en una columna angosta, targets pensados para el dedo y no para el mouse.
- **Tarea:** Vas a pasar la tarde revisando datos en la PC de la oficina (como jefe, para tener acceso al panel de Administracion). Abri el Dashboard, despues el panel de Administracion (tab "Oficina"), y conta como te resulta leer y moverte: que se ve comodo, que te cuesta leer, que te queda lejos o demasiado chico.
- **Que deberia pasar (hoy):** La app usa `useViewport` (`isDesktop`, linea 8547) y, en escritorio, aplica sidebar (`SIDEBAR_W=220`, linea 8543), mas padding y algunos topes de ancho (el contenido del Shell se centra con `maxWidth 960`, linea 9392), por lo que hay un layout de escritorio basico. Pero el origen es mobile-first: varias vistas quedan centradas en una columna con espacio vacio a los costados, con fuentes pensadas para mobile (varios textos de 9-13 px, p.ej. los labels de `StatCard` en 9 px, linea 4911) que a 60 cm cuestan, y targets/tabs heredados del build de planta sin altura minima fija (H4). No hay densidad de informacion propia de escritorio (master-detail real, tablas anchas) en todas las secciones; varias se ven como mobile ampliado.
- **Que observar:**
  - Si acerca la cara a la pantalla o agranda con zoom del navegador.
  - Cuanto ancho de pantalla queda sin usar (columna angosta, vacio lateral).
  - Si los textos de 9-13 px le resultan comodos a distancia de escritorio.
  - Si usa teclado (Tab/Enter) y la navegacion responde o esta pensada para toque.
  - Donde se cansa o entrecierra los ojos en una sesion larga.
  - Si confunde tabs/targets chicos heredados de mobile con el mouse.
- **Senales de confusion:**
  - Hace zoom del navegador para leer.
  - Comenta "esto parece el celular" o "queda todo en el medio".
  - Se acerca a la pantalla para leer un numero.
  - Busca con el mouse un target chico y le erra.
  - Pregunta si hay una vista mas grande o de tabla.
- **Errores criticos posibles:**
  - No hay corrupcion de datos directa en este escenario; el riesgo es fatiga visual y error de lectura por targets chicos (H4) en sesiones largas, que despues induce decisiones mal informadas.
- **Preguntas post-tarea:**
  - Esto te parecio una pantalla de computadora o un celular agrandado? Por que?
  - Que te costo leer desde donde estabas sentado?
  - Aprovecha bien el monitor o te queda mucho lugar vacio?
  - Pudiste moverte con teclado y mouse comodo, o esta pensado para tocar?
- **Metricas:**
  - Uso zoom del navegador (si/no, cuanto). Veces que se acerco a la pantalla. Errores de click por target chico. Ancho de pantalla percibido como desaprovechado (1-5). Comodidad de lectura a 60 cm (1-5).

---

### Jefe

**Caveat del rol:** "Jefe" usa el perfil REAL `jefe`. El jefe hace TODO lo del supervisor MAS acciones exclusivas validadas en el handler (no solo ocultas en UI): **reabrir un dia cerrado** (`handleReabrirDia` valida `perfil==="jefe"`, linea 8795) y **panel tecnico con rebuild de cadena de saldo** (SecDashboard tab "tecnico", solo `perfil==="jefe"`, linea 4782). La nav "Superv." renderiza SecDashboard para supervisor y **SecJefeHub** para jefe (App lineas 9401-9402); SecJefeHub envuelve dos tabs: "Dashboard" (=SecDashboard, que incluye el tab tecnico jefe-only) y "Oficina" (=SecAdmin, linea 8537). El cierre de dia y el cambio de Saldo Base Oficial los puede hacer supervisor O jefe (handlers `handleCerrarDia` linea 8769 y `SaldoInicialPanel.handleSave` linea 8163 validan AMBOS perfiles). El tab "Oficina" dentro de JefeHub NO es un perfil propio "oficina"; es SecAdmin, vista de control/lectura. **T6:** los roles se aplican SOLO en el cliente. **NOTA TH4 (verificada):** cuando se navega a un dia cerrado, el Shell monta un overlay a pantalla completa (zIndex 80, inset 0, linea 9362) que bloquea fisicamente el contenido, Y `save()` rechaza toda escritura a una fecha en `_closedDates` (linea 291) mostrando el banner "Dia cerrado — no se guardaron cambios" (linea 8988). El guardado en un dia cerrado NO pasa silencioso: falla y avisa. TH4 sigue vivo a nivel de codigo (SecCIP nunca recibe la prop `readOnly` desde el Shell, linea 9395), pero el camino practico "rozar un input y reescribir un dia cerrado sin aviso" esta tapado por el overlay y el guard de `save()`.

#### [JF-SHELL-01] Reabrir el dia de hoy, corregir un ingreso y volver a operar sin re-cerrar (trampa T7)
- **Pantalla / Prioridad / Riesgos:** Shell (reapertura de dia) + Ingresos / P0 / T7, H7
- **Objetivo:** Descubrir si el jefe, tras reabrir el dia de HOY y editar un registro, entiende que el saldo de manana puede quedar congelado del cierre anterior (no refleja el cambio) y si reacciona volviendo a cerrar el dia. Esta es la trampa mas peligrosa del rol y casi nunca se documenta como obligatoria en la cabeza del jefe.
- **Tarea:** El dia de hoy ya quedo cerrado en el turno anterior. Recibis un llamado: el ingreso del camion del Tambo 12 se cargo con 8.000 L pero en realidad fueron 18.000 L. Reabri el dia, corregi ese ingreso a 18.000 L y deja la planta lista para seguir trabajando.
- **Que deberia pasar (hoy):** HOY la app deja reabrir: hay un candado en el header (linea 9293) que para el jefe dispara `handleReabrirDia`; valida `perfil==='jefe'` (linea 8795), pide confirmacion ("¿Reabrir el dia...? Los operarios podran volver a editar registros"), guarda `:estado closed=false` y registra `reopen_day` en auditoria (linea 8806). Al reabrir, el overlay desaparece y el ingreso se vuelve editable; el cambio SE guarda en `:ingresos`. PERO el handler de reapertura en si NO recalcula `SALDO_KEY` (T7): solo si la fecha reabierta es ANTERIOR a ayer encola un rebuild (lineas 8811-8812); reabrir HOY no encola nada. La edicion posterior del ingreso de hoy SI dispara invalidacion/rebuild via `save()` solo cuando la fecha es <= ayer (linea 318); editar HOY no la dispara. Resultado real: tras reabrir-hoy-y-editar, el `SALDO_KEY` snapshot del cierre anterior puede NO reflejar los 10.000 L corregidos hasta un NUEVO cierre. La app NO avisa de esto. La unica mitigacion es operativa (volver a cerrar el dia) y la app NO se lo recuerda.
- **Que observar:**
  - Si encuentra el candado de reapertura en el header sin ayuda y cuanto tarda.
  - Si lee el texto de confirmacion de reapertura o confirma de reflejo.
  - Si despues de editar busca activamente volver a cerrar el dia, o asume que con guardar el ingreso alcanza.
  - Si nota el banner tenue de modo historico/estado al moverse de fecha (H7).
  - Si verifica de alguna forma que el saldo se actualizo (mira Stock, Dashboard, o no verifica nada).
  - Tiempo total y numero de pantallas que recorre.
- **Senales de confusion:**
  - Edita el ingreso, guarda y se va sin re-cerrar el dia.
  - Pregunta "esto ya quedo, no?" o "¿hace falta cerrar de nuevo?".
  - Vuelve al header a buscar el candado varias veces.
  - Se queda mirando el header sin encontrar como reabrir.
  - Confunde el boton "Hoy" del selector de fecha con la reapertura.
- **Errores criticos posibles:**
  - Reabrir+editar hoy sin re-cerrar: `SALDO_KEY` conserva el snapshot viejo; el saldo base de manana puede NO reflejar los 10.000 L corregidos hasta un nuevo cierre. Drift silencioso de saldo arrastrado a los dias siguientes (T7).
  - Si por error edita un dia DISTINTO que sigue cerrado (no el que reabrio), el cambio NO se guarda: `save()` lo rechaza y aparece el banner "Dia cerrado — no se guardaron cambios"; el jefe puede creer que corrigio cuando no quedo nada (no es perdida silenciosa, pero si confusion).
  - Si edita creyendo estar en hoy pero la fecha rodo por el cruce UTC de las 21:00 (T2), corrige el ingreso en el dia equivocado.
- **Preguntas post-tarea:**
  - Despues de corregir el ingreso, ¿que hiciste para asegurarte de que el saldo de manana quede bien?
  - ¿Entendiste que el dia quedaba abierto o cerrado al terminar? ¿Como te diste cuenta?
  - Si manana el stock arranca con 10.000 L de menos, ¿donde lo mirarias para entender por que?
  - ¿La app te dijo en algun momento que tenias que volver a cerrar el dia?
- **Metricas:**
  - Tiempo total. **Si volvio a cerrar el dia (si/no) — metrica clave de exito.** Taps hasta encontrar la reapertura. Dudas verbalizadas. Si pidio ayuda. Veces que reviso el header buscando el control.

#### [JF-SALDO-01] Cambiar el Saldo Base Oficial en medio de la operacion (recalcula toda la cadena, no queda auditado)
- **Pantalla / Prioridad / Riesgos:** Saldo Base Oficial (`SaldoInicialPanel`, dentro de Dashboard/JefeHub) / P0 / T6, H4, H3
- **Objetivo:** Descubrir si el jefe entiende que tocar el Saldo Base Oficial recalcula TODA la cadena historica hasta hoy (irreversible), si lee la advertencia, si nota que lo esta haciendo en horario de operacion (cuando deberia hacerse en dia tranquilo con conteo fisico), y si percibe que ese cambio NO queda registrado en auditoria. Probar la friccion de un cambio de alto impacto presentado como un panel mas.
- **Tarea:** Hicieron un conteo fisico del silo 80 y dio 60.000 L, pero en el sistema el saldo base figura distinto. Entra al panel de Saldo Base Oficial y deja el silo 80 en 60.000 L.
- **Que deberia pasar (hoy):** El panel muestra el badge "SALDO BASE OFICIAL" (linea 8286) y el boton "Modificar" (`canEdit` = supervisor O jefe, linea 8142; NO es jefe-exclusivo). Al entrar a edicion aparece un texto e icono naranja (#f97316) sobre fondo rojo tenue: "Modificar este saldo recalculara toda la cadena historica desde el [fecha] hasta hoy. Esta operacion no se puede deshacer." (linea 8385). Al guardar, `askConfirm` con `danger:true` pide confirmacion (linea 8171). Tras confirmar, `saveBaseSaldo` persiste `SALDO_BASE_KEY`, se limpia `_autoLitrosCache`, y si `baseDate < ayer` corre `buildChainedSaldo` hasta ayer y reescribe `SALDO_KEY` (estado "chaining", lineas 8190-8194). El cambio se aplica de verdad a toda la cadena. La app NO bloquea ni advierte que se este haciendo en horario operativo ni exige backup previo. Por riesgo H3 (`askConfirm` usa `danger:true` aqui) el confirm sigue el patron de foco por defecto en el boton de accion, asi que un doble toque confirma sin leer. NO queda entrada de auditoria especifica del cambio de saldo base: `handleSave` NO llama `logAudit`; despues no se puede reconstruir quien lo cambio ni a que valor estaba.
- **Que observar:**
  - Si lee el banner naranja completo o salta directo a editar el campo.
  - Si duda al ver que tiene que tocar el campo de cada silo (grid 2 columnas, targets chicos, H4).
  - Si confirma el `askConfirm` leyendo o de reflejo.
  - Si espera a ver el estado "Recalc.../chaining" o cree que ya termino antes.
  - Si en algun momento menciona descargar backup antes de tocar (no lo sugiere la app).
  - Cuanto tarda en encontrar el panel desde el inicio.
- **Senales de confusion:**
  - Edita el silo equivocado por target chico y nombres parecidos (100 N / 100 V / 80).
  - Pregunta "esto cambia solo el saldo de hoy o todo?".
  - Toca Modificar y Cancelar varias veces sin decidirse.
  - Se queda leyendo la advertencia mas de unos segundos sin avanzar.
  - Busca un boton de deshacer despues de guardar.
- **Errores criticos posibles:**
  - Cargar un valor mal tipeado (un cero de mas) en el saldo base: recalcula TODA la cadena con el valor erroneo, irreversible, afecta el stock e ingresos calculados de todos los dias hasta hoy.
  - Tocar el silo equivocado por target chico (H4): el saldo de otro silo queda corrompido para toda la cadena.
  - El cambio de saldo base NO queda auditado: despues no se puede reconstruir quien lo cambio ni a que valor estaba antes; hueco de atribucion.
  - Hacerlo sin backup previo: como T3 puede dejar el backup truncado, no hay red de recuperacion confiable si el recalculo sale mal.
- **Preguntas post-tarea:**
  - ¿Que entendiste que cambiaba al tocar este saldo? ¿Solo hoy o tambien dias pasados?
  - ¿Se puede deshacer lo que hiciste? ¿Como?
  - ¿Es buen momento del dia para hacer esto? ¿Por que si o por que no?
  - Si manana te preguntan quien cambio el saldo base y a que valor estaba antes, ¿la app lo puede responder?
- **Metricas:**
  - Tiempo total. Si leyo la advertencia (si/no, por observacion). Taps en campos de silo equivocados. Si descargo backup antes (si/no). Dudas verbalizadas. Errores de carga (valor o silo equivocado).

#### [JF-PROD-01] Eliminar un lote de Produccion ya finalizado (restitucion irreversible de litros al silo)
- **Pantalla / Prioridad / Riesgos:** Produccion (SecProduccion, eliminar lote finalizado) / P0 / H3, T7, TH3
- **Objetivo:** Descubrir si el jefe distingue entre borrar un lote ENVASANDO (libera reservados) y un lote FINALIZADO (RESTITUYE litros usados al silo origen, irreversible), si lee la confirmacion diferenciada, y si el foco por defecto en el boton de accion (H3) lo lleva a confirmar de reflejo un borrado que mueve stock real.
- **Tarea:** Te avisan que el lote de Postre que se cerro hoy estaba mal cargado y hay que eliminarlo del sistema. Entra a Produccion, abri ese lote y borralo.
- **Que deberia pasar (hoy):** El lote finalizado abre el modal con boton "Eliminar lote" (visible solo para jefe/supervisor; el handler valida perfil, linea 3490). Al tocar, `askConfirm` con `danger:true` muestra titulo "Eliminar lote FINALIZADO" y mensaje: "...Estaba finalizado: al borrarlo se RESTITUYEN los litros usados al silo de origen. Esto es irreversible." (lineas 3496-3499). Tras confirmar, persist quita el lote, se borra `_autoLitrosCache` del dia, `syncAutoMovSobrante` limpia movimientos automaticos huerfanos, y `logAudit` registra `eliminar_produccion_finalizada` (linea 3511; Produccion es la unica seccion que audita altas/ediciones/borrados). El stock del silo origen sube por la restitucion. Riesgo H3 (`danger:true`): el modal sigue el patron de foco por defecto en el boton de accion, asi que un doble toque o Enter reflejo confirma sin leer. Si el lote es de un dia cerrado, el overlay bloquea abrir el modal en esa fecha (linea 3544: el card no abre si `dayClosed`); el jefe tendria que reabrir el dia primero, y entonces aplica la relacion con T7 (el borrado puede no reflejarse en `SALDO_KEY` hasta re-cierre).
- **Que observar:**
  - Si lee la palabra RESTITUYEN/irreversible o confirma de inmediato.
  - Donde cae el foco al abrir el modal y si el jefe toca dos veces seguidas.
  - Si despues va a verificar el stock del silo origen para confirmar la restitucion.
  - Si distingue que finalizado es distinto de envasando (mira el badge de estado).
  - Tiempo entre abrir el modal y confirmar (muy corto = no leyo).
- **Senales de confusion:**
  - Confirma en menos de 2 segundos sin leer (doble tap reflejo).
  - Pregunta "esto devuelve la leche al silo o no?".
  - Borra el lote envasando equivocado en vez del finalizado.
  - Se queda mirando el badge de estado sin saber cual es cual.
  - Busca un "deshacer" tras confirmar.
- **Errores criticos posibles:**
  - Borrar un lote finalizado por error (doble tap, H3): se restituyen litros usados al silo origen de forma irreversible, inflando el stock con leche que ya se envaso y salio. Descuadre silencioso.
  - Borrar el lote equivocado de la lista por target chico o nombre parecido.
  - Si tuvo que reabrir un dia cerrado para borrar el lote y no lo re-cierra, el saldo de manana no refleja la restitucion (T7).
- **Preguntas post-tarea:**
  - ¿Que le paso a la leche de ese lote en el stock al borrarlo?
  - ¿Habia diferencia entre borrar este lote y borrar uno que todavia se esta envasando? ¿Cual?
  - ¿Como supiste que se borro bien?
  - Si te equivocaste de lote, ¿como lo recuperarias?
- **Metricas:**
  - Tiempo entre abrir modal y confirmar (proxy de si leyo). Si verifico el stock del silo despues (si/no). Taps innecesarios / dobles taps. Si borro el lote correcto (si/no). Dudas verbalizadas.

#### [JF-SHELL-02] Cierre del dia con cola pendiente y descarga de backup (verificacion de integridad)
- **Pantalla / Prioridad / Riesgos:** Shell (cierre de dia, indicador de conexion, descarga de backup) / P0 / T3, T1, T5
- **Objetivo:** Descubrir si el jefe espera a "Sincronizado" antes de cerrar (la app lo frena, pero ¿lo entiende?), si descarga el backup que la app sugiere, y sobre todo si verifica `total_registros` del backup (T3: `db.list` corta en ~1000 sin aviso y marca el backup como hecho igual). Probar si el jefe confia ciegamente en la fecha de "ultimo backup".
- **Tarea:** Es fin de turno y tenes que cerrar el dia y dejar un respaldo de la jornada guardado. Hacelo como lo harias normalmente al final del dia.
- **Que deberia pasar (hoy):** Si hay escrituras en la cola offline (`queueLen>0`), `handleCerrarDia` NO cierra: muestra un aviso "Cambios pendientes de sincronizar... Espera a que se sincronicen... Cuando el icono de conexion muestre Sincronizado, intenta de nuevo" (lineas 8752-8759) y RETORNA sin cerrar (no es un confirm que se pueda forzar: es informativo, boton "Entendido"). Una vez la cola en cero, pide confirmacion con `danger:true` ("¿Cerrar el dia? No se podran agregar ni modificar registros. Solo el jefe puede reabrir.", linea 8763), valida perfil supervisor/jefe (linea 8769), guarda `:estado closed`, snapshotea el saldo (`calcAutoLitros`) y lo audita (`close_day` con saldo total, linea 8778), reescribe `SALDO_KEY` si cierra hoy/ayer, y sugiere descargar backup (aparece el boton "Descargar backup del dia" en el overlay, linea 9387). El backup llama `generateBackup`, que vuelca las claves `yatasto:*` a un JSON con `total_registros`. **PROBLEMA REAL (T3):** `db.list` NO pagina y corta en ~1000 filas; el backup omite claves sin error, y marca `yatasto:ultimo-backup-date` IGUAL aunque este truncado o el usuario cancele la descarga. La app NO avisa de truncamiento. El jefe deberia abrir el archivo y comparar `total_registros` con la cantidad real de claves, cosa que la app no le pide.
- **Que observar:**
  - Si nota el indicador de conexion y espera a "Sincronizado" o intenta cerrar igual.
  - Si entiende el mensaje de bloqueo por cola pendiente y que NO hay forma de forzar el cierre desde la UI.
  - Si descarga el backup cuando la app lo sugiere o lo ignora.
  - Si abre el archivo de backup para verificar algo (`total_registros`) o asume que esta completo.
  - Donde guarda el backup (queda en la tablet o lo saca del dispositivo).
- **Senales de confusion:**
  - Intenta cerrar repetidamente con cola pendiente sin entender por que no cierra.
  - Pregunta "por que no me deja cerrar?".
  - Toca "Descargar backup" y sigue sin verificar nada.
  - Da por hecho que la fecha de ultimo backup garantiza que esta completo.
  - No saca el backup del dispositivo (lo deja en la tablet de planta).
- **Errores criticos posibles:**
  - Cerrar y confiar en un backup truncado (T3): faltan dias enteros sin aviso; si hay que restaurar, se pierden datos reales y nadie lo nota porque la app marco el backup como hecho.
  - Si por consola del navegador se saltara la UI para cerrar antes de sincronizar (T6), el snapshot de saldo quedaria incompleto; desde la UI normal esto no es posible.
  - Backup que solo queda en la tablet: si la tablet se pierde, no hay respaldo externo.
- **Preguntas post-tarea:**
  - ¿Como supiste que el respaldo quedo completo?
  - ¿Por que la app no te dejaba cerrar al principio? ¿Que hiciste?
  - ¿Donde quedo guardado el backup? ¿Te alcanza con eso?
  - Si manana necesitaras restaurar de ese archivo, ¿confiarias en que esta todo?
- **Metricas:**
  - Tiempo total. Si espero a "Sincronizado" (si/no). Si descargo el backup (si/no). **Si verifico `total_registros` (si/no) — metrica clave.** Si saco el backup del dispositivo (si/no). Intentos de cierre fallidos por cola.

#### [JF-DASH-01] Revisar inconsistencias en el panel tecnico y forzar un recalculo de la cadena de saldo (jefe-only)
- **Pantalla / Prioridad / Riesgos:** Dashboard / Panel tecnico (SecDashboard tab "tecnico") / P1 / T6, T1, T5
- **Objetivo:** Descubrir si el jefe entiende que muestra el panel tecnico (consistency checks, cola, cache, log de rebuilds), si sabe cuando y por que tocar "recalcular cadena", y si percibe el peso/riesgo de la accion. Probar si el panel comunica que es una herramienta de diagnostico, no de uso casual.
- **Tarea:** Un operario te dice que el stock del silo 60 aparece en negativo y no entiende por que. Entra al panel tecnico de jefe y revisa si hay algo raro; si hace falta, recalcula.
- **Que deberia pasar (hoy):** El tab "tecnico" solo se renderiza para perfil "jefe" (lineas 4782/4790). Corre `runConsistencyChecks(date)` y muestra avisos con severidad error/warning (stock negativo con texto "Posible doble descuento o saldo inicial mal cargado" linea 914, reservados > total, lote finalizado con usados > enviados, lote finalizado sin litros usados, envasando sin origenes; segun el codigo hay mas checks debajo). Muestra tamano de cache (`_autoLitrosCache.size`), estado de la cola (`techQueueLen`) y el log de rebuilds (`getRebuildLog`). El boton de recalcular llama `rebuildSaldoChain(date, 'panel_tecnico')` (linea 4803), refresca el log y vuelve a correr los checks. La app NO explica al jefe que el recalculo depende de que `SALDO_BASE_KEY` exista (si no, no reconstruye). NO advierte que correrlo con cola pendiente puede dar un resultado parcial (T1/T5 vivos). El stock negativo puede venir de un doble descuento (TH3), saldo base mal cargado o fecha equivocada por T2.
- **Que observar:**
  - Si encuentra el tab "tecnico" (jefe-only) sin ayuda.
  - Si lee los avisos de consistencia o va directo a recalcular.
  - Si entiende que dice cada metrica (cache, cola, log de rebuilds).
  - Si revisa la causa (movimientos, saldo base) antes de recalcular o recalcula a ciegas.
  - Si espera a que la cola este en cero antes de recalcular.
- **Senales de confusion:**
  - Recalcula primero y lee los avisos despues (o nunca).
  - Pregunta "que es la cadena?" o "que pasa si toco esto?".
  - Se queda mirando el log de rebuilds sin saber que es.
  - No distingue un warning de un error en la lista de checks.
  - Toca recalcular varias veces seguidas esperando que cambie algo.
- **Errores criticos posibles:**
  - Recalcular sin `SALDO_BASE_KEY` valido: `rebuildSaldoChain` no reconstruye y el jefe cree que arreglo el negativo cuando no toco nada.
  - Recalcular con cola pendiente (T1/T5): la reconstruccion puede partir de datos a medio sincronizar y dar un saldo parcial.
  - Atacar el sintoma (recalcular) sin corregir la causa (doble descuento TH3, saldo base mal): el negativo vuelve al dia siguiente.
- **Preguntas post-tarea:**
  - ¿Que te dijo el panel sobre el silo 60? ¿Que era warning y que era error?
  - ¿Que entendiste que hace el boton de recalcular?
  - ¿Recalcular arregla la causa del negativo o solo recalcula? ¿Como sigue tu investigacion?
  - ¿Que es la cola/cache que muestra arriba? ¿Te importo para decidir?
- **Metricas:**
  - Tiempo total. Si reviso los checks antes de recalcular (si/no). Recalculos disparados. Dudas verbalizadas. Si pidio ayuda para interpretar el panel.

#### [JF-SHELL-03] Cargar al inicio del turno noche a las 21:10 (cruce de fecha UTC, modo historico) y selector de fecha sin tope
- **Pantalla / Prioridad / Riesgos:** Shell (selector de fecha, modo historico, identificacion de turno) / P0 / T2, H7, TH7, H6
- **Objetivo:** Descubrir si el jefe percibe que a las 21:00+ la fecha ya roto a "manana" por UTC (T2) y que esta operando en modo historico (H7), y si el selector de fecha le permite irse al futuro sin tope (TH7). El jefe abre la app a cualquier hora; esta es la trampa del turno noche aplicada a quien tiene mas poder de mover fechas.
- **Tarea:** Son las 21:10. Abri la app para revisar la jornada en curso y verifica en el selector de fecha que estas parado en el dia de hoy antes de tocar nada. Despues entra a un dia para comparar y volve a hoy.
- **Que deberia pasar (hoy):** `getToday()` usa `toISOString` (UTC), asi que a las 21:00 hora Argentina (UTC-3) la fecha ya rota al dia siguiente (T2). La app puede mostrar el banner de modo historico aunque sea el turno en curso; ese banner ("Viendo registros del [fecha]", linea 9350) tiene fondo tenue (accent al 14%) y es poco evidente (H7). El selector de fecha del Shell (`input type=date`, linea 9334) NO tiene atributo `max`: el jefe puede elegir una fecha FUTURA sin tope (TH7) — a diferencia del selector de Saldo Base (linea 8309) y del visor de saldo (linea 8472), que SI tienen `max=getToday()`. El boton "Hoy" del picker devuelve a `getToday()` (que ya es "manana real" por T2, linea 9336). Si carga en una fecha futura, esos litros NO entran en la cadena de saldo y "desaparecen" hasta una auditoria. Identidad de turno: si el turno noche no tiene responsable, aparece el modal de identificacion con boton para postergarlo (H6).
- **Que observar:**
  - Si nota que la fecha mostrada no coincide con el dia real a las 21:10.
  - Si ve/lee el banner de modo historico o pasa de largo.
  - Si al abrir el selector intenta (o logra) irse a una fecha futura.
  - Que hace el boton "Hoy" para el (a donde cree que lo lleva).
  - Si carga el responsable de turno o posterga el modal.
- **Senales de confusion:**
  - Dice "pero hoy es [fecha de hoy], por que dice [manana]?".
  - No registra que esta en modo historico (no menciona el banner).
  - Navega a un dia futuro sin darse cuenta.
  - Posterga el modal de identificacion sin cargar nombre.
  - Toca "Hoy" esperando volver al dia real y no entiende la fecha que ve.
- **Errores criticos posibles:**
  - Cargar el ingreso/movimiento del turno noche bajo la fecha del dia siguiente (T2): litros atribuidos al dia equivocado y al responsable del turno anterior; saldo encadenado mal atribuido.
  - Registrar en una fecha futura por toque impreciso en el selector del Shell (TH7): los litros no entran en la cadena de saldo; cerrar un dia futuro contamina `SALDO_KEY`.
  - Operacion atribuida a quien no la hizo si no se recarga el responsable de turno (H6).
- **Preguntas post-tarea:**
  - ¿Que dia te mostro la app cuando la abriste? ¿Coincidia con el dia de hoy real?
  - ¿Como sabes si estas mirando hoy o un dia pasado?
  - ¿Pudiste irte a una fecha que todavia no paso? ¿Te parecio normal que te dejara?
  - ¿De quien quedo registrado lo que se carga en este turno?
- **Metricas:**
  - Si detecto el desfase de fecha de las 21:00 (si/no). Si noto el modo historico (si/no). Si logro navegar a una fecha futura (si/no). Si cargo el responsable de turno (si/no). Dudas verbalizadas sobre la fecha.

#### [JF-MOV-01] Trasvase silo a silo bajo presion: inversion de Desde/Hasta y confirm de saldo con cifra enganosa
- **Pantalla / Prioridad / Riesgos:** Movimientos (SecMovimientos) / P1 / TH2, TH9, TH1, H3
- **Objetivo:** Descubrir si el jefe, que hace lo mismo que un supervisor en el piso, invierte los desplegables identicos Desde/Hasta (TH2), si valida mentalmente el descuento con la cifra del confirm que NO incluye la perdida (TH9), y si acepta saldo insuficiente con el foco en el boton de accion (H3). Probar que ni el rol mas alto tiene barrera contra estos defaults.
- **Tarea:** Pasa 15.000 L del silo 80 al silo 60. Carga una perdida de 500 L en el trasvase.
- **Que deberia pasar (hoy):** Los desplegables "Desde" (`item.desde`) y "Hasta" (`item.hasta`) usan la misma lista de silos, sin asimetria visual (TH2); no se valida origen != destino. Si el jefe invierte, el sistema descuenta del silo que debia recibir, sin aviso. Litros y perdida aceptan 0/negativos y el chequeo de saldo se evade con litros <= 0 (TH1). El impacto real al origen es litros + perdida (`impactoOrigen`, linea 2649), pero si NO alcanza el saldo el confirm dice "Se mueven: X litros" usando solo `item.litros` (linea 2654): la cifra mostrada (15.000) NO es el descuento real (15.500). El modal de saldo insuficiente usa `danger:true` (foco por defecto en el boton de accion, H3). Nota: la tarjeta del movimiento ya guardado SI muestra un desglose "Movido / Perdida / Total salida" (lineas 2723-2740), pero ese desglose aparece DESPUES de guardar, no en el confirm de saldo insuficiente. El movimiento NO queda auditado.
- **Que observar:**
  - Si distingue cual desplegable es origen y cual destino sin dudar.
  - Si verifica el sentido del trasvase antes de guardar (la lista muestra "desde → hasta" en la tarjeta).
  - Si lee la cifra del confirm de saldo y con cual numero valida mentalmente.
  - Donde cae el foco en el confirm y si confirma de reflejo.
  - Cuanto tarda en completar el formulario.
- **Senales de confusion:**
  - Toca el desplegable y vuelve a abrirlo para chequear que eligio bien.
  - Pregunta "este es de donde sale o donde entra?".
  - Carga, deshace y vuelve a cargar el sentido.
  - Confirma el saldo insuficiente sin recalcular con la perdida.
  - Doble tap reflejo en el confirm.
- **Errores criticos posibles:**
  - Invertir Desde/Hasta (TH2): descuenta del silo 60 que debia recibir; dos silos descuadrados que nadie nota hasta el conteo fisico.
  - Aceptar saldo insuficiente validando con 15.000 cuando se descuentan 15.500 (TH9): el silo origen queda mas negativo de lo entendido.
  - Cargar 0 o negativo en litros/perdida (TH1): movimiento fantasma o de signo invertido que corrompe stock y saldo sin senal.
- **Preguntas post-tarea:**
  - ¿De que silo a que silo se movio la leche? ¿Como te aseguraste del sentido?
  - ¿Cuantos litros se le restaron al silo 80 en total? (esperado: 15.500, no 15.000)
  - ¿Como supiste que el movimiento quedo guardado?
  - Si te hubieras equivocado de sentido, ¿la app te habria avisado?
- **Metricas:**
  - Tiempo. Si cargo el sentido correcto Desde/Hasta (si/no). Veces que reabrio los desplegables. Si valido el descuento real con la perdida incluida (si/no). Dudas verbalizadas.

#### [JF-CIP-01] Revisar y cerrar una limpieza CIP: punto verde falso-positivo y sync que pisa lo que se escribe
- **Pantalla / Prioridad / Riesgos:** CIP (SecCIP) / P0 / H1, TH5, TH4
- **Objetivo:** Descubrir si el jefe, al revisar las CIP del turno como control de inocuidad, confia en el punto verde sin verificar parametros (H1), y si lo que escribe se le pisa por el sync de 10s (TH5). Tambien comprobar que sobre un dia YA cerrado el overlay y el guard de `save()` impiden editar: TH4 sigue vivo a nivel de codigo porque SecCIP nunca recibe la senal de dia cerrado, pero el roce queda tapado por el overlay del Shell.
- **Tarea:** Antes de cerrar el dia (con el dia AUN abierto), entra a CIP y verifica que las limpiezas de los silos quedaron bien registradas. Si ves alguna incompleta, completa lo que falte; si esta todo, dejala como esta.
- **Que deberia pasar (hoy):** La fila colapsada de CIP muestra punto verde apenas hay hora O responsable (`hasData = data?.hora || data?.resp`, linea 2099), aunque alcalino, enjuague, acido y temperatura esten vacios (H1): un registro puede parecer verificado estando incompleto. CIP guarda por tecla (`updateSilo`/`updateCamion` llaman `save` en cada cambio) y el sync de 10s (`syncKey`) recarga; mientras se escribe puede pisar lo recien tipeado, y si un `save` falla se revierte el caracter sin aviso (TH5): el jefe cree que cargo temperatura/concentracion y quedo vacio (CIP no tiene el dirty-guard con `useRef` que si tiene Stock). Sobre TH4: SecCIP acepta una prop `readOnly` que gatea sus updates (lineas 2178/2183/2188), PERO el Shell la renderiza SIN pasar `readOnly` (linea 9395), asi que su `readOnly` queda siempre false. AUN ASI, si el dia esta cerrado el Shell monta un overlay a pantalla completa (linea 9362) que tapa el contenido, y `save()` rechaza toda escritura a una fecha cerrada (`_closedDates`, linea 291) mostrando el banner "Dia cerrado — no se guardaron cambios" (linea 8988). Por eso, sobre un dia cerrado, el jefe NO logra reescribir CIP por roce y SI recibe aviso. Alta de camion sin deteccion de duplicados puede partir la CIP de un camion en dos filas (H11).
- **Que observar:**
  - Si confia en el punto verde o abre las filas a verificar parametros uno por uno.
  - Si nota cuando una fila verde esta en realidad incompleta.
  - Si lo que escribe "se borra solo" por el sync de 10s y como reacciona (TH5).
  - Si al intentar revisar un dia cerrado el overlay y el banner "Dia cerrado" le dejan claro que no puede editar.
  - Cuanto tarda en revisar la grilla completa de silos.
- **Senales de confusion:**
  - Da por buena una fila por el punto verde sin abrirla.
  - Escribe un valor, parpadea y desaparece, lo vuelve a escribir (sync TH5).
  - Pregunta "cargue esto recien, por que no esta?".
  - Intenta tocar inputs de un dia cerrado y no entiende por que el overlay no lo deja.
  - Ve la misma CIP de un camion en dos filas y no sabe cual es la buena (H11).
- **Errores criticos posibles:**
  - Dar por verificada una limpieza incompleta por el punto verde (H1): registro de inocuidad falso-positivo; el jefe avala una CIP que nunca cargo alcalino/acido/temperatura.
  - Creer que cargo un parametro que el sync de 10s revirtio (TH5): queda vacio un dato de inocuidad sin aviso.
  - Sobre un dia cerrado, creer que edito CIP cuando en realidad el `save` fallo: el dato NO se guarda, pero el banner "Dia cerrado" avisa. TH4 queda vivo a nivel de codigo, no como camino abierto en la UI.
- **Preguntas post-tarea:**
  - ¿Como supiste que una limpieza estaba completa? ¿Que mirabas?
  - Si un punto esta verde pero no tiene temperatura cargada, ¿esa limpieza esta verificada?
  - ¿Algun dato que cargaste desaparecio o se borro solo? ¿Que hiciste?
  - Cuando entraste a un dia ya cerrado, ¿pudiste o no editar? ¿La app te lo dejo claro?
- **Metricas:**
  - Tiempo de revision de la grilla CIP. Si abrio filas a verificar parametros o confio en el verde (proporcion). Veces que un dato escrito desaparecio (TH5). Si entendio que en dia cerrado no se puede editar (si/no). Dudas verbalizadas.

#### [JF-OFI-01] Usar el tab Oficina (SecAdmin) para controlar entradas/salidas y exportar un periodo
- **Pantalla / Prioridad / Riesgos:** JefeHub / Oficina (SecJefeHub tab "oficina" = SecAdmin) + export de Dashboard / P2 / T6, H7
- **Objetivo:** Descubrir si el jefe entiende el alcance del tab "Oficina" (control de entradas/salidas, KPIs, rango de fechas) y si lo usa solo como lectura/control, sin confundirlo con un perfil aparte. Probar la claridad del rango de fechas y los KPIs (litros in/out, balance) y el export por periodo. Marcar el caveat de que "Oficina" NO es un perfil propio.
- **Tarea:** Te piden el total de litros que entraron y salieron de la planta en la ultima semana, separando entradas de salidas. Saca ese dato y exportalo para mandarlo a administracion.
- **Que deberia pasar (hoy):** SecJefeHub muestra dos tabs: "Dashboard" (SecDashboard) y "Oficina" (SecAdmin) (linea 8527). SecAdmin tiene un range picker (presets `RANGE_PRESETS` + custom con dos `input date` sin `max`, lineas 7689/7693), carga ingresos y carga del rango (`loadRangeData`) y muestra KPIs: litros in (suma de `litrosFca` de ingresos, linea 7606), litros out (suma de `litros` de carga, linea 7607), balance, tambos y transportistas unicos. Hay tabs adicionales con placeholders "próximamente / En construcción" (`Placeholder` + `ADMIN_TABS`, lineas 7646-7656). El export por periodo vive en el Dashboard (inputs Desde/Hasta, lineas 6785/6789), NO en Oficina. **CAVEAT:** "Oficina" NO es un perfil real; es una vista de control que se renderiza para el perfil jefe. Los inputs date del rango custom NO tienen tope de fecha. Riesgo T6 vigente: aunque sea solo lectura en UI, la autorizacion es client-side.
- **Que observar:**
  - Si encuentra el tab Oficina y entiende que es una vista de control, no otra app/usuario.
  - Si usa los presets de rango o arma el custom con las fechas correctas de la semana.
  - Si interpreta bien litros in vs out y el balance.
  - Si choca con tabs en "construccion" y como reacciona.
  - Si encuentra el export (esta en Dashboard, no en Oficina) y cuanto tarda.
- **Senales de confusion:**
  - Busca el export dentro de Oficina y no lo encuentra (esta en Dashboard).
  - Pregunta "esto es otro usuario? entro como oficina?".
  - Arma mal el rango de fechas de la semana.
  - Toca un tab "próximamente" y cree que la app fallo.
  - Confunde litros in con out al leer los KPIs.
- **Errores criticos posibles:**
  - Reportar a administracion el balance equivocado por armar mal el rango (sin tope de fecha en los inputs custom).
  - Confundir litros in con out y mandar el dato invertido.
  - Asumir que "Oficina" es un control de acceso real cuando T6 (client-side) lo deja sin barrera de servidor.
- **Preguntas post-tarea:**
  - ¿Que te mostraba la pestana Oficina? ¿Era otro usuario o la misma sesion tuya?
  - ¿Cual numero es lo que entro y cual lo que salio? ¿Como los distinguiste?
  - ¿Donde encontraste la opcion de exportar? ¿Te resulto donde la buscabas?
  - Los datos que viste, ¿se podian editar desde ahi o eran solo para mirar?
- **Metricas:**
  - Tiempo total. Si armo el rango correcto (si/no). Si interpreto in/out correctamente (si/no). Taps hasta encontrar el export. Dudas verbalizadas sobre que es "Oficina".

#### [JF-ING-01] Forzar un ingreso con aguado detectado: override que no queda auditado (responsabilidad legal)
- **Pantalla / Prioridad / Riesgos:** Ingresos (SecIngresos) / P0 / TH10, H5, TH1, H2
- **Objetivo:** Descubrir si el jefe, al autorizar un ingreso con indicio de aguado, asume que su decision queda registrada (el modal lo promete: "El registro quedara en el historial") cuando en realidad el guardado forzado por aguado NO llama a auditoria (TH10, a diferencia del forzado de CIP que SI audita). Es un hueco de atribucion legal critico para quien autoriza. Probar tambien la reinterpretacion silenciosa de densidad/pH (H5) y el campo Litros sepultado (H2).
- **Tarea:** Llega el camion del Tambo 7 con 12.000 L. Al cargar los datos de calidad, la app marca indicio de aguado, pero vos verificaste con el tambero y decidis aceptar el ingreso igual. Cargalo y dejalo autorizado.
- **Que deberia pasar (hoy):** El campo Litros queda entre los 20+ campos de calidad (H2): el jefe scrollea para encontrarlo. Al salir del campo, densidad 28 se reinterpreta como 1.028 y pH 68 como 6,8 sin confirmar el valor final (H5, `SmartDecInp`); el jefe poco atento no nota la reinterpretacion. Litros acepta 0/negativos/texto, la validacion solo chequea no-vacio (TH1). Si los datos disparan aguado, aparece el modal "⚠ Aguado detectado" que dice "El registro quedara en el historial" (linea 1897) e insinua que la autorizacion queda registrada; pero al tocar "Guardar de todas formas" (linea 1901) se llama `onSave(f)` directo con telemetria `track('save_ok','forzado_aguado')` — NO se llama a `logAudit` (el unico forzado que audita es el de CIP, lineas 1937-1939, que setea `_forzadoCIP`; el de aguado no). Resultado (TH10): un ingreso con posible adulteracion se guarda SIN entrada de auditoria de quien lo autorizo. La app NO advierte que el override no queda registrado.
- **Que observar:**
  - Si encuentra el campo Litros rapido o scrollea buscandolo (H2).
  - Si nota que densidad/pH se reinterpretaron al salir del campo (H5).
  - Si lee el modal de aguado y que entiende que pasa al forzar.
  - Si asume que su autorizacion queda registrada (el modal lo insinua con "quedara en el historial").
  - Si despues busca confirmar en algun lado que quedo el registro del override.
- **Senales de confusion:**
  - Scroll de ida y vuelta buscando el campo Litros.
  - No reacciona al ver 1.028 donde tecleo 28 (H5).
  - Pregunta "esto queda registrado que lo autorice yo?".
  - Fuerza el guardado de reflejo sin leer el modal de aguado.
  - Busca en auditoria/historial el override y no lo encuentra.
- **Errores criticos posibles:**
  - Forzar el ingreso con aguado sin que quede auditado (TH10): no hay rastro de quien autorizo un ingreso con indicio de adulteracion; hueco de responsabilidad legal y de inocuidad, agravado porque el modal promete lo contrario.
  - Densidad/pH reinterpretados (H5) y aceptados sin confirmar: parametro de calidad guardado hasta 10x mal sin que el jefe lo note.
  - Litros con un cero de mas o vacio aceptado (TH1/H2): numero erroneo entra al stock y al saldo sin validacion de rango.
- **Preguntas post-tarea:**
  - Cuando autorizaste el ingreso con aguado, ¿quedo registrado en algun lado que fuiste vos? ¿Donde lo verificarias?
  - Los valores de densidad y pH que cargaste, ¿quedaron como los tecleaste? Reviselos.
  - ¿El campo de litros lo encontraste facil? ¿Donde esperabas que estuviera?
  - Si manana te preguntan quien autorizo este ingreso, ¿la app lo puede responder?
- **Metricas:**
  - Tiempo total. Tiempo/scroll hasta encontrar el campo Litros (proxy H2). Si noto la reinterpretacion de densidad/pH (si/no). **Si asumio que el override quedaba auditado (si/no) — metrica clave TH10.** Dudas verbalizadas.

---

## 5. Failure cases para provocar deliberadamente

| Caso | Pantalla | Riesgos | Como provocarlo | Sintoma observable | Consecuencia |
|---|---|---|---|---|---|
| Litros en 0 o negativo entra como movimiento/despacho fantasma o invertido | Ingresos / Movimientos / Carga / Fortificados | TH1 | En Ingresos cargar un camion con Litros = 0; repetir con -500 o un signo menos pegado. En Movimientos cargar 0 litros y una perdida negativa. Tocar Guardar. La validacion solo exige campo no-vacio y el chequeo de saldo retorna OK con litros <= 0. | El registro se guarda sin ningun error ni banner; el operario no ve ninguna senal. El stock no cambia o cambia con signo invertido. | Movimiento o despacho fantasma o de signo invertido; stock y saldo corruptos en silencio, sin rastro hasta una auditoria o conteo fisico. |
| Trasvase invertido o origen igual a destino en Movimientos | Movimientos | TH2, TH9 | Elegir un silo origen y, en el desplegable identico de al lado, elegir el mismo silo en Hasta (origen == destino) y guardar. Repetir invirtiendo: poner en Desde el silo que recibe y en Hasta el que sale. Cargar tambien una perdida y mirar el confirm de saldo. | No aparece ninguna validacion de origen != destino; los dos desplegables se ven iguales. El confirm dice "se mueven X litros" pero el descuento real es X mas la perdida. | Se descuenta del silo que debia recibir; dos silos descuadrados y el origen mas negativo de lo entendido. Nadie lo nota hasta el conteo fisico. |
| BIN como origen en Carga: despacho sin descontar ningun silo | Carga (y Produccion al editar) | TH3 | En Carga (CARGA 1/2/3) abrir el desplegable de origen y elegir BIN. Cargar litros validos y guardar. Despues, editar una carga ya guardada y cambiarle el silo de origen a otro. | No salta "saldo insuficiente", el despacho se guarda como exitoso y el stock de ningun silo baja. Al editar el silo, da OK sin advertir. Carga no muestra el disponible del origen. | Stock sobreestimado permanente: la planta cree que sigue teniendo leche que ya salio. Editar re-suma litros al silo nuevo (falso OK) y deja el viejo sobre-descontado. |
| Unidad equivocada en Fortificados: kg sumado 1 a 1 como litros | Fortificados | TH8, H13 | En una adicion, querer cargar gramos pero dejar el selector en kg (control chico: kg, g, mg, L, mL, cc). Poner una cantidad grande (ej 800) y guardar. Dejar las tres adiciones precargadas y poner 0 en las que no se usan. | No hay confirmacion de la equivalencia masa-volumen; el guardado acepta la unidad. El operario no ve que los 800 "g" se interpretaron como 800 L. Las filas en 0 quedan permanentes. | El silo destino se infla (o desinfla) miles de litros sin aviso. Las adiciones en 0 dejan datos basura que confunden la auditoria. |
| Punto verde de CIP sin parametros de lavado | CIP | H1 | Abrir un silo, escribir solo el apellido en Responsable (o solo la hora), dejar alcalino, enjuague, acido y temperatura vacios, y colapsar/cerrar la fila. | La fila colapsada muestra el punto verde igual que una CIP verificada. El supervisor ve la lista en verde y da la limpieza por hecha; nada indica que falten parametros. | Registro de inocuidad falso-positivo: queda como limpieza verificada una que no se documento (riesgo sanitario y de auditoria). |
| Ingreso a las 21:10 cae en la fecha del dia siguiente (UTC) | Shell / Ingresos (turno noche) | T2, H7 | Con el reloj en hora Argentina entre 21:00 y 23:59 (ej 21:10), abrir la app y cargar el ingreso de un camion sin tocar el selector de fecha. Observar el aviso de modo historico. | El unico aviso de que la fecha "roto" a manana es una linea tenue; el operario apurado no la lee. La app puede mostrar modo historico aunque sea el turno en curso. | Litros, ingresos, cargas y movimientos del turno noche quedan archivados bajo la fecha del dia siguiente y atribuidos al responsable del turno anterior; saldo encadenado mal atribuido. |
| Reabrir el dia de hoy, editar y no volver a cerrar | Shell (reapertura, solo jefe) | T7, TH4 | Con perfil jefe, reabrir el dia de hoy (o ayer). Editar un registro que afecte el saldo (ej un ingreso o una carga). NO volver a cerrar. Mirar el saldo base que arrastra a manana. | La edicion parece guardarse normal; no hay aviso de que el saldo congelado del cierre no se actualizo. Nada indica que falte recerrar. | `SALDO_KEY` del cierre puede no reflejar el cambio hasta un nuevo cierre; el saldo de manana parte de una base desactualizada. Mitigacion solo operativa (recerrar). |
| Backup truncado en silencio a 1000 registros | Admin / backup (jefe) | T3 | Sobre una base con mas de 1000 claves (semanas de uso o datos sembrados), ejecutar la descarga de backup. Contar las claves del archivo descargado. | El backup se descarga, se marca como completo y no aparece ningun error ni alerta; el archivo tiene exactamente 1000 filas aunque hay mas. | El backup omite claves (dias enteros de ingresos, cargas, stock, saldo, auditoria). Si se restaura desde ese archivo faltan datos reales sin que nadie lo note. |
| Escritura por roce en un dia cerrado (CIP y Movimientos) | CIP / Movimientos | TH4 | Cerrar el dia. Volver a entrar a "mirar" ese dia cerrado y rozar un input de CIP o de un formulario de Movimientos, modificando el valor. (Nota: en un dia cerrado el overlay del Shell tapa el contenido y `save()` rechaza la escritura; el caso realmente abierto es un dia PASADO no cerrado — ver OP-CIP-02.) | En un dia cerrado, el overlay "Dia cerrado" intercepta el toque y el guardado falla con banner. En un dia historico no cerrado, el input acepta el cambio sin cartel de solo-lectura. | Sobre un dia historico no cerrado se reescribe un movimiento o un registro de inocuidad de una jornada pasada, sin que el bloqueo lo frene (TH4). |
| Auto-relleno de Stock pisa producto manual y escribe en el turno equivocado | Stock | TH6, H9 | Dejar el selector de turno en Manana por una sesion previa. Bajar hasta las tarjetas de silos y cargar a mano el producto y el pH de lo que en realidad es el turno Noche. Esperar a que el saldo recalcule cero para ver el auto-relleno. Probar un silo con litros por encima de su capacidad. | Las tarjetas no muestran que turno se edita; el selector quedo lejos. A los segundos el auto-relleno reemplaza el producto sin aviso. Un silo sobre capacidad muestra barra llena y 100% sin color de peligro. | Producto o pH cargados en el turno equivocado y la eleccion manual sobreescrita; el rebalse de silo no se detecta visualmente. |
| La cola offline resucita un valor viejo y pisa la ultima carga | Transversal (clave compartida: saldo-silos o stock) | T1, T4 | Poner el dispositivo offline (modo avion) y guardar una escritura sobre una clave compartida para que se encole. Recuperar la red y, antes o despues del flush, reeditar la misma clave con un valor nuevo. Si es posible, editar la misma clave desde un segundo dispositivo. | No aparece error visible; el indicador pasa a Sincronizado. La ultima edicion puede "volver" al valor viejo sin que el operario lo provoque. La guarda de conflicto entre dispositivos no salta. | El flush resucita el valor encolado y borra la ultima carga; en multi-dispositivo pisa a ciegas lo que escribio otro. Perdida silenciosa de datos productivos. |
| Forzar ingreso con aguado detectado no queda auditado | Ingresos | TH10 | Cargar un ingreso con parametros que disparen el indicio de aguado, abrir el modal de aguado y forzar el guardado. Despues revisar el historial/auditoria buscando quien autorizo el override. | El modal promete que el registro queda en el historial, pero no aparece ninguna entrada de auditoria del override (a diferencia del forzado de CIP, que si audita). | Un ingreso con indicio de adulteracion se fuerza sin rastro de quien lo autorizo: se pierde la atribucion legal del override. |
| Confirmacion destructiva con foco en el boton de accion | Transversal (Movimientos, Carga, Fortificados, borrados) | H3, H10 | En cualquier pantalla con borrado o confirmacion de saldo negativo, abrir el modal y, sin leerlo, presionar Enter (venir tipeando antes) o dar un doble toque reflejo. Tambien forzar un banner de error al final de un formulario largo y observar si toma foco. | El foco por defecto cae en el boton rojo (Eliminar) o en "Guardar igual"; el Enter o el doble toque confirma sin leer. El banner de error aparece arriba, fuera de la vista, sin foco. | Se borra un registro real o se acepta un saldo negativo sin lectura; o el operario toca el boton varias veces creyendo que no responde y reintenta sobre dato ya malo. |
| Reinterpretacion silenciosa de densidad y pH en Ingresos | Ingresos | H5 | En Ingresos tipear densidad = 28 y pH = 68 (como los teclea un operario apurado) y salir del campo (blur) pasando al siguiente. No confirmar nada. | Al perder foco, 28 se guarda como 1.028 y 68 como 6,8 sin mostrar "se guardara: X". El operario poco digital no nota el cambio. | Parametro de calidad reinterpretado (hasta 10x distinto de lo tecleado); el valor corrupto solo se descubre en auditoria. |

---

## 6. Metricas simples de validacion

| Nombre | Definicion | Como capturar | Umbral |
|---|---|---|---|
| Tiempo por tarea | Segundos desde que el operario empieza a interactuar con la pantalla hasta que la tarea queda efectivamente guardada (no hasta que cree que guardo). | El observador arranca el cronometro cuando el operario toca el primer campo y lo para cuando se confirma el guardado; anota por tarea y pantalla. Una corrida por failure case y por tarea base. | Ingreso de camion < 30s sin entrenamiento (PRODUCT.md / H2). Para el resto, registrar baseline y marcar friccion alta cualquier tarea operativa que supere ~45s. |
| Numero de errores por tarea | Cantidad de acciones que producen un dato incorrecto o un borrado no querido (ej: BIN como origen, Desde/Hasta invertido, kg por g, litros 0/negativo, borrado por foco). | El observador lleva una grilla de failure cases por pantalla y marca con una cruz cada vez que el operario incurre, anotando el ID de riesgo. Conteo manual. | Cualquier error que corrompa datos en silencio (TH1, TH2, TH3, TH8, T2) es bloqueante: umbral objetivo 0 ocurrencias antes de congelar UX. |
| Numero de dudas / preguntas en voz alta | Veces que el operario pregunta, duda o verbaliza confusion ("y esto cual es", "aca va litros?", "lo guardo o no"). | El observador cuenta a mano cada pregunta o expresion de duda y anota la pantalla y el momento (que campo o boton la disparo). | Sin umbral duro; >2 dudas en una misma tarea senala friccion alta. Priorizar las pantallas con mas dudas para rediseno antes del manual. |
| Taps innecesarios | Toques que no avanzan la tarea: reintentos sobre un boton que no responde (no-op por permiso o por banner no visto), toques en campo o seccion equivocada, scroll de mas para encontrar Litros. | El observador cuenta a mano los toques sin progreso, distinguiendo causa (no-op H8, banner no visto H10, target chico H4, Litros enterrado H2). Conteo por tarea. | Baseline a registrar; >=3 taps innecesarios en una tarea base marca friccion alta. Cualquier reintento por no-op silencioso (H8) cuenta como hallazgo a corregir. |
| Taps totales vs minimos | Cociente entre los toques reales para completar la tarea y la cantidad minima teorica de toques de esa tarea. | El observador cuenta los toques reales con un contador manual; el minimo teorico se calcula antes de la prueba (campos obligatorios + guardar). Se reporta el ratio real/minimo por tarea. | Objetivo cercano a 1.0; ratio > 2.0 indica que la pantalla obliga a navegacion o correcciones evitables (tipico de Ingresos por H2 y grillas densas por H4). |
| Tasa de exito sin ayuda | Proporcion de tareas que el operario completa correctamente y sin error de datos sin que el observador o un companero intervenga. | El observador marca cada tarea como exito-sin-ayuda / exito-con-ayuda / fallo, sin asistir salvo riesgo real; calcula el porcentaje por pantalla al final de la sesion. | Meta PRODUCT.md: registrar sin error y sin entrenamiento. Objetivo >= 90% sin ayuda en las 6 pantallas operativas antes de congelar UX; por debajo de 80% es bloqueante para esa pantalla. |
| Veces que "cree que guardo" pero no guardo | Casos en que el operario afirma o asume que el dato quedo guardado pero en realidad quedo vacio, pisado o revertido (CIP/Stock por sync, formulario perdido por recarga, BIN sin descontar). | El observador le pregunta tras cada tarea sensible si cree que quedo guardado, y luego verifica el dato real en la app (o en la base). Cuenta cada discrepancia, anotando el riesgo (TH5, TH6, H12, TH3, T1). | Bloqueante: objetivo 0 discrepancias. Cualquier caso de "cree que guardo pero no" sobre CIP (inocuidad) o stock/saldo (datos productivos) frena el congelamiento de UX. |

---

## 7. Planilla de observacion por sesion

Formato corto y copiable, una fila por tarea/escenario:

```
SESION DE VALIDACION — ReciboApp / Yatasto
Fecha: ____________   Dispositivo: ____________   Observador: ____________

Rol (Operario/Supervisor/Oficina/Jefe): ____________
Perfil real usado (operador/supervisor/jefe): ____________
Usuario (iniciales): ____________

--- por escenario ---
Pantalla: ____________
Escenario id (ej OP-ING-01): ____________
Tiempo (s, hasta guardado real): ____________
Taps totales: ______   Taps innecesarios: ______
Dudas (conteo): ______
  Que las disparo: ____________________________________
Errores (marcar IDs de riesgo): ____________________________________
Pidio ayuda (si/no): ______
"Cree que guardo" vs realidad (ok / discrepancia): ______
Cita textual del usuario:
  "____________________________________________________"

(repetir el bloque por cada escenario de la sesion)
```

---

## 8. Que NO se esta validando (limites)

### Features planificadas pero NO implementadas (no existen en main, no se validan)

- **Perfil "operario" como rol propio**: no existe; el rol del piso usa el perfil real `operador`. Solo planificado en UX-V2.md.
- **Perfil "oficina" como rol propio**: no existe; "Oficina" se prueba con supervisor o jefe en escritorio. Solo planificado en UX-V2.md.
- **Login por PIN**: no implementado en main.
- **Home / pantalla de inicio nueva** de UX-V2: no implementada.
- **Bottom bar de 4 tabs de UX-V2**: la bottom bar actual tiene los tabs de `NAV` reales (ingresos, movimientos, carga, fortificados, cip, stock). El rediseno de 4 tabs no existe todavia.

Estas features estan en UX-V2.md como plan, no en codigo. No se prueban en esta tanda. Cuando se implementen, se agregaran escenarios propios.

### Riesgos de zona protegida (T1..T7) que no se "prueban tocando UI"

Estos riesgos son tecnicos y silenciosos: no se reproducen con una tarea de usuario comun, pero **hay que tenerlos presentes como observaciones del observador** (no como tareas del usuario):

- **T2 (fecha UTC que rota a las 21:00)**: si se corre cualquier sesion entre las 21:00 y 23:59 hora Argentina, anotar bajo que fecha quedo cada registro. Aparece como contexto en OP-SHELL-01, JF-SHELL-03 y el failure case de turno noche, pero el operario no lo "provoca": ocurre por la hora del reloj.
- **T1 / T4 (cola offline pisa la ultima carga / desactiva la guarda de conflicto)**: se reproducen con un guion offline-then-online sobre clave compartida, no con una tarea normal. Verificar en la base/auditoria, no en la pantalla.
- **T3 (backup truncado a 1000)**: requiere una base con >1000 claves; se verifica abriendo el archivo JSON (`total_registros`), no tocando la UI. Cubierto como tarea de verificacion en OF-BKP-01 / SUP-SHELL-02 / JF-SHELL-02, pero el truncamiento en si es un hecho tecnico a observar, no una accion de usuario.
- **T5 (logAudit/logDelete pierden entradas por escritura concurrente)**: solo se manifiesta con dos dispositivos escribiendo auditoria casi a la vez; se verifica revisando el log, no en una pantalla.
- **T6 (roles solo client-side)**: es un riesgo de seguridad, no de friccion de UI. Se documenta y se prueba con criterio de seguridad (consola del navegador), no como tarea de operario.
- **T7 (reabrir un dia no recalcula el saldo)**: el efecto es silencioso sobre `SALDO_KEY`; se verifica mirando el saldo arrastrado al dia siguiente, no en la pantalla de reapertura. Cubierto en JF-SHELL-01 y OF-TEC-01.

Estos no son objetivos de "tarea de usuario": son condiciones del entorno y del backend que el observador debe registrar para no atribuir un dato corrupto a un error humano cuando en realidad es un riesgo tecnico vivo.

---

## 9. Procedencia y metodo

- **Estado validado:** branch `main` al 2026-06-04, sin la Tanda A de guardrails mergeada.
- **Fuentes en disco (verificadas antes de redactar):** `docs/riesgos/registro-hazards.md` (IDs T1-T7, H1-H13, TH1-TH10 — confirmados; no existe ningun "S1"), `docs/riesgos/riesgos-operario.md` (narrativa por pantalla), `docs/operacion/runbook.md`, `docs/operacion/procedimientos-supervisor.md`, `docs/operacion/guia-operario.md`, `docs/auditabilidad/trazabilidad.md`, `docs/arquitectura/*` y el codigo `recibo_yatasto.jsx` (numeros de linea citados en cada escenario).
- **Metodo:** generacion por rol en paralelo + una pasada de **verificacion adversarial** que reviso cada escenario contra el codigo real para eliminar features inventadas, IDs de riesgo invalidos y "esperados" idealizados. Correcciones aplicadas en esa pasada (ejemplos): se distinguio "dia cerrado" (overlay a nivel Shell + rechazo en `save()`) de "dia pasado ABIERTO" (camino real de TH4); se corrigio que el override de aguado llama a `track()` (telemetria), no a `logAudit` (TH10); se aclaro que backup completo / panel tecnico / auditoria detallada / reapertura son **jefe-only**; se corrigio "operario"->"operador" como perfil real.
- **Restriccion de alcance:** no se inventaron features ni riesgos nuevos. Cada "que deberia pasar" describe el comportamiento ACTUAL (que a veces es el bug). Las features de UX-V2 (perfil operario/oficina, login PIN, home, bottom bar de 4 tabs) **no existen en `main`** y no se validan (ver seccion 8).