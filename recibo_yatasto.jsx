import { useState, useEffect } from "react";

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
const SILOS = ["100 NUEVO", "100 VIEJO", "80", "60", "42", "40F", "15"];
const SILOS_TODOS = [...SILOS, "TQ1", "TQ2", "TQ3", "TQ6", "TQ7", "TQ8", "TQ9", "POSTRE", "TINA", "DULCE"];
const CIP_SILOS = ["100 N", "100 V", "80", "60", "42", "40F", "15", "LINEA 1", "LINEA 2"];
const STOCK_SILOS = ["100 N", "100 V", "80", "60", "42", "40F", "15", "TQ6", "TQ7"];
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
  "40F": 40000, "15": 15000,
  "TQ6": 6000, "TQ7": 7000,
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
  "80": "80", "60": "60", "42": "42", "40F": "40F", "15": "15",
  "TQ6": "TQ6", "TQ7": "TQ7",
};

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
  const def = { tambosCustom: [], camionesCustom: [] };
  try { const r = await window.storage.get(CFG_KEY); return r ? { ...def, ...JSON.parse(r.value) } : def; }
  catch { return def; }
}
async function saveCfg(data) {
  try { await window.storage.set(CFG_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}

// Calcula litros netos por silo: ingresos + movimientos − cargas − fort_origen + fort_destino
async function calcAutoLitros(date) {
  const [ingresos, movData, cargas, forts] = await Promise.all([
    load(date, "ingresos", []),
    load(date, "movimientos", { movs: [], ctrls: [] }),
    load(date, "carga", []),
    load(date, "fortificados", []),
  ]);
  const totals = {};
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
  producto: "",
});

const IngresoForm = ({ initial, onSave, onClose, onDelete, tambos, onNuevoTambo }) => {
  const [f, setF] = useState(initial || emptyIng());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  const pickTambo = nombre => {
    const t = tambos.find(t => t.nombre === nombre);
    setF(p => ({ ...p, tambo: nombre, num: t ? String(t.num) : p.num }));
  };
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
      <F label="Observaciones">
        <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} placeholder="Observaciones..." />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={btnPrimary} onClick={() => {
          const req = [["tambo", "Tambo"], ["litrosFca", "Litros Fábrica"], ["destino", "Destino"], ["producto", "Producto"],
          ["acidezFca", "Acidez Fca."], ["phFca", "pH Fca."], ["alcFca", "Prueba Alcohol Fca."],
          ["gbFca", "GB Fca."], ["sngFca", "SNG Fca."], ["densFca", "Densidad Fca."], ["protFca", "Proteína Fca."], ["atm", "ATM"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar este ingreso</button>}
    </div>
  );
};

const SecIngresos = ({ date }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tambos, setTambos] = useState(TAMBOS_BASE);
  const [tamboModal, setTamboModal] = useState(false);
  const [newTambo, setNewTambo] = useState({ nombre: "", num: "" });

  useEffect(() => {
    load(date, "ingresos", []).then(d => { setList(d); setLoading(false); });
    loadCfg().then(cfg => setTambos([...TAMBOS_BASE, ...(cfg.tambosCustom || [])]));
  }, [date]);

  const persist = async updated => { setList(updated); await save(date, "ingresos", updated); };
  const onSave = async item => {
    const ex = list.find(i => i.id === item.id);
    await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    setModal(null);
  };
  const onDelete = async id => {
    if (confirm("¿Eliminar este ingreso?")) { await persist(list.filter(i => i.id !== id)); setModal(null); }
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

const SecCIP = ({ date }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("silos");
  const [camiones, setCamiones] = useState(CAMIONES_BASE);
  const [camionModal, setCamionModal] = useState(false);
  const [newCamion, setNewCamion] = useState("");

  useEffect(() => {
    load(date, "cip", {}).then(d => { setData(d); setLoading(false); });
    loadCfg().then(cfg => setCamiones([...CAMIONES_BASE, ...(cfg.camionesCustom || [])]));
  }, [date]);

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
const emptyCarga = () => ({ id: Date.now(), label: "CARGA 1", destino: "", siloProveniente: "", limpCisterna: "", litros: "", T: "", gC: "", pH: "", A: "", gD: "", hora: getNow(), responsable: "", obs: "" });
const CargaForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyCarga());
  const set = k => v => setF(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
        {["CARGA 1", "CARGA 2", "CARGA 3"].map(l => (
          <button key={l} onClick={() => set("label")(l)} style={{ ...(f.label === l ? btnPrimary : btnSecondary), padding: "10px 6px", fontSize: 13 }}>{l}</button>
        ))}
      </div>
      <F label="Destino"><Inp value={f.destino} onChange={set("destino")} placeholder="Destino de la carga..." /></F>
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
    </div>
  );
};
const SecCarga = ({ date }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(date, "carga", []).then(d => { setList(d); setLoading(false); }); }, [date]);
  const persist = async u => { setList(u); await save(date, "carga", u); };
  const onSave = async item => { const ex = list.find(i => i.id === item.id); await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]); setModal(null); };
  const onDelete = async id => { if (confirm("¿Eliminar?")) { await persist(list.filter(i => i.id !== id)); setModal(null); } };
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
          <div style={{ fontSize: 15, color: C.text, marginBottom: 4 }}>{c.destino || "Sin destino"}</div>
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
const emptyMov = () => ({ id: Date.now(), hora: getNow(), desde: "", hasta: "", litros: "", motivo: "", resp: "" });
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

const SecMovimientos = ({ date }) => {
  const [data, setData] = useState({ movs: [], ctrls: [] });
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("movs");
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(date, "movimientos", { movs: [], ctrls: [] }).then(d => { setData(d); setLoading(false); }); }, [date]);
  const persist = async u => { setData(u); await save(date, "movimientos", u); };
  const saveMov = async item => { const l = data.movs; const ex = l.find(i => i.id === item.id); await persist({ ...data, movs: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] }); setModal(null); };
  const saveCtrl = async item => { const l = data.ctrls; const ex = l.find(i => i.id === item.id); await persist({ ...data, ctrls: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] }); setModal(null); };
  const delMov = async id => { if (confirm("¿Eliminar?")) await persist({ ...data, movs: data.movs.filter(i => i.id !== id) }); setModal(null); };
  const delCtrl = async id => { if (confirm("¿Eliminar?")) await persist({ ...data, ctrls: data.ctrls.filter(i => i.id !== id) }); setModal(null); };
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
              <div style={{ fontSize: 14, color: C.sub }}>{m.desde || "?"} → {m.hasta || "?"}</div>
              {m.motivo && <div style={{ fontSize: 12, color: C.accent, marginTop: 2, fontStyle: "italic" }}>{m.motivo}</div>}
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
const SecStock = ({ date }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState(getCurrentTurno());
  const [autoLitros, setAutoLitros] = useState({});
  const [silosVaciados, setSilosVaciados] = useState([]);

  useEffect(() => {
    Promise.all([
      load(date, "stock", {}),
      load(date, "ingresos", []),
      calcAutoLitros(date),
    ]).then(([d, ingresos, autoTotals]) => {
      setAutoLitros(autoTotals);

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
  }, [date]);

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
        const fillPct = Math.min(1, litrosAuto / cap);
        const fillColor = PROD_COLOR[sd.producto] || (litrosAuto > 0 ? PROD_COLOR["Leche Cruda"] : null);
        const hasData = litrosAuto > 0 || sd.producto || sd.ph;
        const pct = (fillPct * 100).toFixed(1);

        return (
          <div key={silo} style={{ ...card, borderColor: hasData ? C.accentDark : C.border, padding: 12 }}>
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
                    <span style={{ fontWeight: 700, color: litrosAuto > 0 ? C.text : C.sub }}>{pct}%</span>
                  </div>
                  <div style={{ background: C.muted, borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: fillColor || "#3a4460",
                      width: `${fillPct * 100}%`,
                      transition: "width 1.2s ease, background 0.6s ease",
                      boxShadow: fillColor ? `0 0 6px ${fillColor}66` : "none",
                    }} />
                  </div>
                </div>

                {/* Litros en silo / capacidad */}
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>
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

const SecFortificados = ({ date }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(date, "fortificados", []).then(d => { setList(d); setLoading(false); });
  }, [date]);

  const persist = async u => { setList(u); await save(date, "fortificados", u); };
  const onSave = async item => {
    const ex = list.find(i => i.id === item.id);
    await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    setModal(null);
  };
  const onDelete = async id => {
    if (confirm("¿Eliminar este lote?")) { await persist(list.filter(i => i.id !== id)); setModal(null); }
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
            <span style={{ background: "#0d2b1a", color: "#27ae60", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {f.litrosBase ? `${parseFloat(f.litrosBase).toLocaleString("es-AR")} L` : "Sin litros"}
            </span>
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
          {d.ing.map(i => <Fila key={i.id} lbl={`${i.hora}  [${i.num}] ${i.tambo || "—"}`} val={`${parseFloat(i.litrosFca || 0).toLocaleString("es-AR")} L`} color={C.accent} />)}
        </Blk>
      )}

      {/* Movimientos */}
      {(d.mov.movs || []).length > 0 && (
        <Blk title="🔄 Movimientos">
          {d.mov.movs.map(m => <Fila key={m.id} lbl={`${m.hora}  ${m.desde || "?"}→${m.hasta || "?"}${m.motivo ? " · " + m.motivo : ""}`} val={`${parseFloat(m.litros || 0).toLocaleString("es-AR")} L`} />)}
        </Blk>
      )}

      {/* Cargas */}
      {d.carg.length > 0 && (
        <Blk title={`🚚 Cargas (${totalCarg.toLocaleString("es-AR")} L)`}>
          {d.carg.map(c => <Fila key={c.id} lbl={`${c.hora}  ${c.label || ""}  ${c.destino || "—"}`} val={`${parseFloat(c.litros || 0).toLocaleString("es-AR")} L`} />)}
        </Blk>
      )}

      {/* Fortificados */}
      {d.fort.length > 0 && (
        <Blk title={`⚗️ Fortificados (${totalFort.toLocaleString("es-AR")} L)`}>
          {d.fort.map(f => <Fila key={f.id} lbl={`${f.hora}  ${f.siloOrigen || "?"}→${f.siloDestino || "?"}`} val={`${parseFloat(f.litrosBase || 0).toLocaleString("es-AR")} L`} color="#27ae60" />)}
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

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("ingresos");
  const [date, setDate] = useState(getToday());
  const [datePicker, setDatePicker] = useState(false);
  const [informe, setInforme] = useState(false);
  const [initModal, setInitModal] = useState(false);
  const [initNombre, setInitNombre] = useState("");
  const isToday = date === getToday();

  // Pedir identificación al inicio si el turno actual no tiene responsable
  useEffect(() => {
    if (date !== getToday()) return;
    const t = getCurrentTurno();
    load(date, "stock", {}).then(d => {
      if (!(d[t] || {}).resp) setInitModal(true);
    });
  }, []);

  const guardarResponsable = async () => {
    if (!initNombre.trim()) return;
    const t = getCurrentTurno();
    const d = await load(date, "stock", {});
    await save(date, "stock", { ...d, [t]: { ...(d[t] || {}), resp: initNombre.trim() } });
    setInitModal(false);
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

      {/* Modal informe */}
      {informe && <InformeModal date={date} onClose={() => setInforme(false)} />}

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em" }}>🏭 Yatasto · Recibo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
            {NAV.find(n => n.id === section)?.icon} {NAV.find(n => n.id === section)?.label}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
        {section === "ingresos" && <SecIngresos date={date} />}
        {section === "cip" && <SecCIP date={date} />}
        {section === "carga" && <SecCarga date={date} />}
        {section === "movimientos" && <SecMovimientos date={date} />}
        {section === "stock" && <SecStock date={date} />}
        {section === "fortificados" && <SecFortificados date={date} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(6,1fr)", zIndex: 40 }}>
        {NAV.map(n => (
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
