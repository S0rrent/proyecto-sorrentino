# Pre-mortem — Tanda 3+4: fecha operativa (corte 05:00) y turnos reales

> Zona protegida: la fecha es el prefijo de TODAS las claves de datos.
> Escrito ANTES de tocar código. Decisión de negocio del dueño (2026-07-14):
> corte operativo 05:00, TZ `America/Argentina/Buenos_Aires`, turno noche
> 21–05 completo bajo la fecha en que comenzó.

## Qué se corrige

1. **P0-1**: `getToday()` usa `toISOString()` (UTC) — de 21:00 a 23:59 hora
   argentina la app opera sobre la fecha de MAÑANA, todos los días.
2. **Turnos**: la planta cambió a 05/13/21; la app tiene 07/14/21 hardcodeado.

## Regla nueva

- `getToday()` pasa a devolver el **día operativo**: fecha en TZ
  `America/Argentina/Buenos_Aires` (vía `Intl`, nunca `toISOString`, nunca el
  TZ del dispositivo), menos 1 día si la hora operativa es < 05:00.
- Semántica global: los 35 call sites de `getToday()` significan "el día de
  trabajo de la planta" — cierre, carry-over, retro-check de save, pickers,
  detección de cambio de día: todos pasan juntos a la nueva regla (cambiarlos
  por separado crearía incoherencias entre calendario y operación).
- Turnos con **vigencia por día operativo** (`TURNOS_VIGENCIA_DESDE`):
  días < vigencia → esquema legacy 07/14/21 (los datos históricos de stock
  usan esas horas como CLAVES); días >= vigencia → 05/13/21. Sin migración
  de datos: cada fecha se lee con su propio esquema.

## Qué puede salir mal

1. **Salto de día a las 05:00**: la app abierta cruza las 05:00 → el interval
   de 10s detecta el cambio de `getToday()` y dispara el carry-over (antes
   ocurría a medianoche UTC = 21:00 local, lo peor posible; ahora coincide con
   el cambio de turno mañana — correcto). Riesgo: doble disparo si dos
   dispositivos cruzan juntos → ya mitigado (saveSaldo idempotente sobre la
   misma fecha).
2. **Operaciones 00:00–04:59**: header, guardados, cierre y auditoría caen en
   el día operativo ANTERIOR. Correcto por decisión. El picker con
   `max=getToday()` impide "adelantarse" al día calendario — deseado (el día
   nuevo no existe hasta las 05:00).
3. **Cierre/reapertura**: cerrar a las 03:00 cierra el día operativo (el de
   ayer calendario) — coherente. `date <= yesterday` (retro-check de save y
   rebuild) usa el MISMO getToday → sin falsos retroactivos.
4. **Saldo encadenado / carry-over**: opera sobre strings de fecha puros
   (`getPreviousDate`/`addDay`, aritmética ISO sin TZ) anclados en getToday —
   la cadena sigue siendo continua día a día. NO se toca el motor.
5. **Datos históricos**: NO se migra nada. Artefacto permanente conocido: lo
   cargado entre 21:00 y 23:59 en días previos al deploy quedó bajo la fecha
   siguiente (efecto del bug UTC) — se documenta, no se reescribe.
6. **Día de transición del deploy**: deployar en ventana 09:00–12:00 AR: a esa
   hora fecha UTC = fecha local = día operativo → cero salto visible en el
   momento del deploy. El primer cambio de comportamiento es esa misma noche
   (21:00 ya no salta a mañana; 00:00 ya no cambia de día).
7. **Vigencia de turnos**: `TURNOS_VIGENCIA_DESDE = "2026-07-17"` (primer día
   operativo con esquema nuevo; editable en un solo lugar antes del deploy).
   El día de deploy (16/07) sigue mostrando 07/14/21 (status quo de la app);
   desde el día operativo 17/07 (que comienza el 17/07 a las 05:00) rige
   05/13/21. Un solo cambio comunicable a planta.
   **Gap conocido de la primera madrugada**: el 17/07 de 04:30 a 04:59 el
   banner "¿cambio de turno?" no aparece (el día operativo aún es el 16/07,
   legacy, sin turno a las 05:00) — el banner del turno Mañana nuevo aparece
   desde las 05:00 en punto esa única vez; desde el 18/07 la ventana completa
   04:30–05:30 funciona. Cosmético, una sola vez.
   **Riesgo de bundle viejo**: una tablet con la PWA abierta desde antes del
   deploy puede seguir escribiendo claves legacy (07/14) y fechas UTC en días
   nuevos hasta refrescar. Mitigación operativa: cerrar y reabrir la app en
   todos los dispositivos el 16/07 antes de las 21:00 (checklist de release).
8. **Producción/Movimientos/Ingresos/Cargas/Fortificados/CIP**: ninguna
   sección guarda "turno" en sus items (solo stock usa turnos como claves) —
   para ellas el cambio es únicamente QUÉ fecha es "hoy". Stock: lecturas y
   escrituras usan `turnosDe(date)` → días viejos conservan sus claves.
9. **Exportaciones**: iteran fechas seleccionadas explícitas (sin cambio) y
   leen stock por turnos → deben usar el esquema del día exportado
   (`turnosDe(day)`), si no, los días legacy mostrarían turnos vacíos.
10. **Selector de turno en Stock**: si el tab activo es "05:00" y se navega a
    un día legacy, ese tab no existe → se mapea por posición (Mañana↔Mañana).
11. **Polling/offline**: la fecha operativa se calcula al renderizar/al tick;
    el estado `date` de React se fija al iniciar la operación y NO se recalcula
    a mitad de un formulario → una operación iniciada 04:58 y guardada 05:02
    queda bajo el día en que se inició (deseado). La cola offline guarda claves
    ya resueltas — reconectar no re-fecha nada.
12. **Dispositivo con TZ incorrecta (ej. UTC)**: `Intl` con timeZone pinneado
    da el MISMO día operativo sin importar el TZ del sistema. Un reloj con la
    HORA mal (skew real) sigue siendo un riesgo humano (igual que hoy) — los
    campos `hora` de los items pasan a TZ operativa también (`getNow`).
13. **`Intl.DateTimeFormat` con `hourCycle:"h23"`**: soportado por Chrome 111+
    (piso ya declarado por OKLCH en tokens.js), Node 18 y jsdom.
14. **Ventana de cambio de turno (`useShiftChange`)**: pasa a derivarse del
    esquema vigente del día operativo actual (04:30–05:30 / 12:30–13:30 /
    20:30–21:30 tras la vigencia). Riesgo de banner a las 04:30 del día legacy
    → la ventana usa el esquema del día operativo ACTUAL, no mezcla.
15. **Telemetría**: sus claves diarias usan día UTC propio (analytics, cap y
    retención) — se deja como está, sin impacto operativo. Documentado.

## Rollback

Revert del merge: vuelve el bug UTC y los turnos viejos, sin migración (la
fecha operativa no cambia formatos — solo QUÉ día se considera "hoy"). Los
datos cargados con la regla nueva entre deploy y revert quedarían bajo el día
operativo en que se cargaron (correctos operativamente; el revert no los mueve).
Datos de stock escritos con claves 05/13/21 en días >= vigencia quedarían
ilegibles para el código viejo → revert limpio solo ANTES del primer día
operativo con esquema nuevo (por eso vigencia = día siguiente al deploy).

## Verificación manual pendiente (ventanas nocturnas, no falsificable)

- **21:00–23:59**: header sigue mostrando la fecha de HOY (antes saltaba).
- **00:00–04:59**: header muestra la fecha de AYER calendario (día operativo).
- **05:00 exacto**: la app cambia de día sola (tick ≤10s); carry-over corre;
  banner de cambio de turno visible desde 04:30 (post-vigencia).
