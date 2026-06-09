import { createContext, useContext, cloneElement, isValidElement } from "react";
import { tienePermiso } from "../lib/permisos.js";

// Context para identidad + permisos. Consumido por usePerfil() en hooks.js.
//
// Valores:
// - perfil: "supervisor" | "jefe" | "operador" | "oficina" | null
// - operario: { id, nombre, rol? } | null  (capa adicional para identificar
//   quién está operando cuando hay sesión base compartida)
// - permisosExtra: Set<string> | string[] | null (overrides por usuario)
export const PerfilContext = createContext({
  perfil: null,
  operario: null,
  permisosExtra: null,
});

export function PerfilProvider({ perfil, operario, permisosExtra, children }) {
  return (
    <PerfilContext.Provider value={{ perfil, operario, permisosExtra }}>
      {children}
    </PerfilContext.Provider>
  );
}

// Wrapper de UI: muestra children sólo si el perfil tiene el permiso.
// Si no tiene, renderiza fallback (por defecto: nada) o deshabilita el botón
// hijo si modo="disabled".
//
// Uso recomendado para evitar "ahora-ves-ahora-no-ves":
//   <RequierePermiso accion="ingresos.eliminar" modo="disabled" tooltip="…">
//     <button>Eliminar</button>
//   </RequierePermiso>
export function RequierePermiso({ accion, modo = "ocultar", fallback = null, tooltip, children }) {
  const { perfil, permisosExtra } = useContext(PerfilContext);
  if (tienePermiso(perfil, accion, permisosExtra)) return children;

  if (modo === "disabled" && isValidElement(children)) {
    return cloneElement(children, {
      "aria-disabled": true,
      disabled: true,
      title: tooltip || `Necesitás un perfil con permiso "${accion}"`,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      style: {
        ...(children.props.style || {}),
        opacity: 0.5,
        cursor: "not-allowed",
      },
    });
  }
  return fallback;
}
