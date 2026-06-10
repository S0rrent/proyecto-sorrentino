import { describe, it, expect } from "vitest";
import { escapeHtml, escapeCsv } from "../lib/export-helpers.js";

describe("escapeHtml", () => {
  it("escapa entidades HTML básicas", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapa & primero (evita doble escape)", () => {
    expect(escapeHtml("AT&T <b>")).toBe("AT&amp;T &lt;b&gt;");
  });

  it("escapa comillas dobles y simples", () => {
    expect(escapeHtml(`"x"`)).toBe("&quot;x&quot;");
    expect(escapeHtml(`'y'`)).toBe("&#39;y&#39;");
  });

  it("preserva caracteres seguros", () => {
    expect(escapeHtml("Hola Mundo")).toBe("Hola Mundo");
    expect(escapeHtml("123-456")).toBe("123-456");
    expect(escapeHtml("Año 2026")).toBe("Año 2026");
  });

  it("convierte null/undefined a ''", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("convierte número a string", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(0)).toBe("0");
  });

  it("orden correcto cuando hay & y entidades nombradas", () => {
    expect(escapeHtml("Tom & Jerry < Mickey")).toBe(
      "Tom &amp; Jerry &lt; Mickey"
    );
  });
});

describe("escapeCsv", () => {
  it("strings simples sin caracteres especiales pasan tal cual", () => {
    expect(escapeCsv("Hola")).toBe("Hola");
    expect(escapeCsv("123")).toBe("123");
  });

  it("encierra en comillas si tiene coma", () => {
    expect(escapeCsv("a,b")).toBe(`"a,b"`);
  });

  it("encierra en comillas si tiene newline", () => {
    expect(escapeCsv("línea1\nlínea2")).toBe(`"línea1\nlínea2"`);
    expect(escapeCsv("línea1\rlínea2")).toBe(`"línea1\rlínea2"`);
  });

  it("encierra en comillas si arranca con caracteres de fórmula", () => {
    expect(escapeCsv("=SUM(A1)")).toBe(`"=SUM(A1)"`);
    expect(escapeCsv("+1")).toBe(`"+1"`);
    expect(escapeCsv("-1")).toBe(`"-1"`);
    expect(escapeCsv("@cmd")).toBe(`"@cmd"`);
    expect(escapeCsv("|x")).toBe(`"|x"`);
  });

  it("dobla comillas internas y encierra todo", () => {
    expect(escapeCsv(`he said "hi"`)).toBe(`"he said ""hi"""`);
  });

  it("null/undefined a ''", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("número se convierte a string sin comillas si no tiene especiales", () => {
    expect(escapeCsv(42)).toBe("42");
  });
});
