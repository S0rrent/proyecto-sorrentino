// ─────────────────────────────────────────────────────────────────────────────
// lib/permisos.js — Matriz de permisos por perfil
//
// Single source of truth para decidir qué puede hacer cada rol. La doc
// de referencia es UX-V2.md §2.2 (matriz 8×4 perfil × acción).
//
// Convención de acciones: "<seccion>.<verbo>". El verbo "leer" es implícito
// para todos los perfiles autenticados (los listados son visibles); la matriz
// sólo restringe ESCRITURAS, ELIMINACIONES y OPERACIONES PRIVILEGIADAS.
//
// Migración: el código actual usa `perfil === "supervisor" || perfil === "jefe"`
// inline (~10 sitios). Estos checks se mantendrán en paralelo hasta que el
// refactor a tienePermiso() esté completo. La función está diseñada para que
// los reemplazos sean drop-in.
//
// IMPORTANTE: la decisión de seguridad sigue siendo server-side (RLS en
// Supabase). Este módulo es UX/visibilidad, no la única defensa.
// ─────────────────────────────────────────────────────────────────────────────

// Acciones definidas. Si agregás una nueva, declarala acá y en cada perfil.
export const ACCIONES = Object.freeze({
  // Crear/editar registros operativos del día
  INGRESOS_ESCRIBIR: "ingresos.escribir",
  MOVIMIENTOS_ESCRIBIR: "movimientos.escribir",
  CARGA_ESCRIBIR: "carga.escribir",
  FORTIFICADOS_ESCRIBIR: "fortificados.escribir",
  CIP_ESCRIBIR: "cip.escribir",
  STOCK_ESCRIBIR_MANUAL: "stock.escribir_manual",
  PRODUCCION_ENVASAR: "produccion.envasar",
  PRODUCCION_FINALIZAR: "produccion.finalizar",

  // Eliminación (más restrictivo que escritura)
  INGRESOS_ELIMINAR: "ingresos.eliminar",
  MOVIMIENTOS_ELIMINAR: "movimientos.eliminar",
  CARGA_ELIMINAR: "carga.eliminar",
  FORTIFICADOS_ELIMINAR: "fortificados.eliminar",
  STOCK_ELIMINAR: "stock.eliminar",
  PRODUCCION_ELIMINAR: "produccion.eliminar",

  // Operaciones privilegiadas
  DIA_CERRAR: "dia.cerrar",
  DIA_REABRIR: "dia.reabrir",
  CIP_FORZAR: "cip.forzar",
  SALDO_BASE_EDITAR: "saldo_base.editar",
  FECHA_CAMBIAR: "fecha.cambiar",

  // Vistas restringidas
  DASHBOARD_VER: "dashboard.ver",
  AUDITORIA_VER: "auditoria.ver",
  PANEL_TECNICO_VER: "panel_tecnico.ver",
  USUARIOS_GESTIONAR: "usuarios.gestionar",
  EXPORTAR: "exportar",

  // Step-up (acción requiere PIN de un usuario con este bit aunque la sesión no lo tenga)
  AUTORIZAR_STEP_UP: "autorizar_step_up",
});

// Matriz: { perfil: Set<accion> }
// - jefe: todo.
// - supervisor: operación + cierre día + dashboard + step-up; NO usuarios ni panel técnico ni reabrir día.
// - operador (operario): crear/editar día actual; NO eliminar, NO cierre, NO dashboard, NO exportar.
// - oficina (futuro, no implementado): leer + exportar; NO escribir nada operativo.
//
// Para mantener la matriz auditable, listamos explícitamente cada permiso por perfil.
const A = ACCIONES;

export const PERMISOS_POR_PERFIL = Object.freeze({
  jefe: new Set([
    A.INGRESOS_ESCRIBIR, A.MOVIMIENTOS_ESCRIBIR, A.CARGA_ESCRIBIR, A.FORTIFICADOS_ESCRIBIR,
    A.CIP_ESCRIBIR, A.STOCK_ESCRIBIR_MANUAL, A.PRODUCCION_ENVASAR, A.PRODUCCION_FINALIZAR,
    A.INGRESOS_ELIMINAR, A.MOVIMIENTOS_ELIMINAR, A.CARGA_ELIMINAR, A.FORTIFICADOS_ELIMINAR,
    A.STOCK_ELIMINAR, A.PRODUCCION_ELIMINAR,
    A.DIA_CERRAR, A.DIA_REABRIR, A.CIP_FORZAR, A.SALDO_BASE_EDITAR, A.FECHA_CAMBIAR,
    A.DASHBOARD_VER, A.AUDITORIA_VER, A.PANEL_TECNICO_VER, A.USUARIOS_GESTIONAR, A.EXPORTAR,
    A.AUTORIZAR_STEP_UP,
  ]),
  supervisor: new Set([
    A.INGRESOS_ESCRIBIR, A.MOVIMIENTOS_ESCRIBIR, A.CARGA_ESCRIBIR, A.FORTIFICADOS_ESCRIBIR,
    A.CIP_ESCRIBIR, A.STOCK_ESCRIBIR_MANUAL, A.PRODUCCION_ENVASAR, A.PRODUCCION_FINALIZAR,
    A.INGRESOS_ELIMINAR, A.MOVIMIENTOS_ELIMINAR, A.CARGA_ELIMINAR, A.FORTIFICADOS_ELIMINAR,
    A.STOCK_ELIMINAR,
    A.DIA_CERRAR, A.CIP_FORZAR, A.FECHA_CAMBIAR,
    A.DASHBOARD_VER, A.AUDITORIA_VER, A.EXPORTAR,
    A.AUTORIZAR_STEP_UP,
  ]),
  operador: new Set([
    A.INGRESOS_ESCRIBIR, A.MOVIMIENTOS_ESCRIBIR, A.CARGA_ESCRIBIR, A.FORTIFICADOS_ESCRIBIR,
    A.CIP_ESCRIBIR,
  ]),
  oficina: new Set([
    A.EXPORTAR, A.DASHBOARD_VER, A.AUDITORIA_VER,
  ]),
});

// Helper canónico: ¿el perfil tiene este permiso?
// Acepta perfil null/undefined → false (sesión no resuelta o no autenticada).
// Permisos extra (por operario individual) se pueden inyectar como segundo Set.
export function tienePermiso(perfil, accion, permisosExtra = null) {
  if (!perfil || !accion) return false;
  const base = PERMISOS_POR_PERFIL[perfil];
  if (base?.has(accion)) return true;
  if (permisosExtra instanceof Set && permisosExtra.has(accion)) return true;
  if (Array.isArray(permisosExtra) && permisosExtra.includes(accion)) return true;
  return false;
}

// Helper para checks compuestos: "supervisor o jefe" se vuelve "tieneAlguno(perfil, [a, b])".
export function tieneAlguno(perfil, acciones, permisosExtra = null) {
  return acciones.some((a) => tienePermiso(perfil, a, permisosExtra));
}
