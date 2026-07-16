// ─────────────────────────────────────────────────────────────────────────────
// lib/dates.js — Fechas operativas para Yatasto
//
// Convención del proyecto (ver CLAUDE.md "Date convention"):
// - Persistencia: ISO 8601 "YYYY-MM-DD" (ASCII-sortable, sin timezone shifts).
// - UI: es-AR "dd/mm/yyyy" (sólo display).
//
// DÍA OPERATIVO (Tanda 3, decisión de negocio 2026-07-14):
// - Zona operativa: America/Argentina/Buenos_Aires — pinneada vía Intl, nunca
//   el TZ del dispositivo (un tablet mal configurado no debe partir el día) y
//   nunca toISOString (el bug P0-1: de 21:00 a 23:59 la app operaba sobre la
//   fecha UTC de mañana).
// - Corte operativo: 05:00. De 00:00 a 04:59 la operación pertenece al día
//   operativo ANTERIOR — el turno noche 21:00–05:00 queda completo bajo la
//   fecha en la que comenzó.
//
// Todas las funciones que leen "ahora" aceptan `now` inyectable para tests.
// ─────────────────────────────────────────────────────────────────────────────

export const TZ_OPERATIVA = "America/Argentina/Buenos_Aires";
export const CORTE_OPERATIVO_HORA = 5;

// Fecha y hora del instante `now` en la zona operativa, sin depender del TZ
// del dispositivo. hourCycle h23 evita el "24:00" de algunos engines.
const _fmtOperativo = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_OPERATIVA,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function partesOperativas(now = new Date()) {
  const p = Object.fromEntries(_fmtOperativo.formatToParts(now).map(x => [x.type, x.value]));
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: parseInt(p.hour, 10),
    minuto: parseInt(p.minute, 10),
  };
}

// ── Aritmética pura de calendario sobre strings ISO ──────────────────────────
// Interna en UTC-midnight exacto: toISOString sobre un Date construido con
// Date.UTC es aritmética de calendario pura, sin dependencia del TZ del runner.
const _fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const _toISO = (dt) => dt.toISOString().slice(0, 10);

// DÍA OPERATIVO del instante dado. Ejemplos (hora argentina):
//   14/07 20:59 → 14/07 · 14/07 21:00 → 14/07 · 14/07 23:59 → 14/07
//   15/07 00:00 → 14/07 · 15/07 04:59 → 14/07 · 15/07 05:00 → 15/07
export const getToday = (now = new Date()) => {
  const { fecha, hora } = partesOperativas(now);
  if (hora < CORTE_OPERATIVO_HORA) return getPreviousDate(fecha);
  return fecha;
};

// Devuelve la fecha ISO del día anterior (ej. "2026-06-09" → "2026-06-08").
// Maneja bordes de mes, año y bisiestos.
export const getPreviousDate = (dateStr) => {
  const d = _fromISO(dateStr);
  d.setUTCDate(d.getUTCDate() - 1);
  return _toISO(d);
};

// Inversa: día siguiente.
export const addDay = (dateStr) => {
  const d = _fromISO(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return _toISO(d);
};

// Lista las últimas N fechas ISO inclusivas hasta el día operativo actual,
// en orden ascendente. Ancla en getToday(now) — coherente con el corte 05:00.
export const getLastNDays = (n, now = new Date()) => {
  const days = [];
  let d = getToday(now);
  for (let i = 0; i < n; i++) {
    days.unshift(d);
    d = getPreviousDate(d);
  }
  return days;
};

// Devuelve todas las fechas ISO entre `from` y `to` inclusive, en orden
// ascendente. Cap defensivo a 90 días para evitar runaway si llegan inputs
// malformados o rangos absurdos en exportadores. Inputs no-ISO (p.ej. "" del
// botón Borrar del date picker nativo) → [] — mismo contrato que la versión
// anterior; sin esto, addDay("") lanzaría en pleno render.
const _ES_ISO = /^\d{4}-\d{2}-\d{2}$/;
export const getDaysInRange = (from, to) => {
  if (!_ES_ISO.test(from || "") || !_ES_ISO.test(to || "")) return [];
  const days = [];
  let cur = from;
  while (cur <= to && days.length < 90) {
    days.push(cur);
    cur = addDay(cur);
  }
  return days;
};

// Formatea ISO → es-AR "dd/mm/yyyy". Sólo para display, nunca para persistir.
export const fmtDate = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

// "HH:MM" en la zona OPERATIVA (no la del dispositivo) — un tablet con el
// reloj en UTC no debe estampar horas corridas en los registros.
export const getNow = (now = new Date()) => {
  const { hora, minuto } = partesOperativas(now);
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
};
