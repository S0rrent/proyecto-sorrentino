// ─────────────────────────────────────────────────────────────────────────────
// lib/lecturas.js — Lecturas remotas confiables (Tanda 2, P0-2 auditoría 2026-07)
//
// Problema que resuelve: un fallo de red al leer NO es lo mismo que "no hay
// datos". Si se confunden, la UI muestra un día vacío falso y el próximo
// guardado pisa los datos reales del servidor con el default.
//
// Estados de una lectura:
//   OK             → datos parseados; la clave queda marcada confiable.
//   Fila inexistente → default; la clave queda confiable (día nuevo legítimo).
//   Error de red   → throw ErrorDeLectura(tipo "red"). El caller conserva su
//                    último estado bueno; NUNCA debe mostrar el default.
//   Datos corruptos → throw ErrorDeLectura(tipo "corrupto"). Jamás devolver
//                    default: un guardado posterior destruiría datos reales.
//
// El registro de claves confiables es por sesión (en memoria): save() debe
// negarse a escribir una clave que nunca se leyó bien en esta sesión.
// ─────────────────────────────────────────────────────────────────────────────

export class ErrorDeLectura extends Error {
  constructor(key, tipo, causa) {
    super(`No se pudo leer ${key} (${tipo})`);
    this.name = "ErrorDeLectura";
    this.key = key;
    this.tipo = tipo; // "red" | "corrupto"
    this.causa = causa;
  }
}

const _confiables = new Set();

export const esLecturaConfiable = (key) => _confiables.has(key);
export const marcarLecturaConfiable = (key) => { _confiables.add(key); };
// Solo para tests: resetea el registro de la sesión.
export const _resetLecturasConfiables = () => { _confiables.clear(); };

// Contador de fallos de lectura de la sesión. Un cómputo que hace N lecturas
// (p.ej. calcAutoLitros) puede snapshotearlo antes y después: si cambió,
// alguna lectura interna falló y el resultado NO es apto para persistirse
// ni cachearse (aunque las lecturas tolerantes lo hayan tapado con defaults).
let _fallos = 0;
export const contadorFallosLectura = () => _fallos;
export const registrarFalloLectura = () => { _fallos++; };

// Timeout de lectura: sin él, una conexión colgada (no cortada) deja la promesa
// viva por minutos — la sección queda en "Cargando..." sin banner y los polls
// se apilan. Antes lo limitaba el NetworkFirst(10s) del SW, que ya no existe.
export const LEER_TIMEOUT_MS = 10000;

// Lee una clave remota distinguiendo los cuatro estados.
// dbGet se inyecta (db.get de db-adapter) para mantener el módulo puro y testeable.
// Retorna { data, updatedAt, existia } o lanza ErrorDeLectura.
export async function leerClave(dbGet, key, def, timeoutMs = LEER_TIMEOUT_MS) {
  let r;
  let timer;
  try {
    r = await Promise.race([
      dbGet(key),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout de lectura (${timeoutMs}ms)`)), timeoutMs); }),
    ]);
  } catch (e) {
    registrarFalloLectura();
    throw new ErrorDeLectura(key, "red", e);
  } finally {
    clearTimeout(timer);
  }
  if (!r) {
    marcarLecturaConfiable(key);
    return { data: def, updatedAt: null, existia: false };
  }
  let data;
  try {
    data = JSON.parse(r.value);
  } catch (e) {
    registrarFalloLectura();
    throw new ErrorDeLectura(key, "corrupto", e);
  }
  marcarLecturaConfiable(key);
  return { data, updatedAt: r.updatedAt || null, existia: true };
}
