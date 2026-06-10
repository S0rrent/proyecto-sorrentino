import { describe, it, expect } from "vitest";
import {
  getToday, getPreviousDate, addDay,
  getLastNDays, getDaysInRange,
  fmtDate, getNow,
} from "../lib/dates.js";

describe("getToday", () => {
  it("retorna ISO YYYY-MM-DD", () => {
    const result = getToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("acepta now opcional para tests determinísticos", () => {
    const fixed = new Date("2026-06-09T15:30:00.000Z");
    expect(getToday(fixed)).toBe("2026-06-09");
  });
});

describe("getPreviousDate", () => {
  it("retrocede un día simple", () => {
    expect(getPreviousDate("2026-06-09")).toBe("2026-06-08");
  });

  it("retrocede sobre borde de mes", () => {
    expect(getPreviousDate("2026-06-01")).toBe("2026-05-31");
    expect(getPreviousDate("2026-03-01")).toBe("2026-02-28");
  });

  it("retrocede sobre borde de año", () => {
    expect(getPreviousDate("2026-01-01")).toBe("2025-12-31");
  });

  it("retrocede sobre borde de febrero en año bisiesto", () => {
    expect(getPreviousDate("2024-03-01")).toBe("2024-02-29");
  });
});

describe("addDay", () => {
  it("avanza un día simple", () => {
    expect(addDay("2026-06-09")).toBe("2026-06-10");
  });

  it("avanza sobre borde de mes", () => {
    expect(addDay("2026-05-31")).toBe("2026-06-01");
    expect(addDay("2026-02-28")).toBe("2026-03-01");
  });

  it("avanza sobre borde de año", () => {
    expect(addDay("2025-12-31")).toBe("2026-01-01");
  });

  it("avanza correcto en bisiesto", () => {
    expect(addDay("2024-02-28")).toBe("2024-02-29");
    expect(addDay("2024-02-29")).toBe("2024-03-01");
  });

  it("inversa de getPreviousDate", () => {
    const dates = ["2024-02-29", "2025-12-31", "2026-06-09", "2026-01-01"];
    for (const d of dates) {
      expect(addDay(getPreviousDate(d))).toBe(d);
    }
  });
});

describe("getLastNDays", () => {
  it("retorna N fechas en orden ascendente", () => {
    const now = new Date("2026-06-09T12:00:00.000Z");
    const result = getLastNDays(3, now);
    expect(result).toHaveLength(3);
    expect(result).toEqual(["2026-06-07", "2026-06-08", "2026-06-09"]);
  });

  it("N=1 retorna sólo hoy", () => {
    const now = new Date("2026-06-09T12:00:00.000Z");
    expect(getLastNDays(1, now)).toEqual(["2026-06-09"]);
  });

  it("N=0 retorna array vacío", () => {
    expect(getLastNDays(0)).toEqual([]);
  });

  it("cruza borde de mes correctamente", () => {
    const now = new Date("2026-06-02T12:00:00.000Z");
    expect(getLastNDays(4, now)).toEqual(["2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02"]);
  });
});

describe("getDaysInRange", () => {
  it("retorna rango inclusivo", () => {
    expect(getDaysInRange("2026-06-08", "2026-06-10")).toEqual([
      "2026-06-08", "2026-06-09", "2026-06-10",
    ]);
  });

  it("rango de un solo día", () => {
    expect(getDaysInRange("2026-06-09", "2026-06-09")).toEqual(["2026-06-09"]);
  });

  it("from > to retorna vacío", () => {
    expect(getDaysInRange("2026-06-10", "2026-06-09")).toEqual([]);
  });

  it("cap a 90 días", () => {
    const result = getDaysInRange("2026-01-01", "2026-12-31");
    expect(result).toHaveLength(90);
    expect(result[0]).toBe("2026-01-01");
  });

  it("cruza borde de año", () => {
    const result = getDaysInRange("2025-12-30", "2026-01-02");
    expect(result).toEqual(["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"]);
  });
});

describe("fmtDate", () => {
  it("convierte ISO a es-AR", () => {
    expect(fmtDate("2026-06-09")).toBe("09/06/2026");
    expect(fmtDate("2025-01-01")).toBe("01/01/2025");
  });

  it("retorna '' para input vacío", () => {
    expect(fmtDate(null)).toBe("");
    expect(fmtDate(undefined)).toBe("");
    expect(fmtDate("")).toBe("");
  });

  it("retorna input tal cual si no tiene formato esperado", () => {
    expect(fmtDate("invalido")).toBe("invalido");
    expect(fmtDate("2026-06")).toBe("2026-06");
  });
});

describe("getNow", () => {
  it("formato HH:MM con padding cero", () => {
    const t = new Date();
    t.setHours(7, 5, 0, 0);
    expect(getNow(t)).toBe("07:05");
  });

  it("hora doble dígito sin doble cero", () => {
    const t = new Date();
    t.setHours(14, 32, 0, 0);
    expect(getNow(t)).toBe("14:32");
  });

  it("medianoche", () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    expect(getNow(t)).toBe("00:00");
  });
});
