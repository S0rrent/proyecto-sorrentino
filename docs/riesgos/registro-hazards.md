# Registro de riesgos - ReciboApp (Yatasto)

Estado: BORRADOR para revision
Fecha de generacion: 2026-06-02
Origen: dos auditorias read-only multi-agente sobre el codigo actual
  (1) auditoria tecnica general, (2) evaluacion por persona-operario.
  Las dos fuentes JSON se validaron integras (JSON valido, sin corrupcion de codificacion).

Este archivo es la fuente unica de verdad de riesgo/deuda del sistema.
Cada riesgo tiene un ID estable (T#, H#, TH#); el resto de la documentacion
referencia los riesgos por ese ID y no los repite.

Reglas de formato de este documento: Markdown simple, sin tablas, sin diagramas
ASCII, sin caracteres decorativos. Flechas como "->", mayor-igual como ">=",
distinto como "!=".

---

## Como leer este registro

Taxonomia de riesgo (definiciones acordadas):

- T  - Riesgo tecnico: el sistema falla o corrompe datos por si mismo, aunque el
  operario haga todo bien. Ejemplos tipicos: cola offline pisa datos, drift de
  saldo, backup truncado, race conditions, persistencia inconsistente.
- H  - Riesgo humano-operativo: el sistema funciona a nivel codigo, pero el diseno
  induce al operario a equivocarse. Ejemplos tipicos: demasiados campos,
  confirmaciones ambiguas, formularios cansadores, puntos verdes enganosos,
  navegacion confusa, modo historico poco evidente.
- T+H - Zona gris: problemas tecnicos que se vuelven peligrosos por comportamiento
  humano. Ejemplos tipicos: aceptar negativos, origen == destino, BIN seleccionable
  pero no descontado, errores silenciosos, offline ambiguo.

Escenario de operario asumido (conservador) para evaluar severidad e impacto:

- manos humedas
- cansancio
- iluminacion variable
- presion operativa
- uso rapido
- uso ocasional con guantes o dedos poco precisos

Campos de cada riesgo:

- Pantalla(s): donde se manifiesta.
- Frecuencia probable: cada cuanto puede ocurrir en operacion real.
- Severidad operativa: alta / media / baja, segun dano a datos productivos u operacion.
- Impacto real en planta: que pasa concretamente si ocurre.
- Estado del codigo: "Libre" (guardrail conservador posible, no toca motor de
  calculo, persistencia ni cola) o "ZONA PROTEGIDA" (requiere pre-mortem y test de
  regresion antes de tocar).
- Guardrail futuro posible: medida conservadora sugerida (no es un compromiso de
  implementacion; este registro no modifica codigo).
- Ref: id de origen en la auditoria tecnica o en la evaluacion operario.

Zonas protegidas (no se tocan salvo bug critico confirmado, y siempre con pre-mortem):
motor de calculo (calcAutoLitros, buildChainedSaldo, rebuildSaldoChain,
runConsistencyChecks, syncAutoMovSobrante), persistencia base (load/save/loadSaldo/
saveSaldo/generateBackup), cola offline (db-adapter.js), service worker (vite.config.js),
y el esquema de Supabase.

---

## T - Riesgo tecnico

El sistema corrompe datos o falla por si mismo. Casi todos caen en zona protegida:
requieren pre-mortem y test de regresion de la cadena de saldo antes de cualquier cambio.

### T1. La cola offline pisa la ultima carga del operario
- Pantalla(s): transversal (cualquier guardado con escritura pendiente en cola).
- Frecuencia probable: intermitente, depende de red; alta en planta con senal debil.
- Severidad operativa: alta (critico de datos).
- Impacto real en planta: cuando una clave tiene una escritura encolada y el operario
  la reedita con red recuperada, el flush resucita el valor viejo y borra la ultima
  carga. Peor en claves compartidas (saldo-silos, stock del turno). Perdida silenciosa,
  sin error visible.
- Estado del codigo: ZONA PROTEGIDA (cola offline).
- Guardrail futuro posible: en el camino de exito de db.set, antes de retornar,
  eliminar la entrada pendiente de la misma clave.
- Ref: audit offline-queue-2.

### T2. La fecha del dia se calcula en UTC y rota a las 21:00 hora Argentina
- Pantalla(s): Shell / navegacion (afecta todas las secciones en turno noche).
- Frecuencia probable: cada noche, de 21:00 a 23:59 (diaria, 3 horas).
- Severidad operativa: alta (critico de datos).
- Impacto real en planta: el turno noche queda archivado bajo la fecha del dia
  siguiente; el operario ve modo historico aunque sea el turno en curso. Litros,
  ingresos, cargas y movimientos atribuidos al dia equivocado; saldo encadenado mal
  atribuido.
- Estado del codigo: ZONA PROTEGIDA (alimenta calcAutoLitros y saveSaldo).
- Guardrail futuro posible: derivar la fecha en hora local (mismo criterio que getNow
  y getCurrentTurno), validar con prueba de borde 21:30 hora local.
- Ref: audit appnav-1.

### T3. El backup se trunca en silencio a 1000 registros
- Pantalla(s): Admin / backup (supervisor-jefe).
- Frecuencia probable: en cada backup una vez superadas las 1000 claves; creciente con
  el tiempo de uso.
- Severidad operativa: alta (red de recuperacion).
- Impacto real en planta: el backup omite claves (dias enteros de ingresos, cargas,
  stock, saldo, auditoria) sin error ni alerta, y marca el respaldo como completo. Si
  se restaura desde ese archivo, faltan datos reales sin que nadie lo note.
- Estado del codigo: ZONA PROTEGIDA (generateBackup y db.list).
- Guardrail futuro posible: paginar db.list hasta agotar filas; como minimo, detectar
  1000 filas y bloquear/avisar antes de descargar y antes de marcar la fecha de backup.
- Ref: audit persistencia-1.

### T4. Encolar offline desactiva la guarda anti-conflicto entre dispositivos
- Pantalla(s): transversal, multi-dispositivo.
- Frecuencia probable: cuando un dispositivo encola y otro edita la misma clave;
  intermitente.
- Severidad operativa: alta.
- Impacto real en planta: al encolar, se descarta la marca que protege contra
  modificacion concurrente, asi que el flush posterior pisa a ciegas lo que escribio
  otro dispositivo, sin detectar el conflicto que esa guarda deberia frenar.
- Estado del codigo: ZONA PROTEGIDA (cola offline + persistencia).
- Guardrail futuro posible: no borrar la marca de ultima-lectura al encolar; distinguir
  "encolado" de "fallo definitivo".
- Ref: audit offline-queue-3.

### T5. logAudit y logDelete pierden entradas por escritura concurrente
- Pantalla(s): transversal (auditoria).
- Frecuencia probable: cuando dos dispositivos escriben auditoria casi a la vez; media.
- Severidad operativa: media-alta (auditabilidad).
- Impacto real en planta: la auditoria se guarda leyendo el blob, agregando una entrada
  y reescribiendo; sin atomicidad, dos escrituras casi simultaneas se pisan y se pierden
  entradas del registro de quien hizo que.
- Estado del codigo: ZONA PROTEGIDA (persistencia).
- Guardrail futuro posible: append atomico server-side (funcion/RPC) o tabla append-only
  para auditoria.
- Ref: audit persistencia-2.

### T6. El control de roles es solo del lado del cliente (RLS abierto)
- Pantalla(s): backend (afecta todas).
- Frecuencia probable: requiere un actor con sesion valida y conocimiento; baja
  probabilidad, alto impacto.
- Severidad operativa: alta (seguridad e integridad).
- Impacto real en planta: las politicas de la base solo validan que haya sesion; los
  roles se aplican ocultando botones. Un usuario autenticado puede, desde la consola del
  navegador, borrar o reescribir cualquier clave (saldo-base, cierre de dia, ingresos),
  saltando UI, confirmaciones y auditoria.
- Estado del codigo: ZONA PROTEGIDA (esquema Supabase).
- Guardrail futuro posible: mover la autorizacion por rol al servidor (politicas RLS que
  lean el rol del token), manteniendo los guards de UI como capa de experiencia.
- Ref: audit auth-1 / security-1.

### T7. Reabrir un dia cerrado no recalcula el saldo
- Pantalla(s): Shell (reapertura de dia, solo jefe).
- Frecuencia probable: rara (solo el jefe reabre).
- Severidad operativa: media-alta.
- Impacto real en planta: el saldo no se recalcula al reabrir (la accion en si). Las
  ediciones a dias de hoy o ayer si re-disparan la reconstruccion via save(); el caso sin
  cobertura es reabrir hoy y editar: el SALDO_KEY congelado del cierre puede no reflejar el
  cambio hasta un nuevo cierre.
- Estado del codigo: ZONA PROTEGIDA (motor de saldo).
- Guardrail futuro posible: invalidar y recalcular la cadena al reabrir un dia.
- Ref: audit appnav-3.

---

## H - Riesgo humano-operativo

El codigo funciona, pero el diseno induce al operario cansado o con poca experiencia
digital a equivocarse. Casi todos son "Libre": guardrails conservadores que no tocan
motor, persistencia ni cola.

### H1. El punto verde de CIP dice "limpio" sin haber cargado parametros
- Pantalla(s): CIP.
- Frecuencia probable: cada registro CIP (varias veces por turno).
- Severidad operativa: alta (inocuidad sanitaria).
- Impacto real en planta: la fila colapsada muestra punto verde apenas hay hora O
  responsable; alcalino, enjuague, acido y temperatura pueden estar vacios. Queda un
  registro de limpieza falso-positivo que el supervisor lee como verificado.
- Estado del codigo: Libre.
- Guardrail futuro posible: punto verde solo si hay hora Y responsable Y al menos un
  parametro de lavado; si falta algo, color ambar e indicacion "incompleto".
- Ref: eval operario (CIP) / audit cip-2.

### H2. El formulario de Ingresos sepulta el campo Litros entre 20+ campos
- Pantalla(s): Ingresos (la pantalla mas usada).
- Frecuencia probable: muy alta (cada ingreso de camion).
- Severidad operativa: media (lentitud, omision de campos).
- Impacto real en planta: el operario hace scroll por una columna larga de parametros
  de calidad para encontrar Litros; tarda y se pierde, contra la meta de menos de 30
  segundos sin entrenamiento.
- Estado del codigo: Libre (reordenar/colapsar; enlaza con el wizard de UX-V2).
- Guardrail futuro posible: poner Litros y Destino arriba de todo; colapsar de verdad el
  bloque de calidad.
- Ref: eval operario (Ingresos).

### H3. Las confirmaciones destructivas enfocan por defecto el boton de accion
- Pantalla(s): transversal (Movimientos, Carga, Fortificados, borrados).
- Frecuencia probable: cada borrado o confirmacion (frecuente).
- Severidad operativa: alta.
- Impacto real en planta: el foco automatico cae en el boton rojo (Eliminar) o en
  "Guardar igual"; el operario que venia apretando Enter o da un doble toque reflejo
  confirma sin leer y borra un registro real o acepta un saldo negativo.
- Estado del codigo: Libre.
- Guardrail futuro posible: enfocar por defecto "Cancelar" cuando la accion es destructiva.
- Ref: eval operario (atomos UI) / audit ui-atoms-a11y-4.

### H4. Targets tactiles por debajo de 44 px en el build de planta
- Pantalla(s): transversal (todas).
- Frecuencia probable: constante.
- Severidad operativa: media-alta.
- Impacto real en planta: con dedo poco preciso, mano humeda o guante, el operario toca
  el input gemelo equivocado, la seccion equivocada o borra la fila que no era. En el
  build por defecto los inputs y botones no fijan altura minima.
- Estado del codigo: Libre.
- Guardrail futuro posible: altura minima 48 px en inputs, botones y tabs,
  independiente del flag de UX.
- Ref: eval operario (transversal) / audit sec-stock-2.

### H5. Reinterpretacion silenciosa de densidad, pH y acidez
- Pantalla(s): Ingresos (atomos de numero).
- Frecuencia probable: cada ingreso con datos de calidad.
- Severidad operativa: alta (parametro de calidad hasta 10x mal).
- Impacto real en planta: al salir del campo, densidad 28 se guarda como 1.028 y pH 68
  como 6,8, sin confirmar el valor final. El operario poco digital no nota la
  reinterpretacion; el parametro corrupto solo se ve en auditoria.
- Estado del codigo: Libre.
- Guardrail futuro posible: mostrar bajo el campo "Se guardara: X" cuando el valor
  normalizado difiera de lo tecleado.
- Ref: eval operario (Ingresos) / audit ingresos-4 / ui-atoms-a11y-1.

### H6. Identidad de turno ambigua en dispositivo compartido
- Pantalla(s): Shell (identificacion de turno, header).
- Frecuencia probable: cada cambio de turno (3 por dia) en tablet compartida.
- Severidad operativa: alta (auditabilidad).
- Impacto real en planta: el pedido de identificacion solo aparece si el turno no tiene
  responsable y trae un boton para saltearlo; el operario nuevo hereda la sesion y el
  responsable del turno anterior, asi que lo que carga queda atribuido a quien no lo hizo.
- Estado del codigo: Libre.
- Guardrail futuro posible: re-pedir responsable al detectar cambio de turno; mostrar
  rol y nombre activos en el header.
- Ref: eval operario (Shell).

### H7. El modo historico es poco evidente
- Pantalla(s): Shell (todas las secciones al navegar a un dia pasado).
- Frecuencia probable: cuando se mira un dia pasado, y cada turno noche por T2.
- Severidad operativa: media.
- Impacto real en planta: el unico aviso de estar en un dia que no es hoy es una linea
  tenue; el operario apurado carga creyendo que es el dia actual.
- Estado del codigo: Libre.
- Guardrail futuro posible: banner de modo historico con fondo solido y texto claro
  "no es hoy"; marca "HIST." en el boton de fecha del header.
- Ref: eval operario (Shell).

### H8. Botones Eliminar visibles para perfiles sin permiso (no-op silencioso)
- Pantalla(s): Ingresos, Movimientos, Carga.
- Frecuencia probable: cuando el operario intenta corregir un dato mal cargado.
- Severidad operativa: media.
- Impacto real en planta: el boton rojo se renderiza siempre; el guard de permiso recien
  corta en el handler, asi que el toque no hace nada. El operario reintenta, concluye que
  la app se colgo y deja el dato malo.
- Estado del codigo: Libre.
- Guardrail futuro posible: ocultar o deshabilitar el boton segun perfil, con texto
  "Solo supervisor".
- Ref: eval operario / audit ingresos-3.

### H9. Silo sobrellenado se muestra al 100% sin alerta
- Pantalla(s): Stock (y aviso de calidad en Ingresos).
- Frecuencia probable: ocasional (rebalse o calculo inflado).
- Severidad operativa: media.
- Impacto real en planta: un silo con mas litros que su capacidad muestra barra llena y
  100% sin color de peligro; el operario mira el grafico (mas rapido que el numero) y no
  detecta el rebalse. En Ingresos, los avisos de calidad fuera de rango quedan debajo del
  area de notas, fuera de la vista del boton Guardar.
- Estado del codigo: Libre.
- Guardrail futuro posible: marcar mas de 100% en color de peligro con texto "sobre
  capacidad"; subir el aviso de calidad junto al boton Guardar.
- Ref: eval operario (Stock) / audit sec-stock-1.

### H10. Los desplegables parecen campos de texto y el aviso de error no se ve
- Pantalla(s): transversal (atomos Sel y Banner).
- Frecuencia probable: alta.
- Severidad operativa: media.
- Impacto real en planta: el desplegable no dibuja flecha, asi que con luz pobre el
  operario lo confunde con un campo tipeable y lo deja vacio. El banner de error aparece
  arriba de un formulario largo sin tomar foco, asi que el operario scrolleado abajo no
  ve por que "el boton no responde" y lo toca varias veces.
- Estado del codigo: Libre.
- Guardrail futuro posible: dibujar flecha en el desplegable; al aparecer el banner de
  error, llevarlo a la vista y darle foco.
- Ref: eval operario (atomos) / audit ui-atoms-a11y-5 / ui-atoms-a11y-6.

### H11. Destino de carga de texto libre y alta de camion sin deduplicar
- Pantalla(s): Carga, CIP.
- Frecuencia probable: cada despacho y cada alta de camion.
- Severidad operativa: media (trazabilidad).
- Impacto real en planta: el mismo cliente queda escrito de tres formas distintas en el
  dia; al agregar un camion no se chequean duplicados, asi que la CIP de un camion queda
  partida en dos filas (una con datos, otra vacia).
- Estado del codigo: Libre.
- Guardrail futuro posible: convertir Destino en desplegable con opcion "Nuevo";
  deduplicar al alta de camion con confirmacion.
- Ref: eval operario / audit cip-4.

### H12. La recarga por nueva version o cambio de tema borra el borrador en curso
- Pantalla(s): Shell.
- Frecuencia probable: ocasional (cada deploy o toque del tema).
- Severidad operativa: media-alta.
- Impacto real en planta: el banner "Actualizar" recarga la app y el toggle de tema
  tambien; el restore no recupera el formulario a medio cargar. El operario apurado toca
  el banner por reflejo (parece el boton de avanzar) y pierde lo que estaba cargando.
- Estado del codigo: Libre (no toca el service worker en si).
- Guardrail futuro posible: confirmar antes de recargar cuando hay un formulario abierto;
  bajar el atractivo del boton de actualizar.
- Ref: eval operario (Shell).

### H13. Las tres adiciones por defecto de Fortificados no se pueden borrar
- Pantalla(s): Fortificados.
- Frecuencia probable: cada lote fortificado.
- Severidad operativa: media.
- Impacto real en planta: Lactosa, Variolac y Agua vienen precargadas, no se pueden
  borrar y la validacion exige cantidad en todas; el operario que no usa una escribe 0
  para destrabar, dejando datos basura permanentes que confunden la auditoria.
- Estado del codigo: Libre.
- Guardrail futuro posible: permitir borrar cualquier adicion (o ignorar filas vacias al
  validar).
- Ref: eval operario / audit fortificados-1.

---

## T+H - Zona gris (tecnico + humano)

Carencias tecnicas que solo hacen dano cuando un humano hace algo razonable pero
equivocado. Aca viven los guardrails de maximo valor: arreglos tecnicos chicos que
previenen error humano. Casi todos son "Libre" y NO tocan el motor de calculo.

### TH1. Litros y cantidades aceptan 0, negativos y texto; el chequeo de saldo se evade
- Pantalla(s): Ingresos, Movimientos, Carga, Fortificados.
- Frecuencia probable: alta (un cero de mas, un signo, un campo en 0 para destrabar).
- Severidad operativa: alta.
- Impacto real en planta: la validacion solo chequea que el campo no este vacio; ademas
  el chequeo de saldo retorna OK cuando los litros son menores o iguales a 0. Un 0 o un
  negativo genera un movimiento o despacho fantasma o de signo invertido y corrompe stock
  y saldo sin ninguna senal.
- Estado del codigo: Libre (la validacion va en cada formulario, NO en el motor).
- Guardrail futuro posible: exigir numero mayor a 0 (y perdida mayor o igual a 0) antes
  de guardar, reusando el banner de error de cada formulario.
- Ref: audit ingresos-1, movimientos-2, carga-1, fortificados-2.

### TH2. Origen y destino de Movimientos son identicos y se puede invertir el trasvase
- Pantalla(s): Movimientos.
- Frecuencia probable: alta.
- Severidad operativa: alta.
- Impacto real en planta: los desplegables Desde y Hasta son iguales, con la misma lista,
  sin asimetria visual; no se valida que origen sea distinto de destino. El operario
  apurado toca el desplegable equivocado y mueve al reves, descontando del silo que debia
  recibir. Descuadre de dos silos que nadie nota hasta el conteo fisico.
- Estado del codigo: Libre.
- Guardrail futuro posible: validar origen distinto de destino; diferenciar visualmente
  "DESDE (sale)" y "HASTA (entra)" y mostrar en vivo "Silo X -> Silo Y".
- Ref: audit movimientos-1, movimientos-5.

### TH3. Silo seleccionable que el motor no contabiliza (BIN), y edicion de origen
- Pantalla(s): Carga, Produccion.
- Frecuencia probable: media (cuando se elige BIN como origen o se edita una carga).
- Severidad operativa: alta.
- Impacto real en planta: el desplegable ofrece BIN como origen, pero BIN no esta en
  SILO_STOCK_KEY (recibo_yatasto.jsx:174-182); el despacho se registra, ningun silo baja y el
  chequeo de saldo da OK. (El resto de los silos del desplegable, incluidos los TQ y
  POSTRE/TINA/DULCE, si estan mapeados y descuentan.) Ademas, editar una carga y cambiarle el
  silo re-suma los litros originales al silo nuevo (falso OK) y deja el viejo sobre-descontado.
  El stock queda sobreestimado de forma permanente y silenciosa.
- Estado del codigo: Libre (filtrar opciones en la UI; NO cambiar el mapa de silos del motor).
- Guardrail futuro posible: filtrar o marcar como no disponible BIN (el unico silo no
  contabilizado) en los desplegables de origen de carga y produccion.
- Ref: audit produccion-1, carga-3.

### TH4. El bloqueo de dia cerrado / solo-lectura esta desconectado
- Pantalla(s): CIP, Movimientos, Stock.
- Frecuencia probable: media (al entrar a "mirar" un dia cerrado).
- Severidad operativa: alta.
- Impacto real en planta: la logica de solo-lectura existe pero no recibe la senal de dia
  cerrado en CIP ni en los formularios de Movimientos; cerrar el dia solo oculta el boton
  de alta. El operario que entra a mirar roza un input y reescribe un movimiento o un
  registro de inocuidad de una jornada ya cerrada, sin aviso.
- Estado del codigo: Libre (propagar una prop ya soportada; no es refactor).
- Guardrail futuro posible: pasar la senal de dia cerrado a CIP y a los formularios de
  Movimientos; deshabilitar inputs y boton Guardar con un cartel de "Dia cerrado".
- Ref: audit cip-1.

### TH5. CIP se guarda por tecla y el sync periodico pisa o revierte en silencio
- Pantalla(s): CIP. (Stock tiene un dirty-guard con useRef, recibo_yatasto.jsx:3669, que
  reduce este efecto; CIP no lo tiene.)
- Frecuencia probable: alta con red debil.
- Severidad operativa: alta (inocuidad).
- Impacto real en planta: cada 10 segundos el sync recarga y pisa lo que el operario esta
  escribiendo; si un guardado falla, se revierte el caracter recien tipeado sin aviso. El
  operario cree que cargo concentracion o temperatura y en realidad quedo vacio.
- Estado del codigo: Libre (no se modifica la cola ni el motor).
- Guardrail futuro posible: pausar el reemplazo del sync mientras el campo tiene foco
  (marca de edicion en curso) y avisar cuando un guardado falla.
- Ref: audit concurrency-2, cip-3.

### TH6. El auto-relleno de Stock pisa el producto manual y escribe en el turno equivocado
- Pantalla(s): Stock.
- Frecuencia probable: alta.
- Severidad operativa: media-alta.
- Impacto real en planta: el recalculo automatico reemplaza el producto que el operario
  eligio a mano, sin aviso; y el guardado usa el turno del estado, que puede haber quedado
  de una sesion previa, con las 19 tarjetas lejos del selector de turno. El operario carga
  producto o pH en el turno equivocado.
- Estado del codigo: Libre (no se modifica el motor que provee los litros).
- Guardrail futuro posible: no pisar el producto cargado a mano; mostrar en cada tarjeta
  el turno que se esta editando.
- Ref: audit sec-stock-3.

### TH7. El selector de fecha permite elegir el futuro sin tope
- Pantalla(s): Shell.
- Frecuencia probable: ocasional (toque impreciso en el calendario).
- Severidad operativa: media-alta.
- Impacto real en planta: un toque impreciso deja registrando en una fecha futura cuyos
  litros no entran en la cadena de saldo (el arrastre llega solo hasta ayer) y
  "desaparecen" hasta una auditoria. Cerrar un dia futuro contamina la clave de saldo.
- Estado del codigo: Libre (combinar con el arreglo de fecha local de T2).
- Guardrail futuro posible: poner tope de fecha = hoy en el selector.
- Ref: audit appnav-2.

### TH8. La unidad equivocada en Fortificados infla el silo (kg se computa 1 a 1 como L)
- Pantalla(s): Fortificados.
- Frecuencia probable: media (selector de unidad chico y ambiguo).
- Severidad operativa: alta.
- Impacto real en planta: el selector mezcla kg, g, mg, L, mL, cc casi indistinguibles
  bajo luz pobre; una adicion en kg se suma como litros 1 a 1 al silo destino. Una unidad
  equivocada infla o desinfla miles de litros sin aviso.
- Estado del codigo: Libre (confirmacion y agrupacion visual; no se cambia la conversion).
- Guardrail futuro posible: agrupar unidades en Masa y Volumen, ensanchar el control y
  confirmar la equivalencia masa-volumen al guardar.
- Ref: audit fortificados-3.

### TH9. El confirm de saldo insuficiente muestra una cifra que no es la real
- Pantalla(s): Movimientos.
- Frecuencia probable: cuando hay perdida cargada.
- Severidad operativa: media.
- Impacto real en planta: el mensaje dice "se mueven X litros" pero al origen se le resta
  X mas la perdida. El operario valida mentalmente con X, confirma, y deja el silo mas
  negativo de lo que entendio. La cifra confirmada no representa el descuento real.
- Estado del codigo: Libre (solo texto del mensaje; no cambia el calculo).
- Guardrail futuro posible: mostrar el descuento total (litros mas perdida) en el confirm.
- Ref: audit movimientos-4.

### TH10. Forzar un ingreso con aguado no queda auditado
- Pantalla(s): Ingresos.
- Frecuencia probable: cuando hay aguado detectado y se fuerza el guardado.
- Severidad operativa: media (auditabilidad y responsabilidad legal).
- Impacto real en planta: el modal de aguado promete que el registro queda en el historial,
  pero el guardado forzado no llama a la auditoria (a diferencia del forzado de CIP, que si
  audita). Un ingreso con indicio de adulteracion se puede forzar sin rastro de quien lo
  autorizo.
- Estado del codigo: Libre (agregar una llamada de auditoria, como ya se hace en CIP).
- Guardrail futuro posible: registrar en auditoria el override de aguado con el perfil que
  lo autorizo.
- Ref: audit ingresos-2.

---

## Resumen de conteo

- T (riesgo tecnico): 7 riesgos. Todos en zona protegida (pre-mortem antes de tocar).
- H (riesgo humano-operativo): 13 riesgos. Todos "Libre" (guardrails conservadores).
- T+H (zona gris): 10 riesgos. Todos "Libre" salvo donde se indique; ninguno toca el motor.

Lectura rapida de prioridad operativa:

- Mas urgente por dano silencioso a datos: T1, T2, T3 (tecnicos, zona protegida) y
  TH1, TH4, TH5 (zona gris, guardrails libres de bajo riesgo).
- Mas urgente por inocuidad y auditabilidad: H1 (punto verde CIP), TH10 (aguado sin
  auditar), H6 (identidad de turno), T5 y T6 (auditoria y roles).
- Mayor reduccion de error humano con menor riesgo de cambio: TH1, TH2, TH3, H3, H4
  (validaciones y defaults seguros, sin tocar zonas protegidas).

---

## Notas de mantenimiento

- Cada riesgo se referencia por su ID (T#, H#, TH#) desde el resto de la documentacion.
- Estado por defecto de cada riesgo: ABIERTO. Cuando se actue sobre uno, agregar una linea
  "Estado: en curso / cerrado (fecha, commit)".
- Los guardrails listados son propuestas conservadoras; este registro NO modifica codigo.
- Todo cambio sobre un riesgo marcado ZONA PROTEGIDA requiere pre-mortem y test de
  regresion de la cadena de saldo antes de aplicarse.
- Escenario de manos: PRODUCT.md indica operarios "sin guantes". Por decision del proyecto,
  esta evaluacion usa igual un escenario conservador (manos humedas, dedos poco precisos,
  guante ocasional) para no subestimar el riesgo.
