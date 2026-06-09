import { describe, it, expect } from "vitest";
import {
  isLoteActivo, isLoteFinalizado, isLoteLegacyCancelado,
} from "../lib/produccion.js";

describe("isLoteActivo", () => {
  it("reconoce 'envasando' como activo", () => {
    expect(isLoteActivo("envasando")).toBe(true);
  });

  it("reconoce legacy 'enviado' como activo (compat con datos viejos)", () => {
    expect(isLoteActivo("enviado")).toBe(true);
  });

  it("rechaza 'finalizado'", () => {
    expect(isLoteActivo("finalizado")).toBe(false);
  });

  it("rechaza 'cancelado'", () => {
    expect(isLoteActivo("cancelado")).toBe(false);
  });

  it("rechaza estados no canónicos", () => {
    expect(isLoteActivo("")).toBe(false);
    expect(isLoteActivo(null)).toBe(false);
    expect(isLoteActivo(undefined)).toBe(false);
    expect(isLoteActivo("ENVASANDO")).toBe(false); // case-sensitive
    expect(isLoteActivo("nuevo")).toBe(false);
  });
});

describe("isLoteFinalizado", () => {
  it("reconoce 'finalizado'", () => {
    expect(isLoteFinalizado("finalizado")).toBe(true);
  });

  it("rechaza estados activos y legacy", () => {
    expect(isLoteFinalizado("envasando")).toBe(false);
    expect(isLoteFinalizado("enviado")).toBe(false);
    expect(isLoteFinalizado("cancelado")).toBe(false);
  });

  it("rechaza vacíos", () => {
    expect(isLoteFinalizado("")).toBe(false);
    expect(isLoteFinalizado(null)).toBe(false);
    expect(isLoteFinalizado(undefined)).toBe(false);
  });

  it("case-sensitive", () => {
    expect(isLoteFinalizado("FINALIZADO")).toBe(false);
  });
});

describe("isLoteLegacyCancelado", () => {
  it("reconoce 'cancelado'", () => {
    expect(isLoteLegacyCancelado("cancelado")).toBe(true);
  });

  it("rechaza estados canónicos", () => {
    expect(isLoteLegacyCancelado("envasando")).toBe(false);
    expect(isLoteLegacyCancelado("finalizado")).toBe(false);
    expect(isLoteLegacyCancelado("enviado")).toBe(false);
  });
});

describe("predicados mutuamente exclusivos", () => {
  it("activo y finalizado nunca coinciden", () => {
    const estados = ["envasando", "enviado", "finalizado", "cancelado", "", null, undefined, "nuevo"];
    for (const e of estados) {
      expect(isLoteActivo(e) && isLoteFinalizado(e)).toBe(false);
    }
  });

  it("legacy-cancelado es disjunto de activo y finalizado", () => {
    expect(isLoteLegacyCancelado("cancelado")).toBe(true);
    expect(isLoteActivo("cancelado")).toBe(false);
    expect(isLoteFinalizado("cancelado")).toBe(false);
  });
});
