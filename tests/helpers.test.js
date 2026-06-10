import { describe, it, expect } from "vitest";
import {
  buildFortLabel,
  diffDays,
  calcSF,
  isSueroLike,
  shouldShowSF,
  adicionLitros,
  fortSourceDraws,
} from "../lib/helpers.js";

describe("buildFortLabel", () => {
  it("returns 'Leche Fortificada' for empty/default flags", () => {
    expect(buildFortLabel({})).toBe("Leche Fortificada");
    expect(buildFortLabel({ pasteurizado: false, homogeneizado: false })).toBe(
      "Leche Fortificada"
    );
  });

  it("returns 'Leche Pasteurizada' when only P", () => {
    expect(buildFortLabel({ pasteurizado: true })).toBe("Leche Pasteurizada");
  });

  it("returns 'Leche Homogeneizada' when only H", () => {
    expect(buildFortLabel({ homogeneizado: true })).toBe("Leche Homogeneizada");
  });

  it("returns 'Leche PyH' when both flags", () => {
    expect(buildFortLabel({ pasteurizado: true, homogeneizado: true })).toBe("Leche PyH");
  });

  it("tolerates null/undefined fort (datos viejos)", () => {
    expect(buildFortLabel(null)).toBe("Leche Fortificada");
    expect(buildFortLabel(undefined)).toBe("Leche Fortificada");
  });
});

describe("diffDays", () => {
  it("returns 0 for same date", () => {
    expect(diffDays("2026-06-09", "2026-06-09")).toBe(0);
  });

  it("returns positive when to > from", () => {
    expect(diffDays("2026-06-09", "2026-06-10")).toBe(1);
    expect(diffDays("2026-06-01", "2026-06-09")).toBe(8);
  });

  it("returns negative when to < from", () => {
    expect(diffDays("2026-06-09", "2026-06-08")).toBe(-1);
  });

  it("handles month boundaries", () => {
    expect(diffDays("2026-05-31", "2026-06-01")).toBe(1);
    expect(diffDays("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("handles year boundaries including DST/timezone safely (UTC math)", () => {
    expect(diffDays("2025-12-31", "2026-01-01")).toBe(1);
    expect(diffDays("2025-01-01", "2026-01-01")).toBe(365);
    expect(diffDays("2024-01-01", "2025-01-01")).toBe(366); // 2024 leap
  });
});

describe("calcSF", () => {
  it("returns null if no fechaSilo", () => {
    expect(calcSF(null, "2026-06-09")).toBeNull();
    expect(calcSF(undefined, "2026-06-09")).toBeNull();
    expect(calcSF("", "2026-06-09")).toBeNull();
  });

  it("returns null if no today", () => {
    expect(calcSF("2026-06-09", null)).toBeNull();
    expect(calcSF("2026-06-09", "")).toBeNull();
  });

  it("returns 'SF' when same day", () => {
    expect(calcSF("2026-06-09", "2026-06-09")).toBe("SF");
  });

  it("returns 'SF+N' for positive deltas", () => {
    expect(calcSF("2026-06-09", "2026-06-10")).toBe("SF+1");
    expect(calcSF("2026-06-01", "2026-06-09")).toBe("SF+8");
  });

  it("returns null if today < fechaSilo (inconsistent)", () => {
    expect(calcSF("2026-06-10", "2026-06-09")).toBeNull();
  });

  it("returns null if delta > 999 days (likely data error)", () => {
    expect(calcSF("2020-01-01", "2026-06-09")).toBeNull();
  });
});

describe("isSueroLike", () => {
  it("returns true for the suero family", () => {
    expect(isSueroLike("Suero")).toBe(true);
    expect(isSueroLike("Permeado")).toBe(true);
    expect(isSueroLike("Permeado de Suero")).toBe(true);
    expect(isSueroLike("Permeado de Lactosa")).toBe(true);
  });

  it("returns false for non-suero products", () => {
    expect(isSueroLike("Leche Cruda")).toBe(false);
    expect(isSueroLike("Leche Descremada")).toBe(false);
    expect(isSueroLike("Lactosa")).toBe(false);
    expect(isSueroLike("Crema")).toBe(false);
    expect(isSueroLike("")).toBe(false);
    expect(isSueroLike(null)).toBe(false);
    expect(isSueroLike(undefined)).toBe(false);
  });
});

describe("shouldShowSF", () => {
  it("returns true for Leche Cruda", () => {
    expect(shouldShowSF("Leche Cruda")).toBe(true);
  });

  it("returns true for the suero-like family", () => {
    expect(shouldShowSF("Suero")).toBe(true);
    expect(shouldShowSF("Permeado de Lactosa")).toBe(true);
  });

  it("returns false for processed products", () => {
    expect(shouldShowSF("Leche Fortificada")).toBe(false);
    expect(shouldShowSF("Leche Pasteurizada")).toBe(false);
    expect(shouldShowSF("Leche PyH")).toBe(false);
    expect(shouldShowSF("Yogurt")).toBe(false);
    expect(shouldShowSF("Crema")).toBe(false);
  });
});

describe("adicionLitros", () => {
  it("L: 1:1 con litros", () => {
    expect(adicionLitros("L", 10)).toBe(10);
    expect(adicionLitros("L", "10")).toBe(10);
    expect(adicionLitros("L", 0.5)).toBe(0.5);
  });

  it("kg: 1:1 con litros (densidad ~1 g/mL)", () => {
    expect(adicionLitros("kg", 5)).toBe(5);
  });

  it("mL y cc: ambas /1000", () => {
    expect(adicionLitros("mL", 1000)).toBe(1);
    expect(adicionLitros("cc", 1000)).toBe(1);
    expect(adicionLitros("mL", 500)).toBe(0.5);
  });

  it("g: /1000", () => {
    expect(adicionLitros("g", 250)).toBe(0.25);
    expect(adicionLitros("g", 1)).toBe(0.001);
  });

  it("mg: /1_000_000", () => {
    expect(adicionLitros("mg", 1000000)).toBe(1);
    expect(adicionLitros("mg", 500)).toBe(0.0005);
  });

  it("unidad desconocida → 0 (no contribuye al balance)", () => {
    expect(adicionLitros("XYZ", 10)).toBe(0);
    expect(adicionLitros(undefined, 10)).toBe(0);
    expect(adicionLitros(null, 10)).toBe(0);
  });

  it("cantidad <= 0 → 0", () => {
    expect(adicionLitros("L", 0)).toBe(0);
    expect(adicionLitros("L", -5)).toBe(0);
    expect(adicionLitros("kg", -1)).toBe(0);
  });

  it("cantidad no-numérica → 0", () => {
    expect(adicionLitros("L", "abc")).toBe(0);
    expect(adicionLitros("L", null)).toBe(0);
    expect(adicionLitros("L", undefined)).toBe(0);
    expect(adicionLitros("L", "")).toBe(0);
  });

  it("string numérico se parsea correctamente", () => {
    expect(adicionLitros("L", "12.5")).toBe(12.5);
  });
});

describe("fortSourceDraws", () => {
  const MAP = {
    "100 NUEVO": "100 N",
    "100 VIEJO": "100 V",
    "TQ6": "TQ6",
  };

  it("registra litrosBase contra el silo origen mapeado", () => {
    const fort = { siloOrigen: "100 NUEVO", litrosBase: 5000, adiciones: [] };
    expect(fortSourceDraws(fort, MAP)).toEqual({ "100 N": 5000 });
  });

  it("usa el nombre tal cual si no está en el map", () => {
    const fort = { siloOrigen: "TQ_OTRO", litrosBase: 100, adiciones: [] };
    expect(fortSourceDraws(fort, MAP)).toEqual({ "TQ_OTRO": 100 });
  });

  it("acumula adiciones con sourceSilo sobre el mismo silo origen", () => {
    const fort = {
      siloOrigen: "100 NUEVO", litrosBase: 5000,
      adiciones: [
        { unidad: "L", cantidad: 500, sourceSilo: "100 NUEVO" },
      ],
    };
    expect(fortSourceDraws(fort, MAP)).toEqual({ "100 N": 5500 });
  });

  it("registra adiciones desde otros silos como entradas separadas", () => {
    const fort = {
      siloOrigen: "100 NUEVO", litrosBase: 5000,
      adiciones: [
        { unidad: "kg", cantidad: 100, sourceSilo: "TQ6" },
        { unidad: "L", cantidad: 200, sourceSilo: "100 VIEJO" },
      ],
    };
    expect(fortSourceDraws(fort, MAP)).toEqual({
      "100 N": 5000,
      "100 V": 200,
      "TQ6": 100,
    });
  });

  it("ignora adiciones sin sourceSilo", () => {
    const fort = {
      siloOrigen: "100 NUEVO", litrosBase: 5000,
      adiciones: [
        { unidad: "kg", cantidad: 100 }, // sin sourceSilo
        { unidad: "L", cantidad: 200, sourceSilo: "TQ6" },
      ],
    };
    expect(fortSourceDraws(fort, MAP)).toEqual({
      "100 N": 5000,
      "TQ6": 200,
    });
  });

  it("ignora adiciones con cantidad inválida", () => {
    const fort = {
      adiciones: [
        { unidad: "L", cantidad: 0, sourceSilo: "TQ6" },
        { unidad: "L", cantidad: -10, sourceSilo: "TQ6" },
        { unidad: "L", cantidad: "abc", sourceSilo: "TQ6" },
      ],
    };
    expect(fortSourceDraws(fort, MAP)).toEqual({});
  });

  it("ignora litrosBase 0 o ausente", () => {
    expect(fortSourceDraws({ siloOrigen: "100 NUEVO", litrosBase: 0 }, MAP)).toEqual({});
    expect(fortSourceDraws({ siloOrigen: "100 NUEVO" }, MAP)).toEqual({});
  });

  it("fort null/undefined retorna {}", () => {
    expect(fortSourceDraws(null, MAP)).toEqual({});
    expect(fortSourceDraws(undefined, MAP)).toEqual({});
  });

  it("siloKeyMap omitido se trata como mapa vacío (sin transform)", () => {
    const fort = { siloOrigen: "X", litrosBase: 100, adiciones: [] };
    expect(fortSourceDraws(fort)).toEqual({ "X": 100 });
  });
});
