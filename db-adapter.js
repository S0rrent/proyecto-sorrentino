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

// ── Gestión de sesión expirada ───────────────────────────────────────────────
// Cuando Supabase devuelve 401, se intenta refresh una sola vez.
// Si falla, _sessionExpired=true pausa todas las escrituras directas hasta relogin.
let _sessionExpired = false;
let _refreshing = false;          // lock: evita dos refreshes simultáneos
const _sessionListeners = new Set();

function _is401(error) {
  return error?.status === 401 || error?.code === "PGRST301" ||
    (typeof error?.message === "string" && error.message.includes("JWT"));
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
    const { data, error } = await _sb
      .from("yatasto_storage")
      .select("key,value")
      .like("key", `${prefix}%`);
    if (error) throw error;
    return data || [];
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
