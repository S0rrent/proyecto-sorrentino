import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock supabase y db-adapter — telemetry depende de db.get/set/list/remove.
const _store = new Map();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => {
        _store.set(row.key, row.value);
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: (col, key) => ({ maybeSingle: () => {
        const v = _store.get(key);
        return Promise.resolve({ data: v ? { value: v } : null, error: null });
      } }) }),
      delete: () => ({ eq: (col, key) => { _store.delete(key); return Promise.resolve({ error: null }); } }),
      like: () => Promise.resolve({
        data: Array.from(_store.entries())
          .filter(([k]) => k.startsWith("yatasto:telemetry:"))
          .map(([key, value]) => ({ key, value })),
        error: null,
      }),
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

async function freshTelemetry(enabled) {
  _store.clear();
  vi.resetModules();
  localStorage.clear();
  if (enabled) localStorage.setItem("yatasto:telemetry", "true");
  return await import("../telemetry.js");
}

describe("telemetry: opt-in via localStorage flag", () => {
  beforeEach(() => {
    _store.clear();
    localStorage.clear();
  });

  it("desactivado por default — track() es no-op", async () => {
    const { track, flushTelemetry } = await freshTelemetry(false);
    track("ingreso_save");
    track("tab_open", "movimientos");
    await flushTelemetry();
    // Nada persistido al store
    expect(_store.size).toBe(0);
  });

  it("desactivado: dumpTelemetry retorna []", async () => {
    const { dumpTelemetry } = await freshTelemetry(false);
    const out = await dumpTelemetry(3);
    expect(out).toEqual([]);
  });
});

describe("telemetry: activado", () => {
  it("track + flush persiste eventos del día actual", async () => {
    const { track, flushTelemetry } = await freshTelemetry(true);
    track("save_ok", "ingresos");
    track("save_queued", "movimientos");
    await flushTelemetry();

    // Key del día actual
    const today = new Date().toISOString().slice(0, 10);
    const key = "yatasto:telemetry:" + today;
    expect(_store.has(key)).toBe(true);

    const data = JSON.parse(_store.get(key));
    expect(data.events).toHaveLength(2);
    expect(data.events[0].e).toBe("save_ok");
    expect(data.events[0].v).toBe("ingresos");
    expect(data.events[1].e).toBe("save_queued");
  });

  it("track sin valor/field omite las propiedades", async () => {
    const { track, flushTelemetry } = await freshTelemetry(true);
    track("tab_open");
    await flushTelemetry();

    const today = new Date().toISOString().slice(0, 10);
    const data = JSON.parse(_store.get("yatasto:telemetry:" + today));
    expect(data.events[0]).toHaveProperty("e", "tab_open");
    expect(data.events[0]).toHaveProperty("t");
    expect(data.events[0]).not.toHaveProperty("v");
    expect(data.events[0]).not.toHaveProperty("f");
  });

  it("flush vacía el buffer", async () => {
    const { track, flushTelemetry } = await freshTelemetry(true);
    track("a");
    track("b");
    await flushTelemetry();

    // Segundo flush sin nuevos events: no genera escritura adicional con duplicados
    const today = new Date().toISOString().slice(0, 10);
    const first = JSON.parse(_store.get("yatasto:telemetry:" + today));
    await flushTelemetry();
    const second = JSON.parse(_store.get("yatasto:telemetry:" + today));
    expect(first.events.length).toBe(second.events.length);
  });

  it("flush merge con eventos existentes del mismo día", async () => {
    const { track, flushTelemetry } = await freshTelemetry(true);
    track("a");
    await flushTelemetry();

    track("b");
    await flushTelemetry();

    const today = new Date().toISOString().slice(0, 10);
    const data = JSON.parse(_store.get("yatasto:telemetry:" + today));
    expect(data.events).toHaveLength(2);
    expect(data.events.map((e) => e.e)).toEqual(["a", "b"]);
  });

  it("dumpTelemetry retorna eventos ordenados por timestamp", async () => {
    const { track, flushTelemetry, dumpTelemetry } = await freshTelemetry(true);
    track("primero");
    await new Promise((r) => setTimeout(r, 5));
    track("segundo");
    await flushTelemetry();

    const out = await dumpTelemetry(1);
    expect(out).toHaveLength(2);
    expect(out[0].e).toBe("primero");
    expect(out[1].e).toBe("segundo");
    expect(out[0].t).toBeLessThanOrEqual(out[1].t);
  });

  it("dumpTelemetry incluye el día en cada evento", async () => {
    const { track, flushTelemetry, dumpTelemetry } = await freshTelemetry(true);
    track("x");
    await flushTelemetry();

    const out = await dumpTelemetry(1);
    expect(out[0]).toHaveProperty("day");
    expect(out[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("window.__yatastoTelemetry expone helpers en navegador", async () => {
    await freshTelemetry(true);
    expect(typeof window.__yatastoTelemetry).toBe("object");
    expect(typeof window.__yatastoTelemetry.dump).toBe("function");
    expect(typeof window.__yatastoTelemetry.flush).toBe("function");
    expect(window.__yatastoTelemetry.enabled).toBe(true);
  });
});
