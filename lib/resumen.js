// ─────────────────────────────────────────────────────────────────────────────
// lib/resumen.js — Construcción de resúmenes legibles por tipo de registro
//
// Utilizado en:
// - Confirmaciones de eliminación ("¿Eliminar este ingreso?  ABC — 5000 L").
// - Audit log (yatasto:eliminados): registra el resumen del item borrado para
//   trazabilidad post-hoc sin tener que reconstruir el objeto completo.
//
// Reglas:
// - Tipo desconocido → devuelve String(item.id) como fallback (mejor algo que
//   nada en el log).
// - Cada campo opcional usa "?" o "—" si está ausente, nunca undefined/null.
// ─────────────────────────────────────────────────────────────────────────────

export function buildResumen(tipo, item) {
  if (!item) return "";
  if (tipo === "ingreso") {
    return `[${item.num || "-"}] ${item.tambo || "—"} — ${item.litrosFca || 0} L → ${item.destino || "?"}`;
  }
  if (tipo === "carga") {
    return `${item.label || ""} ${item.destino || "—"} — ${item.litros || 0} L desde ${item.siloProveniente || "?"}`;
  }
  if (tipo === "movimiento") {
    return `${item.desde || "?"}→${item.hasta || "?"} — ${item.litros || 0} L${item.motivo ? " (" + item.motivo + ")" : ""}`;
  }
  if (tipo === "control") {
    return `Silo ${item.silo || "?"} — pH ${item.ph || "?"} / ${item.hora || "?"}`;
  }
  if (tipo === "fortificado") {
    return `${item.siloOrigen || "?"}→${item.siloDestino || "?"} — ${item.litrosBase || 0} L${item.paraQue ? " (" + item.paraQue + ")" : ""}`;
  }
  return String(item.id || "");
}
