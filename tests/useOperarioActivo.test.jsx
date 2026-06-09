import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useOperarioActivo, loadOperarioActivo, saveOperarioActivo } from "../hooks.js";

function Probe({ exposeApi }) {
  const [op, setOp] = useOperarioActivo();
  exposeApi({ op, setOp });
  return null;
}

describe("useOperarioActivo", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("retorna null cuando no hay operario en sessionStorage", () => {
    let api;
    render(<Probe exposeApi={(a) => { api = a; }} />);
    expect(api.op).toBeNull();
  });

  it("retorna el operario cargado desde sessionStorage al montar", () => {
    sessionStorage.setItem(
      "yatasto:operario_activo",
      JSON.stringify({ id: "op_1", nombre: "Carlos R.", rol: "operador" })
    );
    let api;
    render(<Probe exposeApi={(a) => { api = a; }} />);
    expect(api.op).toEqual({ id: "op_1", nombre: "Carlos R.", rol: "operador" });
  });

  it("setOp persiste en sessionStorage y dispara re-render", () => {
    let api;
    render(<Probe exposeApi={(a) => { api = a; }} />);
    expect(api.op).toBeNull();

    act(() => { api.setOp({ id: "op_2", nombre: "Lucía", rol: "supervisor" }); });
    expect(api.op).toEqual({ id: "op_2", nombre: "Lucía", rol: "supervisor" });

    const stored = JSON.parse(sessionStorage.getItem("yatasto:operario_activo"));
    expect(stored).toEqual({ id: "op_2", nombre: "Lucía", rol: "supervisor" });
  });

  it("setOp(null) limpia el sessionStorage y el estado", () => {
    sessionStorage.setItem(
      "yatasto:operario_activo",
      JSON.stringify({ id: "op_1", nombre: "X" })
    );
    let api;
    render(<Probe exposeApi={(a) => { api = a; }} />);
    expect(api.op).not.toBeNull();

    act(() => { api.setOp(null); });
    expect(api.op).toBeNull();
    expect(sessionStorage.getItem("yatasto:operario_activo")).toBeNull();
  });

  it("ignora operarios con shape inválido (sin id o sin nombre)", () => {
    sessionStorage.setItem("yatasto:operario_activo", JSON.stringify({ id: "x" })); // sin nombre
    let api;
    render(<Probe exposeApi={(a) => { api = a; }} />);
    expect(api.op).toBeNull();
  });

  it("ignora sessionStorage corrupto sin tirar", () => {
    sessionStorage.setItem("yatasto:operario_activo", "{ JSON inválido");
    let api;
    expect(() => render(<Probe exposeApi={(a) => { api = a; }} />)).not.toThrow();
    expect(api.op).toBeNull();
  });
});

describe("loadOperarioActivo / saveOperarioActivo (helpers puros)", () => {
  beforeEach(() => sessionStorage.clear());

  it("loadOperarioActivo retorna null sin storage", () => {
    expect(loadOperarioActivo()).toBeNull();
  });

  it("saveOperarioActivo persiste y loadOperarioActivo lo recupera", () => {
    saveOperarioActivo({ id: "x", nombre: "Y" });
    expect(loadOperarioActivo()).toEqual({ id: "x", nombre: "Y" });
  });

  it("saveOperarioActivo(null) limpia el storage", () => {
    saveOperarioActivo({ id: "x", nombre: "Y" });
    saveOperarioActivo(null);
    expect(loadOperarioActivo()).toBeNull();
  });
});
