// ─────────────────────────────────────────────────────────────────────────────
// lib/density.js — Helpers de densidad de leche para Yatasto
//
// Contexto operativo: en planta, los analizadores Ecomilk muestran el valor
// como entero abreviado (28, 29, 30, 31, 34) en lugar del valor técnico
// completo (1.028, 1.029, 1.030, 1.031, 1.034). Operarios escriben lo que
// ven en el display. Estas funciones aceptan ambos formatos y normalizan.
//
// Reglas:
// - Ecomilk: entero en rango [20, 40] (o con decimal — ej. 28.5 → 1.0285).
// - Técnico: float en rango [1.020, 1.040].
// - Cualquier otro valor → inválido.
// - Tolera coma o punto como separador decimal (iOS decimal keyboard usa ",").
// ─────────────────────────────────────────────────────────────────────────────

export function isEcomilkDensity(v) {
  const s = String(v == null ? "" : v).trim().replace(",", ".");
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 20 && n <= 40;
}

// Convierte cualquier formato válido al valor técnico con 3 decimales (4 si Ecomilk con decimal).
export function normalizeDensity(v) {
  if (v === "" || v == null) return "";
  const s = String(v).trim().replace(",", ".");
  if (isEcomilkDensity(s)) {
    const n = parseFloat(s);
    return (1 + n / 1000).toFixed(Number.isInteger(n) ? 3 : 4);
  }
  const n = parseFloat(s);
  return !isNaN(n) ? n.toFixed(3) : String(v);
}

// Para display en auditorías, reportes y exports.
// Retro-compatible: si un registro viejo tuviera "28" guardado, lo convierte al mostrarlo.
export function formatDensity(v) {
  // Misma lógica que normalizeDensity — separadas semánticamente: una es
  // "guardar en formato canónico" y la otra "mostrar al usuario". Si en el
  // futuro queremos formatos distintos por contexto, ya tenemos los hooks.
  return normalizeDensity(v);
}

// Retorna null si el valor es válido; string de error si no.
export function validateDensity(raw) {
  if (raw === "" || raw == null) return null;
  const s = String(raw).trim().replace(",", ".");
  if (isEcomilkDensity(s)) return null; // 20–40 Ecomilk → OK
  const n = parseFloat(s);
  if (isNaN(n)) return "Valor inválido";
  if (n < 1.020 || n > 1.040) return `Fuera de rango (1.020–1.040 ó 20–40 Ecomilk)`;
  return null;
}
