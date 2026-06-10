import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      like: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: {
      refreshSession: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

const { _is401 } = await import("../db-adapter.js");

describe("_is401: detecta errores de auth", () => {
  it("detecta status 401 explícito", () => {
    expect(_is401({ status: 401 })).toBe(true);
  });

  it("detecta código PostgREST PGRST301 (JWT expired)", () => {
    expect(_is401({ code: "PGRST301" })).toBe(true);
  });

  it("detecta mensaje con 'JWT' (texto del error de Supabase)", () => {
    expect(_is401({ message: "JWT expired" })).toBe(true);
    expect(_is401({ message: "Invalid JWT" })).toBe(true);
    expect(_is401({ message: "Bad JWT signature" })).toBe(true);
  });

  it("NO detecta otros 4xx ni 5xx", () => {
    expect(_is401({ status: 400 })).toBe(false);
    expect(_is401({ status: 403 })).toBe(false);
    expect(_is401({ status: 404 })).toBe(false);
    expect(_is401({ status: 422 })).toBe(false);
    expect(_is401({ status: 500 })).toBe(false);
    expect(_is401({ status: 502 })).toBe(false);
  });

  it("NO detecta otros códigos PostgREST", () => {
    expect(_is401({ code: "PGRST116" })).toBe(false);
    expect(_is401({ code: "PGRST201" })).toBe(false);
  });

  it("NO detecta mensajes sin 'JWT'", () => {
    expect(_is401({ message: "Network error" })).toBe(false);
    expect(_is401({ message: "Connection refused" })).toBe(false);
    expect(_is401({ message: "" })).toBe(false);
  });

  it("NO detecta error null/undefined", () => {
    expect(_is401(null)).toBe(false);
    expect(_is401(undefined)).toBe(false);
  });

  it("NO detecta error vacío", () => {
    expect(_is401({})).toBe(false);
  });

  it("message no-string: no busca substring (típico cuando error es Error nativo)", () => {
    expect(_is401({ message: null })).toBe(false);
    expect(_is401({ message: undefined })).toBe(false);
    expect(_is401({ message: 42 })).toBe(false);
  });

  it("composición: el primer criterio que matchea gana", () => {
    // Status 401 + código no relacionado = aún así true (status manda)
    expect(_is401({ status: 401, code: "PGRST116" })).toBe(true);
    // Sólo status 200 con JWT en mensaje (raro pero posible en error wrapper)
    expect(_is401({ status: 200, message: "JWT expired" })).toBe(true);
  });
});
