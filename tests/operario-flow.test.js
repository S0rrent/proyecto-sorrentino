import { describe, it, expect, vi } from "vitest";

// Mock Supabase: storage en memoria por test, suficiente para tests de integración
// que sólo necesitan que loadOperarios/saveOperarios sean idempotentes.
let _store;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => {
        _store.set(row.key, row.value);
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: (col, key) => ({ maybeSingle: () => {
        const value = _store.get(key);
        return Promise.resolve({ data: value ? { value, updated_at: new Date().toISOString() } : null, error: null });
      } }) }),
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
  loadOperarios, saveOperarios, createOperario, verifyOperarioPin,
} = await import("../lib/operarios.js");
const { stampOperario, respFor } = await import("../lib/audit.js");
const { ACCIONES, tienePermiso } = await import("../lib/permisos.js");

describe("flujo operario end-to-end", () => {
  it("jefe crea operario → login PIN → estampa ingreso → audit doble", async () => {
    _store = new Map();

    // 1. Jefe crea un operario con PIN
    let lista = [];
    lista = await createOperario(lista, {
      nombre: "Carlos R.",
      pin: "1234",
      rol: "operador",
      creadoPor: "jefe_id",
    });
    await saveOperarios(lista);

    // Recargar de Supabase mockeado
    lista = await loadOperarios();
    expect(lista).toHaveLength(1);
    const carlos = lista[0];

    // 2. Operario ingresa su PIN
    expect(await verifyOperarioPin(lista, carlos.id, "1234")).toBe(true);
    expect(await verifyOperarioPin(lista, carlos.id, "9999")).toBe(false);

    // 3. Carlos persiste un ingreso → stampOperario inyecta su identidad
    const ingreso = stampOperario(
      { id: "ingreso-1", hora: "08:30", tambo: 5, litros: 12000 },
      { operario: { id: carlos.id, nombre: carlos.nombre }, perfil: "operador" }
    );
    expect(ingreso.operarioId).toBe(carlos.id);
    expect(ingreso.operarioNombre).toBe("Carlos R.");
    expect(ingreso.resp).toBe("Carlos R.");
    expect(ingreso.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // 4. Más tarde, otro operario (Lucía) edita el mismo ingreso
    lista = await createOperario(lista, { nombre: "Lucía G.", pin: "5678" });
    await saveOperarios(lista);
    const lucia = lista[1];

    const ingresoEditado = stampOperario(ingreso, {
      operario: { id: lucia.id, nombre: lucia.nombre },
      perfil: "supervisor",
    });
    expect(ingresoEditado.operarioId).toBe(lucia.id);
    expect(ingresoEditado.operarioNombre).toBe("Lucía G.");
    // El creador original se preserva para auditoría
    expect(ingresoEditado.operarioIdOriginal).toBe(carlos.id);
    expect(ingresoEditado.operarioNombreOriginal).toBe("Carlos R.");
  });

  it("matriz de permisos: operador no puede eliminar, supervisor sí", async () => {
    expect(tienePermiso("operador", ACCIONES.INGRESOS_ELIMINAR)).toBe(false);
    expect(tienePermiso("supervisor", ACCIONES.INGRESOS_ELIMINAR)).toBe(true);
    expect(tienePermiso("jefe", ACCIONES.INGRESOS_ELIMINAR)).toBe(true);
  });

  it("respFor refleja operario activo, falla a perfil si no hay", () => {
    expect(respFor({ id: "x", nombre: "Carlos R." }, "supervisor")).toBe("Carlos R.");
    expect(respFor(null, "supervisor")).toBe("Supervisor");
    expect(respFor(null, "jefe")).toBe("Jefe de Planta");
  });

  it("operario sin PIN no puede loguear", async () => {
    _store = new Map();
    const lista = await createOperario([], { nombre: "Sin PIN" });
    await saveOperarios(lista);

    const reloaded = await loadOperarios();
    expect(reloaded[0].pinHash).toBeNull();
    expect(await verifyOperarioPin(reloaded, reloaded[0].id, "1234")).toBe(false);
  });

  it("operario desactivado se carga pero no aparece para login", async () => {
    _store = new Map();
    const { desactivarOperario, operariosActivos } = await import("../lib/operarios.js");

    let lista = await createOperario([], { nombre: "Activo" });
    lista = await createOperario(lista, { nombre: "Inactivo" });
    lista = desactivarOperario(lista, lista[1].id);
    await saveOperarios(lista);

    const reloaded = await loadOperarios();
    expect(reloaded).toHaveLength(2);
    expect(operariosActivos(reloaded)).toHaveLength(1);
    expect(operariosActivos(reloaded)[0].nombre).toBe("Activo");
  });
});
