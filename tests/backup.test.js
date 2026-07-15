import { describe, it, expect, beforeEach, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Tanda backup/deploy: db.list paginado (Supabase corta en 1000 filas por
// request — T3 del registro de hazards), db.count para verificar completitud,
// y restoreFromBackup con dry-run.
// ─────────────────────────────────────────────────────────────────────────────

let _store;   // Map key → value
let _upserts; // claves escritas

const _rows = () =>
  Array.from(_store.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => {
        _upserts.push(row.key);
        _store.set(row.key, row.value);
        return Promise.resolve({ error: null });
      },
      select: (cols, opts) => {
        // db.count(): select("key", { count: "exact", head: true }).like(...)
        if (opts?.head && opts?.count === "exact") {
          return { like: () => Promise.resolve({ count: _rows().length, error: null }) };
        }
        return {
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          // db.list() keyset: .like(...)[.gt("key", last)].order(...).limit(n)
          like: () => {
            let gtKey = null;
            const q = {
              gt: (col, v) => { gtKey = v; return q; },
              order: () => ({
                limit: (n) => Promise.resolve({
                  data: _rows().filter(r => gtKey === null || r.key > gtKey).slice(0, n),
                  error: null,
                }),
              }),
            };
            return q;
          },
        };
      },
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: {
      refreshSession: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: { user: { id: "t" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

const { db, restoreFromBackup } = await import("../db-adapter.js");

beforeEach(() => {
  _store = new Map();
  _upserts = [];
});

describe("db.list paginado", () => {
  it("trae TODAS las filas aunque superen el corte de 1000 de Supabase", async () => {
    for (let i = 0; i < 2345; i++) {
      _store.set(`yatasto:2026-01-01:reg${String(i).padStart(5, "0")}`, `"v${i}"`);
    }
    const rows = await db.list("yatasto:");
    expect(rows).toHaveLength(2345); // antes: 1000 y marcado como completo
  });

  it("dataset chico: una sola página", async () => {
    _store.set("yatasto:config", "{}");
    const rows = await db.list("yatasto:");
    expect(rows).toHaveLength(1);
  });
});

describe("db.count", () => {
  it("devuelve la cantidad exacta contada por el servidor", async () => {
    for (let i = 0; i < 1500; i++) _store.set(`yatasto:k${i}`, "1");
    expect(await db.count("yatasto:")).toBe(1500);
  });
});

describe("restoreFromBackup", () => {
  const backup = () => ({
    generado: "2026-07-14T10:00:00Z",
    completo: true,
    datos: {
      "yatasto:2026-07-01:ingresos": [{ id: "a" }],
      "yatasto:2026-07-02:ingresos": [{ id: "b" }],
      "yatasto:config": { tambosCustom: [] },
      "otra-app:clave": "se ignora",
    },
  });

  it("dry-run (default): reporta sin escribir nada", async () => {
    _store.set("yatasto:config", "{}");                       // se sobrescribiría
    _store.set("yatasto:solo-servidor", "{}");                // no está en el backup
    const r = await restoreFromBackup(backup());
    expect(r.dryRun).toBe(true);
    expect(r.total_en_backup).toBe(3);
    expect(r.claves_ajenas_ignoradas).toBe(1);
    expect(r.nuevas).toBe(2);
    expect(r.sobrescribe).toBe(1);
    expect(r.solo_en_servidor).toBe(1); // el restore NUNCA borra estas
    expect(_upserts).toHaveLength(0);   // nada escrito
  });

  it("real: upsertea las claves yatasto:* y reporta escritas/encoladas", async () => {
    const r = await restoreFromBackup(backup(), { dryRun: false });
    expect(r.escritas).toBe(3);
    expect(r.encoladas).toBe(0);
    expect(_upserts).toHaveLength(3);
    expect(_upserts).not.toContain("otra-app:clave");
  });

  it("acepta el JSON como string (pegado en consola)", async () => {
    const r = await restoreFromBackup(JSON.stringify(backup()));
    expect(r.total_en_backup).toBe(3);
  });

  it("payload inválido lanza sin escribir", async () => {
    await expect(restoreFromBackup({ sin: "datos" })).rejects.toThrow("Backup inválido");
    await expect(restoreFromBackup("{no es json")).rejects.toThrow("no es JSON");
    expect(_upserts).toHaveLength(0);
  });
});
