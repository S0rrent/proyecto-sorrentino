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

const { _isPermanent4xx } = await import("../db-adapter.js");

describe("_isPermanent4xx: clasifica errores HTTP", () => {
  it("descarta 400 (bad request)", () => {
    expect(_isPermanent4xx({ status: 400 })).toBe(true);
  });

  it("descarta 403 (forbidden)", () => {
    expect(_isPermanent4xx({ status: 403 })).toBe(true);
  });

  it("descarta 404 (not found)", () => {
    expect(_isPermanent4xx({ status: 404 })).toBe(true);
  });

  it("descarta 422 (unprocessable entity — validación)", () => {
    expect(_isPermanent4xx({ status: 422 })).toBe(true);
  });

  it("descarta el resto de 4xx (4XX exhaustivo)", () => {
    for (let s = 400; s < 500; s++) {
      // El comportamiento esperado:
      // - 401 (JWT expired) → NO descarte (refresh)
      // - 408 (timeout) → NO descarte (transitorio)
      // - 429 (rate limit) → NO descarte (transitorio)
      // - resto → descarte
      const expected = s !== 401 && s !== 408 && s !== 429;
      expect(_isPermanent4xx({ status: s })).toBe(expected);
    }
  });

  it("NO descarta 401 (refresh token primero)", () => {
    expect(_isPermanent4xx({ status: 401 })).toBe(false);
  });

  it("NO descarta 408 (timeout transitorio)", () => {
    expect(_isPermanent4xx({ status: 408 })).toBe(false);
  });

  it("NO descarta 429 (rate limit transitorio)", () => {
    expect(_isPermanent4xx({ status: 429 })).toBe(false);
  });

  it("NO descarta 5xx (errores de servidor — reintentar)", () => {
    expect(_isPermanent4xx({ status: 500 })).toBe(false);
    expect(_isPermanent4xx({ status: 502 })).toBe(false);
    expect(_isPermanent4xx({ status: 503 })).toBe(false);
    expect(_isPermanent4xx({ status: 504 })).toBe(false);
  });

  it("NO descarta 2xx ni 3xx", () => {
    expect(_isPermanent4xx({ status: 200 })).toBe(false);
    expect(_isPermanent4xx({ status: 301 })).toBe(false);
    expect(_isPermanent4xx({ status: 399 })).toBe(false);
  });

  it("NO descarta status 0 (error de red, sin response)", () => {
    expect(_isPermanent4xx({ status: 0 })).toBe(false);
  });

  it("NO descarta cuando status no es número (string vacío, undefined, null)", () => {
    expect(_isPermanent4xx({ status: "400" })).toBe(false);
    expect(_isPermanent4xx({ status: undefined })).toBe(false);
    expect(_isPermanent4xx({ status: null })).toBe(false);
    expect(_isPermanent4xx({ status: NaN })).toBe(false);
  });

  it("NO descarta error null/undefined", () => {
    expect(_isPermanent4xx(null)).toBe(false);
    expect(_isPermanent4xx(undefined)).toBe(false);
  });

  it("NO descarta error sin propiedad status", () => {
    expect(_isPermanent4xx({})).toBe(false);
    expect(_isPermanent4xx({ message: "Network error" })).toBe(false);
  });
});
