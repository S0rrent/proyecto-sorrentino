// ─────────────────────────────────────────────────────────────────────────────
// telemetry.js — recolección local mínima para decisiones de UX
//
// Diseño: ver propuesta en sesión. Reglas no negociables:
//   - Si yatasto:telemetry !== "true" en localStorage, todo es no-op.
//   - Append-only en memoria; persistencia lazy (visibilitychange + flush manual).
//   - Una clave por día: yatasto:telemetry:YYYY-MM-DD → { events: Event[] }.
//   - Cap duro 500 eventos/día. Retención 14 días. Sin user/device IDs.
//   - Fallos de db.set o localStorage se tragan en silencio: la app nunca
//     debe degradarse por analytics.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "./db-adapter.js";

const FLAG = "yatasto:telemetry";
const KEY_PREFIX = "yatasto:telemetry:";
const MAX_EVENTS_PER_DAY = 500;
const RETENTION_DAYS = 14;

const ENABLED = (() => {
  try { return typeof localStorage !== "undefined" && localStorage.getItem(FLAG) === "true"; }
  catch { return false; }
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
  const toFlush = buffer;
  buffer = [];
  try {
    const key = KEY_PREFIX + today();
    let existing = [];
    try {
      const r = await db.get(key);
      if (r?.value) {
        const parsed = JSON.parse(r.value);
        if (Array.isArray(parsed?.events)) existing = parsed.events;
      }
    } catch { /* silent */ }
    const remaining = MAX_EVENTS_PER_DAY - existing.length;
    if (remaining <= 0) { flushing = false; return; }
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
      const day = row.key.replace(KEY_PREFIX, "");
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
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    try {
      const r = await db.get(KEY_PREFIX + d);
      if (r?.value) {
        const parsed = JSON.parse(r.value);
        (parsed?.events || []).forEach(e => out.push({ day: d, ...e }));
      }
    } catch { /* silent */ }
  }
  return out.sort((a, b) => a.t - b.t);
};

if (typeof window !== "undefined") {
  window.__yatastoTelemetry = { dump: dumpTelemetry, flush: flushTelemetry, enabled: ENABLED };
}
