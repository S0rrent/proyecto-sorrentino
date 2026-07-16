import { describe, it, expect } from "vitest";
import { isShiftChangeWindow } from "../hooks.js";
import { getPreviousDate, addDay } from "../lib/dates.js";
import { TURNOS_VIGENCIA_DESDE } from "../lib/turnos.js";

// Instantes AR explícitos: independientes del TZ del runner (Windows AR / CI UTC).
const DIA_LEGACY = getPreviousDate(getPreviousDate(TURNOS_VIGENCIA_DESDE)); // bien antes del corte
const DIA_NUEVO = addDay(TURNOS_VIGENCIA_DESDE); // bien después (madrugada incluida)
const ar = (fechaISO, hhmm) => new Date(`${fechaISO}T${hhmm}:00-03:00`);

describe("isShiftChangeWindow — esquema legacy (día operativo < vigencia)", () => {
  it("ventana 07:00 (06:30–07:30)", () => {
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "06:30"))).toBe("07:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "07:00"))).toBe("07:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "07:30"))).toBe("07:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "07:31"))).toBeNull();
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "06:29"))).toBeNull();
  });

  it("ventanas 14:00 y 21:00", () => {
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "13:30"))).toBe("14:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "14:30"))).toBe("14:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "20:30"))).toBe("21:00");
    expect(isShiftChangeWindow(ar(DIA_LEGACY, "21:30"))).toBe("21:00");
  });

  it("fuera de ventana", () => {
    for (const h of ["09:00", "11:00", "16:00", "18:00", "00:00", "03:00"]) {
      expect(isShiftChangeWindow(ar(DIA_LEGACY, h))).toBeNull();
    }
  });
});

describe("isShiftChangeWindow — esquema nuevo (día operativo >= vigencia)", () => {
  it("ventana de la Mañana pasa a 05:00 (04:30–05:30)", () => {
    // 04:30 del día siguiente a la vigencia: día operativo = TURNOS_VIGENCIA_DESDE
    // (>= vigencia) → esquema nuevo → ventana alrededor de las 05:00.
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "04:30"))).toBe("05:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "05:00"))).toBe("05:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "05:30"))).toBe("05:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "05:31"))).toBeNull();
  });

  it("ventanas 13:00 y 21:00", () => {
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "12:30"))).toBe("13:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "13:30"))).toBe("13:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "20:30"))).toBe("21:00");
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "21:30"))).toBe("21:00");
  });

  it("las ventanas viejas dejan de existir", () => {
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "07:00"))).toBeNull();
    expect(isShiftChangeWindow(ar(DIA_NUEVO, "14:00"))).toBeNull();
  });

  it("fuera de ventana (incluida la madrugada del turno noche)", () => {
    for (const h of ["09:00", "16:00", "18:00", "00:00", "02:00", "03:59"]) {
      expect(isShiftChangeWindow(ar(DIA_NUEVO, h))).toBeNull();
    }
  });
});
