// ─────────────────────────────────────────────────────────────────────────────
// lib/dates.js — Utilidades de fechas para Yatasto
//
// Convención del proyecto (ver CLAUDE.md "Date convention"):
// - Persistencia: ISO 8601 "YYYY-MM-DD" (ASCII-sortable, sin timezone shifts).
// - UI: es-AR "dd/mm/yyyy" (sólo display).
//
// Estas funciones operan sobre strings ISO; la conversión al timezone local
// se hace sólo en la frontera UI (fmtDate). Las funciones que necesitan
// "hoy" / "ahora" leen Date() pero exponen un parámetro `now` opcional para
// hacer tests determinísticos.
// ─────────────────────────────────────────────────────────────────────────────

// Devuelve YYYY-MM-DD del momento dado (default: ahora). Usa el toISOString
// del Date — devuelve UTC. Si necesitás la fecha "del operario" considerá
// el offset local: para Yatasto (es-AR, UTC-3) la diferencia entre fecha
// UTC y local sólo cambia entre 00:00 y 03:00 hora local. La app asume
// la ventana operativa es siempre el día UTC vigente al momento.
export const getToday = (now = new Date()) => now.toISOString().split("T")[0];

// Devuelve la fecha ISO del día anterior a `dateStr` (ej. "2026-06-09" → "2026-06-08").
// Maneja correctamente bordes de mes y año.
export const getPreviousDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

// Inversa: día siguiente.
export const addDay = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

// Lista las últimas N fechas ISO inclusivas hasta hoy, en orden cronológico
// ascendente. getLastNDays(3) hoy=2026-06-09 → ["2026-06-07", "2026-06-08", "2026-06-09"].
export const getLastNDays = (n, now = new Date()) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

// Devuelve todas las fechas ISO entre `from` y `to` inclusive, en orden
// ascendente. Cap defensivo a 90 días para evitar runaway si llegan inputs
// malformados o rangos absurdos en exportadores.
export const getDaysInRange = (from, to) => {
  const days = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end && days.length < 90) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
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

// Formatea Date → "HH:MM" para inputs de hora actuales.
export const getNow = (now = new Date()) =>
  `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
