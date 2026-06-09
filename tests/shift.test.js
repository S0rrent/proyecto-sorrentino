import { describe, it, expect } from "vitest";
import { isShiftChangeWindow } from "../hooks.js";

function dt(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

describe("isShiftChangeWindow", () => {
  it("turno 07:00 — entra desde 06:30", () => {
    expect(isShiftChangeWindow(dt(6, 30))).toBe("07:00");
    expect(isShiftChangeWindow(dt(6, 45))).toBe("07:00");
    expect(isShiftChangeWindow(dt(7, 0))).toBe("07:00");
    expect(isShiftChangeWindow(dt(7, 15))).toBe("07:00");
    expect(isShiftChangeWindow(dt(7, 30))).toBe("07:00");
  });

  it("turno 07:00 — sale en 07:31", () => {
    expect(isShiftChangeWindow(dt(7, 31))).toBeNull();
    expect(isShiftChangeWindow(dt(8, 0))).toBeNull();
  });

  it("turno 14:00 — ventana 13:30–14:30", () => {
    expect(isShiftChangeWindow(dt(13, 30))).toBe("14:00");
    expect(isShiftChangeWindow(dt(14, 0))).toBe("14:00");
    expect(isShiftChangeWindow(dt(14, 30))).toBe("14:00");
    expect(isShiftChangeWindow(dt(13, 29))).toBeNull();
    expect(isShiftChangeWindow(dt(14, 31))).toBeNull();
  });

  it("turno 21:00 — ventana 20:30–21:30", () => {
    expect(isShiftChangeWindow(dt(20, 30))).toBe("21:00");
    expect(isShiftChangeWindow(dt(21, 0))).toBe("21:00");
    expect(isShiftChangeWindow(dt(21, 30))).toBe("21:00");
    expect(isShiftChangeWindow(dt(20, 29))).toBeNull();
    expect(isShiftChangeWindow(dt(21, 31))).toBeNull();
  });

  it("horarios fuera de ventana", () => {
    expect(isShiftChangeWindow(dt(9, 0))).toBeNull();
    expect(isShiftChangeWindow(dt(11, 0))).toBeNull();
    expect(isShiftChangeWindow(dt(16, 0))).toBeNull();
    expect(isShiftChangeWindow(dt(18, 0))).toBeNull();
    expect(isShiftChangeWindow(dt(0, 0))).toBeNull();
    expect(isShiftChangeWindow(dt(3, 0))).toBeNull();
  });
});
