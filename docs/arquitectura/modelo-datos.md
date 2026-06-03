# Modelo de datos

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: claves de almacenamiento, forma de los valores y formato de fecha.

Backend: Supabase, tabla yatasto_storage (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ).
Todo pasa por db.get / db.set / db.list / db.remove (db-adapter.js). El valor siempre es
un string JSON. localStorage se usa solo para un conjunto acotado de claves (ver abajo).

main.jsx tiene un polyfill de window.storage sobre localStorage que es SOLO para preview
standalone; la app real siempre usa db.* (Supabase).

Riesgos relacionados: T2 (formato de fecha), T3 (db.list no pagina), T5 (escritura no
atomica de blobs de auditoria). Ver ../riesgos/registro-hazards.md.

---

## Formato de fecha (invariante)

- Persistencia: ISO YYYY-MM-DD. Es ASCII ordenable y es lo que esperan todas las claves y
  el motor de saldo.
- Presentacion: dd/mm/yyyy via fmtDate (linea 238). NUNCA se persiste en esa forma.
- getToday (linea 230) hoy usa toISOString (UTC) y rota el dia a las 21:00 hora Argentina
  (riesgo T2). getCurrentTurno y getNow si usan hora local.
- Helpers: getPreviousDate, addDay, getLastNDays, getDaysInRange (tope 90 dias).

---

## Claves en Supabase (yatasto_storage)

Datos por dia (clave: yatasto:YYYY-MM-DD:seccion, helper sKey en linea 239):

- :ingresos  -> array de ingresos. Cada item: num, tambo, producto, destino (silo),
  litrosFca, litrosTbo, y parametros de calidad por par Fabrica/Tambo (pH, acidez, GB,
  SNG, densidad, proteina, temperatura, aguado, etc.). id por item.
- :cip       -> registros CIP de limpieza (silos y camiones) con hora, responsable y
  parametros de lavado (alcalino, enjuague, acido, temperatura).
- :carga     -> array de cargas despachadas (CARGA 1/2/3): label, destino, litros,
  siloProveniente, producto, parametros.
- :movimientos -> objeto { movs: [], ctrls: [] }. movs = transferencias silo a silo
  (desde, hasta, litros, perdidaLitros, motivo, loteId si es automatico). ctrls =
  controles de calidad por silo.
- :produccion -> array de lotes (lote, producto, estado [enviado/envasando/finalizado/
  cancelado], origenes, litrosUsados, destinoSobrante, cajas).
- :stock     -> objeto por turno: { "07:00": { ...silos, resp }, "14:00": {...},
  "21:00": {...} }. resp es el responsable de ese turno.
- :fortificados -> array de lotes fortificados (siloOrigen, siloDestino, litrosBase,
  adiciones [{ producto, cantidad, unidad, sourceSilo }], flags P/H).
- :estado    -> { closed, closedAt, closedBy } (helper estadoKey, linea 380). Marca el
  cierre del dia.

Auditoria por dia (clave: yatasto:audit:YYYY-MM-DD, helper auditKey, linea 381):
- array de { ts, action, tipo, resumen, by }. Sin tope. Ver ../auditabilidad/trazabilidad.md.

Claves globales:
- yatasto:config (CFG_KEY) -> { tambosCustom, camionesCustom, transportistas,
  cargaProductosCustom }. Tambos y camiones agregados por el usuario.
- yatasto:saldo-silos (SALDO_KEY) -> { data:{silo:litros}, fromDate, productos, fechas }.
  Fast path encadenado hasta ayer. Derivado y reconstruible.
- yatasto:saldo-base (SALDO_BASE_KEY) -> { data, fromDate, productos }. Ancla manual
  permanente. Ver ./invariantes-motor-saldo.md.
- yatasto:usuarios (USERS_KEY) -> [{ id, nombre, rol, ts }]. Heartbeat de usuarios activos,
  ventana de 120 segundos. Lectura-modificacion-escritura no atomica (riesgo T5).
- yatasto:eliminados (ELIM_KEY) -> [{ fecha, hora, tipo, resumen, by }]. Log global de
  borrados, tope 500 (los mas viejos se caen del log global; el audit por dia los conserva).

---

## Claves en localStorage (solo dispositivo)

- yatasto:theme        -> "dark" | "light".
- yatasto:uxV2         -> "true" activa el endurecimiento tactil de UX-V2 (por defecto
  desactivado; relacionado con riesgo H4). Requiere recargar.
- yatasto:session-restore (SR_KEY) -> estado transitorio { section, date, perfil, nombre }
  para sobrevivir una recarga por nueva version o cambio de tema. Se lee una sola vez al
  cargar. Importante: el perfil real NO se deriva de aca (ver abajo).
- yatasto:ultimo-backup-date -> YYYY-MM-DD del ultimo backup descargado. Se escribe siempre,
  aunque el backup este truncado o cancelado (riesgo T3).
- __yatasto_wq__       -> cola de escrituras offline pendientes (db-adapter). Ver
  ../arquitectura/comportamiento-offline.md.

En sessionStorage:
- yatasto:sid          -> id de sesion del dispositivo (heartbeat de usuarios activos).

---

## Identidad y perfil (importante para auditabilidad)

El perfil se deriva EXCLUSIVAMENTE de la sesion de Supabase Auth: primero user_metadata.rol,
si no, por coincidencia de email en PERFILES. Hay tres perfiles definidos
(recibo_yatasto.jsx:63-67): supervisor, jefe y operador (este ultimo con usuario Auth en
supabase-schema.sql). NO se deriva de localStorage ni de session-restore: esto evita escalar
privilegios editando localStorage en devtools. La clave persistida "perfil" en
session-restore es solo para restaurar la vista tras una recarga, no otorga permisos.

El responsable (resp) de cada turno se guarda dentro de :stock por turno. Lo que esta
planificado en UX-V2.md es una atribucion mas fina por persona individual (login por PIN,
permisos extra) mas alla de los tres perfiles base; por eso hoy la atribucion fina por
persona es limitada (riesgo H6).

---

## Notas

- No duplicar: el detalle de producto/dominio (SILOS, PRODUCTOS, etc.) esta en CLAUDE.md.
  Aca solo se describen las claves de almacenamiento y la forma de los valores.
- El esquema fisico de la tabla esta en supabase-schema.sql.
