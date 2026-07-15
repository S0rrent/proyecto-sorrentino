import { describe, it, expect, beforeEach } from "vitest";
import {
  leerClave, ErrorDeLectura,
  esLecturaConfiable, marcarLecturaConfiable, _resetLecturasConfiables,
  contadorFallosLectura,
} from "../lib/lecturas.js";

const K = "yatasto:2026-07-14:ingresos";

describe("leerClave: los cuatro estados de una lectura remota", () => {
  beforeEach(() => _resetLecturasConfiables());

  it("OK: parsea, retorna updatedAt y marca la clave confiable", async () => {
    const dbGet = async () => ({ value: JSON.stringify([{ id: "a" }]), updatedAt: "T1" });
    const r = await leerClave(dbGet, K, []);
    expect(r.data).toEqual([{ id: "a" }]);
    expect(r.updatedAt).toBe("T1");
    expect(r.existia).toBe(true);
    expect(esLecturaConfiable(K)).toBe(true);
  });

  it("fila inexistente: retorna el default y ES confiable (día nuevo legítimo)", async () => {
    const dbGet = async () => null;
    const r = await leerClave(dbGet, K, []);
    expect(r.data).toEqual([]);
    expect(r.existia).toBe(false);
    expect(esLecturaConfiable(K)).toBe(true);
  });

  it("error de red: lanza ErrorDeLectura(red) y NO marca confiable", async () => {
    const dbGet = async () => { throw new Error("Failed to fetch"); };
    await expect(leerClave(dbGet, K, [])).rejects.toMatchObject({
      name: "ErrorDeLectura",
      tipo: "red",
      key: K,
    });
    expect(esLecturaConfiable(K)).toBe(false);
  });

  it("datos corruptos: lanza ErrorDeLectura(corrupto), jamás devuelve el default", async () => {
    const dbGet = async () => ({ value: "{esto no es json", updatedAt: "T1" });
    await expect(leerClave(dbGet, K, [])).rejects.toMatchObject({
      name: "ErrorDeLectura",
      tipo: "corrupto",
    });
    expect(esLecturaConfiable(K)).toBe(false);
  });

  it("un fallo posterior NO borra la confianza ganada (el caller retiene su último estado bueno)", async () => {
    await leerClave(async () => null, K, []);
    expect(esLecturaConfiable(K)).toBe(true);
    await expect(leerClave(async () => { throw new Error("net"); }, K, [])).rejects.toThrow();
    expect(esLecturaConfiable(K)).toBe(true);
  });

  it("ErrorDeLectura preserva la causa original para diagnóstico", async () => {
    const causa = new Error("timeout");
    try {
      await leerClave(async () => { throw causa; }, K, []);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDeLectura);
      expect(e.causa).toBe(causa);
    }
  });

  it("marcarLecturaConfiable es idempotente y por clave exacta", () => {
    marcarLecturaConfiable(K);
    marcarLecturaConfiable(K);
    expect(esLecturaConfiable(K)).toBe(true);
    expect(esLecturaConfiable("yatasto:2026-07-15:ingresos")).toBe(false);
  });

  it("conexión colgada (promesa que nunca resuelve): rechaza por timeout como ErrorDeLectura(red)", async () => {
    const dbGet = () => new Promise(() => {}); // request TCP estancado
    await expect(leerClave(dbGet, K, [], 25)).rejects.toMatchObject({
      name: "ErrorDeLectura",
      tipo: "red",
    });
    expect(esLecturaConfiable(K)).toBe(false);
  });

  it("contadorFallosLectura: suma en red y corrupto, no en lecturas OK", async () => {
    const antes = contadorFallosLectura();
    await leerClave(async () => { throw new Error("net"); }, K, []).catch(() => {});
    await leerClave(async () => ({ value: "{corrupto", updatedAt: "T" }), K, []).catch(() => {});
    expect(contadorFallosLectura()).toBe(antes + 2);
    await leerClave(async () => null, K, []);
    expect(contadorFallosLectura()).toBe(antes + 2); // lectura OK no suma
  });
});
