# Trazabilidad y auditoria

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: que queda registrado, que no, con que limites, y donde estan los huecos.

Prioridad del proyecto: auditabilidad. Este documento deja explicito que se puede
reconstruir despues y que no. Riesgos relacionados: T3, T5, T6, H6, H8, TH10 (ver
../riesgos/registro-hazards.md).

---

## Que se registra hoy

Auditoria por dia (yatasto:audit:YYYY-MM-DD, funcion logAudit, linea 389):
- Cada entrada: ts (ISO), action, tipo, resumen, by (etiqueta de perfil o "Operario").
- Sin tope de tamano.
- Acciones que llaman logAudit hoy:
  - close_day: cierre de dia, con snapshot del saldo total.
  - reopen_day: reapertura de dia.
  - delete: cualquier borrado (via logDelete).
  - forzado de silo con CIP pendiente (el ingreso forzado por CIP si audita).
  - Produccion: alta y edicion de lote (nueva_produccion / actualizar_produccion), sobrante
    automatico (mov_sobrante_produccion), envasado desde Stock y borrado de lote
    (eliminar_produccion / eliminar_produccion_finalizada). Produccion es la unica seccion
    que audita altas y ediciones, no solo borrados.

Log global de borrados (yatasto:eliminados, funcion logDelete, linea 517):
- Cada entrada: fecha, hora, tipo, resumen, by.
- Tope de 500 entradas (los borrados mas viejos se caen del log global, pero el audit por
  dia los conserva).
- logDelete escribe en el log global y ademas llama logAudit con action delete.

Usuarios activos (yatasto:usuarios, heartbeat): id de sesion, nombre, rol, timestamp;
ventana de 120 segundos. Sirve para ver quien esta conectado, no es un log historico.

---

## Que NO se registra (huecos)

- Forzar un ingreso con aguado: el modal promete que queda en el historial, pero el guardado
  forzado NO llama a logAudit (a diferencia del forzado por CIP, que si audita). Un ingreso
  con posible adulteracion puede guardarse sin rastro de quien lo autorizo (riesgo TH10).
- Altas y ediciones normales (fuera de Produccion): crear o editar un ingreso, movimiento,
  carga, stock o fortificado NO genera entrada de auditoria. Si se auditan los borrados, el
  cierre/reapertura de dia, el forzado por CIP y TODA la actividad de Produccion (ver arriba).
  Es decir, "quien cargo o edito que" no esta en el log para la operacion normal, salvo en
  Produccion.
- Atribucion por persona: hay tres perfiles base (supervisor, jefe, operador), pero el unico
  dato de identidad por operacion es el campo resp del turno en :stock. La atribucion fina por
  persona individual (mas alla de los tres perfiles) esta planificada en UX-V2.md. En
  dispositivo compartido la atribucion es ambigua (riesgo H6).

---

## Limites de integridad del registro

- Escritura no atomica (riesgo T5): logAudit y logDelete leen el blob, agregan una entrada y
  reescriben. Dos escrituras casi simultaneas desde dispositivos distintos se pisan y se
  pierden entradas de auditoria. updateHeartbeat tiene el mismo patron.
- Roles solo en el cliente (riesgo T6): las politicas de la base solo validan que haya
  sesion. Un usuario autenticado puede, desde la consola del navegador, borrar o reescribir
  cualquier clave saltando la UI, las confirmaciones y la auditoria. El registro de
  auditoria no es a prueba de manipulacion mientras la autorizacion sea solo client-side.
- Backup truncado (riesgo T3): generateBackup vuelca todas las claves yatasto:* pero db.list
  no pagina y corta en 1000 filas; ademas marca la fecha de ultimo backup siempre, aunque el
  backup este incompleto o el usuario cancele la descarga. Verificar total_registros antes de
  confiar en un backup (ver ../operacion/procedimientos-supervisor.md).
- Botones destructivos sin gating real (riesgo H8): el boton Eliminar se muestra a perfiles
  sin permiso y el guard recien corta en el handler (no-op silencioso). No genera registro,
  pero confunde y dispara reintentos.

---

## Que se puede reconstruir despues

- Saldo de silos: reconstruible desde SALDO_BASE_KEY mas los datos diarios
  (ver ../arquitectura/invariantes-motor-saldo.md).
- Cierres y reaperturas de dia: si, via audit por dia.
- Borrados: si, via audit por dia (sin tope) y log global (ultimos 500).
- Quien cargo o edito un lote de Produccion: SI (Produccion audita alta y edicion).
- Quien cargo o edito un registro de Ingresos, Movimientos, Carga, Stock o Fortificados: NO
  de forma confiable hoy.
- Quien autorizo un ingreso con aguado: NO (riesgo TH10).

---

## Mejoras de auditabilidad sugeridas (conservadoras)

Detalle y priorizacion en ../riesgos/guardrails-roadmap.md. Resumen:
- Auditar el override de aguado, igual que ya se audita el forzado por CIP (cierra TH10).
- Mover la autorizacion por rol al servidor para que la auditoria no se pueda saltar (T6).
- Append atomico para auditoria (server-side) para no perder entradas concurrentes (T5).
- Detectar y avisar backup truncado antes de marcarlo como hecho (T3).
- Avanzar el perfil operario individual de UX-V2.md para atribucion por persona (H6).
