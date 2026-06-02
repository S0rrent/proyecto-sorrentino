# Invariantes del motor de saldo (ZONA PROTEGIDA)

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: contrato del motor de calculo de litros/saldo y reglas que NO deben romperse.

Este documento describe como funciona hoy el motor de saldo y enumera los invariantes
que cualquier cambio debe preservar. Es la referencia obligatoria antes de tocar la zona
protegida. No propone cambios; los riesgos asociados estan en
../riesgos/registro-hazards.md (IDs T1, T2, T3, T4, T7, TH1, TH3, TH4, TH5, TH6).

Regla dura: ningun cambio en las funciones listadas aca se aplica sin pre-mortem y sin
test de regresion de la cadena de saldo cruzando limites de dia.

---

## Que funciones son zona protegida

En recibo_yatasto.jsx:
- calcAutoLitros (linea 605): calcula litros netos por silo para una fecha.
- buildChainedSaldo (linea 807): encadena dia a dia desde un ancla hasta una fecha.
- rebuildSaldoChain (linea 839) y scheduleRebuildSaldoChain (linea 875): reconstruyen
  el saldo tras una edicion retroactiva (debounce 2s, coalescido).
- runConsistencyChecks (linea 901): detector de inconsistencias (ver
  ../operacion/procedimientos-supervisor.md).
- save / saveSaldo / saveBaseSaldo (lineas 290, 346, 361): persistencia y disparo de rebuild.
- syncAutoMovSobrante (linea 3403, dentro de SecProduccion): genera movimientos automaticos
  de sobrante.
- calcSF / shouldShowSF (lineas 104, 114): vida util / SF+N.

En db-adapter.js: toda la cola offline (ver ../arquitectura/comportamiento-offline.md).

---

## Modelo de datos del saldo

Hay dos claves de saldo (detalle en ./modelo-datos.md):

- yatasto:saldo-base (SALDO_BASE_KEY): ancla manual permanente. La carga el jefe. NUNCA la
  sobreescribe la cadena. Forma: { data: { silo: litros }, fromDate, productos }.
- yatasto:saldo-silos (SALDO_KEY): fast path derivado. Es el resultado encadenado hasta
  (al menos) ayer. Es descartable: siempre se puede reconstruir desde el ancla mas los
  datos diarios. Forma: { data, fromDate, productos, fechas }.

Idea central: SALDO_BASE_KEY es la unica fuente de verdad manual. SALDO_KEY es cache de
largo plazo. Si SALDO_KEY se corrompe, se reconstruye; si SALDO_BASE_KEY se corrompe, se
pierde el ancla.

---

## Como calcula calcAutoLitros(date)

Devuelve { totals, productosBase, fechasBase, reservados } por silo.

Tiene tres modos de obtener el saldo de arranque del dia:
1. Modo cadena (chainMode): la base la provee buildChainedSaldo; no toca la base de datos
   para el saldo.
2. Fast path: si SALDO_KEY.fromDate es anterior a date, usa SALDO_KEY directo.
3. Fallback: si SALDO_KEY es demasiado reciente o no existe, usa SALDO_BASE_KEY; si el ancla
   es exactamente date-1 la usa directo, y si es mas antigua encadena dia a dia hasta date-1
   con buildChainedSaldo.

Sobre ese saldo de arranque aplica las operaciones del dia, en este orden:
- Ingresos: suma litrosFca al silo destino. El ingreso define el producto del silo.
- Movimientos: al origen resta litros + perdidaLitros; al destino suma litros. Propaga
  producto y fecha (worst-case) del origen al destino.
- Cargas: resta litros del silo proveniente.
- Fortificados: al origen resta litrosBase; al destino suma y aplica el label del lote;
  las adiciones suman volumen (y descuentan del sourceSilo si esta declarado).
- Produccion: lotes activos generan reservados; lotes finalizados descuentan litros reales
  (o todo lo enviado si el sobrante fue merma/decomiso).

Convencion de signos (invariante critico): ingreso +, movimiento origen -, movimiento
destino +, carga -, fort origen -, fort destino +, produccion finalizada -. Invertir un
signo corrompe el saldo de forma silenciosa.

Mapa de silos: SILO_STOCK_KEY (linea 174) normaliza los nombres de silo a las claves
canonicas de STOCK_SILOS. Un silo que no esta en ese mapa se descarta en silencio: sus litros
no se suman ni se restan. Hoy el unico silo seleccionable ausente del mapa es BIN; los TQ y
POSTRE/TINA/DULCE si estan mapeados (riesgo TH3).

Fechas worst-case (SF+N): fechasBase guarda la fecha ISO mas antigua del contenido de cada
silo. Se resetea a la fecha que se esta calculando (date, que en modo cadena puede ser un dia
historico, no necesariamente hoy) cuando el silo estaba vacio; conserva la mas antigua al
mezclar; se anula cuando el silo queda en cero. Sirve para propagar la vida util.

Cache: _autoLitrosCache (linea 553) con TTL de 15 segundos, solo en modo no-cadena. Se
borra para una fecha en cada save de esa fecha (ver save). invalidateAutoLitrosFrom borra
desde una fecha en adelante.

---

## Cadena de saldo entre dias

buildChainedSaldo(base, targetDate): arranca en base.fromDate, e itera dia a dia (addDay)
hasta targetDate, llamando calcAutoLitros en modo cadena. Tope de 365 iteraciones
(_CHAIN_MAX_DAYS); si lo supera, marca truncated y avisa por consola.

rebuildSaldoChain(fromDate): carga SALDO_BASE_KEY, encadena hasta ayer y guarda SALDO_KEY.
Requiere que base.fromDate sea anterior a fromDate; si no, no reconstruye. Si truncated,
queda registrado en el log de rebuilds (getRebuildLog) y lo detecta runConsistencyChecks.

scheduleRebuildSaldoChain(fromDate): coalesce de varios rebuilds en uno solo con la fecha
mas antigua, throttle de 2 segundos.

Disparadores de rebuild:
- save() de una seccion con date <= ayer: invalida cache desde date y agenda rebuild.
- Cierre retroactivo de un dia anterior a ayer (handleCerrarDia).
- Reapertura de un dia anterior a ayer (handleReabrirDia).
- Apertura de la app y cruce de medianoche: reconstruyen SALDO_KEY hasta ayer.

---

## Invariantes que NO deben romperse

1. Fechas siempre en formato ISO YYYY-MM-DD (ASCII ordenable). Nunca persistir dd/mm/yyyy
   (eso es solo presentacion via fmtDate). La fecha "hoy" debe ser local; hoy getToday usa
   UTC y rota a las 21:00 hora Argentina (riesgo T2): corregir esto es condicion para que
   el resto del motor atribuya bien.
2. SALDO_BASE_KEY es la unica ancla manual. La cadena nunca lo sobreescribe. SALDO_KEY es
   derivado y reconstruible.
3. Toda escritura retroactiva (date <= ayer) debe invalidar cache y agendar rebuild. save()
   ya lo hace; cualquier camino de escritura nuevo debe hacerlo tambien, o el saldo de hoy
   queda viejo.
4. Las convenciones de signo de calcAutoLitros son sagradas. Un cambio de signo corrompe
   stock y saldo sin alerta.
5. El motor NO valida litros. Asume numeros > 0. Litros 0, negativos o no numericos
   corrompen el saldo (riesgo TH1). La validacion debe vivir en el formulario, nunca en el
   motor.
6. Solo se contabilizan silos presentes en SILO_STOCK_KEY. Los selectores no deben ofrecer
   como origen de stock silos que no esten en ese mapa (riesgo TH3).
7. El cache de 15s es una optimizacion de navegacion. Tras un save se borra el cache de esa
   fecha; aun asi, otra pestana o dispositivo puede leer saldo viejo en una ventana corta.
8. fechasBase debe propagar la fecha mas antigua al mezclar contenidos (SF+N). Romper esto
   degrada el calculo de vida util.
9. Reabrir un dia de hoy o ayer NO recalcula SALDO_KEY (riesgo T7, conocido). Si se edita
   tras reabrir hoy, hay que volver a cerrar para re-snapshotear el saldo.
10. La guarda de concurrencia C5 (en save) compara el timestamp de ultima lectura contra el
    remoto antes de escribir y aborta si difieren. Encolar offline borra esa marca y
    desactiva la guarda (riesgo T4): cualquier cambio en la cola debe preservar C5.

---

## Que valida runConsistencyChecks

Es la red de seguridad del motor. Corre sobre una fecha y devuelve issues (error/warning):
- Stock negativo (silo por debajo de -0.5 L): posible doble descuento o saldo inicial mal.
- Reservados que exceden el total del silo (lote envasando con litros que ya no estan).
- Lote finalizado con usados mayores a enviados.
- Lote finalizado sin litros usados (cae al fallback de origenes).
- Lote envasando sin silos origen.
- Rendimiento mayor a 105 por ciento (envasado mayor a usado).
- Movimiento automatico huerfano (apunta a un lote inexistente) o duplicado.
- Cadena de saldo truncada en el ultimo rebuild.

Uso operativo en ../operacion/procedimientos-supervisor.md.

---

## Antes de tocar esta zona

1. Leer este documento y ../riesgos/registro-hazards.md (riesgos T y TH).
2. Hacer pre-mortem: que dato productivo se corrompe si el cambio falla.
3. Test de regresion: cargar un escenario con saldo base, varios dias de operaciones,
   un cierre, una edicion retroactiva y un cruce de medianoche; verificar que SALDO_KEY
   reconstruido coincide con el calculo dia a dia.
4. Verificar el caso borde de turno noche (21:30 hora local) por el riesgo T2.
