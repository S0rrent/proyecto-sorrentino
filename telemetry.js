// ─────────────────────────────────────────────────────────────────────────────
// telemetry.js — recolección local mínima para decisiones de UX
//
// Diseño: ver propuesta en sesión. Reglas no negociables:
//   - Opt-out (Tanda 1, 2026-07): activa salvo yatasto:telemetry === "false".
//     Los datos alimentan la decisión de nav del council y las métricas de UX-V2.
//   - Append-only en memoria; persistencia lazy (visibilitychange + flush manual).
//   - Una clave por día y dispositivo: yatasto:telemetry:YYYY-MM-DD:xxxxxx →
//     { events: Event[] }. El sufijo es un token aleatorio local (no identifica
//     al usuario): evita que flushes concurrentes de dos tablets se pisen
//     (read-merge-write sobre una clave compartida = last-writer-wins).
//   - Cap duro 500 eventos/día POR DISPOSITIVO. Retención 14 días. Sin user IDs.
//   - No se escribe sin sesión: el upsert fallaría contra RLS y ensuciaría la
//     cola offline y el registro de descartes auditables (__yatasto_discarded__).
//   - Fallos de db.set o localStorage se tragan en silencio: la app nunca
//     debe degradarse por analytics.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "./db-adapter.js";

const FLAG = "yatasto:telemetry";
const KEY_PREFIX = "yatasto:telemetry:";
const MAX_EVENTS_PER_DAY = 500;
const RETENTION_DAYS = 14;

const ENABLED = (() => {
  try { return typeof localStorage !== "undefined" && localStorage.getItem(FLAG) !== "false"; }
  catch { return false; }
})();

// Token aleatorio por dispositivo (persistido en localStorage, nunca sube solo).
// No está atado a ningún usuario u operario — solo separa las claves de escritura.
const DEVICE_ID = (() => {
  try {
    let id = localStorage.getItem(FLAG + ":device");
    if (!id) {
      id = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(FLAG + ":device", id);
    }
    return id;
  } catch { return "anon"; }
})();

let buffer = [];
let flushing = false;

const today = () => new Date().toISOString().slice(0, 10);

export const track = (e, v, f) => {
  if (!ENABLED) return;
  const evt = { t: Date.now(), e };
  if (v !== undefined && v !== null && v !== "") evt.v = String(v);
  if (f !== undefined && f !== null && f !== "") evt.f = String(f);
  buffer.push(evt);
  // Cap defensivo en memoria por si el flush nunca llega: nunca más de 2x el cap diario.
  if (buffer.length > MAX_EVENTS_PER_DAY * 2) buffer = buffer.slice(-MAX_EVENTS_PER_DAY);
};

export const flushTelemetry = async () => {
  if (!ENABLED || buffer.length === 0 || flushing) return;
  flushing = true;
  try {
    // Sin sesión no se escribe: el upsert violaría RLS (403) y el retry de la
    // cola terminaría registrando analytics en los descartes auditables.
    // Los eventos quedan en buffer y salen en el próximo flush post-login.
    let session = null;
    try { session = await db.auth.getSession(); } catch { /* silent */ }
    if (!session) return;

    const toFlush = buffer;
    buffer = [];
    const key = KEY_PREFIX + today() + ":" + DEVICE_ID;
    let existing = [];
    try {
      const r = await db.get(key);
      if (r?.value) {
        const parsed = JSON.parse(r.value);
        if (Array.isArray(parsed?.events)) existing = parsed.events;
      }
    } catch { /* silent */ }
    const remaining = MAX_EVENTS_PER_DAY - existing.length;
    if (remaining <= 0) return;
    const merged = existing.concat(toFlush.slice(0, remaining));
    await db.set(key, JSON.stringify({ events: merged }));
  } catch {
    // descartar silenciosamente — nunca degradar la app principal
  } finally {
    flushing = false;
  }
};

const cleanupOldDays = async () => {
  if (!ENABLED) return;
  try {
    const all = await db.list(KEY_PREFIX);
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
      .toISOString().slice(0, 10);
    for (const row of all) {
      // Soporta claves nuevas (día:device) y legacy (solo día).
      const day = row.key.replace(KEY_PREFIX, "").slice(0, 10);
      if (day < cutoff) {
        try { await db.remove(row.key); } catch { /* silent */ }
      }
    }
  } catch { /* silent */ }
};

let initialized = false;
export const initTelemetry = () => {
  if (!ENABLED || initialized) return;
  initialized = true;
  cleanupOldDays();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushTelemetry();
    });
    window.addEventListener("pagehide", () => { flushTelemetry(); });
  }
};

// Helper opcional para análisis manual desde consola
export const dumpTelemetry = async (days = RETENTION_DAYS) => {
  const out = [];
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  try {
    // Una sola lista y filtrado client-side: agrega los eventos de TODOS los
    // dispositivos (claves día:device) y sigue leyendo las claves legacy.
    const all = await db.list(KEY_PREFIX);
    for (const row of all) {
      const day = row.key.replace(KEY_PREFIX, "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < cutoff) continue;
      try {
        const parsed = JSON.parse(row.value);
        (parsed?.events || []).forEach(e => out.push({ day, ...e }));
      } catch { /* silent */ }
    }
  } catch { /* silent */ }
  return out.sort((a, b) => a.t - b.t);
};

if (typeof window !== "undefined") {
  window.__yatastoTelemetry = { dump: dumpTelemetry, flush: flushTelemetry, enabled: ENABLED };
}
