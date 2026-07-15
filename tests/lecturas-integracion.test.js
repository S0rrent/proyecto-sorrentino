import { describe, it, expect, beforeEach, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Integración Tanda 2: load()/save() REALES de recibo_yatasto.jsx contra un
// Supabase mockeado con modo de fallo de red controlable.
//
// Reproduce el P0-2 de la auditoría: un fallo de red al leer no debe
// convertirse en "día vacío" ni habilitar un guardado que pise el servidor.
// ─────────────────────────────────────────────────────────────────────────────

let _store;         // Map key → { value, updated_at }
let _failReads;     // true = todo SELECT falla (red caída)
let _failKeySubstr; // fallo selectivo: SELECT falla solo para keys que contengan esto
let _upserts;       // keys escritas (para asertar que save NO llegó a la red)

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => {
        _upserts.push(row.key);
        _store.set(row.key, { value: row.value, updated_at: row.updated_at });
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: (col, key) => ({ maybeSingle: () => {
        if (_failReads || (_failKeySubstr && key.includes(_failKeySubstr))) {
          return Promise.resolve({ data: null, error: new Error("Failed to fetch") });
        }
        const row = _store.get(key);
        return Promise.resolve({
          data: row ? { value: row.value, updated_at: row.updated_at } : null,
          error: null,
        });
      } }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      like: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: {
      refreshSession: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: { user: { id: "t" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

// recibo_yatasto.jsx importa el registro del SW como módulo virtual de Vite.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

const { __test } = await import("../recibo_yatasto.jsx");
const { _resetLecturasConfiables } = await import("../lib/lecturas.js");
const { load, loadSeguro, save } = __test;

const HOY = new Date().toISOString().slice(0, 10); // fecha "hoy" del app (evita el path de rebuild retro)
const K = (sec) => `yatasto:${HOY}:${sec}`;

beforeEach(() => {
  _store = new Map();
  _failReads = false;
  _failKeySubstr = null;
  _upserts = [];
  _resetLecturasConfiables();
  __test._autoLitrosCache.clear();
});

describe("loadSeguro: distingue red caída de fila inexistente", () => {
  it("fila inexistente legítima → default (día nuevo)", async () => {
    const d = await loadSeguro(HOY, "ingresos", []);
    expect(d).toEqual([]);
  });

  it("datos existentes → los datos, no el default", async () => {
    _store.set(K("ingresos"), { value: JSON.stringify([{ id: "a", tambo: "LA PORFIA" }]), updated_at: "T1" });
    const d = await loadSeguro(HOY, "ingresos", []);
    expect(d).toHaveLength(1);
    expect(d[0].tambo).toBe("LA PORFIA");
  });

  it("red caída → lanza (el caller conserva su último estado bueno, no muestra [])", async () => {
    _failReads = true;
    await expect(loadSeguro(HOY, "ingresos", [])).rejects.toMatchObject({ name: "ErrorDeLectura", tipo: "red" });
  });

  it("load() legacy conserva su semántica para el motor: default ante fallo", async () => {
    _failReads = true;
    const d = await load(HOY, "ingresos", []);
    expect(d).toEqual([]);
  });
});

describe("save: bloqueado sin lectura confiable de la clave en la sesión", () => {
  it("clave jamás leída (o leída solo con red caída) → save retorna false y NO escribe", async () => {
    // El servidor tiene 15 camiones cargados; este dispositivo nunca pudo leerlos.
    _store.set(K("ingresos"), { value: JSON.stringify(Array.from({ length: 15 }, (_, i) => ({ id: String(i) }))), updated_at: "T1" });
    _failReads = true;
    await loadSeguro(HOY, "ingresos", []).catch(() => {});

    const ok = await save(HOY, "ingresos", [{ id: "nuevo" }]);
    expect(ok).toBe(false);
    expect(_upserts).toHaveLength(0); // el día de 15 camiones sigue intacto
  });

  it("tras una lectura confiable (fila inexistente) el save procede", async () => {
    await loadSeguro(HOY, "carga", []);
    const ok = await save(HOY, "carga", [{ id: "c1" }]);
    expect(ok).toBe(true);
    expect(_upserts).toContain(K("carga"));
  });

  it("lectura exitosa posterior desbloquea el guardado (reintento automático del polling)", async () => {
    _failReads = true;
    await loadSeguro(HOY, "movimientos", { movs: [], ctrls: [] }).catch(() => {});
    expect(await save(HOY, "movimientos", { movs: [], ctrls: [] })).toBe(false);

    _failReads = false; // vuelve la señal; el tick de 10s relee
    const d = await loadSeguro(HOY, "movimientos", { movs: [], ctrls: [] });
    expect(await save(HOY, "movimientos", { ...d, movs: [{ id: "m1" }] })).toBe(true);
  });

  it("offline total: save de clave leída OK antes del corte sigue el camino de la cola (no false)", async () => {
    await loadSeguro(HOY, "fortificados", []); // lectura confiable con red OK
    _failReads = true; // se corta la red (los SELECT fallan; upsert del mock sigue OK — C5 tolera error de red)
    const ok = await save(HOY, "fortificados", [{ id: "f1" }]);
    expect(ok).toBe(true); // no lo frena el guard: la sesión ya vio datos reales de esa clave
  });
});

describe("calcAutoLitros: un fallo de lectura interno no envenena el cache", () => {
  it("fallo parcial (solo movimientos) → _lecturasFallidas=true y NO cachea; al volver la señal recomputa", async () => {
    const { calcAutoLitros, _autoLitrosCache } = __test;
    _store.set(K("ingresos"), {
      value: JSON.stringify([{ id: "i1", litrosFca: "1000", destino: "80" }]),
      updated_at: "T1",
    });
    _failKeySubstr = ":movimientos"; // señal inestable: UNA de las lecturas falla

    const r1 = await calcAutoLitros(HOY);
    expect(r1._lecturasFallidas).toBe(true);
    expect(_autoLitrosCache.has(HOY)).toBe(false); // el resultado a medias no se cachea

    _failKeySubstr = null; // vuelve la señal — el próximo tick recomputa de cero
    const r2 = await calcAutoLitros(HOY);
    expect(r2._lecturasFallidas).toBe(false);
    expect(_autoLitrosCache.has(HOY)).toBe(true);
  });
});
