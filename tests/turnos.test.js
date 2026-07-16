import { describe, it, expect } from "vitest";
import { getToday, getPreviousDate, addDay } from "../lib/dates.js";
import {
  TURNOS_VIGENCIA_DESDE,
  turnosDe, turnoLabelsDe, turnoCierreDe, turnoActual, normalizarTurno,
} from "../lib/turnos.js";

// Fechas relativas a la vigencia — robustas si el dueño la mueve antes del deploy.
const DIA_LEGACY = getPreviousDate(TURNOS_VIGENCIA_DESDE);
const DIA_NUEVO = TURNOS_VIGENCIA_DESDE;

// Instante AR explícito: independiente del TZ del runner (Windows AR o CI UTC).
const ar = (fechaISO, hhmm) => new Date(`${fechaISO}T${hhmm}:00-03:00`);

describe("vigencia por día operativo", () => {
  it("día anterior a la vigencia usa el esquema legacy 07/14/21", () => {
    expect(turnosDe(DIA_LEGACY)).toEqual(["07:00", "14:00", "21:00"]);
    expect(turnoLabelsDe(DIA_LEGACY)).toEqual({ "07:00": "Mañana", "14:00": "Tarde", "21:00": "Noche" });
  });

  it("desde la vigencia usa 05/13/21", () => {
    expect(turnosDe(DIA_NUEVO)).toEqual(["05:00", "13:00", "21:00"]);
    expect(turnoLabelsDe(DIA_NUEVO)).toEqual({ "05:00": "Mañana", "13:00": "Tarde", "21:00": "Noche" });
  });

  it("una fecha histórica NO cambia por la nueva vigencia", () => {
    expect(turnosDe("2026-06-01")).toEqual(["07:00", "14:00", "21:00"]);
    expect(turnosDe("2025-12-31")).toEqual(["07:00", "14:00", "21:00"]);
  });

  it("horas de cierre coherentes con cada esquema", () => {
    expect(turnoCierreDe(DIA_LEGACY)).toEqual({ "07:00": "14:00", "14:00": "21:00", "21:00": "07:00" });
    expect(turnoCierreDe(DIA_NUEVO)).toEqual({ "05:00": "13:00", "13:00": "21:00", "21:00": "05:00" });
  });
});

describe("turnoActual — esquema nuevo (día operativo >= vigencia)", () => {
  // El día operativo de las horas 05:00-23:59 de DIA_NUEVO es DIA_NUEVO (>= vigencia).
  it("límites exactos de los tres turnos", () => {
    expect(turnoActual(ar(DIA_NUEVO, "05:00"))).toBe("05:00"); // arranca Mañana
    expect(turnoActual(ar(DIA_NUEVO, "12:59"))).toBe("05:00"); // fin de Mañana
    expect(turnoActual(ar(DIA_NUEVO, "13:00"))).toBe("13:00"); // arranca Tarde
    expect(turnoActual(ar(DIA_NUEVO, "20:59"))).toBe("13:00"); // fin de Tarde
    expect(turnoActual(ar(DIA_NUEVO, "21:00"))).toBe("21:00"); // arranca Noche
    expect(turnoActual(ar(DIA_NUEVO, "23:59"))).toBe("21:00");
  });

  it("turno noche después de medianoche: sigue siendo Noche del día operativo anterior", () => {
    const madrugada = addDay(DIA_NUEVO); // calendario del día siguiente, 00-04:59
    expect(turnoActual(ar(madrugada, "00:00"))).toBe("21:00");
    expect(turnoActual(ar(madrugada, "02:00"))).toBe("21:00");
    expect(turnoActual(ar(madrugada, "04:59"))).toBe("21:00");
  });

  it("turno y fecha operativa coherentes entre sí (mismo now)", () => {
    const now = ar(addDay(DIA_NUEVO), "02:00"); // 02:00 del calendario siguiente
    expect(getToday(now)).toBe(DIA_NUEVO);      // día operativo = el que empezó la noche
    expect(turnoActual(now)).toBe("21:00");     // y el turno es Noche de ese día
  });
});

describe("normalizarTurno — el tab seleccionado sobrevive al cambio de esquema", () => {
  it("mapea por posición entre esquemas (Mañana↔Mañana)", () => {
    expect(normalizarTurno("05:00", DIA_LEGACY)).toBe("07:00");
    expect(normalizarTurno("13:00", DIA_LEGACY)).toBe("14:00");
    expect(normalizarTurno("07:00", DIA_NUEVO)).toBe("05:00");
    expect(normalizarTurno("14:00", DIA_NUEVO)).toBe("13:00");
  });

  it("clave ya válida en el esquema del día queda intacta", () => {
    expect(normalizarTurno("21:00", DIA_LEGACY)).toBe("21:00");
    expect(normalizarTurno("21:00", DIA_NUEVO)).toBe("21:00");
    expect(normalizarTurno("05:00", DIA_NUEVO)).toBe("05:00");
  });

  it("clave desconocida cae al primer turno del día", () => {
    expect(normalizarTurno("99:99", DIA_NUEVO)).toBe("05:00");
  });
});

describe("turnoActual — esquema legacy (día operativo < vigencia)", () => {
  it("respeta los cortes viejos 07/14/21", () => {
    expect(turnoActual(ar(DIA_LEGACY, "06:59"))).toBe("21:00"); // madrugada legacy: noche hasta 07
    expect(turnoActual(ar(DIA_LEGACY, "07:00"))).toBe("07:00");
    expect(turnoActual(ar(DIA_LEGACY, "13:59"))).toBe("07:00");
    expect(turnoActual(ar(DIA_LEGACY, "14:00"))).toBe("14:00");
    expect(turnoActual(ar(DIA_LEGACY, "20:59"))).toBe("14:00");
    expect(turnoActual(ar(DIA_LEGACY, "21:00"))).toBe("21:00");
  });
});
