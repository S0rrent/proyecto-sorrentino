// ─────────────────────────────────────────────────────────────────────────────
// lib/operarios.js — CRUD de operarios (identidad por turno)
//
// Modelo: lista persistida bajo la clave `yatasto:operarios` en la tabla
// `yatasto_storage` (mismo backend que el resto de la app). Permite usar la
// infraestructura existente (RLS, sync, cola offline) sin migración nueva.
//
// Cada operario:
//   {
//     id: string,            // UUID
//     nombre: string,        // "Carlos R."
//     color: string,         // hex p/ chip
//     rol: "operador" | "supervisor",  // perfil para resolver permisos
//     pinHash: string,       // "sha256:salt:hash" — opcional para bootstrap
//     activo: boolean,       // si false, no aparece en selector
//     permisosExtra: string[], // acciones extra otorgadas individualmente
//     creadoPor: string|null,
//     creadoEn: string,      // ISO
//     ultimoLogin: string|null, // ISO
//   }
//
// Diseño: opt-in. Si la lista está vacía, la app sigue funcionando como antes
// (perfil-only). Cuando el jefe crea operarios, el selector se activa.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "../db-adapter.js";
import { hashPin, verifyPin } from "./pin.js";

const OPERARIOS_KEY = "yatasto:operarios";

// Lectura cruda — array vacío si no existe la clave o si está corrupta.
export async function loadOperarios() {
  try {
    const r = await db.get(OPERARIOS_KEY);
    if (!r?.value) return [];
    const parsed = JSON.parse(r.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Persiste la lista completa. Devuelve true si OK, false si falló.
export async function saveOperarios(lista) {
  if (!Array.isArray(lista)) throw new Error("saveOperarios: lista debe ser array");
  try {
    await db.set(OPERARIOS_KEY, JSON.stringify(lista));
    return true;
  } catch (e) {
    console.error("[saveOperarios] fallo al persistir:", e);
    return false;
  }
}

// Filtros públicos
export function operariosActivos(lista) {
  return lista.filter((o) => o.activo !== false);
}

export function buscarOperario(lista, id) {
  return lista.find((o) => o.id === id) || null;
}

// Crear un operario nuevo. Si `pin` viene, lo hashea; si no, queda sin pinHash
// (modo "bootstrap" — el jefe puede crearlo y asignar PIN después).
export async function createOperario(lista, { nombre, color, rol = "operador", pin = null, creadoPor = null, permisosExtra = [] }) {
  if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
    throw new Error("createOperario: nombre requerido");
  }
  const op = {
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    color: color || "#3b82f6",
    rol,
    pinHash: pin ? await hashPin(pin) : null,
    activo: true,
    permisosExtra: Array.isArray(permisosExtra) ? permisosExtra : [],
    creadoPor,
    creadoEn: new Date().toISOString(),
    ultimoLogin: null,
  };
  return [...lista, op];
}

// Actualiza campos arbitrarios de un operario. NO toca pinHash (usar setPin).
export function updateOperario(lista, id, patch) {
  const idx = lista.findIndex((o) => o.id === id);
  if (idx < 0) return lista;
  const { pinHash: _ignored, ...safePatch } = patch || {};
  const next = lista.slice();
  next[idx] = { ...next[idx], ...safePatch };
  return next;
}

// Set/cambia el PIN. Devuelve nueva lista.
export async function setPin(lista, id, pin) {
  if (!pin) throw new Error("setPin: PIN vacío");
  const idx = lista.findIndex((o) => o.id === id);
  if (idx < 0) return lista;
  const next = lista.slice();
  next[idx] = { ...next[idx], pinHash: await hashPin(pin) };
  return next;
}

// Elimina (soft) un operario marcándolo inactivo. No borra histórico.
export function desactivarOperario(lista, id) {
  return updateOperario(lista, id, { activo: false });
}

export function reactivarOperario(lista, id) {
  return updateOperario(lista, id, { activo: true });
}

// Valida PIN. Devuelve true/false. NO mutea ni persiste — el caller decide.
export async function verifyOperarioPin(lista, id, pin) {
  const op = buscarOperario(lista, id);
  if (!op || !op.pinHash) return false;
  return await verifyPin(pin, op.pinHash);
}

// Marca último login. Pure: devuelve nueva lista, el caller persiste.
export function recordLogin(lista, id) {
  return updateOperario(lista, id, { ultimoLogin: new Date().toISOString() });
}

// Iniciales para chip (2 caracteres). "Carlos R." → "CR".
export function iniciales(nombre) {
  if (!nombre) return "??";
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const primera = partes[0][0] || "?";
  const ultima = partes[partes.length - 1][0] || "?";
  return (primera + ultima).toUpperCase();
}
