// ─────────────────────────────────────────────────────────────────────────────
// db-adapter.js — Capa de persistencia para Lacteos Yatasto SA
//
// MODO ACTUAL: window.storage (Antigravity) con fallback a localStorage.
//
// PARA ACTIVAR SUPABASE:
//   1. Crear proyecto en https://supabase.com
//   2. Crear tabla `yatasto_storage` con columnas:
//        key   TEXT PRIMARY KEY
//        value TEXT
//        updated_at TIMESTAMPTZ DEFAULT NOW()
//   3. Pegar URL y ANON_KEY de tu proyecto abajo
//   4. Descomentar la sección "Supabase client" y "Supabase backend"
//   5. Comentar la sección "window.storage backend"
//
// La interfaz es idéntica a window.storage:
//   db.get(key)         → Promise<{ value: string } | null>
//   db.set(key, value)  → Promise<void>
//   db.remove(key)      → Promise<void>
//   db.list(prefix)     → Promise<Array<{ key, value }>>
// ─────────────────────────────────────────────────────────────────────────────

// ── Supabase credentials (completar cuando esté listo) ───────────────────────
const SUPABASE_URL      = "";   // ej: "https://xxxxxxxxxxx.supabase.co"
const SUPABASE_ANON_KEY = "";   // ej: "eyJhbGci..."

// ── Supabase client (descomentar cuando tengas credenciales) ──────────────────
// import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
// const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── window.storage backend (modo actual — Antigravity) ────────────────────────
const _ws = (() => {
  if (typeof window !== "undefined" && window.storage) return window.storage;
  // Fallback a localStorage si no hay window.storage (preview standalone)
  return {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v !== null ? { value: v } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
    },
    remove: async (key) => {
      localStorage.removeItem(key);
    },
  };
})();

export const db = {
  // ── Lee un valor ──────────────────────────────────────────────────────────
  async get(key) {
    return _ws.get(key);
    // Supabase (descomentar):
    // const { data, error } = await _sb.from("yatasto_storage").select("value").eq("key", key).maybeSingle();
    // if (error) throw error;
    // return data ? { value: data.value } : null;
  },

  // ── Guarda un valor ───────────────────────────────────────────────────────
  async set(key, value) {
    return _ws.set(key, value);
    // Supabase (descomentar):
    // const { error } = await _sb.from("yatasto_storage").upsert({ key, value, updated_at: new Date().toISOString() });
    // if (error) throw error;
  },

  // ── Elimina un valor ──────────────────────────────────────────────────────
  async remove(key) {
    if (_ws.remove) return _ws.remove(key);
    // Supabase (descomentar):
    // const { error } = await _sb.from("yatasto_storage").delete().eq("key", key);
    // if (error) throw error;
  },

  // ── Lista claves con prefijo (para backup / exportación completa) ─────────
  async list(prefix = "yatasto:") {
    // window.storage no tiene list nativo — retorna vacío salvo implementación custom
    if (_ws.list) return _ws.list(prefix);
    return [];
    // Supabase (descomentar):
    // const { data, error } = await _sb.from("yatasto_storage").select("key,value").like("key", `${prefix}%`);
    // if (error) throw error;
    // return data || [];
  },
};

// ── Helpers de migración (window.storage → Supabase) ─────────────────────────
// Usar desde la consola del navegador para migrar datos locales a Supabase:
//
//   import { migrateToSupabase } from "./db-adapter.js";
//   await migrateToSupabase();
//
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
