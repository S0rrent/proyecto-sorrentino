import { describe, it, expect, beforeEach, vi } from "vitest";

// Mockear @supabase/supabase-js antes de importar db-adapter para no requerir red.
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

// import después del mock
const { onDiscarded, listDiscarded, clearDiscarded } = await import("../db-adapter.js");

describe("descartes auditables", () => {
  beforeEach(() => {
    clearDiscarded();
  });

  it("listDiscarded retorna [] cuando no hay descartes", () => {
    expect(listDiscarded()).toEqual([]);
  });

  it("clearDiscarded vacía el localStorage", () => {
    localStorage.setItem(
      "__yatasto_discarded__",
      JSON.stringify([{ key: "x", value: "y", status: 400, message: "bad", ts: "2026-06-09T00:00:00Z" }])
    );
    expect(listDiscarded()).toHaveLength(1);
    clearDiscarded();
    expect(listDiscarded()).toEqual([]);
  });

  it("onDiscarded entrega el estado inicial al suscribirse", () => {
    const seed = [{ key: "k1", value: "v1", status: 422, message: "validation", ts: "2026-06-09T01:00:00Z" }];
    localStorage.setItem("__yatasto_discarded__", JSON.stringify(seed));

    const received = [];
    const unsub = onDiscarded((items) => received.push(items));

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(seed);
    unsub();
  });

  it("onDiscarded notifica cuando se limpia", () => {
    localStorage.setItem(
      "__yatasto_discarded__",
      JSON.stringify([{ key: "k", value: "v", status: 400, message: "bad", ts: "2026-06-09T02:00:00Z" }])
    );

    const received = [];
    const unsub = onDiscarded((items) => received.push(items));
    expect(received).toHaveLength(1);

    clearDiscarded();
    expect(received).toHaveLength(2);
    expect(received[1]).toEqual([]);
    unsub();
  });

  it("onDiscarded retorna función de unsubscribe", () => {
    const received = [];
    const unsub = onDiscarded((items) => received.push(items));
    expect(received).toHaveLength(1); // initial state

    unsub();
    clearDiscarded(); // not notified since unsubscribed
    expect(received).toHaveLength(1);
  });
});
