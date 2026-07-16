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

// Instante AR explícito: mismo resultado en Windows Argentina y en CI UTC.
const ar = (hhmm, fecha = "2026-07-14") => new Date(`${fecha}T${hhmm}:00-03:00`);

describe("getToday — día operativo (corte 05:00, TZ America/Argentina/Buenos_Aires)", () => {
  it("ejemplos obligatorios de la decisión de negocio", () => {
    expect(getToday(ar("20:59"))).toBe("2026-07-14");
    expect(getToday(ar("21:00"))).toBe("2026-07-14"); // el bug UTC devolvía 15/07
    expect(getToday(ar("23:59"))).toBe("2026-07-14"); // ídem
    expect(getToday(ar("00:00", "2026-07-15"))).toBe("2026-07-14"); // madrugada → día anterior
    expect(getToday(ar("04:59", "2026-07-15"))).toBe("2026-07-14");
    expect(getToday(ar("05:00", "2026-07-15"))).toBe("2026-07-15"); // corte exacto
  });

  it("todos los límites horarios del día operativo", () => {
    expect(getToday(ar("04:59"))).toBe("2026-07-13"); // pertenece al día que empezó anoche
    expect(getToday(ar("05:00"))).toBe("2026-07-14");
    expect(getToday(ar("12:59"))).toBe("2026-07-14");
    expect(getToday(ar("13:00"))).toBe("2026-07-14");
    expect(getToday(ar("20:59"))).toBe("2026-07-14");
    expect(getToday(ar("21:00"))).toBe("2026-07-14");
    expect(getToday(ar("23:59"))).toBe("2026-07-14");
    expect(getToday(ar("00:00", "2026-07-15"))).toBe("2026-07-14");
  });

  it("independiente del TZ del runner: mismo instante expresado en UTC", () => {
    // 2026-07-15T02:00Z = 14/07 23:00 hora argentina → día operativo 14/07
    expect(getToday(new Date("2026-07-15T02:00:00.000Z"))).toBe("2026-07-14");
    // 2026-07-15T07:30Z = 15/07 04:30 AR → sigue siendo 14/07
    expect(getToday(new Date("2026-07-15T07:30:00.000Z"))).toBe("2026-07-14");
    // 2026-07-15T08:00Z = 15/07 05:00 AR → 15/07
    expect(getToday(new Date("2026-07-15T08:00:00.000Z"))).toBe("2026-07-15");
  });

  it("bordes de mes y año en la madrugada", () => {
    expect(getToday(ar("00:30", "2026-08-01"))).toBe("2026-07-31");
    expect(getToday(ar("03:00", "2026-01-01"))).toBe("2025-12-31");
  });

  it("integración: un ingreso a las 02:00 se guarda bajo el día operativo anterior", () => {
    // sKey del día = `yatasto:${getToday(now)}:ingresos` — la clave del ingreso
    // de las 02:00 debe ser la del día que empezó la noche.
    const now = ar("02:00", "2026-07-17");
    expect(`yatasto:${getToday(now)}:ingresos`).toBe("yatasto:2026-07-16:ingresos");
  });

  it("integración: carry-over consulta el 'ayer' operativo correcto", () => {
    // A las 02:00 del 17/07, el día operativo es 16/07 y su 'ayer' es 15/07.
    const now = ar("02:00", "2026-07-17");
    expect(getPreviousDate(getToday(now))).toBe("2026-07-15");
  });

  it("integración: el cierre de día a las 21:30 NO selecciona mañana (bug UTC)", () => {
    expect(getToday(ar("21:30", "2026-07-16"))).toBe("2026-07-16");
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

  it("inputs no-ISO (p.ej. el botón Borrar del date picker nativo) → [] sin lanzar", () => {
    expect(getDaysInRange("", "2026-07-15")).toEqual([]);
    expect(getDaysInRange("2026-07-15", "")).toEqual([]);
    expect(getDaysInRange("", "")).toEqual([]);
    expect(getDaysInRange("abc", "abd")).toEqual([]);
    expect(getDaysInRange(null, "2026-07-15")).toEqual([]);
    expect(getDaysInRange(undefined, undefined)).toEqual([]);
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

describe("getNow — hora operativa (TZ pinneada, no la del dispositivo)", () => {
  it("formato HH:MM con padding cero", () => {
    expect(getNow(new Date("2026-07-14T07:05:00-03:00"))).toBe("07:05");
  });

  it("hora doble dígito", () => {
    expect(getNow(new Date("2026-07-14T14:32:00-03:00"))).toBe("14:32");
  });

  it("medianoche en formato h23 (00, no 24)", () => {
    expect(getNow(new Date("2026-07-15T00:00:00-03:00"))).toBe("00:00");
  });

  it("dispositivo con reloj en UTC: la hora mostrada sigue siendo la argentina", () => {
    // 12:00Z = 09:00 AR — un tablet mal configurado no debe estampar 12:00.
    expect(getNow(new Date("2026-07-14T12:00:00.000Z"))).toBe("09:00");
  });
});
