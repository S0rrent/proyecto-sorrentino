import { describe, it, expect } from "vitest";
import {
  isEcomilkDensity, normalizeDensity, formatDensity, validateDensity,
} from "../lib/density.js";

describe("isEcomilkDensity", () => {
  it("acepta enteros 20-40", () => {
    expect(isEcomilkDensity(20)).toBe(true);
    expect(isEcomilkDensity(28)).toBe(true);
    expect(isEcomilkDensity(34)).toBe(true);
    expect(isEcomilkDensity(40)).toBe(true);
  });

  it("acepta strings con esos valores", () => {
    expect(isEcomilkDensity("28")).toBe(true);
    expect(isEcomilkDensity("34")).toBe(true);
  });

  it("acepta decimal con punto o coma", () => {
    expect(isEcomilkDensity("28.5")).toBe(true);
    expect(isEcomilkDensity("28,5")).toBe(true);
  });

  it("rechaza fuera de rango", () => {
    expect(isEcomilkDensity(19)).toBe(false);
    expect(isEcomilkDensity(41)).toBe(false);
    expect(isEcomilkDensity(0)).toBe(false);
    expect(isEcomilkDensity(100)).toBe(false);
  });

  it("rechaza formato técnico (1.028)", () => {
    expect(isEcomilkDensity(1.028)).toBe(false);
    expect(isEcomilkDensity("1.028")).toBe(false);
  });

  it("rechaza vacío y no-numérico", () => {
    expect(isEcomilkDensity("")).toBe(false);
    expect(isEcomilkDensity(null)).toBe(false);
    expect(isEcomilkDensity(undefined)).toBe(false);
    expect(isEcomilkDensity("abc")).toBe(false);
    expect(isEcomilkDensity("NaN")).toBe(false);
  });

  it("trimea espacios", () => {
    expect(isEcomilkDensity(" 28 ")).toBe(true);
  });
});

describe("normalizeDensity", () => {
  it("convierte Ecomilk entero a técnico 1.0XX", () => {
    expect(normalizeDensity(28)).toBe("1.028");
    expect(normalizeDensity("28")).toBe("1.028");
    expect(normalizeDensity(30)).toBe("1.030");
    expect(normalizeDensity(34)).toBe("1.034");
  });

  it("convierte Ecomilk decimal a técnico 1.0XXX (4 decimales)", () => {
    expect(normalizeDensity("28.5")).toBe("1.0285");
    expect(normalizeDensity("28,5")).toBe("1.0285");
  });

  it("pasa valor técnico válido con 3 decimales", () => {
    expect(normalizeDensity(1.028)).toBe("1.028");
    expect(normalizeDensity("1.028")).toBe("1.028");
    // 1.0285 redondea a 3 decimales — el resultado depende de IEEE 754
    // y de la implementación de toFixed (round-half-to-even típicamente).
    expect(normalizeDensity("1.0285")).toMatch(/^1\.0(28|29)$/);
  });

  it("acepta coma como decimal en valor técnico", () => {
    expect(normalizeDensity("1,028")).toBe("1.028");
  });

  it("vacío/null retorna ''", () => {
    expect(normalizeDensity("")).toBe("");
    expect(normalizeDensity(null)).toBe("");
    expect(normalizeDensity(undefined)).toBe("");
  });

  it("no-numérico pasa tal cual (NaN safety)", () => {
    expect(normalizeDensity("abc")).toBe("abc");
  });
});

describe("formatDensity", () => {
  it("muestra el mismo formato canónico que normalizeDensity (alias)", () => {
    expect(formatDensity(28)).toBe("1.028");
    expect(formatDensity(1.028)).toBe("1.028");
    expect(formatDensity("28.5")).toBe("1.0285");
    expect(formatDensity("")).toBe("");
  });
});

describe("validateDensity", () => {
  it("vacío retorna null (sin error)", () => {
    expect(validateDensity("")).toBeNull();
    expect(validateDensity(null)).toBeNull();
    expect(validateDensity(undefined)).toBeNull();
  });

  it("Ecomilk 20-40 retorna null", () => {
    expect(validateDensity(28)).toBeNull();
    expect(validateDensity("34")).toBeNull();
    expect(validateDensity("28,5")).toBeNull();
  });

  it("técnico 1.020-1.040 retorna null", () => {
    expect(validateDensity(1.028)).toBeNull();
    expect(validateDensity("1.028")).toBeNull();
    expect(validateDensity("1,028")).toBeNull();
    expect(validateDensity(1.020)).toBeNull();
    expect(validateDensity(1.040)).toBeNull();
  });

  it("fuera de rango retorna mensaje de error", () => {
    expect(validateDensity(1.019)).toMatch(/fuera de rango/i);
    expect(validateDensity(1.041)).toMatch(/fuera de rango/i);
    expect(validateDensity(0.9)).toMatch(/fuera de rango/i);
  });

  it("no-numérico retorna 'Valor inválido'", () => {
    expect(validateDensity("abc")).toBe("Valor inválido");
    expect(validateDensity("xyz")).toBe("Valor inválido");
  });

  it("borde 19 (Ecomilk inválido + técnico inválido)", () => {
    expect(validateDensity(19)).toMatch(/fuera de rango/i);
    expect(validateDensity(41)).toMatch(/fuera de rango/i);
  });
});
