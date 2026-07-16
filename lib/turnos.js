// ─────────────────────────────────────────────────────────────────────────────
// lib/turnos.js — Turnos con vigencia por día operativo (Tanda 4)
//
// La planta cambió sus turnos a Mañana 05–13 / Tarde 13–21 / Noche 21–05.
// Los datos históricos de stock usan las horas VIEJAS ("07:00"/"14:00"/"21:00")
// como CLAVES de datos — no se migran ni se reinterpretan: cada día operativo
// se lee y escribe con el esquema vigente EN ESA FECHA.
//
// La clave "21:00" existe en ambos esquemas (misma string, distinta ventana):
// no hay conflicto porque el esquema se resuelve por la fecha del documento.
// ─────────────────────────────────────────────────────────────────────────────
import { getToday, partesOperativas } from "./dates.js";

// Primer DÍA OPERATIVO que usa el esquema nuevo. Editable en este único punto
// antes del deploy. Recomendación: el día operativo SIGUIENTE al del deploy,
// para que el cambio arranque limpio a las 05:00 y sea comunicable a planta.
// (Deploy previsto 2026-07-16 en ventana 09-12 AR → vigencia 2026-07-17.)
export const TURNOS_VIGENCIA_DESDE = "2026-07-17";

// inicio: hora operativa (0-23) en la que arranca el turno.
// La noche cruza medianoche: va de su inicio hasta el inicio de Mañana.
const ESQUEMA_LEGACY = [
  { key: "07:00", label: "Mañana", inicio: 7 },
  { key: "14:00", label: "Tarde", inicio: 14 },
  { key: "21:00", label: "Noche", inicio: 21 },
];
const ESQUEMA_ACTUAL = [
  { key: "05:00", label: "Mañana", inicio: 5 },
  { key: "13:00", label: "Tarde", inicio: 13 },
  { key: "21:00", label: "Noche", inicio: 21 },
];

export function esquemaDe(dateISO) {
  return dateISO >= TURNOS_VIGENCIA_DESDE ? ESQUEMA_ACTUAL : ESQUEMA_LEGACY;
}

// Claves de turno del día (también son las claves del doc de stock).
export function turnosDe(dateISO) {
  return esquemaDe(dateISO).map(t => t.key);
}

export function turnoLabelsDe(dateISO) {
  return Object.fromEntries(esquemaDe(dateISO).map(t => [t.key, t.label]));
}

// Hora en la que cierra cada turno (= inicio del siguiente; la noche cierra
// cuando arranca la mañana). Sólo display.
export function turnoCierreDe(dateISO) {
  const ts = esquemaDe(dateISO);
  return Object.fromEntries(ts.map((t, i) => [t.key, ts[(i + 1) % ts.length].key]));
}

// Turno en curso para el instante dado, según el esquema del DÍA OPERATIVO de
// ese instante (a las 02:00 el día operativo es el de ayer calendario, y el
// turno es la Noche de ese día).
export function turnoActual(now = new Date()) {
  const esquema = esquemaDe(getToday(now));
  const { hora } = partesOperativas(now);
  const [maniana, tarde, noche] = esquema;
  if (hora >= noche.inicio || hora < maniana.inicio) return noche.key;
  if (hora >= tarde.inicio) return tarde.key;
  return maniana.key;
}

// Inicios de turno del día operativo actual, para la ventana "¿cambio de
// turno?" (±30 min) de useShiftChange.
export function iniciosDeTurno(now = new Date()) {
  return esquemaDe(getToday(now)).map(t => ({ key: t.key, inicio: t.inicio }));
}

// Normaliza un turno seleccionado al esquema del día dado (por posición:
// Mañana↔Mañana). Para que el tab elegido sobreviva al navegar entre fechas
// con esquemas distintos.
export function normalizarTurno(turnoKey, dateISO) {
  const hasta = esquemaDe(dateISO);
  if (hasta.some(t => t.key === turnoKey)) return turnoKey;
  const otro = hasta === ESQUEMA_ACTUAL ? ESQUEMA_LEGACY : ESQUEMA_ACTUAL;
  const idx = otro.findIndex(t => t.key === turnoKey);
  return idx >= 0 ? hasta[idx].key : hasta[0].key;
}

// Unión de claves de ambos esquemas, en orden mañana→noche. Para LECTURAS que
// recorren docs de stock de fechas variadas (informes, dashboard): cada doc
// solo contiene las claves de su propio esquema, así que leer la unión es
// equivalente a leer el esquema exacto del día.
export const TURNOS_TODAS_LAS_CLAVES = ["05:00", "07:00", "13:00", "14:00", "21:00"];
