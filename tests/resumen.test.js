import { describe, it, expect } from "vitest";
import { buildResumen } from "../lib/resumen.js";

describe("buildResumen — ingreso", () => {
  it("incluye número, tambo, litros y destino", () => {
    expect(buildResumen("ingreso", {
      num: 13, tambo: "SEIVANE", litrosFca: 12500, destino: "100 N",
    })).toBe("[13] SEIVANE — 12500 L → 100 N");
  });

  it("usa fallbacks cuando faltan campos", () => {
    expect(buildResumen("ingreso", {})).toBe("[-] — — 0 L → ?");
    expect(buildResumen("ingreso", { tambo: "X" })).toBe("[-] X — 0 L → ?");
  });
});

describe("buildResumen — carga", () => {
  it("formato CARGA n + destino + origen", () => {
    expect(buildResumen("carga", {
      label: "CARGA 1", destino: "BUEH 1", litros: 8000, siloProveniente: "80",
    })).toBe("CARGA 1 BUEH 1 — 8000 L desde 80");
  });

  it("fallbacks vacíos", () => {
    expect(buildResumen("carga", {})).toBe(" — — 0 L desde ?");
  });
});

describe("buildResumen — movimiento", () => {
  it("desde→hasta + litros", () => {
    expect(buildResumen("movimiento", {
      desde: "100 N", hasta: "80", litros: 3000,
    })).toBe("100 N→80 — 3000 L");
  });

  it("incluye motivo entre paréntesis si está", () => {
    expect(buildResumen("movimiento", {
      desde: "100 N", hasta: "80", litros: 3000, motivo: "Equilibrar carga",
    })).toBe("100 N→80 — 3000 L (Equilibrar carga)");
  });

  it("fallbacks", () => {
    expect(buildResumen("movimiento", {})).toBe("?→? — 0 L");
  });
});

describe("buildResumen — control", () => {
  it("silo + pH + hora", () => {
    expect(buildResumen("control", {
      silo: "100 N", ph: "6.8", hora: "10:30",
    })).toBe("Silo 100 N — pH 6.8 / 10:30");
  });

  it("fallbacks", () => {
    expect(buildResumen("control", {})).toBe("Silo ? — pH ? / ?");
  });
});

describe("buildResumen — fortificado", () => {
  it("origen→destino + litrosBase", () => {
    expect(buildResumen("fortificado", {
      siloOrigen: "100 N", siloDestino: "TQ6", litrosBase: 5000,
    })).toBe("100 N→TQ6 — 5000 L");
  });

  it("incluye paraQue si está", () => {
    expect(buildResumen("fortificado", {
      siloOrigen: "100 N", siloDestino: "TQ6", litrosBase: 5000, paraQue: "Tetra",
    })).toBe("100 N→TQ6 — 5000 L (Tetra)");
  });
});

describe("buildResumen — tipo desconocido", () => {
  it("fallback al id", () => {
    expect(buildResumen("alien", { id: "abc-123" })).toBe("abc-123");
  });

  it("sin id → string vacío", () => {
    expect(buildResumen("alien", {})).toBe("");
  });

  it("item null → ''", () => {
    expect(buildResumen("ingreso", null)).toBe("");
    expect(buildResumen("carga", undefined)).toBe("");
  });
});
