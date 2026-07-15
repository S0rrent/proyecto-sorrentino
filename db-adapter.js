import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// db-adapter.js — Persistencia Supabase para Lacteos Yatasto SA
//
// Backend: tabla yatasto_storage (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)
// Interfaz:
//   db.get(key)         → Promise<{ value: string } | null>
//   db.set(key, value)  → Promise<void>  (encola si falla, reintenta con backoff)
//   db.remove(key)      → Promise<void>
//   db.list(prefix)     → Promise<Array<{ key, value }>>
//
// Cola offline:
//   onWriteQueueChange(fn) → fn(pendingCount, isRetrying) — suscripción reactiva
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[db-adapter] Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Crear un archivo .env basado en .env.example.");
}

const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Write queue con retry ────────────────────────────────────────────────────
// Persiste en localStorage para sobrevivir recargas. Cada entrada: { key, value }.
// Al reconectar drena en orden FIFO con backoff 2s → 4s → 8s → 16s.

const _QUEUE_LS = "__yatasto_wq__";
let _queue = (() => {
  try { return JSON.parse(localStorage.getItem(_QUEUE_LS) || "[]"); } catch { return []; }
})();
let _flushing = false;
const _listeners = new Set();

// ── Descartes auditables ─────────────────────────────────────────────────────
// Cuando la cola descarta una entrada por 4xx permanente, en vez de perderla
// en silencio la guardamos en localStorage y notificamos a la UI.
// Cap 50 entradas (las más recientes) — suficiente para investigar sin que
// la lista crezca sin límite. Cada descarte: { key, value, status, message, ts }.
const _DISCARDED_LS = "__yatasto_discarded__";
const _DISCARDED_CAP = 50;
const _discardedListeners = new Set();

function _loadDiscarded() {
  try { return JSON.parse(localStorage.getItem(_DISCARDED_LS) || "[]"); } catch { return []; }
}
function _saveDiscarded(items) {
  try { localStorage.setItem(_DISCARDED_LS, JSON.stringify(items.slice(-_DISCARDED_CAP))); } catch {}
}
function _notifyDiscarded() {
  const items = _loadDiscarded();
  _discardedListeners.forEach(fn => fn(items));
}
function _recordDiscarded(key, value, error) {
  const items = _loadDiscarded();
  items.push({
    key,
    value: typeof value === "string" ? value.slice(0, 500) : String(value).slice(0, 500),
    status: error?.status ?? null,
    message: error?.message ?? String(error ?? "unknown"),
    ts: new Date().toISOString(),
  });
  _saveDiscarded(items);
  _notifyDiscarded();
}

export function onDiscarded(fn) {
  _discardedListeners.add(fn);
  fn(_loadDiscarded()); // estado inicial
  return () => _discardedListeners.delete(fn);
}

export function listDiscarded() {
  return _loadDiscarded();
}

export function clearDiscarded() {
  try { localStorage.removeItem(_DISCARDED_LS); } catch {}
  _notifyDiscarded();
}

// ── Gestión de sesión expirada ───────────────────────────────────────────────
// Cuando Supabase devuelve 401, se intenta refresh una sola vez.
// Si falla, _sessionExpired=true pausa todas las escrituras directas hasta relogin.
let _sessionExpired = false;
let _refreshing = false;          // lock: evita dos refreshes simultáneos
const _sessionListeners = new Set();

// Reconoce errores de autenticación (JWT expirado, código PostgREST, status 401).
// Exportado para test directo — la decisión "refresh sesión vs descartar" es
// crítica para no perder operaciones cuando expira el token.
export function _is401(error) {
  return error?.status === 401 || error?.code === "PGRST301" ||
    (typeof error?.message === "string" && error.message.includes("JWT"));
}

// Errores 4xx permanentes (validación, constraint, payload inválido, etc.) NO se
// recuperan reintentando. Excluye 401 (refresh token), 408 (timeout, transitorio)
// y 429 (rate limit, transitorio) — esos sí ameritan retry.
// Exportado para testabilidad — la decisión retry vs descarte es crítica para
// la integridad de la cola offline; cualquier cambio aquí afecta la pérdida
// de datos en planta y debe estar cubierto por tests.
export function _isPermanent4xx(error) {
  const s = error?.status;
  if (typeof s !== "number") return false;
  return s >= 400 && s < 500 && s !== 401 && s !== 408 && s !== 429;
}

async function _tryRefresh() {
  try {
    const { error } = await _sb.auth.refreshSession();
    return !error;
  } catch { return false; }
}

function _notifySessionExpired() {
  _sessionListeners.forEach(fn => fn());
}

export function onSessionExpired(fn) {
  _sessionListeners.add(fn);
  return () => _sessionListeners.delete(fn);
}

export function clearSessionExpired() {
  _sessionExpired = false;
  _refreshing = false;
  setTimeout(_flushQueue, 500); // retomar cola tras relogin
}
// ─────────────────────────────────────────────────────────────────────────────

function _queuePersist() {
  try { localStorage.setItem(_QUEUE_LS, JSON.stringify(_queue)); } catch {}
}
function _queueNotify() {
  _listeners.forEach(fn => fn(_queue.length, _flushing));
}

export function onWriteQueueChange(fn) {
  _listeners.add(fn);
  fn(_queue.length, _flushing); // estado inicial inmediato
  return () => _listeners.delete(fn);
}

async function _flushQueue() {
  if (_flushing || _queue.length === 0 || _sessionExpired) return;
  _flushing = true;
  _queueNotify();

  while (_queue.length > 0) {
    if (_sessionExpired) break; // sesión expiró durante el drenado — detener
    const { key, value } = _queue[0];
    let ok = false;
    let lastError = null;
    let delay = 2000;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const { error } = await _sb
          .from("yatasto_storage")
          .upsert({ key, value, updated_at: new Date().toISOString() });
        if (error) throw error;
        ok = true;
        break;
      } catch (e) {
        lastError = e;
        if (attempt < 3) await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
    if (ok) {
      _queue.shift();
      _queuePersist();
      _queueNotify();
    } else if (_isPermanent4xx(lastError)) {
      // 4xx permanente (validación, constraint, payload corrupto): reintentar es
      // inútil y bloquea la cola indefinidamente. Descartar, registrar para auditoría
      // y notificar a la UI (banner de descartes auditable).
      console.error(`[queue] descartando entrada con error 4xx permanente (status=${lastError?.status}) key=${key}:`, lastError);
      _recordDiscarded(key, value, lastError);
      _queue.shift();
      _queuePersist();
      _queueNotify();
      continue;
    } else {
      // Si el fallo fue por 401, intentar refresh una sola vez y reintentar
      if (_is401(lastError) && !_refreshing) {
        _refreshing = true;
        const refreshed = await _tryRefresh();
        _refreshing = false;
        if (refreshed) {
          // Reintentar el mismo item con el nuevo token
          try {
            const { error } = await _sb
              .from("yatasto_storage")
              .upsert({ key, value, updated_at: new Date().toISOString() });
            if (!error) {
              _queue.shift();
              _queuePersist();
              _queueNotify();
              continue;
            }
          } catch {}
        }
        // Refresh falló o segundo intento falló — pausar cola y avisar
        _sessionExpired = true;
        _notifySessionExpired();
      }
      break; // sigue offline o sesión expirada — detener
    }
  }

  _flushing = false;
  _queueNotify();
  if (_queue.length > 0 && !_sessionExpired) setTimeout(_flushQueue, 30000);
}

// Drenar cola al iniciar si quedó algo pendiente de sesión anterior
if (_queue.length > 0) setTimeout(_flushQueue, 2000);

// ── API pública ──────────────────────────────────────────────────────────────
export const db = {
  async get(key) {
    const { data, error } = await _sb
      .from("yatasto_storage")
      .select("value,updated_at")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? { value: data.value, updatedAt: data.updated_at } : null;
  },

  async getTimestamp(key) {
    const { data, error } = await _sb
      .from("yatasto_storage")
      .select("updated_at")
      .eq("key", key)
      .maybeSingle();
    if (error) return null;
    return data ? { updatedAt: data.updated_at } : null;
  },

  async set(key, value) {
    // Si la sesión está marcada como expirada, encolar directamente sin intentar red
    if (_sessionExpired) {
      const idx = _queue.findIndex(q => q.key === key);
      if (idx >= 0) _queue[idx].value = value;
      else _queue.push({ key, value });
      _queuePersist();
      _queueNotify();
      return null;
    }
    const ts = new Date().toISOString();
    try {
      const { error } = await _sb
        .from("yatasto_storage")
        .upsert({ key, value, updated_at: ts });
      if (error) throw error;
      return ts; // éxito — retornar timestamp escrito
    } catch (e) {
      // 401 JWT expirado: intentar refresh una vez y reintentar
      if (_is401(e) && !_refreshing) {
        _refreshing = true;
        const refreshed = await _tryRefresh();
        _refreshing = false;
        if (refreshed) {
          try {
            const ts2 = new Date().toISOString();
            const { error: e2 } = await _sb
              .from("yatasto_storage")
              .upsert({ key, value, updated_at: ts2 });
            if (!e2) return ts2; // éxito tras refresh
          } catch {}
        }
        // Refresh falló o segundo intento falló — marcar sesión expirada
        _sessionExpired = true;
        _notifySessionExpired();
      }
      // Escritura directa falló — encolar para reintento
      const idx = _queue.findIndex(q => q.key === key);
      if (idx >= 0) _queue[idx].value = value;
      else _queue.push({ key, value });
      _queuePersist();
      _queueNotify();
      setTimeout(_flushQueue, 2000);
      return null; // encolado/fallado — sin timestamp
    }
  },

  async remove(key) {
    const { error } = await _sb
      .from("yatasto_storage")
      .delete()
      .eq("key", key);
    if (error) throw error;
  },

  async list(prefix = "yatasto:") {
    // Supabase corta silenciosamente en 1000 filas por request (T3 del registro
    // de hazards). Paginación KEYSET (gt sobre la última key, no offset): inmune
    // a inserts/deletes concurrentes (offset saltea o duplica filas del borde de
    // página) y a un db-max-rows del servidor menor a PAGE. Corta solo cuando
    // una página llega vacía.
    const PAGE = 1000;
    const all = [];
    let last = null;
    for (;;) {
      let q = _sb
        .from("yatasto_storage")
        .select("key,value")
        .like("key", `${prefix}%`);
      if (last !== null) q = q.gt("key", last);
      const { data, error } = await q.order("key", { ascending: true }).limit(PAGE);
      if (error) throw error;
      const rows = data || [];
      if (rows.length === 0) break;
      all.push(...rows);
      last = rows[rows.length - 1].key;
    }
    return all;
  },

  // Cantidad exacta de filas con el prefijo, contada por el servidor.
  // Sirve para verificar que un backup trajo TODO (list.length === count).
  async count(prefix = "yatasto:") {
    const { count, error } = await _sb
      .from("yatasto_storage")
      .select("key", { count: "exact", head: true })
      .like("key", `${prefix}%`);
    if (error) throw error;
    return count ?? 0;
  },

  auth: {
    async signIn(email, password) {
      const { data, error } = await _sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      const { error } = await _sb.auth.signOut();
      if (error) throw error;
    },
    async getSession() {
      const { data, error } = await _sb.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    onAuthStateChange(callback) {
      const { data: { subscription } } = _sb.auth.onAuthStateChange(callback);
      return () => subscription.unsubscribe();
    },
  },
};

// ── Migración localStorage → Supabase ────────────────────────────────────────
// Ejecutar desde la consola del navegador UNA SOLA VEZ para migrar datos locales:
//   const { migrateToSupabase } = await import("/src/db-adapter.js");
//   await migrateToSupabase();
export async function migrateToSupabase() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("yatasto:"));
  console.log(`Migrando ${keys.length} claves a Supabase...`);
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      await db.set(key, value);
      console.log(`  ✓ ${key}`);
    }
  }
  console.log("Migración completa.");
}

// Restaura un backup generado por la app (el JSON descargado por generateBackup).
// SIEMPRE aditivo: upsertea las claves del backup, NUNCA borra las que solo
// existen en el servidor. Por defecto dryRun=true: no escribe nada, devuelve
// un reporte para verificar antes de ejecutar en serio.
//
// Procedimiento (RUNBOOK §10): desde la consola del navegador con sesión de jefe:
//   const r = await window.__yatastoRestore(backupJson);            // dry-run
//   const r = await window.__yatastoRestore(backupJson, { dryRun: false }); // real
export async function restoreFromBackup(payload, { dryRun = true } = {}) {
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); }
    catch { throw new Error("Backup inválido: el texto no es JSON"); }
  }
  if (!payload || typeof payload !== "object" || payload.datos === null || typeof payload.datos !== "object") {
    throw new Error("Backup inválido: falta el objeto 'datos'");
  }
  const todas = Object.keys(payload.datos);
  const keys = todas.filter(k => k.startsWith("yatasto:"));
  const existentes = await db.list("yatasto:");
  const existentesSet = new Set(existentes.map(r => r.key));
  const sobrescribe = keys.filter(k => existentesSet.has(k)).length;
  const reporte = {
    dryRun,
    backup_generado: payload.generado || null,
    backup_completo: payload.completo ?? null,
    total_en_backup: keys.length,
    claves_ajenas_ignoradas: todas.length - keys.length,
    en_servidor_ahora: existentes.length,
    nuevas: keys.length - sobrescribe,
    sobrescribe,
    solo_en_servidor: existentes.length - sobrescribe,
  };
  if (dryRun) return reporte;
  // db.set nunca lanza: retorna timestamp (escrita) o null (encolada en
  // __yatasto_wq__ por falta de red — va a drenar sola al reconectar).
  // Encolada NO es error: el restore se completa solo, pero conviene
  // hacerlo con buena señal para verificarlo en el momento.
  let escritas = 0;
  const encoladas = [];
  for (const k of keys) {
    const v = payload.datos[k];
    const value = typeof v === "string" ? v : JSON.stringify(v);
    const ts = await db.set(k, value);
    if (ts) escritas++; else encoladas.push(k);
  }
  return { ...reporte, escritas, encoladas: encoladas.length, claves_encoladas: encoladas };
}

// Helper de consola (el import dinámico no funciona en el bundle de producción).
if (typeof window !== "undefined") {
  window.__yatastoRestore = restoreFromBackup;
}
