import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "../lib/pin.js";

describe("hashPin", () => {
  it("genera un string con formato sha256:<salt>:<hash>", async () => {
    const hash = await hashPin("1234");
    expect(hash).toMatch(/^sha256:[0-9a-f]{32}:[0-9a-f]{64}$/);
  });

  it("genera hashes diferentes para el mismo PIN (salt distinta)", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a).not.toBe(b);
  });

  it("rechaza PIN vacío", async () => {
    await expect(hashPin("")).rejects.toThrow();
    await expect(hashPin(null)).rejects.toThrow();
    await expect(hashPin(undefined)).rejects.toThrow();
  });

  it("acepta PINs de distinta longitud (4, 6, 8 dígitos)", async () => {
    const h4 = await hashPin("1234");
    const h6 = await hashPin("123456");
    const h8 = await hashPin("12345678");
    expect(h4).toMatch(/^sha256:/);
    expect(h6).toMatch(/^sha256:/);
    expect(h8).toMatch(/^sha256:/);
  });
});

describe("verifyPin", () => {
  it("valida un PIN correcto", async () => {
    const hash = await hashPin("4321");
    expect(await verifyPin("4321", hash)).toBe(true);
  });

  it("rechaza un PIN incorrecto", async () => {
    const hash = await hashPin("4321");
    expect(await verifyPin("1234", hash)).toBe(false);
    expect(await verifyPin("4322", hash)).toBe(false);
    expect(await verifyPin("", hash)).toBe(false);
  });

  it("rechaza hash malformado", async () => {
    expect(await verifyPin("1234", null)).toBe(false);
    expect(await verifyPin("1234", "")).toBe(false);
    expect(await verifyPin("1234", "not-a-hash")).toBe(false);
    expect(await verifyPin("1234", "sha256:")).toBe(false);
    expect(await verifyPin("1234", "sha256:badhex:badhex")).toBe(false);
  });

  it("rechaza prefix incorrecto", async () => {
    expect(await verifyPin("1234", "md5:abc:def")).toBe(false);
  });

  it("es case-insensitive en hex (defensivo)", async () => {
    const hash = await hashPin("5555");
    // Upper-case sólo los segmentos hex (salt y digest), preservando "sha256:" literal.
    const [prefix, salt, digest] = hash.split(":");
    const upper = `${prefix}:${salt.toUpperCase()}:${digest.toUpperCase()}`;
    expect(await verifyPin("5555", upper)).toBe(true);
  });

  it("validación es reproducible (mismo input → mismo resultado)", async () => {
    const hash = await hashPin("9999");
    const a = await verifyPin("9999", hash);
    const b = await verifyPin("9999", hash);
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
