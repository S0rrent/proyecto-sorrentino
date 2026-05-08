import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// db-adapter.js — Persistencia para Lacteos Yatasto SA
//
// Si VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas usa Supabase.
// Si no, cae a localStorage como fallback (útil en dev local sin .env).
//
// Interfaz:
//   db.get(key)         → Promise<{ value: string } | null>
//   db.set(key, value)  → Promise<void>
//   db.remove(key)      → Promise<void>
//   db.list(prefix)     → Promise<Array<{ key, value }>>
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USE_SUPABASE      = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!USE_SUPABASE) {
  console.warn("[db-adapter] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no encontradas — usando localStorage.");
}

const _sb = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ── Fallback localStorage ─────────────────────────────────────────────────────
const _ls = {
  async get(key) {
    try { const v = localStorage.getItem(key); return v !== null ? { value: v } : null; } catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  },
  async remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
  async list(prefix = "yatasto:") {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .map(k => ({ key: k, value: localStorage.getItem(k) }));
    } catch { return []; }
  },
};

// ── Supabase backend ──────────────────────────────────────────────────────────
const _sb_db = {
  async get(key) {
    const { data, error } = await _sb.from("yatasto_storage").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? { value: data.value } : null;
  },
  async set(key, value) {
    const { error } = await _sb.from("yatasto_storage").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async remove(key) {
    const { error } = await _sb.from("yatasto_storage").delete().eq("key", key);
    if (error) throw error;
  },
  async list(prefix = "yatasto:") {
    const { data, error } = await _sb.from("yatasto_storage").select("key,value").like("key", `${prefix}%`);
    if (error) throw error;
    return data || [];
  },
};

const _backend = USE_SUPABASE ? _sb_db : _ls;

// ── Auth (solo disponible con Supabase) ───────────────────────────────────────
const _auth_noop = {
  async signIn()  { throw new Error("Supabase no configurado. Agregar variables de entorno."); },
  async signOut() {},
  async getSession() { return null; },
  onAuthStateChange() { return () => {}; },
};

const _auth_sb = {
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
};

export const db = {
  get:    key        => _backend.get(key),
  set:    (key, val) => _backend.set(key, val),
  remove: key        => _backend.remove(key),
  list:   prefix     => _backend.list(prefix),
  auth:   USE_SUPABASE ? _auth_sb : _auth_noop,
};

// ── Migración localStorage → Supabase ────────────────────────────────────────
// Ejecutar desde la consola del navegador UNA SOLA VEZ:
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
