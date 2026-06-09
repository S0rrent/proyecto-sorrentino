import { describe, it, expect } from "vitest";
import { respFor, stampOperario, stampLote, describirResp } from "../lib/audit.js";

describe("respFor", () => {
  it("operario tiene precedencia sobre perfil", () => {
    expect(respFor({ id: "x", nombre: "Carlos R." }, "supervisor")).toBe("Carlos R.");
  });

  it("perfilLabel se usa cuando no hay operario", () => {
    expect(respFor(null, "jefe", "Jefe de Planta")).toBe("Jefe de Planta");
  });

  it("perfil sin label usa fallback", () => {
    expect(respFor(null, "jefe")).toBe("Jefe de Planta");
    expect(respFor(null, "supervisor")).toBe("Supervisor");
    expect(respFor(null, "operador")).toBe("Operador");
    expect(respFor(null, "oficina")).toBe("Oficina");
  });

  it("perfil desconocido se imprime tal cual", () => {
    expect(respFor(null, "rolNuevo")).toBe("rolNuevo");
  });

  it("sin identidad → '—'", () => {
    expect(respFor(null, null)).toBe("—");
    expect(respFor(undefined, undefined)).toBe("—");
  });

  it("operario sin nombre cae al perfil", () => {
    expect(respFor({ id: "x" }, "supervisor")).toBe("Supervisor");
  });
});

describe("stampOperario", () => {
  it("inyecta operarioId, operarioNombre, resp, savedAt", () => {
    const item = { hora: "08:00", tambo: 5 };
    const out = stampOperario(item, {
      operario: { id: "op_1", nombre: "Carlos R." },
      perfil: "supervisor",
    });
    expect(out.operarioId).toBe("op_1");
    expect(out.operarioNombre).toBe("Carlos R.");
    expect(out.resp).toBe("Carlos R.");
    expect(out.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(out.hora).toBe("08:00");
    expect(out.tambo).toBe(5);
  });

  it("sin operario, resp = perfilLabel", () => {
    const item = { hora: "08:00" };
    const out = stampOperario(item, { perfil: "jefe", perfilLabel: "Jefe de Planta" });
    expect(out.resp).toBe("Jefe de Planta");
    expect(out.operarioId).toBeNull();
    expect(out.operarioNombre).toBeNull();
  });

  it("es inmutable — no muta input", () => {
    const item = { hora: "08:00" };
    const out = stampOperario(item, { operario: { id: "op_1", nombre: "X" }, perfil: "supervisor" });
    expect(item).toEqual({ hora: "08:00" });
    expect(out).not.toBe(item);
  });

  it("edición por otro operario preserva operarioIdOriginal", () => {
    const original = stampOperario(
      { tambo: 5 },
      { operario: { id: "op_1", nombre: "Original" }, perfil: "supervisor" }
    );
    const edited = stampOperario(original, {
      operario: { id: "op_2", nombre: "Editor" },
      perfil: "supervisor",
    });
    expect(edited.operarioId).toBe("op_2");
    expect(edited.operarioNombre).toBe("Editor");
    expect(edited.operarioIdOriginal).toBe("op_1");
    expect(edited.operarioNombreOriginal).toBe("Original");
  });

  it("edición por el mismo operario NO duplica el original field", () => {
    const original = stampOperario(
      { tambo: 5 },
      { operario: { id: "op_1", nombre: "Carlos" }, perfil: "supervisor" }
    );
    const edited = stampOperario(original, {
      operario: { id: "op_1", nombre: "Carlos" },
      perfil: "supervisor",
    });
    expect(edited.operarioIdOriginal).toBeUndefined();
  });

  it("re-edición preserva el operarioIdOriginal inicial (no se sobreescribe)", () => {
    const v1 = stampOperario({}, { operario: { id: "a", nombre: "A" }, perfil: "x" });
    const v2 = stampOperario(v1, { operario: { id: "b", nombre: "B" }, perfil: "x" });
    const v3 = stampOperario(v2, { operario: { id: "c", nombre: "C" }, perfil: "x" });
    expect(v3.operarioIdOriginal).toBe("a");
    expect(v3.operarioNombreOriginal).toBe("A");
    expect(v3.operarioId).toBe("c");
  });

  it("input null/undefined pasa sin transformar", () => {
    expect(stampOperario(null, { operario: { id: "x" } })).toBeNull();
    expect(stampOperario(undefined, { operario: { id: "x" } })).toBeUndefined();
  });
});

describe("stampLote", () => {
  it("estampa cada item del array", () => {
    const items = [{ tambo: 1 }, { tambo: 2 }, { tambo: 3 }];
    const out = stampLote(items, { operario: { id: "x", nombre: "Op" }, perfil: "supervisor" });
    expect(out).toHaveLength(3);
    for (const item of out) {
      expect(item.operarioId).toBe("x");
      expect(item.operarioNombre).toBe("Op");
    }
  });

  it("retorna input sin tocar si no es array", () => {
    expect(stampLote(null, {})).toBeNull();
    expect(stampLote({ a: 1 }, {})).toEqual({ a: 1 });
  });

  it("no muta el array original", () => {
    const items = [{ tambo: 1 }];
    const out = stampLote(items, { operario: { id: "x", nombre: "Op" } });
    expect(items[0]).toEqual({ tambo: 1 });
    expect(out[0].operarioId).toBe("x");
  });
});

describe("describirResp", () => {
  it("retorna resp si coincide con operarioNombre", () => {
    const item = { resp: "Carlos R.", operarioNombre: "Carlos R." };
    expect(describirResp(item)).toBe("Carlos R.");
  });

  it("retorna 'operarioNombre · resp' si difieren (operario actúa como perfil distinto)", () => {
    const item = { resp: "Supervisor", operarioNombre: "Carlos R." };
    expect(describirResp(item)).toBe("Carlos R. · Supervisor");
  });

  it("retorna resp legacy si no hay operarioNombre", () => {
    expect(describirResp({ resp: "Jefe" })).toBe("Jefe");
  });

  it("fallback a '—'", () => {
    expect(describirResp(null)).toBe("—");
    expect(describirResp({})).toBe("—");
  });
});
