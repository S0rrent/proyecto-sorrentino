import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock @supabase/supabase-js con respuestas indexadas por key.
//
// Cada test setea `upsertByKey[<key>] = [ result1, result2, ... ]` — el mock
// las consume FIFO para esa key. Una vez vacía, devuelve { error: null }
// (éxito). Esto aísla cada test de leftover setTimeouts de tests anteriores
// que apunten a OTRAS keys.
let upsertByKey;
let upsertCallCount;
let upsertKeys = []; // registro por clave: inmune a timers residuales de otros tests
// Tanda 5: updated_at remoto por key — el drenado lo consulta para detectar
// que otro dispositivo escribió después de encolarse (conflicto → descarte).
let timestampByKey;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (payload) => {
        upsertCallCount++;
        const key = payload?.key || "";
        upsertKeys.push(key);
        const arr = upsertByKey[key];
        if (arr && arr.length > 0) {
          return Promise.resolve(arr.shift());
        }
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: (col, key) => ({ maybeSingle: () => Promise.resolve({
        data: timestampByKey?.[key] ? { updated_at: timestampByKey[key] } : null,
        error: null,
      }) }) }),
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

let db;
let onWriteQueueChange;
let onDiscarded;
let listDiscarded;
let clearDiscarded;

async function freshImport() {
  vi.resetModules();
  localStorage.clear();
  upsertByKey = {};
  upsertCallCount = 0;
  upsertKeys = [];
  timestampByKey = {};
  const mod = await import("../db-adapter.js");
  db = mod.db;
  onWriteQueueChange = mod.onWriteQueueChange;
  onDiscarded = mod.onDiscarded;
  listDiscarded = mod.listDiscarded;
  clearDiscarded = mod.clearDiscarded;
}

describe("db.set: éxito directo", () => {
  beforeEach(async () => { await freshImport(); });

  it("retorna timestamp ISO cuando upsert tiene éxito", async () => {
    const ts = await db.set("yatasto:test:ok", "valor");
    expect(typeof ts).toBe("string");
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("no encola si upsert tiene éxito", async () => {
    let len = -1;
    const unsub = onWriteQueueChange((l) => { len = l; });
    await db.set("yatasto:test:ok", "valor");
    expect(len).toBe(0);
    unsub();
  });

  it("una sola llamada a upsert para escritura exitosa", async () => {
    upsertCallCount = 0;
    await db.set("yatasto:test:ok", "valor");
    expect(upsertCallCount).toBe(1);
  });
});

describe("db.set: encolar offline", () => {
  beforeEach(async () => { await freshImport(); });

  it("retorna null cuando upsert rechaza con error de red", async () => {
    upsertByKey["yatasto:test:offline"] = [{ error: { message: "Network error", status: 0 } }];
    const ts = await db.set("yatasto:test:offline", "v1");
    expect(ts).toBeNull();
  });

  it("notifica al listener con queue length=1 tras encolar", async () => {
    upsertByKey["yatasto:test:notify"] = [{ error: { message: "Network", status: 0 } }];
    let latestLen = -1;
    const unsub = onWriteQueueChange((len) => { latestLen = len; });
    await db.set("yatasto:test:notify", "v1");
    expect(latestLen).toBe(1);
    unsub();
  });

  it("persiste la cola en localStorage para sobrevivir reload", async () => {
    upsertByKey["yatasto:test:persist"] = [{ error: { message: "Network", status: 0 } }];
    await db.set("yatasto:test:persist", "v1");
    const raw = localStorage.getItem("__yatasto_wq__");
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw);
    expect(arr).toHaveLength(1);
    expect(arr[0].key).toBe("yatasto:test:persist");
    expect(arr[0].value).toBe("v1");
  });

  it("colapsa múltiples writes a la misma key (último gana)", async () => {
    upsertByKey["yatasto:test:colapso"] = [
      { error: { message: "Network", status: 0 } },
      { error: { message: "Network", status: 0 } },
    ];
    await db.set("yatasto:test:colapso", "v1");
    await db.set("yatasto:test:colapso", "v2");
    const arr = JSON.parse(localStorage.getItem("__yatasto_wq__"));
    expect(arr).toHaveLength(1);
    expect(arr[0].value).toBe("v2");
  });

  it("encola entradas distintas como items separados", async () => {
    upsertByKey["yatasto:test:a"] = [{ error: { message: "Network", status: 0 } }];
    upsertByKey["yatasto:test:b"] = [{ error: { message: "Network", status: 0 } }];
    await db.set("yatasto:test:a", "va");
    await db.set("yatasto:test:b", "vb");
    const arr = JSON.parse(localStorage.getItem("__yatasto_wq__"));
    expect(arr).toHaveLength(2);
  });
});

describe("queue: descarte por 4xx permanente", () => {
  beforeEach(async () => { await freshImport(); });

  it("descarta 400 (bad request) tras 4 reintentos fallidos", async () => {
    const KEY = "yatasto:test:400";
    upsertByKey[KEY] = [
      { error: { message: "Network", status: 0 } },     // db.set inicial → encola
      { error: { message: "Bad request", status: 400 } }, // flush intento 1
      { error: { message: "Bad request", status: 400 } }, // intento 2
      { error: { message: "Bad request", status: 400 } }, // intento 3
      { error: { message: "Bad request", status: 400 } }, // intento 4
    ];
    await db.set(KEY, "v");
    const got = await new Promise((resolve) => {
      const stop = onDiscarded((items) => {
        if (items.some((d) => d.key === KEY)) { stop(); resolve(items); }
      });
      setTimeout(() => { stop(); resolve(listDiscarded()); }, 22000);
    });
    expect(got.some((d) => d.status === 400 && d.key === KEY)).toBe(true);
  }, 25000);
});

describe("queue: códigos transitorios no se descartan", () => {
  beforeEach(async () => { await freshImport(); });

  it("status 408 (timeout) NO se descarta — sigue en cola", async () => {
    const KEY = "yatasto:test:408";
    upsertByKey[KEY] = [
      { error: { message: "Network", status: 0 } },
      { error: { message: "Timeout", status: 408 } },
      { error: { message: "Timeout", status: 408 } },
      { error: { message: "Timeout", status: 408 } },
      { error: { message: "Timeout", status: 408 } },
    ];
    await db.set(KEY, "v");

    // Esperamos 18s — supera el ciclo de retry. Si NO aparece descarte,
    // confirma que 408 NO se descartó.
    const result = await new Promise((resolve) => {
      const stop = onDiscarded((items) => {
        if (items.some((d) => d.key === KEY)) { stop(); resolve("descartado"); }
      });
      setTimeout(() => { stop(); resolve("no-descartado"); }, 18000);
    });
    expect(result).toBe("no-descartado");
  }, 22000);

  it("status 429 (rate limit) NO se descarta — sigue en cola", async () => {
    const KEY = "yatasto:test:429";
    upsertByKey[KEY] = [
      { error: { message: "Network", status: 0 } },
      { error: { message: "Rate limit", status: 429 } },
      { error: { message: "Rate limit", status: 429 } },
      { error: { message: "Rate limit", status: 429 } },
      { error: { message: "Rate limit", status: 429 } },
    ];
    await db.set(KEY, "v");

    const result = await new Promise((resolve) => {
      const stop = onDiscarded((items) => {
        if (items.some((d) => d.key === KEY)) { stop(); resolve("descartado"); }
      });
      setTimeout(() => { stop(); resolve("no-descartado"); }, 18000);
    });
    expect(result).toBe("no-descartado");
  }, 22000);
});

describe("queue: drena cuando se recupera la red", () => {
  beforeEach(async () => { await freshImport(); });

  it("vacía la cola tras reintento exitoso", async () => {
    const KEY = "yatasto:test:recovery";
    // Sólo el primer upsert falla. El resto (de los flushes) sin entries → defecto éxito.
    upsertByKey[KEY] = [{ error: { message: "Network", status: 0 } }];
    await db.set(KEY, "v");
    expect(JSON.parse(localStorage.getItem("__yatasto_wq__"))).toHaveLength(1);

    const drained = await new Promise((resolve) => {
      const stop = onWriteQueueChange((len) => {
        const persisted = JSON.parse(localStorage.getItem("__yatasto_wq__") || "[]");
        if (len === 0 && persisted.length === 0) { stop(); resolve(true); }
      });
      setTimeout(() => { stop(); resolve(false); }, 8000);
    });
    expect(drained).toBe(true);
  }, 10000);
});

describe("Tanda 5: éxito directo purga la clave encolada (v1 zombi)", () => {
  beforeEach(async () => { await freshImport(); });

  it("un save exitoso elimina de la cola el valor viejo de la misma clave", async () => {
    const KEY = "yatasto:test:purga";
    // v1 falla y queda encolada (4 reintentos del flush también fallarán,
    // pero acá solo importa el estado inmediato de la cola).
    upsertByKey[KEY] = [{ error: { message: "Network", status: 0 } }];
    await db.set(KEY, "v1");
    expect(JSON.parse(localStorage.getItem("__yatasto_wq__"))).toHaveLength(1);

    // Vuelve la red: v2 se escribe directo — la v1 zombi NO debe quedar en
    // la cola (al drenar pisaría a v2 con el valor viejo).
    const ts = await db.set(KEY, "v2");
    expect(ts).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("__yatasto_wq__"))).toHaveLength(0);
  });

  it("el éxito de una clave NO purga entradas encoladas de otras claves", async () => {
    const K1 = "yatasto:test:otra1";
    const K2 = "yatasto:test:otra2";
    upsertByKey[K1] = [{ error: { message: "Network", status: 0 } }];
    await db.set(K1, "v");
    await db.set(K2, "v"); // éxito directo
    expect(JSON.parse(localStorage.getItem("__yatasto_wq__")).map(q => q.key)).toEqual([K1]);
  });
});

describe("Tanda 5: el drenado no pisa escrituras más nuevas de otro dispositivo", () => {
  beforeEach(async () => { await freshImport(); });

  it("remoto modificado después de encolar → descarte auditable con status 'conflicto', sin upsert", async () => {
    const KEY = "yatasto:test:conflicto";
    upsertByKey[KEY] = [{ error: { message: "Network", status: 0 } }];
    await db.set(KEY, "mi-version-vieja"); // encolada con queuedAt=ahora
    const upsertsDeEstaClave = () => upsertKeys.filter(k => k === KEY).length;
    expect(upsertsDeEstaClave()).toBe(1); // solo el intento directo fallido

    // Otro dispositivo escribe DESPUÉS de nuestro encolado (más allá de la
    // tolerancia de 2 min por skew de relojes).
    timestampByKey[KEY] = new Date(Date.now() + 5 * 60000).toISOString();

    const descartada = await new Promise((resolve) => {
      const stop = onDiscarded((items) => {
        const hit = items.find(i => i.key === KEY && i.status === "conflicto");
        if (hit) { stop(); resolve(hit); }
      });
      setTimeout(() => { stop(); resolve(null); }, 8000);
    });
    expect(descartada).toBeTruthy();
    expect(descartada.status).toBe("conflicto");
    expect(JSON.parse(localStorage.getItem("__yatasto_wq__"))).toHaveLength(0);
    expect(upsertsDeEstaClave()).toBe(1); // el drenado NO intentó escribir esta clave
  }, 10000);

  it("updated_at remoto apenas posterior (dentro de la tolerancia de skew) → NO se descarta, drena", async () => {
    // El trigger del servidor estampa NOW() de Postgres; con el reloj local
    // atrasado, nuestra PROPIA escritura previa parecería "posterior" al
    // encolado. La tolerancia evita el falso auto-conflicto.
    const KEY = "yatasto:test:skew";
    upsertByKey[KEY] = [{ error: { message: "Network", status: 0 } }];
    await db.set(KEY, "v");
    timestampByKey[KEY] = new Date(Date.now() + 60000).toISOString(); // +1 min < tolerancia

    const drenada = await new Promise((resolve) => {
      const stop = onWriteQueueChange((len) => {
        if (len === 0 && JSON.parse(localStorage.getItem("__yatasto_wq__") || "[]").length === 0) {
          stop(); resolve(true);
        }
      });
      setTimeout(() => { stop(); resolve(false); }, 8000);
    });
    expect(drenada).toBe(true);
    expect(listDiscarded().find(i => i.key === KEY)).toBeUndefined();
  }, 10000);

  it("remoto SIN cambios posteriores → drena y escribe normal", async () => {
    const KEY = "yatasto:test:sin-conflicto";
    upsertByKey[KEY] = [{ error: { message: "Network", status: 0 } }];
    await db.set(KEY, "v");
    // El remoto tiene un updated_at ANTERIOR al encolado (nuestra propia escritura previa).
    timestampByKey[KEY] = new Date(Date.now() - 60000).toISOString();

    const drenada = await new Promise((resolve) => {
      const stop = onWriteQueueChange((len) => {
        if (len === 0 && JSON.parse(localStorage.getItem("__yatasto_wq__") || "[]").length === 0) {
          stop(); resolve(true);
        }
      });
      setTimeout(() => { stop(); resolve(false); }, 8000);
    });
    expect(drenada).toBe(true);
    expect(listDiscarded().find(i => i.key === KEY)).toBeUndefined();
  }, 10000);

  it("entrada legacy sin queuedAt (cola persistida por un bundle viejo) drena como siempre", async () => {
    // Sembrar la cola ANTES de importar el módulo (se lee en el init).
    vi.resetModules();
    localStorage.clear();
    upsertByKey = {};
    upsertCallCount = 0;
    timestampByKey = {};
    const LEGACY = "yatasto:test:legacy";
    localStorage.setItem("__yatasto_wq__", JSON.stringify([{ key: LEGACY, value: "v-legacy" }]));
    // Aunque el remoto figure "más nuevo", sin queuedAt no hay base de comparación → drena.
    timestampByKey[LEGACY] = new Date(Date.now() + 60000).toISOString();
    const mod = await import("../db-adapter.js");
    db = mod.db; onWriteQueueChange = mod.onWriteQueueChange; listDiscarded = mod.listDiscarded;

    // Disparar el flush encolando otra clave con fallo (agenda _flushQueue).
    upsertByKey["yatasto:test:trigger"] = [{ error: { message: "Network", status: 0 } }];
    await db.set("yatasto:test:trigger", "x");

    const drenada = await new Promise((resolve) => {
      const stop = onWriteQueueChange((len) => {
        if (len === 0) { stop(); resolve(true); }
      });
      setTimeout(() => { stop(); resolve(false); }, 8000);
    });
    expect(drenada).toBe(true);
    expect(listDiscarded().find(i => i.key === LEGACY)).toBeUndefined();
  }, 10000);
});

afterEach(() => {
  localStorage.clear();
});
