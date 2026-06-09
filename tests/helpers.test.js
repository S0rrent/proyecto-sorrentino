import { describe, it, expect } from "vitest";
import {
  buildFortLabel,
  diffDays,
  calcSF,
  isSueroLike,
  shouldShowSF,
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
