// ─────────────────────────────────────────────────────────────────────────────
// lib/helpers.js — funciones puras compartidas entre recibo_yatasto.jsx y tests
//
// Reglas:
// - Sólo funciones puras (sin side effects, sin I/O, sin acceso a localStorage).
// - Resultado determinístico dadas las mismas entradas.
// - Cualquier cambio aquí impacta cálculos visibles al operario: tener tests.
// ─────────────────────────────────────────────────────────────────────────────

// Deriva el label canónico de un lote fort según sus flags de proceso.
// Pura — sin side effects. Siempre usa ?? false para compat con datos viejos.
export const buildFortLabel = (fort) => {
  const p = fort?.pasteurizado ?? false;
  const h = fort?.homogeneizado ?? false;
  if (p && h) return "Leche PyH";
  if (p) return "Leche Pasteurizada";
  if (h) return "Leche Homogeneizada";
  return "Leche Fortificada";
};

// Diferencia en días entre dos fechas ISO "YYYY-MM-DD". Resultado positivo = to es posterior.
export const diffDays = (from, to) => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
};

// Badge SF+N: null si no hay fecha o inconsistencia.
export const calcSF = (fechaSilo, today) => {
  if (!fechaSilo || !today) return null;
  const d = diffDays(fechaSilo, today);
  if (d < 0 || d > 999) return null;
  return d === 0 ? "SF" : `SF+${d}`;
};

// Familia "Suero-like": suero y sus permeados comparten parámetros, color base, SF, form simplificado y disponibilidad en carga.
export const isSueroLike = (p) =>
  p === "Suero" || p === "Permeado" || p === "Permeado de Suero" || p === "Permeado de Lactosa";

// SF solo aplica a productos sin procesar. Productos industrializados no muestran antigüedad de materia prima.
export const shouldShowSF = (producto) => producto === "Leche Cruda" || isSueroLike(producto);

// Conversión de unidad de adición → litros equivalentes para el balance
// del silo destino y para el descuento opcional del sourceSilo.
// Asunción: densidad ~1 g/mL (válida para insumos lácteos típicos).
//   L, kg → 1:1 con litros.
//   mL, cc, g → /1000.
//   mg → /1_000_000.
//   Otra unidad → 0 (no contribuye al balance).
// Devuelve siempre >= 0 (cantidad negativa o NaN → 0).
export const adicionLitros = (unidad, cantidad) => {
  const qty = parseFloat(cantidad) || 0;
  if (qty <= 0) return 0;
  switch (unidad) {
    case "L":  return qty;
    case "mL": return qty / 1000;
    case "cc": return qty / 1000;
    case "kg": return qty;
    case "g":  return qty / 1000;
    case "mg": return qty / 1000000;
    default:   return 0;
  }
};
