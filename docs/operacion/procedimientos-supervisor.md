# Procedimientos para supervisor y jefe

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: tareas de control (cierre, inconsistencias, backup, reapertura, saldo) y que mirar.

Riesgos relacionados: T3, T5, T6, T7 (ver ../riesgos/registro-hazards.md).

---

## Cerrar el dia correctamente

1. Antes de cerrar, revisar inconsistencias (ver abajo).
2. Verificar el indicador de conexion: debe decir "Sincronizado" (cola en cero). El sistema
   bloquea el cierre si hay escrituras pendientes, para que el saldo quede correcto.
3. Cerrar. Queda registrado en auditoria (close_day) con el saldo total snapshotado.
4. Descargar el backup que sugiere la app (ver "Backup").

---

## Revisar inconsistencias

El detector (runConsistencyChecks) corre sobre una fecha y devuelve avisos de tipo error o
warning. Que detecta y que hacer:

- Stock negativo en un silo: posible doble descuento o saldo inicial mal cargado. Revisar
  los movimientos y cargas del silo ese dia; revisar SALDO_BASE_KEY.
- Reservados mayores al total del silo: hay un lote envasando con litros que ya no estan en
  el silo. Revisar el lote en Produccion.
- Lote finalizado con usados mayores a enviados: corregir los litros del lote.
- Lote finalizado sin litros usados: el motor cae al fallback de origenes; completar litros
  usados.
- Lote envasando sin silos origen: completar origenes.
- Rendimiento mayor a 105 por ciento: el envasado supera lo usado; revisar cajas o litros.
- Movimiento automatico huerfano o duplicado: vincula a un lote inexistente o hay mas de uno
  por lote. Revisar Produccion y Movimientos.
- Cadena de saldo truncada: el saldo base puede ser muy antiguo (mas de 365 dias de cadena).
  Considerar cargar un nuevo SALDO_BASE_KEY mas reciente.

Recomendacion: correr este chequeo antes de cerrar el dia. Hoy es facil cerrar sin haberlo
mirado; conviene hacerlo habito.

---

## Backup

- Generar backup con regularidad (la app lo sugiere al cerrar el dia).
- ATENCION (riesgo T3): el backup se trunca en silencio alrededor de 1000 registros. Ese tope
  lo impone el limite por defecto del servidor (PostgREST max-rows), no una constante de la
  app. Antes de confiar en un backup, abrir el archivo y verificar total_registros contra la
  cantidad real de claves. Si esta cerca o llega a 1000, el backup esta incompleto.
- No confiar en la fecha de "ultimo backup": se marca aunque el backup este truncado o la
  descarga se cancele (riesgo T3).
- Guardar el backup fuera del dispositivo (no dejarlo solo en la tablet de planta).

---

## Reabrir un dia (solo jefe)

- Reabrir registra en auditoria (reopen_day).
- ATENCION (riesgo T7): reabrir un dia de hoy o ayer NO recalcula el saldo (SALDO_KEY). Si
  editas registros tras reabrir hoy, el saldo de manana puede no reflejarlos.
- Procedimiento seguro: tras editar un dia reabierto que sea hoy o ayer, volver a cerrar el
  dia. El cierre re-snapshotea el saldo correcto.
- Reabrir un dia anterior a ayer dispara la reconstruccion automatica de la cadena.

---

## Saldo inicial (SALDO_BASE_KEY)

- Es el ancla manual del saldo de silos. Cambiarlo recalcula toda la cadena de dias hasta
  hoy. Es zona protegida (ver ../arquitectura/invariantes-motor-saldo.md).
- Cargarlo o cambiarlo solo con datos verificados de un conteo fisico, y de preferencia en
  un dia tranquilo, no en medio de la operacion.

---

## Seguridad y acceso

- ATENCION (riesgo T6): los roles (supervisor / jefe / operador) se aplican solo en el
  cliente, ocultando botones. No son una barrera real: un usuario autenticado puede modificar
  datos saltando la UI. Mientras esto no se mueva al servidor, el control efectivo es el
  acceso fisico al dispositivo y las credenciales.
- Rotar las contrasenas (hubo una filtrada en el historial del repositorio; ver T6 y el
  hallazgo de auditoria security-1). Nunca versionar la service_role key.
- Pedir a cada operario que registre su nombre por turno; hoy es la unica atribucion por
  persona (riesgo H6).
- ATENCION (riesgo T5): el registro de auditoria puede perder entradas si dos dispositivos
  escriben casi a la vez (escritura no atomica). No asumir que el log es exhaustivo en
  jornadas de mucha concurrencia.

---

## Que mirar cada dia (resumen)

- Conexion en "Sincronizado" antes de cerrar.
- Inconsistencias en cero (o resueltas) antes de cerrar.
- Backup descargado y verificado (total_registros).
- Responsable cargado en cada turno.
