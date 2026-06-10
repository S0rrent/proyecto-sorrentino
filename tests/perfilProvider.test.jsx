import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PerfilProvider, RequierePermiso } from "../components/PerfilProvider.jsx";
import { ACCIONES } from "../lib/permisos.js";

describe("PerfilProvider — RequierePermiso ocultar (default)", () => {
  it("muestra children cuando el perfil tiene el permiso", () => {
    const { getByText } = render(
      <PerfilProvider perfil="jefe">
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR}>
          <button>Eliminar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(getByText("Eliminar")).toBeTruthy();
  });

  it("oculta children cuando el perfil no tiene el permiso", () => {
    const { queryByText } = render(
      <PerfilProvider perfil="operador">
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR}>
          <button>Eliminar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(queryByText("Eliminar")).toBeNull();
  });

  it("renderiza fallback custom si se provee", () => {
    const { getByText, queryByText } = render(
      <PerfilProvider perfil="operador">
        <RequierePermiso
          accion={ACCIONES.INGRESOS_ELIMINAR}
          fallback={<span>Sin acceso</span>}
        >
          <button>Eliminar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(queryByText("Eliminar")).toBeNull();
    expect(getByText("Sin acceso")).toBeTruthy();
  });

  it("sin provider, no muestra children (perfil null)", () => {
    const { queryByText } = render(
      <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR}>
        <button>Eliminar</button>
      </RequierePermiso>
    );
    expect(queryByText("Eliminar")).toBeNull();
  });
});

describe("PerfilProvider — RequierePermiso modo disabled", () => {
  it("muestra children deshabilitado cuando no tiene permiso", () => {
    const { getByText } = render(
      <PerfilProvider perfil="operador">
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR} modo="disabled">
          <button>Eliminar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    const btn = getByText("Eliminar");
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("inyecta title con el nombre de la acción", () => {
    const { getByText } = render(
      <PerfilProvider perfil="operador">
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR} modo="disabled">
          <button>X</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(getByText("X").getAttribute("title")).toMatch(/permiso/i);
  });

  it("acepta tooltip custom", () => {
    const { getByText } = render(
      <PerfilProvider perfil="operador">
        <RequierePermiso
          accion={ACCIONES.INGRESOS_ELIMINAR}
          modo="disabled"
          tooltip="Pedile al supervisor"
        >
          <button>X</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(getByText("X").getAttribute("title")).toBe("Pedile al supervisor");
  });

  it("cuando tiene permiso, no toca props del child", () => {
    const { getByText } = render(
      <PerfilProvider perfil="jefe">
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR} modo="disabled" tooltip="X">
          <button>OK</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    const btn = getByText("OK");
    expect(btn.hasAttribute("aria-disabled")).toBe(false);
    expect(btn.hasAttribute("disabled")).toBe(false);
    expect(btn.hasAttribute("title")).toBe(false);
  });
});

describe("PerfilProvider — permisosExtra", () => {
  it("acepta permisos extra como array", () => {
    const { getByText } = render(
      <PerfilProvider perfil="operador" permisosExtra={[ACCIONES.INGRESOS_ELIMINAR]}>
        <RequierePermiso accion={ACCIONES.INGRESOS_ELIMINAR}>
          <button>Eliminar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(getByText("Eliminar")).toBeTruthy();
  });

  it("acepta permisos extra como Set", () => {
    const { getByText } = render(
      <PerfilProvider perfil="operador" permisosExtra={new Set([ACCIONES.EXPORTAR])}>
        <RequierePermiso accion={ACCIONES.EXPORTAR}>
          <button>Exportar</button>
        </RequierePermiso>
      </PerfilProvider>
    );
    expect(getByText("Exportar")).toBeTruthy();
  });
});
