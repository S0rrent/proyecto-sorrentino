// ─────────────────────────────────────────────────────────────────────────────
// lib/produccion.js — Predicados de estado de lotes de producción
//
// Estados canónicos:
//   "envasando"   → en curso, litros reservados (reservados pero no consumidos).
//   "finalizado"  → cerrado, litros consumidos del silo origen.
//
// Estados legacy (compatibilidad con datos viejos):
//   "enviado"     → ALIAS de "envasando" (norma antigua).
//   "cancelado"   → se filtra silenciosamente de vistas activas y dashboard
//                    (no se migra, sólo se ignora).
//
// Reglas para futuros estados: agregar el string al predicado correspondiente,
// no agregar nuevos predicados que se interpreten de otro modo en distintos
// puntos del código.
// ─────────────────────────────────────────────────────────────────────────────

export const isLoteActivo = (estado) =>
  estado === "envasando" || estado === "enviado";

export const isLoteFinalizado = (estado) => estado === "finalizado";

export const isLoteLegacyCancelado = (estado) => estado === "cancelado";
