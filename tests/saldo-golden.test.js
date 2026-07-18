import { describe, it, expect, beforeEach, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// GOLDEN MASTER del motor de saldos (Tanda 6).
//
// Fija el comportamiento EXACTO de calcAutoLitros sobre fixtures sintéticos
// que ejercitan todas las reglas: ingresos, movimientos con pérdida, cargas,
// fortificados (label + adiciones con y sin sourceSilo), producción en sus
// tres estados (finalizado con litrosUsados, legacy sin campo, envasando
// reservado), sobrante reservado, fast-path de SALDO_KEY, fallback de
// SALDO_BASE_KEY con encadenado multi-día, y saldos negativos (el motor es
// honesto: los deja pasar y runConsistencyChecks los señala).
//
// Los valores esperados están calculados A MANO con las reglas documentadas
// del motor — si un refactor (extracción a lib/saldo.js) cambia un número,
// este archivo lo detecta. NO ajustar los goldens sin una decisión explícita
// de negocio.
// ─────────────────────────────────────────────────────────────────────────────

let _store;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => { _store.set(row.key, row.value); return Promise.resolve({ error: null }); },
      select: () => ({
        eq: (col, key) => ({ maybeSingle: () => {
          const v = _store.get(key);
          return Promise.resolve({ data: v ? { value: v, updated_at: "2026-01-01T00:00:00Z" } : null, error: null });
        } }),
        like: () => ({ gt: function () { return this; }, order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
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

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}));

const { __test } = await import("../recibo_yatasto.jsx");
const { buildFortLabel } = await import("../lib/helpers.js");
const { calcAutoLitros, _autoLitrosCache } = __test;

const seed = (date, sec, data) => _store.set(`yatasto:${date}:${sec}`, JSON.stringify(data));

beforeEach(() => {
  _store = new Map();
  _autoLitrosCache.clear();
});

describe("golden: un día completo con todas las operaciones", () => {
  const D = "2026-06-01"; // fecha sintética estable — sin dependencia del reloj

  const FORT = {
    id: "f1", siloOrigen: "60", siloDestino: "42", litrosBase: "1000",
    pasteurizado: true, homogeneizado: false,
    adiciones: [
      { id: "a1", producto: "Vitamina", cantidad: "50", unidad: "kg" },           // sin sourceSilo: crea volumen
      { id: "a2", producto: "Crema", cantidad: "200", unidad: "L", sourceSilo: "20" }, // con sourceSilo: descuenta del 20
    ],
  };

  const seedDia = () => {
    seed(D, "ingresos", [
      { id: "i1", destino: "80", litrosFca: "10000", producto: "Leche Cruda" },
      { id: "i2", destino: "100 NUEVO", litrosFca: "20000", producto: "Leche Cruda" },
      { id: "i3", destino: "20", litrosFca: "500", producto: "Leche Cruda" },
      { id: "i4", destino: "15", litrosFca: "2500", producto: "Leche Cruda" },
    ]);
    seed(D, "movimientos", { movs: [
      { id: "m1", desde: "80", hasta: "60", litros: "3000", perdidaLitros: "100" },
    ], ctrls: [] });
    seed(D, "carga", [
      { id: "c1", siloProveniente: "100 NUEVO", litros: "5000" },
    ]);
    seed(D, "fortificados", [FORT]);
    seed(D, "produccion", [
      // Finalizado con litrosUsados: descuenta lo usado; sobrante queda reservado
      { id: "p1", estado: "finalizado", origenes: [{ silo: "15", litros: "2000" }],
        litrosUsados: [{ silo: "15", litros: "1800" }], destinoSobrante: "reservado", sobranteL: 200 },
      // Envasando (nueva lógica): reserva sin descontar
      { id: "p2", estado: "envasando", litrosUsados: null, origenes: [{ silo: "80", litros: "1000" }] },
      // Cancelado: se ignora por completo
      { id: "p3", estado: "cancelado", origenes: [{ silo: "80", litros: "99999" }] },
    ]);
  };

  it("totales exactos por silo (calculados a mano)", async () => {
    seedDia();
    const r = await calcAutoLitros(D);
    expect(r._lecturasFallidas).toBe(false);
    expect(r.totals).toEqual({
      "80": 6900,     // 10000 − 3000 (mov) − 100 (pérdida)
      "60": 2000,     // +3000 (mov) − 1000 (fort origen)
      "100 N": 15000, // 20000 − 5000 (carga)
      "42": 1250,     // 1000 (fort) + 50 (adición kg 1:1) + 200 (adición L)
      "20": 300,      // 500 − 200 (sourceSilo de la adición)
      "15": 700,      // 2500 − 1800 (litrosUsados del finalizado)
    });
  });

  it("reservados: envasando reserva sus orígenes; el sobrante 'reservado' del finalizado también", async () => {
    seedDia();
    const r = await calcAutoLitros(D);
    expect(r.reservados).toEqual({
      "80": 1000, // lote envasando
      "15": 200,  // sobrante reservado del finalizado (2000 − 1800)
    });
  });

  it("productos: el ingreso define, el movimiento copia si el destino no tiene, el fort etiqueta con su label", async () => {
    seedDia();
    const r = await calcAutoLitros(D);
    expect(r.productosBase["80"]).toBe("Leche Cruda");
    expect(r.productosBase["100 N"]).toBe("Leche Cruda");
    expect(r.productosBase["60"]).toBe("Leche Cruda");      // copiado por el mov desde 80
    expect(r.productosBase["42"]).toBe(buildFortLabel(FORT)); // label derivado de flags P/H
  });

  it("fechas: los silos que reciben hoy quedan con fecha de hoy", async () => {
    seedDia();
    const r = await calcAutoLitros(D);
    expect(r.fechasBase["80"]).toBe(D);
    expect(r.fechasBase["42"]).toBe(D); // el fort resetea la fecha al día del lote
    expect(r.fechasBase["60"]).toBe(D);
  });

  it("saldo negativo pasa honesto (lo señala runConsistencyChecks, no el motor)", async () => {
    seed(D, "carga", [{ id: "c1", siloProveniente: "TQ6", litros: "4000" }]); // TQ6 sin contenido
    const r = await calcAutoLitros(D);
    expect(r.totals["TQ6"]).toBe(-4000);
  });
});

describe("golden: fast-path de SALDO_KEY (cadena ya calculada hasta ayer)", () => {
  const D = "2026-06-10";

  it("usa el saldo directo y aplica las operaciones del día encima", async () => {
    _store.set("yatasto:saldo-silos", JSON.stringify({
      data: { "40F": 7000 }, fromDate: "2026-06-09", productos: { "40F": "Crema" }, fechas: {},
    }));
    seed(D, "movimientos", { movs: [{ id: "m1", desde: "40F", hasta: "TQ6", litros: "1000" }], ctrls: [] });
    const r = await calcAutoLitros(D);
    expect(r.totals).toEqual({ "40F": 6000, "TQ6": 1000 });
    expect(r.productosBase["TQ6"]).toBe("Crema");        // el mov lleva el producto
    expect(r.fechasBase["40F"]).toBe("2026-06-09");      // bootstrap: fecha del saldo
    expect(r.fechasBase["TQ6"]).toBe("2026-06-09");      // hereda la fecha más antigua del origen
  });
});

describe("golden: fallback de SALDO_BASE_KEY con encadenado multi-día", () => {
  const D0 = "2026-06-20", D1 = "2026-06-21", D2 = "2026-06-22";

  it("encadena base→D1→D2 aplicando las operaciones de cada jornada", async () => {
    _store.set("yatasto:saldo-base", JSON.stringify({
      data: { "80": 5000 }, fromDate: D0, productos: { "80": "Leche Cruda" },
    }));
    seed(D1, "ingresos", [{ id: "i1", destino: "60", litrosFca: "1000", producto: "Leche Cruda" }]);
    seed(D2, "carga", [{ id: "c1", siloProveniente: "80", litros: "2000" }]);

    const r = await calcAutoLitros(D2);
    expect(r.totals).toEqual({
      "80": 3000, // 5000 de la base − 2000 de la carga de D2
      "60": 1000, // ingreso de D1, arrastrado por la cadena
    });
    expect(r.productosBase["80"]).toBe("Leche Cruda");
    expect(r.fechasBase["60"]).toBe(D1); // el silo se llenó en D1
  });

  it("base exactamente = ayer: se usa directa, sin encadenar", async () => {
    const DX = "2026-06-25";
    _store.set("yatasto:saldo-base", JSON.stringify({
      data: { "15": 800 }, fromDate: getPrev(DX), productos: { "15": "Suero" },
    }));
    const r = await calcAutoLitros(DX);
    expect(r.totals).toEqual({ "15": 800 });
    expect(r.fechasBase["15"]).toBe(getPrev(DX)); // bootstrap de fecha con fromDate de la base
  });
});

// mini-helper local (sin importar lib/dates: la aritmética acá es fija)
function getPrev(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}
