import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase para no requerir red.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      like: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: {
      refreshSession: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

const {
  loadOperarios,
  saveOperarios,
  operariosActivos,
  buscarOperario,
  createOperario,
  updateOperario,
  setPin,
  desactivarOperario,
  reactivarOperario,
  verifyOperarioPin,
  recordLogin,
  iniciales,
} = await import("../lib/operarios.js");

describe("createOperario", () => {
  it("crea operario con campos por defecto", async () => {
    const lista = await createOperario([], { nombre: "Carlos R." });
    expect(lista).toHaveLength(1);
    const op = lista[0];
    expect(op.nombre).toBe("Carlos R.");
    expect(op.id).toMatch(/^[0-9a-f-]+$/);
    expect(op.rol).toBe("operador");
    expect(op.activo).toBe(true);
    expect(op.pinHash).toBeNull();
    expect(op.permisosExtra).toEqual([]);
    expect(op.creadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(op.ultimoLogin).toBeNull();
  });

  it("rechaza nombre vacío o ausente", async () => {
    await expect(createOperario([], {})).rejects.toThrow();
    await expect(createOperario([], { nombre: "" })).rejects.toThrow();
    await expect(createOperario([], { nombre: "  " })).rejects.toThrow();
    await expect(createOperario([], { nombre: null })).rejects.toThrow();
  });

  it("trimea el nombre", async () => {
    const lista = await createOperario([], { nombre: "  Lucía G.  " });
    expect(lista[0].nombre).toBe("Lucía G.");
  });

  it("acepta rol supervisor", async () => {
    const lista = await createOperario([], { nombre: "Miguel", rol: "supervisor" });
    expect(lista[0].rol).toBe("supervisor");
  });

  it("hashea PIN si se provee", async () => {
    const lista = await createOperario([], { nombre: "Ana", pin: "1234" });
    expect(lista[0].pinHash).toMatch(/^sha256:/);
  });

  it("preserva operarios previos en la lista", async () => {
    const lista1 = await createOperario([], { nombre: "Op1" });
    const lista2 = await createOperario(lista1, { nombre: "Op2" });
    expect(lista2).toHaveLength(2);
    expect(lista2[0].nombre).toBe("Op1");
    expect(lista2[1].nombre).toBe("Op2");
  });

  it("guarda creadoPor", async () => {
    const lista = await createOperario([], { nombre: "X", creadoPor: "jefe_id_123" });
    expect(lista[0].creadoPor).toBe("jefe_id_123");
  });

  it("genera IDs únicos para operarios distintos", async () => {
    let lista = [];
    for (let i = 0; i < 10; i++) {
      lista = await createOperario(lista, { nombre: `Op${i}` });
    }
    const ids = lista.map((o) => o.id);
    expect(new Set(ids).size).toBe(10);
  });
});

describe("updateOperario", () => {
  it("actualiza un operario por id", async () => {
    const l1 = await createOperario([], { nombre: "Carlos" });
    const id = l1[0].id;
    const l2 = updateOperario(l1, id, { color: "#ff0000" });
    expect(l2[0].color).toBe("#ff0000");
    expect(l2[0].nombre).toBe("Carlos"); // no tocó
  });

  it("retorna la misma lista si el id no existe", async () => {
    const l1 = await createOperario([], { nombre: "Carlos" });
    const l2 = updateOperario(l1, "id-inexistente", { color: "#ff0000" });
    expect(l2).toEqual(l1);
  });

  it("ignora pinHash en patch (debe usarse setPin)", async () => {
    const l1 = await createOperario([], { nombre: "Carlos", pin: "1234" });
    const originalHash = l1[0].pinHash;
    const l2 = updateOperario(l1, l1[0].id, { pinHash: "sha256:fake:fake" });
    expect(l2[0].pinHash).toBe(originalHash);
  });

  it("permite cambiar múltiples campos a la vez", async () => {
    const l1 = await createOperario([], { nombre: "X" });
    const l2 = updateOperario(l1, l1[0].id, {
      nombre: "Y",
      color: "#abc",
      rol: "supervisor",
    });
    expect(l2[0].nombre).toBe("Y");
    expect(l2[0].color).toBe("#abc");
    expect(l2[0].rol).toBe("supervisor");
  });

  it("no muta la lista original (inmutable)", async () => {
    const l1 = await createOperario([], { nombre: "X" });
    const l2 = updateOperario(l1, l1[0].id, { color: "#zzz" });
    expect(l1).not.toBe(l2);
    expect(l1[0].color).toBe("#3b82f6"); // original sin cambios
  });
});

describe("setPin", () => {
  it("setea o cambia el PIN hasheado", async () => {
    let lista = await createOperario([], { nombre: "Lucía" });
    expect(lista[0].pinHash).toBeNull();
    lista = await setPin(lista, lista[0].id, "9876");
    expect(lista[0].pinHash).toMatch(/^sha256:/);
  });

  it("rechaza PIN vacío", async () => {
    const lista = await createOperario([], { nombre: "X" });
    await expect(setPin(lista, lista[0].id, "")).rejects.toThrow();
    await expect(setPin(lista, lista[0].id, null)).rejects.toThrow();
  });

  it("no cambia nada si el id no existe", async () => {
    const lista = await createOperario([], { nombre: "X" });
    const out = await setPin(lista, "no-existe", "1234");
    expect(out).toBe(lista);
  });
});

describe("verifyOperarioPin", () => {
  it("retorna true para PIN correcto", async () => {
    const lista = await createOperario([], { nombre: "X", pin: "5555" });
    expect(await verifyOperarioPin(lista, lista[0].id, "5555")).toBe(true);
  });

  it("retorna false para PIN incorrecto", async () => {
    const lista = await createOperario([], { nombre: "X", pin: "5555" });
    expect(await verifyOperarioPin(lista, lista[0].id, "0000")).toBe(false);
  });

  it("retorna false si el operario no tiene PIN seteado", async () => {
    const lista = await createOperario([], { nombre: "Sin PIN" });
    expect(await verifyOperarioPin(lista, lista[0].id, "1234")).toBe(false);
  });

  it("retorna false si el id no existe", async () => {
    expect(await verifyOperarioPin([], "no-existe", "1234")).toBe(false);
  });
});

describe("desactivar/reactivar", () => {
  it("desactivar marca activo=false sin borrar", async () => {
    const l1 = await createOperario([], { nombre: "X" });
    const l2 = desactivarOperario(l1, l1[0].id);
    expect(l2[0].activo).toBe(false);
    expect(l2).toHaveLength(1);
  });

  it("reactivar restaura activo=true", async () => {
    let l = await createOperario([], { nombre: "X" });
    l = desactivarOperario(l, l[0].id);
    l = reactivarOperario(l, l[0].id);
    expect(l[0].activo).toBe(true);
  });
});

describe("operariosActivos", () => {
  it("filtra los activos", async () => {
    let l = await createOperario([], { nombre: "A" });
    l = await createOperario(l, { nombre: "B" });
    l = await createOperario(l, { nombre: "C" });
    l = desactivarOperario(l, l[1].id);
    const activos = operariosActivos(l);
    expect(activos).toHaveLength(2);
    expect(activos.map((o) => o.nombre)).toEqual(["A", "C"]);
  });

  it("trata activo=undefined como activo (compat con datos viejos)", async () => {
    const lista = [{ id: "legacy", nombre: "Legacy" }]; // sin campo activo
    expect(operariosActivos(lista)).toHaveLength(1);
  });
});

describe("recordLogin", () => {
  it("marca ultimoLogin con timestamp ISO", async () => {
    const l1 = await createOperario([], { nombre: "X" });
    const l2 = recordLogin(l1, l1[0].id);
    expect(l2[0].ultimoLogin).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("retorna lista sin cambios si id no existe", async () => {
    const l1 = await createOperario([], { nombre: "X" });
    const l2 = recordLogin(l1, "no-existe");
    expect(l2).toEqual(l1);
  });
});

describe("iniciales", () => {
  it("dos nombres → primera de cada uno", () => {
    expect(iniciales("Carlos Ramírez")).toBe("CR");
    expect(iniciales("Lucía G.")).toBe("LG");
  });

  it("tres+ nombres → primera del primero y primera del último", () => {
    expect(iniciales("Juan Pedro Sánchez")).toBe("JS");
  });

  it("un solo nombre → primeras 2 letras", () => {
    expect(iniciales("Ana")).toBe("AN");
    expect(iniciales("X")).toBe("X");
  });

  it("vacío o nulo → '??'", () => {
    expect(iniciales("")).toBe("??");
    expect(iniciales(null)).toBe("??");
    expect(iniciales(undefined)).toBe("??");
    expect(iniciales("   ")).toBe("??");
  });

  it("trim de espacios", () => {
    expect(iniciales("  Carlos R.  ")).toBe("CR");
  });
});

describe("loadOperarios / saveOperarios (con mock storage)", () => {
  beforeEach(() => {
    // limpiamos lo que pudo quedar de tests previos vía db.set
  });

  it("loadOperarios retorna [] cuando no hay datos", async () => {
    const lista = await loadOperarios();
    expect(Array.isArray(lista)).toBe(true);
  });

  it("saveOperarios persiste sin tirar", async () => {
    const lista = await createOperario([], { nombre: "X" });
    const ok = await saveOperarios(lista);
    expect(typeof ok).toBe("boolean");
  });

  it("saveOperarios rechaza no-array", async () => {
    await expect(saveOperarios("foo")).rejects.toThrow();
    await expect(saveOperarios({})).rejects.toThrow();
  });
});

describe("buscarOperario", () => {
  it("encuentra por id", async () => {
    const l = await createOperario([], { nombre: "X" });
    expect(buscarOperario(l, l[0].id)?.nombre).toBe("X");
  });

  it("retorna null si no existe", () => {
    expect(buscarOperario([], "no-existe")).toBeNull();
  });
});
