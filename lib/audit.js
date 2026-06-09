// ─────────────────────────────────────────────────────────────────────────────
// lib/audit.js — Trazabilidad de quién creó/editó cada registro
//
// Cuando hay operario activo, cada item nuevo o editado debe registrar:
//   - operarioId   → id estable para auditoría
//   - operarioNombre → nombre legible
//   - savedAt    → ISO de cuándo se persistió
//   - resp       → string visible en la UI (fallback al perfil si no hay operario)
//
// `resp` ya existía para mostrar "Supervisor" o "Jefe" en cards. Se mantiene
// con el operario tomando precedencia: si hay operario activo, resp = nombre.
// Si no, fallback al perfil. Si tampoco, "—".
//
// Backward compat: items sin operarioId siguen mostrándose con su resp legacy.
// ─────────────────────────────────────────────────────────────────────────────

// Mapeo de perfil → label legible (espejo de PERFILES[].label sin requerir
// import circular). Se mantiene mínimo y coordinable con PERFILES.
const PERFIL_LABEL_FALLBACK = {
  supervisor: "Supervisor",
  jefe: "Jefe de Planta",
  operador: "Operador",
  oficina: "Oficina",
};

// Devuelve el `resp` correcto dado el estado de identidad.
// Prioridad: operario.nombre > perfilLabel > perfil key > "—".
export function respFor(operario, perfil, perfilLabel = null) {
  if (operario?.nombre) return operario.nombre;
  if (perfilLabel) return perfilLabel;
  if (perfil && PERFIL_LABEL_FALLBACK[perfil]) return PERFIL_LABEL_FALLBACK[perfil];
  if (perfil) return perfil;
  return "—";
}

// Estampa un item con audit fields. Pure: no muta input.
// Si el item ya tenía operarioId (edición), lo preserva como `operarioIdOriginal`
// para mantener la creación original visible incluso después de ediciones.
export function stampOperario(item, { operario, perfil, perfilLabel = null } = {}) {
  if (!item || typeof item !== "object") return item;
  const stamped = { ...item };
  const ts = new Date().toISOString();

  // resp: visible en cards. Override siempre que haya identidad nueva.
  stamped.resp = respFor(operario, perfil, perfilLabel);

  // Audit fields nuevos
  stamped.savedAt = ts;
  if (operario?.id) {
    // Preservar autor original si ya estaba estampado (edición)
    if (item.operarioId && item.operarioId !== operario.id) {
      stamped.operarioIdOriginal = item.operarioIdOriginal || item.operarioId;
      stamped.operarioNombreOriginal = item.operarioNombreOriginal || item.operarioNombre;
    }
    stamped.operarioId = operario.id;
    stamped.operarioNombre = operario.nombre;
  } else if (perfil) {
    // Sin operario: limpiar fields de operario para no dejar mezcla rara.
    // Pero NO sobreescribir el operarioIdOriginal si existe (auditoría).
    stamped.operarioId = null;
    stamped.operarioNombre = null;
  }

  return stamped;
}

// Estampa cada item de un array (para secciones que persisten arrays).
export function stampLote(items, ctx) {
  if (!Array.isArray(items)) return items;
  return items.map((it) => stampOperario(it, ctx));
}

// Compat helper: dado un item con audit fields, devuelve "Carlos R. (Jefe)"
// o variantes para la UI. Si no hay datos, "—".
export function describirResp(item) {
  if (!item) return "—";
  if (item.operarioNombre && item.resp && item.operarioNombre !== item.resp) {
    return `${item.operarioNombre} · ${item.resp}`;
  }
  return item.resp || item.operarioNombre || "—";
}
