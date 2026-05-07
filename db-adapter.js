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

const SUPABASE_URL      = "https://edhcphmzvzqsvkfnachx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaGNwaG16dnpxc3ZrZm5hY2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDMwOTMsImV4cCI6MjA5MzA3OTA5M30.a6cXNXh-rxg86XnW-6PmKihDNujWSLsUF5Wt6Z4X_jw";

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
