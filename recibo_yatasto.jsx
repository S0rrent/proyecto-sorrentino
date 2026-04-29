import { useState, useEffect, Fragment } from "react";

// ─── CONSTANTES ───────────────────────────────────────────────
const TAMBOS_BASE = [
  { num: 13, nombre: "SEIVANE" }, { num: 90, nombre: "ESTAR 1" },
  { num: 91, nombre: "ESTAR 2" }, { num: 93, nombre: "ESTAR 3" },
  { num: 16, nombre: "TUESO" }, { num: 30, nombre: "CARPINETI" },
  { num: 24, nombre: "COGORNI" }, { num: 26, nombre: "PAZOS 2" },
  { num: 50, nombre: "BRUNO" }, { num: 4, nombre: "VIVOT" },
  { num: 1, nombre: "MURPHY 1" }, { num: 2, nombre: "MURPHY 2" },
  { num: 89, nombre: "OPOCA" }, { num: 35, nombre: "ETCHEVERRY" },
  { num: 14, nombre: "ZIVERRA" }, { num: 65, nombre: "MELO" },
  { num: 17, nombre: "GIORGI G." }, { num: 18, nombre: "GIORGI F." },
  { num: 21, nombre: "GUSTI CARLOS" }, { num: 46, nombre: "PIÑERO JORGE" },
  { num: 49, nombre: "CEJAS" }, { num: 50, nombre: "VAQUERIA" },
  { num: 51, nombre: "SPINELLI" }, { num: "-", nombre: "FAISAN" },
  { num: 4, nombre: "ZONA" }, { num: "-", nombre: "SAIGNACIO" },
  { num: "-", nombre: "CANAGRO" }, { num: "-", nombre: "CHAME" },
];
const CAMIONES_BASE = ["GRISARO", "CUARELA", "BARTOLINI", "LLANO 1", "LLANO 2", "GALVAN", "ANGRIGIANI"];
const FORT_DESTINOS = ["Tetra", "Ultra", "Yogur", "Postre", "Acción Correctiva"];
const PERFILES = {
  supervisor: { usuario: "Supervisor", clave: "Yatasto2026$", label: "Supervisor", icon: "👔" },
  jefe: { usuario: "Jefe", clave: "BuenaLeche123$", label: "Jefe de Planta", icon: "👑" },
};
const SILOS = ["100 NUEVO", "100 VIEJO", "80", "60", "42", "40F", "20", "15"];
const SILOS_TODOS = [...SILOS, "TQ1", "TQ2", "TQ3", "TQ6", "TQ7", "TQ8", "TQ9", "POSTRE", "TINA", "DULCE"];
const CIP_SILOS = ["100 N", "100 V", "80", "60", "42", "40F", "20", "15", "LINEA 1", "LINEA 2"];
const STOCK_SILOS = ["100 N", "100 V", "80", "60", "42", "40F", "20", "15", "TQ6", "TQ7"];
const TURNOS = ["07:00", "14:00", "21:00"];
const TURNO_LABELS = { "07:00": "Mañana", "14:00": "Tarde", "21:00": "Noche" };
const TURNO_CIERRE = { "07:00": "14:00", "14:00": "21:00", "21:00": "07:00" }; // hora de cierre
const PRODUCTOS = ["Leche Cruda", "Leche Descremada", "Lactosa", "Suero"];
const PRODS_STOCK = [
  "Leche Cruda", "Leche Entera", "Leche Descremada", "Leche Fortificada",
  "Lactosa", "Suero", "Yogurt", "Sucio (vacío)",
];
const NAV = [
  { id: "ingresos", label: "Ingr.", icon: "🚛" },
  { id: "movimientos", label: "Movim.", icon: "🔄" },
  { id: "carga", label: "Carga", icon: "🚚" },
  { id: "fortificados", label: "Fort.", icon: "⚗️" },
  { id: "cip", label: "CIP", icon: "🧼" },
  { id: "stock", label: "Stock", icon: "📊" },
];

// Capacidades reales de cada silo (litros)
const SILO_CAP = {
  "100 N": 100000, "100 V": 100000,
  "80": 80000, "60": 60000, "42": 42000,
  "40F": 40000, "20": 20000, "15": 15000,
  "TQ6": 6000, "TQ7": 7000,
};
// Mínimos recomendados por silo (litros)
const SILO_MIN = {
  "100 N": 5000, "100 V": 5000,
  "80": 4000, "60": 3000, "42": 2000,
  "40F": 2000, "20": 1000, "15": 1000,
  "TQ6": 500, "TQ7": 500,
};
// Máximos recomendados por silo (litros) — 95% de capacidad aprox.
const SILO_MAX = {
  "100 N": 95000, "100 V": 95000,
  "80": 76000, "60": 57000, "42": 40000,
  "40F": 38000, "20": 19000, "15": 14000,
  "TQ6": 5700, "TQ7": 6650,
};

// Color de llenado por producto
const PROD_COLOR = {
  "Leche Cruda": "#eeece8",
  "Leche Entera": "#1a6fcc",
  "Leche Descremada": "#00ff00ff",
  "Leche Fortificada": "#ffa600ff",
  "Lactosa": "#d4b896",
  "Suero": "#ffe000",
  "Yogurt": "#f4a0c0",
  "Sucio (vacío)": "#dc2626",
};

// Mapeo de nombres de silos → clave en STOCK_SILOS
const SILO_STOCK_KEY = {
  "100 NUEVO": "100 N", "100 N": "100 N",
  "100 VIEJO": "100 V", "100 V": "100 V",
  "80": "80", "60": "60", "42": "42", "40F": "40F",
  "20": "20", "15": "15",
  "TQ6": "TQ6", "TQ7": "TQ7",
};
// Productos de despacho para carga de camiones
const CARGA_PRODUCTOS_BASE = ["Leche Entera", "Leche Descremada", "Suero", "Lactosa", "Concentrado", "Crema", "Otro"];
// Productos concentrados que usan formulario simplificado en ingresos
const PRODS_CONCENTRADOS = ["Lactosa", "Suero", "Concentrado"];

// ─── UTILS ────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];
const getNow = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const getCurrentTurno = () => { const h = new Date().getHours(); return h >= 7 && h < 14 ? "07:00" : h >= 14 && h < 21 ? "14:00" : "21:00"; };
const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const sKey = (date, sec) => `yatasto:${date}:${sec}`;
const CFG_KEY = "yatasto:config";

// ─── COLORS ──────────────────────────────────────────────────
const C = {
  bg: "#080c18", surface: "#0f1525", card: "#1a2035", border: "#2a3050",
  accent: "#f59e0b", accentDim: "#3d2e08", accentDark: "#92610a",
  text: "#e8edf5", sub: "#7a8aaa", muted: "#2d3a55",
  success: "#22c55e", danger: "#ef4444",
};

// ─── SHARED STYLES ───────────────────────────────────────────
const inp = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: "11px 12px", fontSize: 16, width: "100%",
  outline: "none", fontFamily: "'Courier New', monospace", boxSizing: "border-box",
};
const lbl = { fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, display: "block", fontWeight: 700 };
const secTitle = { fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 };
const btnPrimary = { background: C.accent, color: "#000", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" };
const btnSecondary = { background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%" };
const card = { background: C.card, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${C.border}` };
const panel = { background: C.surface, borderRadius: 10, padding: 12, marginBottom: 12 };

// ─── STORAGE ─────────────────────────────────────────────────
async function load(date, sec, def) {
  try { const r = await window.storage.get(sKey(date, sec)); return r ? JSON.parse(r.value) : def; }
  catch { return def; }
}
async function save(date, sec, data) {
  try { await window.storage.set(sKey(date, sec), JSON.stringify(data)); } catch (e) { console.error(e); }
}
async function loadCfg() {
  const def = { tambosCustom: [], camionesCustom: [], transportistas: [], cargaProductosCustom: [] };
  try { const r = await window.storage.get(CFG_KEY); return r ? { ...def, ...JSON.parse(r.value) } : def; }
  catch { return def; }
}
// Saldo de silos entre días
async function loadSaldo() {
  try { const r = await window.storage.get(SALDO_KEY); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function saveSaldo(data, fromDate) {
  try { await window.storage.set(SALDO_KEY, JSON.stringify({ data, fromDate })); } catch { }
}
async function saveCfg(data) {
  try { await window.storage.set(CFG_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}
const ELIM_KEY = "yatasto:eliminados";
const USERS_KEY = "yatasto:usuarios";
const SALDO_KEY = "yatasto:saldo-silos";
const SESSION_ID = (() => {
  try {
    let id = sessionStorage.getItem("yatasto:sid");
    if (!id) { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem("yatasto:sid", id); }
    return id;
  } catch { return "local-" + Math.random().toString(36).slice(2, 7); }
})();

// Rangos de referencia para alertas de calidad (solo visibles a Supervisor/Jefe)
const QUALITY_REFS = {
  "pH":          { min: 6.6,  max: 6.8  },
  "Acidez":      { min: 14,   max: 18   },
  "GB":          { min: 3,    max: 4    },
  "SNG":         { min: 8,    max: 8.7  },
  "Proteína":    { min: 2.9,  max: 3.5  },
  "Temperatura": { min: 3,    max: 8    },
  "Aguado":      { min: 0,    max: 0,   critical: true }, // debe ser EXACTAMENTE 0
};

// Campos a comparar Tambo vs Fábrica para detección de desvíos
const DIFF_FIELDS = [
  { label: "Litros",    fca: "litrosFca", tbo: "litrosTbo",  thresh: 100,   pct: true,  critical: false },
  { label: "GB",        fca: "gbFca",     tbo: "gbTbo",      thresh: 0.25,  pct: false, critical: false },
  { label: "SNG",       fca: "sngFca",    tbo: "sngTbo",     thresh: 0.25,  pct: false, critical: false },
  { label: "Densidad",  fca: "densFca",   tbo: "densTbo",    thresh: 0.003, pct: false, critical: false },
  { label: "Aguado",    fca: "aguadoFca", tbo: "aguadoTbo",  thresh: 0.01,  pct: false, critical: true  },
  { label: "Proteína",  fca: "protFca",   tbo: "protTbo",    thresh: 0.2,   pct: false, critical: false },
  { label: "Alcohol",   fca: "alcFca",    tbo: "alcTbo",     thresh: 1,     pct: false, critical: false },
];

async function updateHeartbeat(nombre, rol) {
  try {
    const r = await window.storage.get(USERS_KEY);
    const users = r ? JSON.parse(r.value) : [];
    const now = Date.now();
    const filtered = users.filter(u => u.id !== SESSION_ID && now - u.ts < 120000);
    filtered.push({ id: SESSION_ID, nombre: nombre || "Operario", rol: rol || "Operario", ts: now });
    await window.storage.set(USERS_KEY, JSON.stringify(filtered));
  } catch { }
}
async function getActiveUsers() {
  try {
    const r = await window.storage.get(USERS_KEY);
    if (!r) return [];
    const now = Date.now();
    return (JSON.parse(r.value) || []).filter(u => now - u.ts < 120000);
  } catch { return []; }
}

function buildResumen(tipo, item) {
  if (tipo === "ingreso") return `[${item.num || "-"}] ${item.tambo || "—"} — ${item.litrosFca || 0} L → ${item.destino || "?"}`;
  if (tipo === "carga") return `${item.label || ""} ${item.destino || "—"} — ${item.litros || 0} L desde ${item.siloProveniente || "?"}`;
  if (tipo === "movimiento") return `${item.desde || "?"}→${item.hasta || "?"} — ${item.litros || 0} L${item.motivo ? " (" + item.motivo + ")" : ""}`;
  if (tipo === "control") return `Silo ${item.silo || "?"} — pH ${item.ph || "?"} / ${item.hora || "?"}`;
  if (tipo === "fortificado") return `${item.siloOrigen || "?"}→${item.siloDestino || "?"} — ${item.litrosBase || 0} L${item.paraQue ? " (" + item.paraQue + ")" : ""}`;
  return String(item.id || "");
}
async function logDelete(tipo, item) {
  try {
    const r = await window.storage.get(ELIM_KEY);
    const log = r ? JSON.parse(r.value) : [];
    log.unshift({ fecha: getToday(), hora: getNow(), tipo, resumen: buildResumen(tipo, item) });
    await window.storage.set(ELIM_KEY, JSON.stringify(log.slice(0, 300)));
  } catch { }
}

// Calcula litros netos por silo: saldo_anterior + ingresos + movimientos − cargas − fort_origen + fort_destino
async function calcAutoLitros(date) {
  const [ingresos, movData, cargas, forts, saldo] = await Promise.all([
    load(date, "ingresos", []),
    load(date, "movimientos", { movs: [], ctrls: [] }),
    load(date, "carga", []),
    load(date, "fortificados", []),
    loadSaldo(),
  ]);
  const totals = {};
  // Saldo de días anteriores
  if (saldo && saldo.fromDate && saldo.fromDate < date) {
    Object.entries(saldo.data || {}).forEach(([key, litros]) => {
      if (litros > 0) totals[key] = (totals[key] || 0) + litros;
    });
  }
  ingresos.forEach(ing => {
    const key = SILO_STOCK_KEY[ing.destino];
    if (key) totals[key] = (totals[key] || 0) + (parseFloat(ing.litrosFca) || 0);
  });
  (movData.movs || []).forEach(mov => {
    const from = SILO_STOCK_KEY[mov.desde];
    const to = SILO_STOCK_KEY[mov.hasta];
    const L = parseFloat(mov.litros) || 0;
    if (from) totals[from] = (totals[from] || 0) - L;
    if (to) totals[to] = (totals[to] || 0) + L;
  });
  cargas.forEach(c => {
    const from = SILO_STOCK_KEY[c.siloProveniente];
    const L = parseFloat(c.litros) || 0;
    if (from && L > 0) totals[from] = (totals[from] || 0) - L;
  });
  forts.forEach(f => {
    const from = SILO_STOCK_KEY[f.siloOrigen];
    const to = SILO_STOCK_KEY[f.siloDestino];
    const L = parseFloat(f.litrosBase) || 0;
    if (from && L > 0) totals[from] = (totals[from] || 0) - L;
    if (to && L > 0) totals[to] = (totals[to] || 0) + L;
    // Adiciones líquidas (L / mL) suman volumen al destino
    (f.adiciones || []).forEach(a => {
      const qty = parseFloat(a.cantidad) || 0;
      if (qty > 0 && to) {
        if (a.unidad === "L") totals[to] = (totals[to] || 0) + qty;
        if (a.unidad === "mL") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "cc") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "kg") totals[to] = (totals[to] || 0) + qty;      // 1 kg ≈ 1 L
        if (a.unidad === "g") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "mg") totals[to] = (totals[to] || 0) + qty / 1000000;
      }
    });
  });
  return totals;
}

// ─── SVG SILO VISUAL ─────────────────────────────────────────
// Silo path en viewBox "0 0 100 220":
// cuerpo: tapa (y≈2), cono top → cilindro (y=52-148) → hopper (y=148-170) → salida
const SILO_PATH = "M50,2 L57,10 L77,53 L77,148 L63,168 L37,168 L23,148 L23,53 L43,10 Z";
const RINGS_Y = [72, 92, 112, 132];

const SiloSVG = ({ siloKey, litros, producto }) => {
  const cap = SILO_CAP[siloKey] || 100000;
  const isSucio = producto === "Sucio (vacío)";
  const rawPct = Math.min(1, Math.max(0, (litros || 0) / cap));
  const fillPct = isSucio && rawPct === 0 ? 0.06 : rawPct; // pequeño tinte rojo si está sucio
  const fillColor = PROD_COLOR[producto] || (litros > 0 ? PROD_COLOR["Leche Cruda"] : null);

  // Región llenadora: y=2 (tope) a y=170 (fondo salida) → 168 px SVG
  const FILL_TOP = 2, FILL_BOT = 170, FILL_H = FILL_BOT - FILL_TOP;
  const rectY = FILL_TOP + (1 - fillPct) * FILL_H;

  const uid = `sv-${String(siloKey).replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg viewBox="0 0 100 220" style={{ width: "100%", display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id={uid}>
          <path d={SILO_PATH} />
        </clipPath>
        {fillColor && (
          <linearGradient id={`gf-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.72" />
            <stop offset="40%" stopColor={fillColor} stopOpacity="1" />
            <stop offset="60%" stopColor={fillColor} stopOpacity="1" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.72" />
          </linearGradient>
        )}
      </defs>

      {/* Fondo vacío del silo */}
      <path d={SILO_PATH} fill="#1e2438" />

      {/* Líquido animado */}
      {fillColor && fillPct > 0 && (
        <rect
          x="-8" y={rectY} width="116" height="200"
          fill={`url(#gf-${uid})`}
          clipPath={`url(#${uid})`}
          style={{ transition: "y 1.4s cubic-bezier(0.34,1.08,0.64,1)" }}
        />
      )}

      {/* Brillo lateral izquierdo (reflejo líquido) */}
      {fillColor && fillPct > 0.04 && (
        <rect
          x="24" y={rectY} width="6" height="200"
          fill="white" fillOpacity="0.07"
          clipPath={`url(#${uid})`}
          style={{ transition: "y 1.4s cubic-bezier(0.34,1.08,0.64,1)" }}
        />
      )}

      {/* Contorno principal del silo */}
      <path d={SILO_PATH} fill="none" stroke="#3a4460" strokeWidth="1.8" />

      {/* Tapa superior */}
      <rect x="43" y="2" width="14" height="9" rx="2"
        fill="#1e2438" stroke="#3a4460" strokeWidth="1.2" />

      {/* Línea unión cono-cilindro */}
      <line x1="23" y1="53" x2="77" y2="53" stroke="#3a4460" strokeWidth="0.7" strokeOpacity="0.5" />

      {/* Anillos horizontales del cilindro */}
      {RINGS_Y.map(y => (
        <line key={y} x1="23" y1={y} x2="77" y2={y}
          stroke="#3a4460" strokeWidth="0.9" strokeOpacity="0.55" />
      ))}

      {/* Línea unión cilindro-hopper */}
      <line x1="23" y1="148" x2="77" y2="148" stroke="#3a4460" strokeWidth="0.7" strokeOpacity="0.5" />

      {/* Patas soporte */}
      <line x1="25" y1="151" x2="12" y2="215" stroke="#3a4460" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="75" y1="151" x2="88" y2="215" stroke="#3a4460" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="36" y1="151" x2="29" y2="215" stroke="#3a4460" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="64" y1="151" x2="71" y2="215" stroke="#3a4460" strokeWidth="1.6" strokeLinecap="round" />

      {/* Cruces diagonales */}
      <line x1="12" y1="200" x2="36" y2="162" stroke="#3a4460" strokeWidth="1.3" />
      <line x1="88" y1="200" x2="64" y2="162" stroke="#3a4460" strokeWidth="1.3" />

      {/* Pies */}
      <line x1="6" y1="215" x2="34" y2="215" stroke="#3a4460" strokeWidth="2.8" strokeLinecap="round" />
      <line x1="66" y1="215" x2="94" y2="215" stroke="#3a4460" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
};

// ─── UI ATOMS ────────────────────────────────────────────────
const F = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}><label style={lbl}>{label}</label>{children}</div>
);
const Inp = ({ value, onChange, type = "text", placeholder, step, readOnly }) => (
  <input
    style={{ ...inp, ...(readOnly ? { opacity: 0.6, cursor: "default" } : {}) }}
    type={type} inputMode={type === "number" ? "decimal" : "text"}
    value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} step={step} readOnly={readOnly}
  />
);
const Sel = ({ value, onChange, options, placeholder }) => (
  <select style={{ ...inp, WebkitAppearance: "none" }} value={value} onChange={e => onChange(e.target.value)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => (
      <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
        {typeof o === "string" ? o : o.label}
      </option>
    ))}
  </select>
);
const Pair = ({ label, v1, v2, on1, on2 }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={lbl}>{label} — <span style={{ color: C.text }}>Fca.</span> / <span style={{ color: C.sub }}>Tbo.</span></label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <input style={{ ...inp, borderColor: C.accentDark }} type="number" inputMode="decimal" value={v1} onChange={e => on1(e.target.value)} placeholder="Fca." />
      <input style={inp} type="number" inputMode="decimal" value={v2} onChange={e => on2(e.target.value)} placeholder="Tbo." />
    </div>
  </div>
);
const FAB = ({ onClick }) => (
  <button onClick={onClick} style={{
    position: "fixed", right: 20, bottom: 82, width: 56, height: 56, borderRadius: 28,
    background: C.accent, border: "none", color: "#000", fontSize: 28, fontWeight: 700,
    cursor: "pointer", boxShadow: `0 4px 24px ${C.accent}55`,
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
  }}>+</button>
);
const Modal = ({ title, onClose, children, zIndex = 100 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
    <div style={{ background: C.bg, borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "93vh", overflowY: "auto", border: `1px solid ${C.border}`, borderBottom: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{title}</span>
        <button onClick={onClose} style={{ background: C.card, border: "none", color: C.sub, borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
      </div>
      {children}
      <div style={{ height: 20 }} />
    </div>
  </div>
);

// ─── INGRESOS ────────────────────────────────────────────────
const emptyIng = () => ({
  id: Date.now(), hora: getNow(), tambo: "", num: "",
  litrosFca: "", litrosTbo: "", destino: "", tC: "",
  acidezFca: "", phFca: "", alcFca: "", alcTbo: "",
  gbFca: "", gbTbo: "", sngFca: "", sngTbo: "",
  densFca: "", densTbo: "", aguadoFca: "", aguadoTbo: "",
  dcFca: "", dcTbo: "", protFca: "", protTbo: "", atm: "", obs: "",
  producto: "", brix: "", organoleptico: "",
});

const IngresoForm = ({ initial, onSave, onClose, onDelete, tambos, onNuevoTambo }) => {
  const [f, setF] = useState(initial || emptyIng());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const pickTambo = nombre => {
    const t = tambos.find(t => t.nombre === nombre);
    setF(p => ({ ...p, tambo: nombre, num: t ? String(t.num) : p.num }));
  };
  const isConcentrado = PRODS_CONCENTRADOS.includes(f.producto);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="N° Tambo"><Inp value={f.num} onChange={set("num")} placeholder="Nº" /></F>
      </div>
      <F label="Tambo / Procedencia">
        <Sel value={f.tambo} onChange={pickTambo}
          options={tambos.map(t => ({ value: t.nombre, label: `${t.num} — ${t.nombre}` }))}
          placeholder="Seleccionar tambo..." />
        <button onClick={onNuevoTambo} style={{ marginTop: 6, background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", padding: "4px 0", textDecoration: "underline" }}>
          + Agregar nuevo tambo
        </button>
      </F>
      <F label="Producto">
        <Sel value={f.producto || ""} onChange={set("producto")} options={PRODUCTOS} placeholder="Seleccionar producto..." />
      </F>

      {/* Badge que distingue el formulario */}
      {isConcentrado && (
        <div style={{ background: "#1e3a5f", border: "1px solid #3b82f644", borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧪</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa" }}>Formulario simplificado — Producto concentrado</div>
            <div style={{ fontSize: 10, color: C.sub }}>Solo se requieren los parámetros esenciales para este tipo de producto.</div>
          </div>
        </div>
      )}

      {/* ── Formulario CONCENTRADOS (Lactosa / Suero / Concentrado) ── */}
      {isConcentrado ? (
        <>
          <div style={panel}>
            <div style={secTitle}>📦 Destino & Litros</div>
            <F label="Destino — Silo"><Sel value={f.destino} onChange={set("destino")} options={SILOS} placeholder="Seleccionar silo..." /></F>
            <F label="Litros"><Inp type="number" value={f.litrosFca} onChange={set("litrosFca")} placeholder="0" /></F>
            <F label="Temperatura llegada (°C)"><Inp type="number" value={f.tC} onChange={set("tC")} step="0.1" placeholder="°C" /></F>
          </div>
          <div style={panel}>
            <div style={secTitle}>🧪 Parámetros</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez"><Inp type="number" value={f.acidezFca} onChange={set("acidezFca")} step="0.1" /></F>
              <F label="pH"><Inp type="number" value={f.phFca} onChange={set("phFca")} step="0.01" /></F>
            </div>
            <F label="°BRIX"><Inp type="number" value={f.brix || ""} onChange={set("brix")} step="0.1" placeholder="°Brix" /></F>
            <F label="Organoléptico">
              <Sel value={f.organoleptico || ""} onChange={set("organoleptico")} options={["Sí", "No"]} placeholder="¿Conforme?" />
            </F>
          </div>
        </>
      ) : (
        /* ── Formulario LECHE NORMAL ── */
        <>
          <div style={panel}>
            <div style={secTitle}>📦 Litros & Destino</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Litros Fábrica"><Inp type="number" value={f.litrosFca} onChange={set("litrosFca")} placeholder="0" /></F>
              <F label="Litros Tambo"><Inp type="number" value={f.litrosTbo} onChange={set("litrosTbo")} placeholder="0" /></F>
            </div>
            <F label="Destino — Silo"><Sel value={f.destino} onChange={set("destino")} options={SILOS} placeholder="Seleccionar silo..." /></F>
            <F label="Temperatura llegada (°C)"><Inp type="number" value={f.tC} onChange={set("tC")} step="0.1" placeholder="°C" /></F>
          </div>
          <div style={panel}>
            <div style={secTitle}>🧪 Parámetros básicos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez Fca."><Inp type="number" value={f.acidezFca} onChange={set("acidezFca")} step="0.1" /></F>
              <F label="pH Fca."><Inp type="number" value={f.phFca} onChange={set("phFca")} step="0.01" /></F>
            </div>
            <Pair label="Prueba Alcohol" v1={f.alcFca} v2={f.alcTbo} on1={set("alcFca")} on2={set("alcTbo")} />
          </div>
          <div style={panel}>
            <div style={secTitle}>📊 Composición</div>
            <Pair label="Grasa Butirosa (GB)" v1={f.gbFca} v2={f.gbTbo} on1={set("gbFca")} on2={set("gbTbo")} />
            <Pair label="Sólidos No Grasos (SNG)" v1={f.sngFca} v2={f.sngTbo} on1={set("sngFca")} on2={set("sngTbo")} />
            <Pair label="Densidad" v1={f.densFca} v2={f.densTbo} on1={set("densFca")} on2={set("densTbo")} />
            <Pair label="Aguado" v1={f.aguadoFca} v2={f.aguadoTbo} on1={set("aguadoFca")} on2={set("aguadoTbo")} />
            <Pair label="Leche de Descarte" v1={f.dcFca} v2={f.dcTbo} on1={set("dcFca")} on2={set("dcTbo")} />
            <Pair label="Proteína" v1={f.protFca} v2={f.protTbo} on1={set("protFca")} on2={set("protTbo")} />
            <F label="ATM"><Sel value={f.atm || ""} onChange={set("atm")} options={["Sí", "No"]} placeholder="ATM..." /></F>
          </div>
        </>
      )}

      <F label="Observaciones">
        <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} placeholder="Observaciones..." />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          let req;
          if (isConcentrado) {
            req = [["tambo", "Tambo"], ["litrosFca", "Litros"], ["destino", "Destino"],
                   ["acidezFca", "Acidez"], ["phFca", "pH"]];
          } else {
            req = [["tambo", "Tambo"], ["litrosFca", "Litros Fábrica"], ["destino", "Destino"], ["producto", "Producto"],
                   ["acidezFca", "Acidez Fca."], ["phFca", "pH Fca."], ["alcFca", "Prueba Alcohol Fca."],
                   ["gbFca", "GB Fca."], ["sngFca", "SNG Fca."], ["densFca", "Densidad Fca."], ["protFca", "Proteína Fca."], ["atm", "ATM"]];
          }
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar este ingreso</button>}
    </div>
  );
};

const SecIngresos = ({ date, syncKey = 0 }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tambos, setTambos] = useState(TAMBOS_BASE);
  const [tamboModal, setTamboModal] = useState(false);
  const [newTambo, setNewTambo] = useState({ nombre: "", num: "" });

  useEffect(() => {
    load(date, "ingresos", []).then(d => { setList(d); setLoading(false); });
    loadCfg().then(cfg => setTambos([...TAMBOS_BASE, ...(cfg.tambosCustom || [])]));
  }, [date, syncKey]);

  const persist = async updated => { setList(updated); await save(date, "ingresos", updated); };
  const onSave = async item => {
    const ex = list.find(i => i.id === item.id);
    await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    setModal(null);
  };
  const onDelete = async id => {
    if (confirm("¿Eliminar este ingreso?")) {
      const item = list.find(i => i.id === id);
      if (item) await logDelete("ingreso", item);
      await persist(list.filter(i => i.id !== id)); setModal(null);
    }
  };
  const saveNuevoTambo = async () => {
    if (!newTambo.nombre.trim()) return;
    const t = { num: newTambo.num.trim() || "-", nombre: newTambo.nombre.trim().toUpperCase() };
    const cfg = await loadCfg();
    const updated = { ...cfg, tambosCustom: [...(cfg.tambosCustom || []), t] };
    await saveCfg(updated);
    setTambos([...TAMBOS_BASE, ...updated.tambosCustom]);
    setNewTambo({ nombre: "", num: "" });
    setTamboModal(false);
  };

  const totalFca = list.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;

  return (
    <div>
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: C.accentDark }}>
        <div>
          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Total del día</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.accent, fontFamily: "'Courier New',monospace", lineHeight: 1 }}>
            {totalFca.toLocaleString("es-AR")} <span style={{ fontSize: 16 }}>L</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Camiones</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{list.length}</div>
        </div>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
          <div style={{ fontSize: 15 }}>Sin ingresos registrados hoy</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div>
        </div>
      ) : list.map(ing => (
        <div key={ing.id} onClick={() => setModal(ing)} style={{ ...card, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "'Courier New',monospace", fontWeight: 700, color: C.accent, fontSize: 17 }}>{ing.hora}</span>
            <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{ing.destino || "Sin destino"}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>[{ing.num}] {ing.tambo || "—"}</div>
          <div style={{ display: "flex", gap: 14, fontSize: 13, color: C.sub, flexWrap: "wrap" }}>
            {ing.litrosFca && <span>🏭 {parseFloat(ing.litrosFca).toLocaleString("es-AR")} L Fca.</span>}
            {ing.litrosTbo && <span>🚛 {parseFloat(ing.litrosTbo).toLocaleString("es-AR")} L Tbo.</span>}
            {ing.tC && <span>🌡️ {ing.tC}°C</span>}
            {ing.phFca && <span>pH {ing.phFca}</span>}
            {ing.producto && <span style={{ color: C.accent }}>· {ing.producto}</span>}
          </div>
        </div>
      ))}
      <FAB onClick={() => setModal("new")} />
      {modal && (
        <Modal title={modal === "new" ? "Nuevo Ingreso" : "Editar Ingreso"} onClose={() => setModal(null)}>
          <IngresoForm
            initial={modal === "new" ? null : modal}
            onSave={onSave} onClose={() => setModal(null)}
            onDelete={modal !== "new" ? () => onDelete(modal.id) : null}
            tambos={tambos} onNuevoTambo={() => setTamboModal(true)}
          />
        </Modal>
      )}
      {tamboModal && (
        <Modal title="Agregar Nuevo Tambo" onClose={() => setTamboModal(false)} zIndex={150}>
          <F label="Nombre del tambo">
            <input style={inp} type="text" autoFocus value={newTambo.nombre}
              onChange={e => setNewTambo(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: LÓPEZ" />
          </F>
          <F label="Número (opcional)">
            <input style={inp} type="text" value={newTambo.num}
              onChange={e => setNewTambo(p => ({ ...p, num: e.target.value }))} placeholder="Ej: 99" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setTamboModal(false)}>Cancelar</button>
            <button style={btnPrimary} onClick={saveNuevoTambo}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── CIP ─────────────────────────────────────────────────────
const CIPRow = ({ nombre, tipo, data, onChange }) => {
  const [open, setOpen] = useState(false);
  const set = k => v => onChange({ ...data, [k]: v });
  const hasData = data?.hora || data?.resp;
  return (
    <div style={{ background: C.surface, borderRadius: 10, marginBottom: 8, overflow: "hidden", border: `1px solid ${open ? C.accentDark : C.border}` }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "13px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{tipo} {nombre}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasData && <span style={{ width: 8, height: 8, borderRadius: 4, background: C.success, display: "inline-block" }} />}
          {data?.hora && <span style={{ fontSize: 12, color: C.success, fontFamily: "monospace" }}>{data.hora}</span>}
          <span style={{ color: C.sub }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ marginTop: 12 }} />
          {tipo === "SILO" && (
            <>
              <div style={secTitle}>Lavado Alcalino / Clorado</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Conc %"><Inp type="number" value={data?.alcConc || ""} onChange={set("alcConc")} step="0.1" /></F>
                <F label="Tiempo"><Inp value={data?.alcTiempo || ""} onChange={set("alcTiempo")} /></F>
                <F label="Temp °C"><Inp type="number" value={data?.alcTemp || ""} onChange={set("alcTemp")} /></F>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Enjuague tiempo"><Inp value={data?.enjTiempo || ""} onChange={set("enjTiempo")} /></F>
                <F label="Verificación"><Inp value={data?.enjVerif || ""} onChange={set("enjVerif")} /></F>
              </div>
              <div style={secTitle}>Lavado Ácido (Semanal)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Conc %"><Inp type="number" value={data?.acidConc || ""} onChange={set("acidConc")} step="0.1" /></F>
                <F label="Tiempo"><Inp value={data?.acidTiempo || ""} onChange={set("acidTiempo")} /></F>
                <F label="Temp °C"><Inp type="number" value={data?.acidTemp || ""} onChange={set("acidTemp")} /></F>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Enj. tiempo"><Inp value={data?.acid2Tiempo || ""} onChange={set("acid2Tiempo")} /></F>
                <F label="Verificación"><Inp value={data?.acid2Verif || ""} onChange={set("acid2Verif")} /></F>
              </div>
            </>
          )}
          {tipo === "CAMIÓN" && (
            <>
              <div style={secTitle}>Lavado Alcalino / Clorado</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Conc %"><Inp type="number" value={data?.alcConc || ""} onChange={set("alcConc")} step="0.1" /></F>
                <F label="Tiempo"><Inp value={data?.alcTiempo || ""} onChange={set("alcTiempo")} /></F>
                <F label="Temp °C"><Inp type="number" value={data?.alcTemp || ""} onChange={set("alcTemp")} /></F>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <F label="Enjuague tiempo"><Inp value={data?.enjTiempo || ""} onChange={set("enjTiempo")} /></F>
                <F label="Verificación"><Inp value={data?.enjVerif || ""} onChange={set("enjVerif")} /></F>
              </div>
            </>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label="Hora"><input style={inp} type="time" value={data?.hora || ""} onChange={e => set("hora")(e.target.value)} /></F>
            <F label="Responsable"><Inp value={data?.resp || ""} onChange={set("resp")} /></F>
          </div>
          <F label="Observaciones">
            <textarea style={{ ...inp, minHeight: 48, resize: "vertical" }} value={data?.obs || ""} onChange={e => set("obs")(e.target.value)} />
          </F>
        </div>
      )}
    </div>
  );
};

const SecCIP = ({ date, syncKey = 0 }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("silos");
  const [camiones, setCamiones] = useState(CAMIONES_BASE);
  const [camionModal, setCamionModal] = useState(false);
  const [newCamion, setNewCamion] = useState("");

  useEffect(() => {
    load(date, "cip", {}).then(d => { setData(d); setLoading(false); });
    loadCfg().then(cfg => setCamiones([...CAMIONES_BASE, ...(cfg.camionesCustom || [])]));
  }, [date, syncKey]);

  const updateSilo = async (s, v) => { const u = { ...data, silos: { ...(data.silos || {}), [s]: v } }; setData(u); await save(date, "cip", u); };
  const updateCamion = async (c, v) => { const u = { ...data, camiones: { ...(data.camiones || {}), [c]: v } }; setData(u); await save(date, "cip", u); };
  const setFiltro = async (k, v) => { const u = { ...data, [k]: v }; setData(u); await save(date, "cip", u); };

  const saveNuevoCamion = async () => {
    if (!newCamion.trim()) return;
    const nombre = newCamion.trim().toUpperCase();
    const cfg = await loadCfg();
    const updated = { ...cfg, camionesCustom: [...(cfg.camionesCustom || []), nombre] };
    await saveCfg(updated);
    setCamiones([...CAMIONES_BASE, ...updated.camionesCustom]);
    setNewCamion(""); setCamionModal(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["silos", "🏗️ Silos / Líneas"], ["camiones", "🚛 Camiones"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...(tab === t ? btnPrimary : btnSecondary), padding: "10px 6px" }}>{l}</button>
        ))}
      </div>
      {tab === "silos" && (
        <>
          {CIP_SILOS.map(s => <CIPRow key={s} nombre={s} tipo="SILO" data={(data.silos || {})[s] || {}} onChange={v => updateSilo(s, v)} />)}
          <div style={{ ...panel, marginTop: 8 }}>
            <div style={secTitle}>🔧 Desarme Filtro — Limpieza Manual</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Hora"><input style={inp} type="time" value={data.filtroHora || ""} onChange={e => setFiltro("filtroHora", e.target.value)} /></F>
              <F label="Responsable"><Inp value={data.filtroResp || ""} onChange={v => setFiltro("filtroResp", v)} /></F>
            </div>
            <F label="Observaciones">
              <textarea style={{ ...inp, minHeight: 56, resize: "vertical" }} value={data.filtroObs || ""} onChange={e => setFiltro("filtroObs", e.target.value)} />
            </F>
          </div>
        </>
      )}
      {tab === "camiones" && (
        <>
          {camiones.map(c => <CIPRow key={c} nombre={c} tipo="CAMIÓN" data={(data.camiones || {})[c] || {}} onChange={v => updateCamion(c, v)} />)}
          <button onClick={() => setCamionModal(true)} style={{ ...btnSecondary, marginTop: 8, borderStyle: "dashed", color: C.accent, borderColor: C.accentDark }}>
            + Agregar nuevo camión
          </button>
        </>
      )}
      {camionModal && (
        <Modal title="Agregar Nuevo Camión" onClose={() => setCamionModal(false)}>
          <F label="Nombre del camión">
            <input style={inp} type="text" autoFocus value={newCamion}
              onChange={e => setNewCamion(e.target.value)} placeholder="Ej: MARTINEZ" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setCamionModal(false)}>Cancelar</button>
            <button style={btnPrimary} onClick={saveNuevoCamion}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── CARGA DE CAMIONES ────────────────────────────────────────
const emptyCarga = () => ({ id: Date.now(), label: "CARGA 1", destino: "", transportista: "", producto: "", siloProveniente: "", limpCisterna: "", litros: "", T: "", gC: "", pH: "", A: "", gD: "", hora: getNow(), responsable: "", obs: "" });
const CargaForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyCarga());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const [transportistas, setTransportistas] = useState([]);
  const [cargaProductos, setCargaProductos] = useState(CARGA_PRODUCTOS_BASE);
  const [transModal, setTransModal] = useState(false);
  const [prodModal, setProdModal] = useState(false);
  const [newTrans, setNewTrans] = useState("");
  const [newProd, setNewProd] = useState("");

  useEffect(() => {
    loadCfg().then(cfg => {
      setTransportistas(cfg.transportistas || []);
      setCargaProductos([...CARGA_PRODUCTOS_BASE, ...(cfg.cargaProductosCustom || [])]);
    });
  }, []);

  const saveNuevoTrans = async () => {
    if (!newTrans.trim()) return;
    const nombre = newTrans.trim().toUpperCase();
    const cfg = await loadCfg();
    const updated = { ...cfg, transportistas: [...(cfg.transportistas || []), nombre] };
    await saveCfg(updated);
    setTransportistas(updated.transportistas);
    set("transportista")(nombre);
    setNewTrans(""); setTransModal(false);
  };

  const saveNuevoProd = async () => {
    if (!newProd.trim()) return;
    const nombre = newProd.trim();
    const cfg = await loadCfg();
    const updated = { ...cfg, cargaProductosCustom: [...(cfg.cargaProductosCustom || []), nombre] };
    await saveCfg(updated);
    const lista = [...CARGA_PRODUCTOS_BASE, ...updated.cargaProductosCustom];
    setCargaProductos(lista);
    set("producto")(nombre);
    setNewProd(""); setProdModal(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
        {["CARGA 1", "CARGA 2", "CARGA 3"].map(l => (
          <button key={l} onClick={() => set("label")(l)} style={{ ...(f.label === l ? btnPrimary : btnSecondary), padding: "10px 6px", fontSize: 13 }}>{l}</button>
        ))}
      </div>
      <F label="Destino"><Inp value={f.destino} onChange={set("destino")} placeholder="Destino de la carga..." /></F>

      {/* Producto despachado */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Producto que se envía</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Sel value={f.producto || ""} onChange={set("producto")} options={cargaProductos} placeholder="Seleccionar producto..." />
          </div>
          <button onClick={() => setProdModal(true)} style={{
            background: C.card, border: `1px solid ${C.accentDark}`, color: C.accent,
            borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap",
          }}>+ Nuevo</button>
        </div>
      </div>

      {/* Transportista */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Transportista</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Sel value={f.transportista || ""} onChange={set("transportista")} options={transportistas} placeholder="Seleccionar transportista..." />
          </div>
          <button onClick={() => setTransModal(true)} style={{
            background: C.card, border: `1px solid ${C.accentDark}`, color: C.accent,
            borderRadius: 8, padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap",
          }}>+ Nuevo</button>
        </div>
      </div>

      <F label="Silo Proveniente"><Sel value={f.siloProveniente} onChange={set("siloProveniente")} options={SILOS_TODOS} placeholder="Silo origen..." /></F>
      <F label="Limpieza Cisterna"><Sel value={f.limpCisterna} onChange={set("limpCisterna")} options={["Sí", "No", "Pendiente"]} placeholder="¿Limpieza?" /></F>
      <F label="Litros"><Inp type="number" value={f.litros} onChange={set("litros")} placeholder="0" /></F>
      <div style={panel}>
        <div style={secTitle}>Parámetros</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[["T", "T"], ["°C", "gC"], ["pH", "pH"], ["A", "A"], ["°D", "gD"]].map(([l, k]) => (
            <F key={k} label={l}><Inp type="number" value={f[k]} onChange={set(k)} step="0.01" /></F>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Hora Carga"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="Responsable"><Inp value={f.responsable} onChange={set("responsable")} /></F>
      </div>
      <F label="Observaciones"><textarea style={{ ...inp, minHeight: 48, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          const req = [["destino", "Destino"], ["siloProveniente", "Silo Proveniente"], ["limpCisterna", "Limpieza Cisterna"],
          ["litros", "Litros"], ["hora", "Hora"], ["responsable", "Responsable"],
          ["T", "T"], ["gC", "°C"], ["pH", "pH"], ["A", "A"], ["gD", "°D"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}

      {transModal && (
        <Modal title="Agregar Transportista" onClose={() => setTransModal(false)}>
          <F label="Nombre del transportista">
            <input style={inp} type="text" autoFocus value={newTrans}
              onChange={e => setNewTrans(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveNuevoTrans()}
              placeholder="Ej: MARTINEZ" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setTransModal(false)}>Cancelar</button>
            <button style={btnPrimary} onClick={saveNuevoTrans}>Guardar</button>
          </div>
        </Modal>
      )}
      {prodModal && (
        <Modal title="Crear nuevo producto" onClose={() => setProdModal(false)}>
          <F label="Nombre del producto">
            <input style={inp} type="text" autoFocus value={newProd}
              onChange={e => setNewProd(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveNuevoProd()}
              placeholder="Ej: Leche Parcialmente Descremada" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setProdModal(false)}>Cancelar</button>
            <button style={btnPrimary} onClick={saveNuevoProd}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
const SecCarga = ({ date, syncKey = 0 }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(date, "carga", []).then(d => { setList(d); setLoading(false); }); }, [date, syncKey]);
  const persist = async u => { setList(u); await save(date, "carga", u); };
  const onSave = async item => { const ex = list.find(i => i.id === item.id); await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]); setModal(null); };
  const onDelete = async id => {
    if (confirm("¿Eliminar?")) {
      const item = list.find(i => i.id === id);
      if (item) await logDelete("carga", item);
      await persist(list.filter(i => i.id !== id)); setModal(null);
    }
  };
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;
  return (
    <div>
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div><div>Sin cargas registradas</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
      ) : list.map(c => (
        <div key={c.id} onClick={() => setModal(c)} style={{ ...card, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.accent, fontSize: 16 }}>{c.hora}</span>
            <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{c.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, color: C.text }}>{c.destino || "Sin destino"}</span>
            {c.producto && <span style={{ fontSize: 11, background: "#1e3a5f", color: "#60a5fa", borderRadius: 6, padding: "2px 8px", fontWeight: 700, border: "1px solid #3b82f644" }}>{c.producto}</span>}
          </div>
          {c.transportista && (
            <div style={{ fontSize: 12, color: "#60a5fa", marginBottom: 2 }}>🚛 {c.transportista}</div>
          )}
          <div style={{ fontSize: 13, color: C.sub }}>
            {c.siloProveniente && <span>Desde {c.siloProveniente} </span>}
            {c.litros && <span>· {parseFloat(c.litros).toLocaleString("es-AR")} L </span>}
            {c.responsable && <span>· {c.responsable}</span>}
          </div>
        </div>
      ))}
      <FAB onClick={() => setModal("new")} />
      {modal && (
        <Modal title={modal === "new" ? "Nueva Carga" : "Editar Carga"} onClose={() => setModal(null)}>
          <CargaForm initial={modal === "new" ? null : modal} onSave={onSave} onClose={() => setModal(null)} onDelete={modal !== "new" ? () => onDelete(modal.id) : null} />
        </Modal>
      )}
    </div>
  );
};

// ─── MOVIMIENTOS ─────────────────────────────────────────────
const emptyMov = () => ({ id: Date.now(), hora: getNow(), desde: "", hasta: "", litros: "", producto: "", motivo: "", resp: "" });
const emptyCtrl = () => ({ id: Date.now(), hora: getNow(), silo: "", ph: "", gD: "", gC: "", alc: "", mg: "", sng: "", dens: "", fp: "", prot: "", resp: "" });

const MovForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyMov());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="Litros"><Inp type="number" value={f.litros} onChange={set("litros")} placeholder="0" /></F>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <F label="Desde"><Sel value={f.desde} onChange={set("desde")} options={SILOS_TODOS} placeholder="Origen..." /></F>
        <F label="Hasta"><Sel value={f.hasta} onChange={set("hasta")} options={SILOS_TODOS} placeholder="Destino..." /></F>
      </div>
      <F label="Producto que se mueve"><Sel value={f.producto || ""} onChange={set("producto")} options={PRODS_STOCK} placeholder="Seleccionar producto..." /></F>
      <F label="Motivo"><Inp value={f.motivo || ""} onChange={set("motivo")} placeholder="Ej: Trasvase, Mezcla, etc." /></F>
      <F label="Responsable"><Inp value={f.resp} onChange={set("resp")} /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          const req = [["litros", "Litros"], ["desde", "Desde"], ["hasta", "Hasta"], ["motivo", "Motivo"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};
const CtrlForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyCtrl());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const campos = [["pH", "ph"], ["°D", "gD"], ["°C", "gC"], ["Alc.", "alc"], ["MG", "mg"], ["SNG", "sng"], ["Dens.", "dens"], ["FP", "fp"], ["Prot.", "prot"]];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="Silo"><Sel value={f.silo} onChange={set("silo")} options={SILOS} placeholder="Silo..." /></F>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {campos.map(([l, k]) => <F key={k} label={l}><Inp type="number" value={f[k]} onChange={set(k)} step="0.01" /></F>)}
      </div>
      <F label="Responsable"><Inp value={f.resp} onChange={set("resp")} /></F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          const req = [["silo", "Silo"], ["ph", "pH"], ["gD", "°D"], ["gC", "°C"], ["alc", "Alc."], ["mg", "MG"], ["sng", "SNG"], ["dens", "Densidad"], ["fp", "FP"], ["prot", "Proteína"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};

const SecMovimientos = ({ date, syncKey = 0 }) => {
  const [data, setData] = useState({ movs: [], ctrls: [] });
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("movs");
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(date, "movimientos", { movs: [], ctrls: [] }).then(d => { setData(d); setLoading(false); }); }, [date, syncKey]);
  const persist = async u => { setData(u); await save(date, "movimientos", u); };
  const saveMov = async item => { const l = data.movs; const ex = l.find(i => i.id === item.id); await persist({ ...data, movs: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] }); setModal(null); };
  const saveCtrl = async item => { const l = data.ctrls; const ex = l.find(i => i.id === item.id); await persist({ ...data, ctrls: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] }); setModal(null); };
  const delMov = async id => {
    if (confirm("¿Eliminar?")) {
      const item = data.movs.find(i => i.id === id);
      if (item) await logDelete("movimiento", item);
      await persist({ ...data, movs: data.movs.filter(i => i.id !== id) });
    }
    setModal(null);
  };
  const delCtrl = async id => {
    if (confirm("¿Eliminar?")) {
      const item = data.ctrls.find(i => i.id === id);
      if (item) await logDelete("control", item);
      await persist({ ...data, ctrls: data.ctrls.filter(i => i.id !== id) });
    }
    setModal(null);
  };
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[["movs", "🔄 Movimientos"], ["ctrls", "🔬 Control Silos"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...(tab === t ? btnPrimary : btnSecondary), padding: "10px 6px" }}>{l}</button>
        ))}
      </div>
      {tab === "movs" && (
        <>
          {data.movs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ fontSize: 48 }}>🔄</div><div>Sin movimientos</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
          ) : data.movs.map(m => (
            <div key={m.id} onClick={() => setModal({ type: "mov", item: m })} style={{ ...card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", color: C.accent, fontWeight: 700, fontSize: 16 }}>{m.hora}</span>
                {m.litros && <span style={{ color: C.text, fontWeight: 600 }}>{parseFloat(m.litros).toLocaleString("es-AR")} L</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, color: C.sub }}>{m.desde || "?"} → {m.hasta || "?"}</span>
                {m.producto && (
                  <span style={{ fontSize: 11, background: C.accentDim, color: C.accent, borderRadius: 5, padding: "1px 8px", fontWeight: 700 }}>
                    {m.producto}
                  </span>
                )}
              </div>
              {m.motivo && <div style={{ fontSize: 12, color: C.sub, marginTop: 2, fontStyle: "italic" }}>{m.motivo}</div>}
              {m.resp && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{m.resp}</div>}
            </div>
          ))}
          <FAB onClick={() => setModal({ type: "mov", item: null })} />
        </>
      )}
      {tab === "ctrls" && (
        <>
          {data.ctrls.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ fontSize: 48 }}>🔬</div><div>Sin controles registrados</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
          ) : data.ctrls.map(c => (
            <div key={c.id} onClick={() => setModal({ type: "ctrl", item: c })} style={{ ...card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", color: C.accent, fontWeight: 700, fontSize: 16 }}>{c.hora}</span>
                <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>SILO {c.silo || "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 12, color: C.sub, flexWrap: "wrap" }}>
                {c.ph && <span>pH {c.ph}</span>}{c.gD && <span>°D {c.gD}</span>}{c.gC && <span>°C {c.gC}</span>}
                {c.mg && <span>MG {c.mg}</span>}{c.sng && <span>SNG {c.sng}</span>}
                {c.resp && <span style={{ color: C.muted }}>| {c.resp}</span>}
              </div>
            </div>
          ))}
          <FAB onClick={() => setModal({ type: "ctrl", item: null })} />
        </>
      )}
      {modal && (
        <Modal
          title={modal.type === "mov" ? (modal.item ? "Editar Movimiento" : "Nuevo Movimiento") : (modal.item ? "Editar Control Silo" : "Nuevo Control Silo")}
          onClose={() => setModal(null)}
        >
          {modal.type === "mov"
            ? <MovForm initial={modal.item} onSave={saveMov} onClose={() => setModal(null)} onDelete={modal.item ? () => delMov(modal.item.id) : null} />
            : <CtrlForm initial={modal.item} onSave={saveCtrl} onClose={() => setModal(null)} onDelete={modal.item ? () => delCtrl(modal.item.id) : null} />
          }
        </Modal>
      )}
    </div>
  );
};

// ─── STOCK POR TURNO ─────────────────────────────────────────
const SecStock = ({ date, syncKey = 0 }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState(getCurrentTurno());
  const [autoLitros, setAutoLitros] = useState({});
  const [silosVaciados, setSilosVaciados] = useState([]);
  const [saldo, setSaldo] = useState(null);   // { data: {}, fromDate: "YYYY-MM-DD" }
  const [updatingSaldo, setUpdatingSaldo] = useState(false);

  useEffect(() => {
    Promise.all([
      load(date, "stock", {}),
      load(date, "ingresos", []),
      calcAutoLitros(date),
      loadSaldo(),
    ]).then(([d, ingresos, autoTotals, saldoData]) => {
      setAutoLitros(autoTotals);
      setSaldo(saldoData);

      // Inferir producto por silo desde ingresos del día
      const inferred = {};
      ingresos.forEach(ing => {
        const key = SILO_STOCK_KEY[ing.destino];
        if (key && ing.producto) inferred[key] = ing.producto;
      });

      let updated = d;
      let changed = false;
      const vaciados = [];

      TURNOS.forEach(t => {
        STOCK_SILOS.forEach(silo => {
          const sd = (((updated[t] || {}).silos) || {})[silo] || {};
          const upd = (u, extra) => {
            updated = { ...u, [t]: { ...(u[t] || {}), silos: { ...((u[t] || {}).silos || {}), [silo]: { ...sd, ...extra } } } };
            changed = true;
          };
          // Auto-producto desde ingresos
          if (!sd.producto && inferred[silo]) { upd(updated, { producto: inferred[silo] }); }
          // Auto-Sucio cuando silo se vacía y tenía producto
          const litros = autoTotals[silo] || 0;
          const curProd = (((updated[t] || {}).silos || {})[silo] || {}).producto || sd.producto;
          if (litros === 0 && curProd && curProd !== "Sucio (vacío)") {
            upd(updated, { producto: "Sucio (vacío)" });
            if (!vaciados.includes(silo)) vaciados.push(silo);
          }
        });
      });

      if (changed) save(date, "stock", updated);
      if (vaciados.length > 0) setSilosVaciados(vaciados);
      setData(updated);
      setLoading(false);
    });
  }, [date, syncKey]);

  const updateSilo = async (t, s, k, v) => {
    const u = {
      ...data,
      [t]: { ...(data[t] || {}), silos: { ...((data[t] || {}).silos || {}), [s]: { ...(((data[t] || {}).silos || {})[s] || {}), [k]: v } } }
    };
    setData(u); await save(date, "stock", u);
  };
  const updateResp = async (t, v) => {
    const u = { ...data, [t]: { ...(data[t] || {}), resp: v } };
    setData(u); await save(date, "stock", u);
  };

  const actualizarSaldo = async () => {
    setUpdatingSaldo(true);
    const totals = await calcAutoLitros(date);
    await saveSaldo(totals, date);
    setSaldo({ data: totals, fromDate: date });
    setUpdatingSaldo(false);
    alert(`✅ Saldo guardado (${date}). Mañana los silos iniciarán con estas cantidades.`);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;
  const td = data[turno] || {};

  return (
    <div>
      {/* Banner silos vaciados */}
      {silosVaciados.length > 0 && (
        <div style={{ ...card, borderColor: C.danger, background: "#1a0808", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              🔴 Silos vaciados — requieren lavado CIP
            </div>
            <div style={{ fontSize: 13, color: C.text }}>{silosVaciados.join(", ")} → marcados como Sucio (vacío)</div>
          </div>
          <button onClick={() => setSilosVaciados([])} style={{ background: "none", border: "none", color: C.sub, fontSize: 22, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Banner saldo anterior */}
      {saldo && saldo.fromDate && saldo.fromDate < date && (
        <div style={{ ...card, borderColor: "#1d4ed844", background: "#0c1a35", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                📦 Saldo anterior incluido — {fmtDate(saldo.fromDate)}
              </div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
                Los litros que quedaron en silos el {fmtDate(saldo.fromDate)} están sumados al stock de hoy.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(saldo.data || {}).filter(([, l]) => l > 0).map(([silo, litros]) => (
              <span key={silo} style={{ fontSize: 10, background: "#1e3a5f", color: "#93c5fd", borderRadius: 6, padding: "3px 8px", border: "1px solid #3b82f633" }}>
                {silo}: {Math.round(litros).toLocaleString("es-AR")} L
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botón cerrar día / guardar saldo */}
      <button
        onClick={actualizarSaldo}
        disabled={updatingSaldo}
        style={{ ...btnSecondary, marginBottom: 14, borderColor: "#1d4ed844", color: "#60a5fa", fontSize: 13, opacity: updatingSaldo ? 0.6 : 1 }}
      >
        {updatingSaldo ? "⏳ Guardando..." : "💾 Cerrar día — guardar saldo para mañana"}
      </button>

      {/* Selector de turno */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        {TURNOS.map(t => {
          const filled = Object.values((data[t] || {}).silos || {}).filter(s => s.ph && s.grasa).length;
          const isActive = t === getCurrentTurno() && date === getToday();
          return (
            <button key={t} onClick={() => setTurno(t)} style={{ ...(turno === t ? btnPrimary : btnSecondary), padding: "8px 4px", position: "relative" }}>
              {isActive && <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: 3, background: turno === t ? "#000" : "#22c55e", display: "inline-block" }} />}
              <div style={{ fontSize: 13, fontWeight: 700 }}>{TURNO_LABELS[t]}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{t}–{TURNO_CIERRE[t]} hs.</div>
              <div style={{ fontSize: 9, marginTop: 2, color: turno === t ? "#000a" : "#22c55e88" }}>
                {filled > 0 ? `✓ ${filled} silos` : "Sin datos"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Responsable del turno */}
      <div style={panel}>
        <div style={secTitle}>Responsable — Turno {TURNO_LABELS[turno]} ({turno} hs.)</div>
        <Inp value={td.resp || ""} onChange={v => updateResp(turno, v)} placeholder="Nombre del responsable" />
      </div>

      {/* Tarjetas de silos */}
      {STOCK_SILOS.map(silo => {
        const sd = ((td.silos || {})[silo]) || {};
        const litrosAuto = Math.max(0, autoLitros[silo] || 0);
        const cap = SILO_CAP[silo] || 100000;
        const siloMin = SILO_MIN[silo] || 0;
        const siloMax = SILO_MAX[silo] || cap;
        const espacio = Math.max(0, siloMax - litrosAuto);
        const fillPct = Math.min(1, litrosAuto / cap);
        const fillColor = PROD_COLOR[sd.producto] || (litrosAuto > 0 ? PROD_COLOR["Leche Cruda"] : null);
        const hasData = litrosAuto > 0 || sd.producto || sd.ph;
        const pct = (fillPct * 100).toFixed(1);
        const nivelAlerta = litrosAuto > siloMax ? "over" : litrosAuto < siloMin && litrosAuto > 0 ? "low" : "ok";

        return (
          <div key={silo} style={{ ...card, borderColor: nivelAlerta === "over" ? C.danger : nivelAlerta === "low" ? "#f59e0b" : hasData ? C.accentDark : C.border, padding: 12 }}>
            {/* Header: nombre + litros acumulados */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "0.04em" }}>
                {silo.startsWith("TQ") ? "TQ" : "SILO"} {silo.replace("TQ", "")}
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Acumulado del día</div>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: litrosAuto > 0 ? C.accent : C.sub }}>
                  {litrosAuto.toLocaleString("es-AR")} L
                </span>
              </div>
            </div>

            {/* SVG silo + datos numéricos */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <SiloSVG siloKey={silo} litros={litrosAuto} producto={sd.producto || ""} />
              <div>
                {/* Barra de nivel */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.sub, marginBottom: 4 }}>
                    <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Nivel</span>
                    <span style={{ fontWeight: 700, color: nivelAlerta === "over" ? C.danger : nivelAlerta === "low" ? C.accent : litrosAuto > 0 ? C.text : C.sub }}>{pct}%</span>
                  </div>
                  <div style={{ background: C.muted, borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: nivelAlerta === "over" ? C.danger : fillColor || "#3a4460",
                      width: `${fillPct * 100}%`,
                      transition: "width 1.2s ease, background 0.6s ease",
                      boxShadow: fillColor ? `0 0 6px ${fillColor}66` : "none",
                    }} />
                  </div>
                </div>

                {/* Litros en silo / capacidad */}
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>
                  <span style={{ color: litrosAuto > 0 ? C.text : C.sub, fontFamily: "monospace", fontWeight: 600 }}>
                    {litrosAuto.toLocaleString("es-AR")}
                  </span>
                  <span style={{ color: C.muted }}> / {cap.toLocaleString("es-AR")} L</span>
                </div>

                {/* Selector de producto */}
                <select
                  style={{
                    ...inp, fontSize: 12, padding: "7px 10px", WebkitAppearance: "none",
                    ...(sd.producto && fillColor ? { borderColor: fillColor, boxShadow: `0 0 0 1px ${fillColor}44` } : {})
                  }}
                  value={sd.producto || ""}
                  onChange={e => updateSilo(turno, silo, "producto", e.target.value)}
                >
                  <option value="">Sin producto</option>
                  {PRODS_STOCK.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Panel info operario ── */}
            <div style={{ background: C.surface, borderRadius: 8, padding: "10px 12px", marginBottom: 10, border: `1px solid ${C.muted}` }}>
              <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>Parámetros del silo</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                {[
                  ["Capacidad total",    `${cap.toLocaleString("es-AR")} L`,     C.muted],
                  ["Mín. recomendado",   `${siloMin.toLocaleString("es-AR")} L`, "#22c55e"],
                  ["Máx. recomendado",   `${siloMax.toLocaleString("es-AR")} L`, C.accent],
                  ["Espacio disponible", `${espacio.toLocaleString("es-AR")} L`, "#60a5fa"],
                ].map(([label, val, color]) => (
                  <Fragment key={label}>
                    <span style={{ fontSize: 10, color: C.sub }}>{label}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color }}>{val}</span>
                  </Fragment>
                ))}
              </div>
              {nivelAlerta !== "ok" && (
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: nivelAlerta === "over" ? C.danger : C.accent }}>
                  {nivelAlerta === "over" ? "⚠️ Por encima del máximo recomendado" : "⚠️ Por debajo del mínimo recomendado"}
                </div>
              )}
            </div>

            {/* Campo litros reales (EcoMilk / medición) */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ ...lbl, color: "#60a5fa" }}>Litros reales (EcoMilk / medición)</label>
              <input
                style={{ ...inp, padding: "9px 12px", fontSize: 14, borderColor: sd.litrosReal ? "#3b82f6" : C.border }}
                type="number" inputMode="decimal"
                value={sd.litrosReal || ""}
                onChange={e => updateSilo(turno, silo, "litrosReal", e.target.value)}
                placeholder="Ingresá los litros reales del instrumento"
              />
              {sd.litrosReal && litrosAuto > 0 && (
                <div style={{ fontSize: 10, color: Math.abs(parseFloat(sd.litrosReal) - litrosAuto) > 500 ? C.accent : C.success, marginTop: 4 }}>
                  Diferencia con acumulado: {(parseFloat(sd.litrosReal) - litrosAuto).toLocaleString("es-AR", { signDisplay: "always" })} L
                </div>
              )}
            </div>

            {/* pH / Grasa / °D / °C */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <F label="pH">
                <input style={{ ...inp, padding: "8px 10px", fontSize: 13 }} type="number" inputMode="decimal"
                  value={sd.ph || ""} onChange={e => updateSilo(turno, silo, "ph", e.target.value)} step="0.01" />
              </F>
              <F label="Grasa %">
                <input style={{ ...inp, padding: "8px 10px", fontSize: 13 }} type="number" inputMode="decimal"
                  value={sd.grasa || ""} onChange={e => updateSilo(turno, silo, "grasa", e.target.value)} step="0.01" />
              </F>
              <F label="°D">
                <input style={{ ...inp, padding: "8px 10px", fontSize: 13 }} type="number" inputMode="decimal"
                  value={sd.gD || ""} onChange={e => updateSilo(turno, silo, "gD", e.target.value)} step="0.1" />
              </F>
              <F label="°C">
                <input style={{ ...inp, padding: "8px 10px", fontSize: 13 }} type="number" inputMode="decimal"
                  value={sd.gC || ""} onChange={e => updateSilo(turno, silo, "gC", e.target.value)} step="0.1" />
              </F>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── FORTIFICADOS ────────────────────────────────────────────
const UNIDADES_FORT = ["kg", "g", "L", "mL", "mg", "cc"];

const emptyFort = () => ({
  id: Date.now(),
  hora: getNow(),
  paraQue: "",
  siloOrigen: "",
  litrosBase: "",
  siloDestino: "",
  adiciones: [
    { id: 1, producto: "Lactosa", cantidad: "", unidad: "kg" },
    { id: 2, producto: "Variolac", cantidad: "", unidad: "g" },
    { id: 3, producto: "Agua", cantidad: "", unidad: "L" },
  ],
  ph: "", acidez: "", gB: "",
  responsable: "",
  obs: "",
});

const FortForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(() => initial ? { ...emptyFort(), ...initial } : emptyFort());
  const set = k => v => setF(p => ({ ...p, [k]: v }));

  const updAdicion = (id, key, val) =>
    setF(p => ({ ...p, adiciones: p.adiciones.map(a => a.id === id ? { ...a, [key]: val } : a) }));
  const addAdicion = () =>
    setF(p => ({ ...p, adiciones: [...p.adiciones, { id: Date.now(), producto: "", cantidad: "", unidad: "kg" }] }));
  const delAdicion = id =>
    setF(p => ({ ...p, adiciones: p.adiciones.filter(a => a.id !== id) }));

  return (
    <div>
      <F label="Para qué producto">
        <Sel value={f.paraQue || ""} onChange={set("paraQue")} options={FORT_DESTINOS} placeholder="Seleccionar destino..." />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="Litros base"><Inp type="number" value={f.litrosBase} onChange={set("litrosBase")} placeholder="0" /></F>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <F label="Silo Origen"><Sel value={f.siloOrigen} onChange={set("siloOrigen")} options={SILOS_TODOS} placeholder="Origen..." /></F>
        <F label="Silo Destino"><Sel value={f.siloDestino} onChange={set("siloDestino")} options={SILOS_TODOS} placeholder="Destino..." /></F>
      </div>

      <div style={panel}>
        <div style={secTitle}>⚗️ Adiciones</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 64px 28px", gap: 5, marginBottom: 5 }}>
          <span style={{ ...lbl, marginBottom: 0 }}>Producto</span>
          <span style={{ ...lbl, marginBottom: 0 }}>Cantidad</span>
          <span style={{ ...lbl, marginBottom: 0 }}>Unidad</span>
          <span />
        </div>
        {f.adiciones.map((a, idx) => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 64px 28px", gap: 5, alignItems: "center", marginBottom: 7 }}>
            <input
              style={inp}
              value={a.producto}
              onChange={e => updAdicion(a.id, "producto", e.target.value)}
              placeholder="Producto..."
            />
            <input
              style={{ ...inp, textAlign: "right" }}
              type="number" inputMode="decimal"
              value={a.cantidad}
              onChange={e => updAdicion(a.id, "cantidad", e.target.value)}
              placeholder="0"
            />
            <select
              style={{ ...inp, WebkitAppearance: "none", padding: "11px 4px", textAlign: "center" }}
              value={a.unidad}
              onChange={e => updAdicion(a.id, "unidad", e.target.value)}
            >
              {UNIDADES_FORT.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {idx >= 3
              ? <button onClick={() => delAdicion(a.id)} style={{ background: "none", border: `1px solid ${C.danger}55`, borderRadius: 6, color: C.danger, cursor: "pointer", height: 42, width: 28, fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
              : <div />
            }
          </div>
        ))}
        <button onClick={addAdicion} style={{ ...btnSecondary, marginTop: 6, borderStyle: "dashed", color: C.accent, borderColor: C.accentDark, fontSize: 13, padding: "9px 12px" }}>
          + Agregar producto
        </button>
      </div>

      <div style={panel}>
        <div style={secTitle}>🧪 Control de calidad</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <F label="pH"><Inp type="number" value={f.ph} onChange={set("ph")} step="0.01" /></F>
          <F label="Acidez"><Inp type="number" value={f.acidez} onChange={set("acidez")} step="0.1" /></F>
          <F label="GB %"><Inp type="number" value={f.gB} onChange={set("gB")} step="0.01" /></F>
        </div>
      </div>

      <F label="Responsable"><Inp value={f.responsable} onChange={set("responsable")} /></F>
      <F label="Observaciones">
        <textarea style={{ ...inp, minHeight: 56, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} placeholder="Obs..." />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          const req = [["siloOrigen", "Silo Origen"], ["litrosBase", "Litros base"], ["siloDestino", "Silo Destino"], ["responsable", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          const sinCant = f.adiciones.filter(a => !String(a.cantidad || "").trim()).map(a => a.producto || "Adición");
          const all = [...miss, ...sinCant.map(p => `Cantidad de ${p}`)];
          if (all.length) { alert("Campos obligatorios sin completar:\n• " + all.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};

const SecFortificados = ({ date, syncKey = 0 }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(date, "fortificados", []).then(d => { setList(d); setLoading(false); });
  }, [date, syncKey]);

  const persist = async u => { setList(u); await save(date, "fortificados", u); };
  const onSave = async item => {
    const ex = list.find(i => i.id === item.id);
    await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    setModal(null);
  };
  const onDelete = async id => {
    if (confirm("¿Eliminar este lote?")) {
      const item = list.find(i => i.id === id);
      if (item) await logDelete("fortificado", item);
      await persist(list.filter(i => i.id !== id));
      setModal(null);
    }
  };

  const totalL = list.reduce((s, i) => s + (parseFloat(i.litrosBase) || 0), 0);
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;

  return (
    <div>
      {list.length > 0 && (
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: "#0d5c30", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Total del día</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#27ae60", fontFamily: "'Courier New',monospace", lineHeight: 1 }}>
              {totalL.toLocaleString("es-AR")} <span style={{ fontSize: 14 }}>L</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Lotes</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>{list.length}</div>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🥛</div>
          <div style={{ fontSize: 15 }}>Sin lotes de leche fortificada hoy</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div>
        </div>
      ) : list.map(f => (
        <div key={f.id} onClick={() => setModal(f)} style={{ ...card, cursor: "pointer", borderLeftWidth: 3, borderLeftColor: "#27ae60" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.accent, fontSize: 17 }}>{f.hora}</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {f.paraQue && <span style={{ background: "#0a2218", color: "#27ae60", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, border: "1px solid #27ae6044" }}>{f.paraQue}</span>}
              <span style={{ background: "#0d2b1a", color: "#27ae60", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                {f.litrosBase ? `${parseFloat(f.litrosBase).toLocaleString("es-AR")} L` : "Sin litros"}
              </span>
            </div>
          </div>
          {(f.siloOrigen || f.siloDestino) && (
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
              {f.siloOrigen}{f.siloOrigen && f.siloDestino && " → "}{f.siloDestino}
            </div>
          )}
          {f.adiciones?.filter(a => a.cantidad).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {f.adiciones.filter(a => a.cantidad).map(a => (
                <span key={a.id} style={{ background: C.surface, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.sub, border: `1px solid ${C.border}` }}>
                  {a.producto}: {a.cantidad} {a.unidad}
                </span>
              ))}
            </div>
          )}
          {f.responsable && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{f.responsable}</div>}
        </div>
      ))}
      <FAB onClick={() => setModal("new")} />
      {modal && (
        <Modal title={modal === "new" ? "Nuevo Lote Fortificado" : "Editar Lote Fortificado"} onClose={() => setModal(null)}>
          <FortForm
            initial={modal === "new" ? null : modal}
            onSave={onSave} onClose={() => setModal(null)}
            onDelete={modal !== "new" ? () => onDelete(modal.id) : null}
          />
        </Modal>
      )}
    </div>
  );
};

// ─── INFORME DEL DÍA ──────────────────────────────────────────
const InformeModal = ({ date, onClose }) => {
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.all([
      load(date, "ingresos", []),
      load(date, "cip", {}),
      load(date, "carga", []),
      load(date, "movimientos", { movs: [], ctrls: [] }),
      load(date, "stock", {}),
      load(date, "fortificados", []),
      calcAutoLitros(date),
    ]).then(([ing, cip, carg, mov, stk, fort, litros]) => setD({ ing, cip, carg, mov, stk, fort, litros }));
  }, [date]);

  const Blk = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={secTitle}>{title}</div>
      {children}
    </div>
  );
  const Fila = ({ lbl, val, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}44` }}>
      <span style={{ fontSize: 12, color: C.sub, flex: 1 }}>{lbl}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || C.text, fontFamily: "monospace", marginLeft: 8 }}>{val}</span>
    </div>
  );

  if (!d) return (
    <Modal title={`📄 Informe — ${fmtDate(date)}`} onClose={onClose}>
      <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando informe...</div>
    </Modal>
  );

  const totalIng = d.ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
  const totalCarg = d.carg.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
  const totalFort = d.fort.reduce((s, f) => s + (parseFloat(f.litrosBase) || 0), 0);
  const silosPend = CIP_SILOS.filter(s => !(d.cip.silos || {})[s]?.hora);
  const camsPend = CAMIONES_BASE.filter(c => !(d.cip.camiones || {})[c]?.hora);
  const vacios = STOCK_SILOS.filter(s => (d.litros[s] || 0) <= 0);
  const resps = TURNOS.map(t => (d.stk[t] || {}).resp).filter(Boolean);

  return (
    <Modal title={`📄 Informe — ${fmtDate(date)}`} onClose={onClose}>

      {/* Resumen */}
      <div style={{ ...card, borderColor: C.accentDark, marginBottom: 14 }}>
        <Fila lbl="Total ingresado" val={`${totalIng.toLocaleString("es-AR")} L`} color={C.accent} />
        <Fila lbl="Total cargado (salidas)" val={`${totalCarg.toLocaleString("es-AR")} L`} />
        <Fila lbl="Total fortificado" val={`${totalFort.toLocaleString("es-AR")} L`} color="#27ae60" />
        <Fila lbl="Camiones ingresados" val={String(d.ing.length)} />
        <Fila lbl="Movimientos entre silos" val={String((d.mov.movs || []).length)} />
        {resps.length > 0 && <Fila lbl="Responsables del día" val={resps.join(" · ")} />}
      </div>

      {/* Estado silos */}
      <Blk title="🏗️ Estado de silos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {STOCK_SILOS.map(s => {
            const l = d.litros[s] || 0, cap = SILO_CAP[s] || 100000;
            const pct = (l / cap * 100).toFixed(0);
            const col = l <= 0 ? C.danger : l / cap > 0.8 ? C.success : C.text;
            return (
              <div key={s} style={{ background: C.surface, borderRadius: 8, padding: "8px 10px", border: `1px solid ${l <= 0 ? C.danger + "55" : C.border}` }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 2 }}>{s}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "monospace" }}>
                  {l <= 0 ? "VACÍO" : `${l.toLocaleString("es-AR")} L`}
                </div>
                {l > 0 && <div style={{ fontSize: 9, color: C.muted }}>{pct}% de {cap.toLocaleString("es-AR")} L</div>}
              </div>
            );
          })}
        </div>
      </Blk>

      {/* Ingresos */}
      {d.ing.length > 0 && (
        <Blk title={`🚛 Ingresos (${d.ing.length} camiones · ${totalIng.toLocaleString("es-AR")} L)`}>
          {d.ing.map(i => (
            <div key={i.id}>
              <Fila lbl={`${i.hora}  [${i.num}] ${i.tambo || "—"}${i.producto ? "  ·  " + i.producto : ""}`} val={`${parseFloat(i.litrosFca || 0).toLocaleString("es-AR")} L`} color={C.accent} />
              {i.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>💬 {i.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* Movimientos */}
      {(d.mov.movs || []).length > 0 && (
        <Blk title="🔄 Movimientos">
          {d.mov.movs.map(m => (
            <div key={m.id}>
              <Fila lbl={`${m.hora}  ${m.desde || "?"}→${m.hasta || "?"}${m.motivo ? " · " + m.motivo : ""}`} val={`${parseFloat(m.litros || 0).toLocaleString("es-AR")} L`} />
            </div>
          ))}
        </Blk>
      )}

      {/* Cargas */}
      {d.carg.length > 0 && (
        <Blk title={`🚚 Cargas (${totalCarg.toLocaleString("es-AR")} L)`}>
          {d.carg.map(c => (
            <div key={c.id}>
              <Fila lbl={`${c.hora}  ${c.label || ""}  ${c.destino || "—"}`} val={`${parseFloat(c.litros || 0).toLocaleString("es-AR")} L`} />
              {c.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>💬 {c.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* Fortificados */}
      {d.fort.length > 0 && (
        <Blk title={`⚗️ Fortificados (${totalFort.toLocaleString("es-AR")} L)`}>
          {d.fort.map(f => (
            <div key={f.id}>
              <Fila lbl={`${f.hora}  ${f.paraQue || ""}  ${f.siloOrigen || "?"}→${f.siloDestino || "?"}`} val={`${parseFloat(f.litrosBase || 0).toLocaleString("es-AR")} L`} color="#27ae60" />
              {f.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>💬 {f.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* CIP realizado */}
      {CIP_SILOS.some(s => (d.cip.silos || {})[s]?.hora) && (
        <Blk title="🧼 CIP realizado">
          {CIP_SILOS.filter(s => (d.cip.silos || {})[s]?.hora).map(s => (
            <Fila key={s} lbl={`SILO ${s}`} val={(d.cip.silos || {})[s]?.hora || ""} color={C.success} />
          ))}
          {CAMIONES_BASE.filter(c => (d.cip.camiones || {})[c]?.hora).map(c => (
            <Fila key={c} lbl={`CAMIÓN ${c}`} val={(d.cip.camiones || {})[c]?.hora || ""} color={C.success} />
          ))}
        </Blk>
      )}

      {/* Pendientes */}
      {(vacios.length > 0 || silosPend.length > 0 || camsPend.length > 0) ? (
        <div style={{ ...card, borderColor: C.danger + "66", background: "#160808", marginBottom: 8 }}>
          <div style={{ ...secTitle, color: C.danger }}>⚠️ Pendientes</div>
          {vacios.length > 0 && <div style={{ fontSize: 12, color: C.danger, marginBottom: 6 }}>🔴 Silos vacíos (requieren CIP): {vacios.join(", ")}</div>}
          {silosPend.length > 0 && <div style={{ fontSize: 12, color: C.accent, marginBottom: 4 }}>🧼 CIP silos sin registrar: {silosPend.join(", ")}</div>}
          {camsPend.length > 0 && <div style={{ fontSize: 12, color: C.accent }}>🚛 CIP camiones sin registrar: {camsPend.join(", ")}</div>}
        </div>
      ) : d.ing.length > 0 && (
        <div style={{ ...card, borderColor: C.success + "55", background: "#081608", textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
          <div style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>Todo en orden</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Sin pendientes registrados</div>
        </div>
      )}
    </Modal>
  );
};

// ─── DASHBOARD SUPERVISOR / JEFE ─────────────────────────────
const SecDashboard = ({ date, perfil, perfilLabel, syncKey = 0 }) => {
  const [tab, setTab] = useState("resumen");
  const [d, setD] = useState(null);
  const [users, setUsers] = useState([]);
  const [exportDate, setExportDate] = useState(date);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setExportDate(date);
    Promise.all([
      load(date, "ingresos", []),
      load(date, "carga", []),
      load(date, "movimientos", { movs: [], ctrls: [] }),
      load(date, "stock", {}),
      load(date, "fortificados", []),
      load(date, "cip", {}),
      calcAutoLitros(date),
      window.storage.get(ELIM_KEY).then(r => r ? JSON.parse(r.value) : []).catch(() => []),
      getActiveUsers(),
    ]).then(([ing, cargas, movData, stock, forts, cip, autoLitros, historial, activeUsers]) => {
      setD({ ing, cargas, movData, stock, forts, cip, autoLitros, historial });
      setUsers(activeUsers);
    });
  }, [date, syncKey]);

  if (!d) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando dashboard...</div>;

  // ── Estadísticas calculadas ──────────────────────────────────
  const totalIngresados = d.ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
  const totalCargados = d.cargas.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
  const balance = totalIngresados - totalCargados;
  const tambosUnicos = new Set(d.ing.map(i => i.tambo).filter(Boolean)).size;

  const qualFields = [
    ["Acidez", "acidezFca"], ["pH", "phFca"], ["GB", "gbFca"],
    ["SNG", "sngFca"], ["Proteína", "protFca"], ["Temperatura", "tC"], ["Aguado", "aguadoFca"],
  ];
  const quality = {};
  qualFields.forEach(([label, key]) => {
    const vals = d.ing.map(i => parseFloat(i[key])).filter(v => !isNaN(v) && v > 0);
    if (vals.length > 0) quality[label] = {
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
      min: Math.min(...vals), max: Math.max(...vals), n: vals.length,
    };
  });

  const TIPO_LABEL = { ingreso: "Ingreso", carga: "Carga", movimiento: "Movimiento", control: "Control Silo", fortificado: "Fortificado" };
  const TIPO_COL = { ingreso: C.accent, carga: "#60a5fa", movimiento: "#a78bfa", control: "#34d399", fortificado: "#27ae60" };

  // ── Componentes visuales ─────────────────────────────────────
  const StatCard = ({ icon, label, value, unit, color, sub }) => (
    <div style={{ background: C.card, borderRadius: 12, padding: "14px 10px", border: `1px solid ${C.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: color || C.text, fontFamily: "monospace", lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, color: C.sub, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const SiloBar = ({ silo }) => {
    const litros = d.autoLitros[silo] || 0;
    const cap = SILO_CAP[silo] || 10000;
    const pct = Math.min(100, Math.max(0, (litros / cap) * 100));
    let prod = "";
    for (const t of TURNOS) { const p = ((((d.stock[t] || {}).silos || {})[silo]) || {}).producto; if (p) { prod = p; break; } }
    const fillColor = PROD_COLOR[prod] || C.accent;
    const isEmpty = litros <= 0;
    return (
      <div style={{ ...card, padding: "10px 14px", marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Silo {silo}</span>
          <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: isEmpty ? C.danger : C.accent }}>
            {litros.toLocaleString("es-AR")} L
          </span>
        </div>
        <div style={{ background: C.muted, borderRadius: 6, height: 12, overflow: "hidden", marginBottom: 5 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: isEmpty ? C.danger : fillColor, borderRadius: 6, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: isEmpty ? C.danger : C.sub }}>{prod || "Sin producto"}</span>
          <span style={{ fontSize: 10, color: C.muted }}>{pct.toFixed(1)}% · {(cap / 1000).toFixed(0)}k L cap.</span>
        </div>
      </div>
    );
  };

  // ── Funciones de exportación ─────────────────────────────────
  const doExportCSV = async () => {
    setExporting(true);
    try {
      const [ing, cargas, movData] = await Promise.all([
        load(exportDate, "ingresos", []),
        load(exportDate, "carga", []),
        load(exportDate, "movimientos", { movs: [] }),
      ]);
      let csv = `YATASTO - INFORME DIARIO - ${fmtDate(exportDate)}\n\n`;
      csv += "INGRESOS\nHora,Tambo,Litros,Destino,pH,Acidez,GB,SNG,Densidad,Proteína,Responsable\n";
      ing.forEach(i => { csv += `${i.hora || ""},${i.tambo || ""},${i.litrosFca || ""},${i.destino || ""},${i.phFca || ""},${i.acidezFca || ""},${i.gbFca || ""},${i.sngFca || ""},${i.densFca || ""},${i.protFca || ""},${i.responsable || ""}\n`; });
      csv += "\nCARGAS\nHora,Label,Destino,Transportista,Silo,Litros,pH,Temp,Responsable\n";
      cargas.forEach(c => { csv += `${c.hora || ""},${c.label || ""},${c.destino || ""},${c.transportista || ""},${c.siloProveniente || ""},${c.litros || ""},${c.pH || ""},${c.gC || ""},${c.responsable || ""}\n`; });
      csv += "\nMOVIMIENTOS\nHora,Desde,Hasta,Litros,Motivo,Responsable\n";
      (movData.movs || []).forEach(m => { csv += `${m.hora || ""},${m.desde || ""},${m.hasta || ""},${m.litros || ""},${m.motivo || ""},${m.resp || ""}\n`; });
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `yatasto_${exportDate}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const doExportXLS = async () => {
    setExporting(true);
    try {
      const [ing, cargas] = await Promise.all([
        load(exportDate, "ingresos", []),
        load(exportDate, "carga", []),
      ]);
      let html = `<h2 style="color:#f59e0b">Yatasto · Informe Diario · ${fmtDate(exportDate)}</h2>`;
      const th = s => `<th style="background:#1a2035;color:#f59e0b;padding:6px 10px;border:1px solid #2a3050">${s}</th>`;
      const td = s => `<td style="padding:5px 10px;border:1px solid #2a3050">${s || ""}</td>`;
      html += `<h3>Ingresos (${ing.length})</h3><table style="border-collapse:collapse;width:100%"><tr>${["Hora", "Tambo", "Litros", "Destino", "pH", "Acidez", "GB", "SNG", "Dens.", "Prot.", "Resp."].map(th).join("")}</tr>`;
      ing.forEach(i => { html += `<tr>${[i.hora, i.tambo, i.litrosFca, i.destino, i.phFca, i.acidezFca, i.gbFca, i.sngFca, i.densFca, i.protFca, i.responsable].map(td).join("")}</tr>`; });
      html += `</table><h3>Cargas (${cargas.length})</h3><table style="border-collapse:collapse;width:100%"><tr>${["Hora", "Label", "Destino", "Transportista", "Silo", "Litros", "pH", "Temp", "Resp."].map(th).join("")}</tr>`;
      cargas.forEach(c => { html += `<tr>${[c.hora, c.label, c.destino, c.transportista, c.siloProveniente, c.litros, c.pH, c.gC, c.responsable].map(td).join("")}</tr>`; });
      html += `</table>`;
      const blob = new Blob([`<html><head><meta charset="utf-8"></head><body style="background:#080c18;color:#e8edf5;font-family:Arial">${html}</body></html>`], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `yatasto_${exportDate}.xls`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const doExportPDF = async () => {
    setExporting(true);
    try {
      const [ing, cargas, stk] = await Promise.all([
        load(exportDate, "ingresos", []),
        load(exportDate, "carga", []),
        load(exportDate, "stock", {}),
      ]);
      const autoL = await calcAutoLitros(exportDate);
      let html = `<style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#111}h1{font-size:16px;border-bottom:2px solid #f59e0b;padding-bottom:6px}h2{font-size:13px;color:#333;margin-top:16px}table{border-collapse:collapse;width:100%;margin-bottom:14px}th{background:#f59e0b;color:#000;padding:5px 8px;text-align:left;font-size:10px}td{border:1px solid #ccc;padding:4px 8px;font-size:10px}tr:nth-child(even){background:#f9f9f9}.stats{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}.stat{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:8px 14px;text-align:center}.stat .v{font-size:18px;font-weight:bold;color:#f59e0b}.stat .l{font-size:9px;color:#888;text-transform:uppercase}@media print{button{display:none}}</style>`;
      html += `<h1>🏭 Yatasto — Informe Diario — ${fmtDate(exportDate)}</h1>`;
      html += `<div class="stats">
        <div class="stat"><div class="v">${ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0).toLocaleString("es-AR")} L</div><div class="l">Ingresados</div></div>
        <div class="stat"><div class="v">${cargas.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0).toLocaleString("es-AR")} L</div><div class="l">Cargados</div></div>
        <div class="stat"><div class="v">${ing.length}</div><div class="l">Camiones</div></div>
        <div class="stat"><div class="v">${cargas.length}</div><div class="l">Cargas</div></div>
      </div>`;
      html += `<h2>Ingresos (${ing.length})</h2><table><tr><th>Hora</th><th>Nº</th><th>Tambo</th><th>Litros</th><th>Dest.</th><th>pH</th><th>Acidez</th><th>GB</th><th>SNG</th><th>Dens.</th><th>Prot.</th><th>Resp.</th></tr>`;
      ing.forEach(i => { html += `<tr><td>${i.hora || ""}</td><td>${i.num || ""}</td><td>${i.tambo || ""}</td><td>${i.litrosFca || ""}</td><td>${i.destino || ""}</td><td>${i.phFca || ""}</td><td>${i.acidezFca || ""}</td><td>${i.gbFca || ""}</td><td>${i.sngFca || ""}</td><td>${i.densFca || ""}</td><td>${i.protFca || ""}</td><td>${i.responsable || ""}</td></tr>`; });
      html += `</table><h2>Cargas (${cargas.length})</h2><table><tr><th>Hora</th><th>Label</th><th>Destino</th><th>Transportista</th><th>Silo</th><th>Litros</th><th>pH</th><th>Temp</th><th>Resp.</th></tr>`;
      cargas.forEach(c => { html += `<tr><td>${c.hora || ""}</td><td>${c.label || ""}</td><td>${c.destino || ""}</td><td>${c.transportista || ""}</td><td>${c.siloProveniente || ""}</td><td>${c.litros || ""}</td><td>${c.pH || ""}</td><td>${c.gC || ""}</td><td>${c.responsable || ""}</td></tr>`; });
      html += `</table><h2>Estado de Silos</h2><table><tr><th>Silo</th><th>Litros</th><th>Capacidad</th><th>% Lleno</th><th>Producto</th></tr>`;
      STOCK_SILOS.forEach(silo => {
        const litros = autoL[silo] || 0; const cap = SILO_CAP[silo] || 10000;
        const pct = cap > 0 ? ((litros / cap) * 100).toFixed(1) : "0.0";
        let prod = ""; for (const t of TURNOS) { const p = ((((stk[t] || {}).silos || {})[silo]) || {}).producto; if (p) { prod = p; break; } }
        html += `<tr><td>${silo}</td><td>${litros.toLocaleString("es-AR")}</td><td>${cap.toLocaleString("es-AR")}</td><td>${pct}%</td><td>${prod}</td></tr>`;
      });
      html += `</table><br><button onclick="window.print()" style="background:#f59e0b;color:#000;border:none;padding:8px 18px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:bold">🖨️ Imprimir / Guardar PDF</button>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(`<html><head><title>Yatasto ${exportDate}</title></head><body>${html}</body></html>`); w.document.close(); }
      else { alert("Bloqueado por el navegador. Permitir popups para exportar a PDF."); }
    } finally { setExporting(false); }
  };

  // ── Alertas automáticas ──────────────────────────────────────
  const alertas = [];
  STOCK_SILOS.forEach(s => {
    const litros = d.autoLitros[s] || 0; const cap = SILO_CAP[s] || 10000; const pct = (litros / cap) * 100;
    if (litros > 0 && pct > 90) alertas.push({ tipo: "warn", msg: `Silo ${s} al ${pct.toFixed(0)}% — casi lleno` });
    if (litros < 0) alertas.push({ tipo: "err", msg: `Silo ${s}: balance negativo (${litros.toLocaleString("es-AR")} L)` });
  });
  // Alertas por parámetros de calidad (todos los rangos de QUALITY_REFS)
  qualFields.forEach(([label]) => {
    const ref = QUALITY_REFS[label];
    if (!ref || !quality[label]) return;
    const v = quality[label];
    const outOfRange = v.avg < ref.min || v.avg > ref.max;
    if (outOfRange) {
      const isCrit = ref.critical || label === "Aguado";
      alertas.push({
        tipo: isCrit ? "err" : "warn",
        msg: isCrit
          ? `🚨 AGUADO detectado — promedio ${v.avg.toFixed(3)} (debe ser 0) — revisar adulteración`
          : `${label} fuera de rango: promedio ${v.avg.toFixed(2)} (ref: ${ref.min}–${ref.max})`,
      });
    }
  });
  // Alertas por desvíos Tambo vs Fábrica (cualquier ingreso con aguado > 0 = crítico)
  const ingConAguado = d.ing.filter(i => parseFloat(i.aguadoFca) > 0 || parseFloat(i.aguadoTbo) > 0);
  if (ingConAguado.length > 0)
    alertas.push({ tipo: "err", msg: `🚨 ${ingConAguado.length} camión/es con AGUADO detectado: ${ingConAguado.map(i => i.tambo || "?").join(", ")}` });
  const ingConDesvio = d.ing.filter(i => {
    const dL = Math.abs((parseFloat(i.litrosFca) || 0) - (parseFloat(i.litrosTbo) || 0));
    return dL > 150;
  });
  if (ingConDesvio.length > 0)
    alertas.push({ tipo: "warn", msg: `⚖️ ${ingConDesvio.length} camión/es con diferencia de litros Tbo/Fca > 150 L` });

  // ── Análisis diferencias Tambo vs Fábrica ────────────────────
  const analisisDifs = d.ing.map(ing => {
    const diffs = DIFF_FIELDS.map(f => {
      const vFca = parseFloat(ing[f.fca]);
      const vTbo = parseFloat(ing[f.tbo]);
      if (isNaN(vFca) || isNaN(vTbo) || (vFca === 0 && vTbo === 0)) return null;
      const diff = vFca - vTbo;
      const absDiff = Math.abs(diff);
      const pctDiff = vTbo !== 0 ? (diff / Math.abs(vTbo)) * 100 : null;
      const flagged = absDiff > f.thresh;
      return { ...f, vFca, vTbo, diff, absDiff, pctDiff, flagged };
    }).filter(Boolean);
    const flaggedCount = diffs.filter(df => df.flagged).length;
    const hasCritical = diffs.some(df => df.flagged && df.critical);
    const severity = hasCritical ? "crit" : flaggedCount >= 2 ? "warn" : flaggedCount >= 1 ? "attn" : "ok";
    return { ing, diffs, flaggedCount, hasCritical, severity };
  }).sort((a, b) => {
    const o = { crit: 0, warn: 1, attn: 2, ok: 3 };
    return o[a.severity] - o[b.severity] || b.flaggedCount - a.flaggedCount;
  });

  return (
    <div>
      {/* Header de perfil */}
      <div style={{ ...card, borderColor: "#5b21b644", background: "#0f0a1e", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Perfil activo · {fmtDate(date)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{perfilLabel}</div>
            {users.length > 0 && <div style={{ fontSize: 11, color: C.success, marginTop: 4 }}>● {users.length} usuario{users.length > 1 ? "s" : ""} activo{users.length > 1 ? "s" : ""}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 32 }}>{PERFILES[perfil]?.icon || "👔"}</span>
          </div>
        </div>
        {users.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {users.map(u => (
              <span key={u.id} style={{ fontSize: 10, background: C.muted, borderRadius: 4, padding: "2px 8px", color: C.text }}>
                {u.nombre} · {u.rol}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {[["resumen", "📊", "Resumen"], ["silos", "🏭", "Silos"], ["calidad", "📈", "Calidad"], ["difs", "🔍", "Difs."], ["historial", "📋", "Historial"], ["exportar", "📤", "Exportar"]].map(([t, ico, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...(tab === t ? btnPrimary : btnSecondary),
            padding: "8px 6px", fontSize: 11, whiteSpace: "nowrap", flex: 1, minWidth: 0,
          }}>{ico}<br />{lbl}</button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <StatCard icon="🥛" label="Ingresados" value={totalIngresados} unit="L" color={C.accent} />
            <StatCard icon="🚚" label="Cargados" value={totalCargados} unit="L" color="#60a5fa" />
            <StatCard icon="⚖️" label="Balance" value={balance} unit="L" color={balance >= 0 ? C.success : C.danger} />
            <StatCard icon="🚛" label="Camiones" value={d.ing.length} color={C.text} sub={`${tambosUnicos} tambos únicos`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            <StatCard icon="📦" label="Cargas" value={d.cargas.length} color={C.text} />
            <StatCard icon="⚗️" label="Fort." value={d.forts.length} color="#27ae60" />
            <StatCard icon="🔄" label="Movim." value={(d.movData.movs || []).length} color="#a78bfa" />
          </div>
          {alertas.length === 0 ? (
            <div style={{ ...card, borderColor: C.success + "55", background: "#081608", textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
              <div style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>Sin alertas activas</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Todo en orden</div>
            </div>
          ) : (
            <div style={{ ...card, borderColor: C.danger + "44", background: "#160808" }}>
              <div style={{ ...secTitle, color: C.danger }}>⚠️ Alertas ({alertas.length})</div>
              {alertas.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: a.tipo === "err" ? C.danger : C.accent, padding: "5px 0", borderBottom: `1px solid ${C.border}33` }}>
                  {a.tipo === "err" ? "🔴" : "🟡"} {a.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SILOS ── */}
      {tab === "silos" && (
        <div>
          <div style={{ ...secTitle, marginBottom: 10 }}>Estado de silos — {fmtDate(date)}</div>
          {STOCK_SILOS.map(s => <SiloBar key={s} silo={s} />)}
        </div>
      )}

      {/* ── CALIDAD ── */}
      {tab === "calidad" && (
        <div>
          {Object.keys(quality).length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📈</div>
              <div>Sin ingresos registrados</div>
            </div>
          ) : (
            <>
              <div style={{ ...secTitle }}>Promedios del día · {d.ing.length} camiones · {fmtDate(date)}</div>
              {Object.entries(quality).map(([label, v]) => (
                <div key={label} style={{ ...card, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.accent, fontFamily: "monospace" }}>{v.avg.toFixed(3)}</span>
                  </div>
                  <div style={{ background: C.muted, borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 5 }}>
                    <div style={{ width: `${Math.min(100, (v.avg / 20) * 100)}%`, height: "100%", background: C.accent, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: C.muted }}>mín <b style={{ color: C.text }}>{v.min.toFixed(3)}</b></span>
                    <span style={{ fontSize: 10, color: C.muted }}>n={v.n}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>máx <b style={{ color: C.text }}>{v.max.toFixed(3)}</b></span>
                  </div>
                  {QUALITY_REFS[label] && (() => {
                    const r = QUALITY_REFS[label]; const ok = v.avg >= r.min && v.avg <= r.max;
                    return <div style={{ marginTop: 4, fontSize: 10, color: ok ? C.success : C.danger }}>{ok ? "✅" : "⚠️"} Ref: {r.min}–{r.max}</div>;
                  })()}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── DIFS TAMBO vs FÁBRICA ── */}
      {tab === "difs" && (() => {
        const conProblemas = analisisDifs.filter(a => a.severity !== "ok");
        const critCount  = analisisDifs.filter(a => a.severity === "crit").length;
        const warnCount  = analisisDifs.filter(a => a.severity === "warn").length;
        const attnCount  = analisisDifs.filter(a => a.severity === "attn").length;

        const SEV = {
          crit: { label: "🚨 ADULTERACIÓN",  bg: "#450a0a", border: "#ef444466", text: "#fca5a5", badge: "#ef4444" },
          warn: { label: "🔴 ALERTA",         bg: "#431407", border: "#f9731644", text: "#fdba74", badge: "#f97316" },
          attn: { label: "🟡 DESVÍO",         bg: "#422006", border: "#d9770644", text: "#fde68a", badge: "#f59e0b" },
          ok:   { label: "✅ Normal",          bg: C.card,    border: C.border,    text: C.sub,    badge: "#22c55e" },
        };

        return (
          <div>
            {/* Banner resumen */}
            <div style={{ ...panel, marginBottom: 14, borderColor: critCount > 0 ? "#ef444466" : warnCount > 0 ? "#f9731644" : "#f59e0b44" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                🔍 Auditoría Tambo vs Fábrica — {fmtDate(date)}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { lbl: "Adulteración", val: critCount,  col: "#ef4444" },
                  { lbl: "Alertas",      val: warnCount,  col: "#f97316" },
                  { lbl: "Desvíos",      val: attnCount,  col: "#f59e0b" },
                  { lbl: "Normales",     val: analisisDifs.length - conProblemas.length, col: "#22c55e" },
                ].map(({ lbl, val, col }) => (
                  <div key={lbl} style={{ flex: 1, minWidth: 60, textAlign: "center", background: col + "18", borderRadius: 10, padding: "8px 6px", border: `1px solid ${col}33` }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{val}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {critCount === 0 && conProblemas.length === 0 && (
                <div style={{ textAlign: "center", marginTop: 10, color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
                  ✅ Todos los camiones dentro de parámetros normales
                </div>
              )}
            </div>

            {/* Umbral de referencia */}
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, padding: "6px 10px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <b style={{ color: C.sub }}>Umbrales de alerta:</b>{" "}
              Litros ±100 L · GB ±0.25 · SNG ±0.25 · Densidad ±0.003 · <b style={{ color: "#fca5a5" }}>Aguado &gt;0 = CRÍTICO</b> · Proteína ±0.2 · Alcohol ±1
            </div>

            {/* Cards por ingreso */}
            {analisisDifs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: C.sub, fontSize: 13 }}>Sin ingresos registrados para esta fecha</div>
            ) : analisisDifs.map(({ ing, diffs, flaggedCount, severity }, idx) => {
              const sev = SEV[severity];
              const flaggedDiffs = diffs.filter(df => df.flagged);
              const okDiffs      = diffs.filter(df => !df.flagged);
              const tamboParsed  = TAMBOS_BASE.find(t => String(t.num) === String(ing.tambo)) || null;
              const tamboNombre  = tamboParsed ? `${tamboParsed.nombre} (#${tamboParsed.num})` : (ing.tambo ? `Tambo #${ing.tambo}` : "—");

              return (
                <div key={ing.id || idx} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  {/* Cabecera */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{tamboNombre}</div>
                      <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                        {ing.hora || "—"} · {(parseFloat(ing.litrosFca) || 0).toLocaleString("es-AR")} L Fca · {(parseFloat(ing.litrosTbo) || 0).toLocaleString("es-AR")} L Tbo
                      </div>
                    </div>
                    <span style={{ fontSize: 11, background: sev.badge + "33", color: sev.badge, border: `1px solid ${sev.badge}55`, borderRadius: 8, padding: "4px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {sev.label}
                    </span>
                  </div>

                  {/* Tabla de parámetros con desvío */}
                  {flaggedDiffs.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: sev.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 700 }}>
                        ⚠ {flaggedDiffs.length} parámetro{flaggedDiffs.length > 1 ? "s" : ""} fuera de rango
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr 1fr", gap: "3px 8px", alignItems: "center" }}>
                        {/* Header */}
                        {["Param.", "Tambo", "Fábrica", "Δ Dif.", "Δ %"].map(h => (
                          <div key={h} style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, paddingBottom: 3, borderBottom: `1px solid ${C.border}` }}>{h}</div>
                        ))}
                        {/* Filas */}
                        {flaggedDiffs.map((df, i) => {
                          const signo = df.diff > 0 ? "+" : "";
                          const pctStr = df.pctDiff !== null ? `${signo}${df.pctDiff.toFixed(1)}%` : "—";
                          const diffStr = df.label === "Litros"
                            ? `${signo}${Math.round(df.diff).toLocaleString("es-AR")} L`
                            : `${signo}${df.diff.toFixed(3)}`;
                          const rowCol = df.critical ? "#fca5a5" : sev.text;
                          return (
                            <Fragment key={i}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: rowCol }}>{df.label}{df.critical ? " 🚨" : ""}</div>
                              <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{df.label === "Litros" ? (df.vTbo || 0).toLocaleString("es-AR") : df.vTbo.toFixed(3)}</div>
                              <div style={{ fontSize: 11, color: C.text, fontFamily: "monospace" }}>{df.label === "Litros" ? (df.vFca || 0).toLocaleString("es-AR") : df.vFca.toFixed(3)}</div>
                              <div style={{ fontSize: 11, color: rowCol, fontFamily: "monospace", fontWeight: 600 }}>{diffStr}</div>
                              <div style={{ fontSize: 11, color: df.pctDiff !== null && Math.abs(df.pctDiff) > 5 ? rowCol : C.muted, fontFamily: "monospace" }}>{pctStr}</div>
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Parámetros OK (colapsados) */}
                  {severity === "ok" && okDiffs.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {okDiffs.map((df, i) => (
                        <span key={i} style={{ fontSize: 10, background: "#16a34a22", color: "#4ade80", borderRadius: 5, padding: "2px 7px" }}>
                          ✓ {df.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {severity !== "ok" && okDiffs.length > 0 && (
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                      Sin desvío: {okDiffs.map(df => df.label).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── HISTORIAL ── */}
      {tab === "historial" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["🚛", "Ingresos", d.ing.length], ["🚚", "Cargas", d.cargas.length], ["⚗️", "Fort.", d.forts.length], ["🔄", "Movim.", (d.movData.movs || []).length]].map(([ico, lbl, cnt]) => (
              <div key={lbl} style={{ ...card, textAlign: "center", padding: "12px 8px" }}>
                <div style={{ fontSize: 20 }}>{ico}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{cnt}</div>
                <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase" }}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ ...secTitle }}>🗑️ Eliminaciones recientes</div>
          {d.historial.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: C.sub, fontSize: 12 }}>Sin eliminaciones registradas</div>
          ) : d.historial.slice(0, 30).map((e, i) => (
            <div key={i} style={{ ...card, padding: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, background: TIPO_COL[e.tipo] + "22", color: TIPO_COL[e.tipo], borderRadius: 4, padding: "2px 7px", fontWeight: 700, textTransform: "uppercase" }}>
                  {TIPO_LABEL[e.tipo] || e.tipo}
                </span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{e.fecha} {e.hora}</span>
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{e.resumen}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── EXPORTAR ── */}
      {tab === "exportar" && (
        <div>
          <div style={{ ...panel, marginBottom: 14 }}>
            <div style={secTitle}>📅 Seleccionar fecha</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={exportDate} onChange={e => setExportDate(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={() => setExportDate(date)} style={{ ...btnSecondary, width: "auto", padding: "10px 14px", whiteSpace: "nowrap" }}>Hoy</button>
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 8, textAlign: "center" }}>Exportando datos del {fmtDate(exportDate)}</div>
          </div>

          <div style={{ ...secTitle }}>Formato de exportación</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <button onClick={doExportCSV} disabled={exporting} style={{ background: "#064e3b", color: "#34d399", border: "1px solid #34d39944", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>📊 Exportar CSV</div>
              <div style={{ fontSize: 11, color: "#6ee7b7" }}>Ingresos · Cargas · Movimientos — Compatible con Excel, Google Sheets y cualquier planilla</div>
            </button>
            <button onClick={doExportXLS} disabled={exporting} style={{ background: "#1e3a5f", color: "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>📗 Exportar Excel (.xls)</div>
              <div style={{ fontSize: 11, color: "#93c5fd" }}>Tabla formateada lista para abrir en Microsoft Excel</div>
            </button>
            <button onClick={doExportPDF} disabled={exporting} style={{ background: "#4a1942", color: "#e879f9", border: "1px solid #e879f944", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>📄 Ver / Imprimir PDF</div>
              <div style={{ fontSize: 11, color: "#f0abfc" }}>Abre una vista de impresión — guardá como PDF desde el navegador</div>
            </button>
          </div>
          {exporting && <div style={{ textAlign: "center", marginTop: 14, color: C.accent, fontSize: 13 }}>⏳ Preparando exportación...</div>}
        </div>
      )}
    </div>
  );
};

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("ingresos");
  const [date, setDate] = useState(getToday());
  const [datePicker, setDatePicker] = useState(false);
  const [informe, setInforme] = useState(false);
  const [initModal, setInitModal] = useState(false);
  const [initNombre, setInitNombre] = useState("");
  const [perfil, setPerfil] = useState(null); // null | "supervisor" | "jefe"
  const [perfilModal, setPerfilModal] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [syncKey, setSyncKey] = useState(0); // incrementa cada 30s → refresca datos en todas las secciones
  const isToday = date === getToday();

  const navItems = perfil
    ? [...NAV, { id: "supervisor", label: "Superv.", icon: PERFILES[perfil]?.icon || "👔" }]
    : NAV;

  // Pedir identificación al inicio si el turno actual no tiene responsable
  useEffect(() => {
    if (date !== getToday()) return;
    const t = getCurrentTurno();
    load(date, "stock", {}).then(d => {
      if (!(d[t] || {}).resp) setInitModal(true);
    });
  }, []);

  // Sync cada 30s: refresca datos de todas las secciones + registra presencia de usuario
  useEffect(() => {
    const rol = perfil ? PERFILES[perfil].label : "Operario";
    const nombre = initNombre || "Operario";
    updateHeartbeat(nombre, rol);
    const interval = setInterval(() => {
      setSyncKey(k => k + 1);
      updateHeartbeat(nombre, rol);
    }, 30000);
    return () => clearInterval(interval);
  }, [perfil, initNombre]);

  const guardarResponsable = async () => {
    if (!initNombre.trim()) return;
    const t = getCurrentTurno();
    const d = await load(date, "stock", {});
    await save(date, "stock", { ...d, [t]: { ...(d[t] || {}), resp: initNombre.trim() } });
    setInitModal(false);
  };

  const handleLogin = () => {
    const key = Object.keys(PERFILES).find(k =>
      PERFILES[k].usuario === loginUser && PERFILES[k].clave === loginPass
    );
    if (key) {
      setPerfil(key);
      setLoginUser(""); setLoginPass(""); setLoginError("");
      setPerfilModal(false);
    } else {
      setLoginError("Usuario o contraseña incorrectos.");
    }
  };

  const handleLogout = () => {
    setPerfil(null);
    if (section === "supervisor") setSection("ingresos");
    setPerfilModal(false);
  };

  const closePerfilModal = () => {
    setPerfilModal(false);
    setLoginUser(""); setLoginPass(""); setLoginError("");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "-apple-system,'Segoe UI',sans-serif", paddingBottom: 72 }}>

      {/* Modal identificación de turno */}
      {initModal && (
        <Modal title={`Turno ${TURNO_LABELS[getCurrentTurno()]} — ${getCurrentTurno()} hs.`} onClose={() => setInitModal(false)} zIndex={200}>
          <div style={{ color: C.sub, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Bienvenido/a. Identificate para registrar el responsable de este turno.
          </div>
          <F label="Tu nombre">
            <input style={inp} type="text" autoFocus value={initNombre}
              onChange={e => setInitNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guardarResponsable()}
              placeholder="Ej: Juan García" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btnSecondary} onClick={() => setInitModal(false)}>Ahora no</button>
            <button style={btnPrimary} onClick={guardarResponsable}>Ingresar</button>
          </div>
        </Modal>
      )}

      {/* Modal perfil / login */}
      {perfilModal && (
        <Modal title="Acceso con perfil" onClose={closePerfilModal} zIndex={200}>
          {perfil ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{PERFILES[perfil].icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{PERFILES[perfil].label}</div>
                <div style={{ fontSize: 12, color: C.success, marginTop: 4, fontWeight: 600 }}>● Sesión activa</div>
              </div>
              <button
                style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, width: "100%" }}
                onClick={handleLogout}
              >Cerrar sesión</button>
            </div>
          ) : (
            <div>
              <div style={{ color: C.sub, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Ingresá tus credenciales para acceder con un perfil especial.
              </div>
              <F label="Usuario">
                <input style={inp} type="text" autoFocus value={loginUser}
                  onChange={e => { setLoginUser(e.target.value); setLoginError(""); }}
                  onKeyDown={e => e.key === "Enter" && document.getElementById("loginPassInput")?.focus()}
                  placeholder="Usuario" />
              </F>
              <F label="Contraseña">
                <input id="loginPassInput" style={inp} type="password" value={loginPass}
                  onChange={e => { setLoginPass(e.target.value); setLoginError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="Contraseña" />
              </F>
              {loginError && (
                <div style={{ color: C.danger, fontSize: 12, marginBottom: 10, padding: "6px 10px", background: "#ef444418", borderRadius: 6 }}>
                  {loginError}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button style={btnSecondary} onClick={closePerfilModal}>Cancelar</button>
                <button style={btnPrimary} onClick={handleLogin}>Ingresar</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal informe */}
      {informe && <InformeModal date={date} onClose={() => setInforme(false)} />}

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>🏭 Yatasto · Recibo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
            {navItems.find(n => n.id === section)?.icon} {navItems.find(n => n.id === section)?.label}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Botón perfil */}
          <button onClick={() => setPerfilModal(true)} title={perfil ? PERFILES[perfil].label : "Acceder con perfil"} style={{
            background: perfil ? C.accentDim : C.card,
            border: `1px solid ${perfil ? C.accentDark : C.border}`,
            borderRadius: 10, color: perfil ? C.accent : C.sub,
            padding: "7px 11px", cursor: "pointer", fontSize: 16,
            position: "relative", lineHeight: 1,
          }}>
            👤
            {perfil && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: C.success, borderRadius: "50%", display: "block", border: `1.5px solid ${C.surface}` }} />
            )}
          </button>
          <button onClick={() => setInforme(true)} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, color: C.text, padding: "8px 10px",
            cursor: "pointer", fontSize: 12, fontWeight: 700,
          }}>📄 Inf.</button>
          <button onClick={() => setDatePicker(!datePicker)} style={{
            background: isToday ? C.card : C.accentDim, border: `1px solid ${isToday ? C.border : C.accentDark}`,
            borderRadius: 10, color: isToday ? C.text : C.accent, padding: "8px 12px",
            cursor: "pointer", fontSize: 13, fontFamily: "'Courier New',monospace", fontWeight: 700,
          }}>
            📅 {isToday ? "Hoy" : fmtDate(date)}
          </button>
        </div>
      </div>

      {/* Date picker */}
      {datePicker && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 8 }}>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setDatePicker(false); }} style={{ ...inp, flex: 1 }} />
          <button onClick={() => { setDate(getToday()); setDatePicker(false); }} style={{ ...btnPrimary, width: "auto", padding: "10px 16px", whiteSpace: "nowrap" }}>Hoy</button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "12px 16px 0" }}>
        {section === "ingresos" && <SecIngresos date={date} syncKey={syncKey} />}
        {section === "cip" && <SecCIP date={date} syncKey={syncKey} />}
        {section === "carga" && <SecCarga date={date} syncKey={syncKey} />}
        {section === "movimientos" && <SecMovimientos date={date} syncKey={syncKey} />}
        {section === "stock" && <SecStock date={date} syncKey={syncKey} />}
        {section === "fortificados" && <SecFortificados date={date} syncKey={syncKey} />}
        {section === "supervisor" && perfil && <SecDashboard date={date} perfil={perfil} perfilLabel={PERFILES[perfil]?.label || ""} syncKey={syncKey} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: `repeat(${navItems.length},1fr)`, zIndex: 40 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 0 13px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            borderTop: section === n.id ? `2px solid ${C.accent}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: section === n.id ? C.accent : C.sub, letterSpacing: "0.05em", textTransform: "uppercase" }}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
