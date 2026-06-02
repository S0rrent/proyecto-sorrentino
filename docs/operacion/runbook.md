# Runbook operativo

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: como funciona realmente el ciclo operativo diario del sistema.

Este documento describe el comportamiento real (no el deseado). Para usuarios y principios
ver PRODUCT.md; para el plan de rediseno ver UX-V2.md (no se repiten aca). Riesgos
relacionados: T2, T7, H6, H7, TH4, TH7 (ver ../riesgos/registro-hazards.md).

---

## Turnos

- Tres turnos: 07:00 (Manana), 14:00 (Tarde), 21:00 (Noche).
- getCurrentTurno (linea 237) los deriva por hora local: 7 a 14 Manana, 14 a 21 Tarde,
  21 a 7 Noche.
- El stock se registra por turno; cada turno tiene su responsable (resp).

---

## Apertura de la app

1. Resolucion de perfil: se lee la sesion de Supabase Auth y se deriva el perfil del token
   (hay tres: supervisor, jefe, operador), no de localStorage.
2. Carry-over de saldo: se reconstruye SALDO_KEY hasta ayer. Si hay un hueco de varios
   dias, se encadena cada jornada (buildChainedSaldo). Esto asegura que cada dia parta del
   cierre del dia anterior.
3. Identificacion: si el turno actual no tiene responsable cargado, aparece el modal de
   identificacion. Tiene una salida para postergarlo, por lo que puede quedar sin cargar
   (riesgo H6).

---

## Durante el dia

- Cada accion de una seccion guarda de inmediato (no hay boton de guardar a nivel seccion
  ni debounce). Esto significa rafagas de escritura con senal mala.
- Guarda C5: antes de escribir, save() compara el timestamp de ultima lectura contra el
  remoto y aborta si otro dispositivo modifico la misma clave (deteccion de conflicto).
- Edicion retroactiva: guardar en una fecha anterior o igual a ayer invalida el cache de
  saldo y agenda una reconstruccion de la cadena (debounce 2s).
- Sync cada 10 segundos (linea 8719): refresca las secciones (setSyncKey), actualiza el
  turno si cambio la hora, manda heartbeat cada 30s y detecta cruce de medianoche para
  reconstruir el saldo. Nota: este refresco puede pisar lo que el operario esta tipeando en
  CIP y Stock (riesgos TH5 y TH6).

---

## Modo historico y dia cerrado

Modo historico (mirar un dia que no es hoy):
- Cuando la fecha seleccionada no es hoy, la app muestra un aviso de modo historico. Hoy
  ese aviso es de bajo contraste y poco evidente (riesgo H7).
- Por el bug de fecha en UTC (riesgo T2), durante el turno noche la app puede entrar en modo
  historico aunque sea el turno en curso.
- El selector de fecha permite elegir fechas futuras sin tope (riesgo TH7).

Dia cerrado:
- Al cerrar un dia se guarda :estado con closed=true. save() bloquea cualquier escritura en
  una fecha cerrada (_closedDates) y avisa.
- Limitacion conocida: el bloqueo de solo-lectura no esta conectado en CIP ni en los
  formularios de Movimientos (riesgo TH4): al "mirar" un dia cerrado se puede reescribir un
  registro por un roce, sin senal clara.

---

## Cierre del dia (supervisor / jefe)

handleCerrarDia (linea 8751):
1. Si hay escrituras pendientes en la cola offline, NO deja cerrar y pide esperar a
   "Sincronizado". Esto protege el saldo.
2. Pide confirmacion.
3. Valida el perfil en el handler (no confia en que el boton este oculto).
4. Guarda :estado closed.
5. Toma un snapshot del saldo (calcAutoLitros) y lo registra en auditoria (close_day).
6. Si cierra hoy o ayer, ese saldo pasa a ser la base de SALDO_KEY para manana. Si es un
   cierre retroactivo (dia anterior a ayer), agenda una reconstruccion de la cadena.
7. Sugiere descargar backup.

---

## Reapertura del dia (solo jefe)

handleReabrirDia (linea 8793):
1. Valida que el perfil sea jefe.
2. Pide confirmacion.
3. Guarda :estado closed=false y registra en auditoria (reopen_day).
4. Si el dia es anterior a ayer, agenda reconstruccion de la cadena.

Limitacion conocida (riesgo T7): reabrir un dia de hoy o ayer NO recalcula SALDO_KEY. Si se
edita tras reabrir hoy, el saldo de manana puede no reflejar el cambio. Mitigacion operativa:
volver a cerrar el dia para re-snapshotear el saldo (ver ../operacion/procedimientos-supervisor.md).

---

## Cruce de medianoche

Si la app queda abierta al cruzar la medianoche, el sync de 10s detecta el cambio de dia y
reconstruye SALDO_KEY hasta ayer. Por el riesgo T2 (fecha en UTC) ese cruce ocurre a las
21:00 hora Argentina, no a la medianoche local.

---

## Comportamiento offline

Resumen (detalle en ../arquitectura/comportamiento-offline.md):
- Las escrituras que fallan por red se encolan en localStorage y se reintentan con backoff.
- La sesion puede expirar (401); se intenta refrescar una vez.
- El cierre del dia se bloquea si hay cola pendiente.
- Riesgos abiertos: T1 (la cola puede pisar la ultima carga), T4 (encolar desactiva la
  guarda de conflicto), TH5 (CIP pierde tecleo con el sync).

---

## Identidad y trazabilidad

- El perfil viene de la sesion de Supabase (hay tres: supervisor, jefe, operador). La
  atribucion fina por persona individual esta planificada en UX-V2.md.
- El responsable del turno se guarda en :stock por turno.
- En un dispositivo compartido, la sesion y el responsable persisten entre personas, por lo
  que una operacion puede quedar atribuida a quien no la hizo (riesgo H6).
- Que queda registrado y que no: ver ../auditabilidad/trazabilidad.md.
