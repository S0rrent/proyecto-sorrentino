import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// db-adapter.js — Persistencia Supabase para Lacteos Yatasto SA
//
// Backend: tabla yatasto_storage (key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)
// Interfaz:
//   db.get(key)         → Promise<{ value: string } | null>
//   db.set(key, value)  → Promise<void>
//   db.remove(key)      → Promise<void>
//   db.list(prefix)     → Promise<Array<{ key, value }>>
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[db-adapter] Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Crear un archivo .env basado en .env.example.");
}

const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const db = {
  async get(key) {
    const { data, error } = await _sb
      .from("yatasto_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? { value: data.value } : null;
  },

  async set(key, value) {
    const { error } = await _sb
      .from("yatasto_storage")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
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
