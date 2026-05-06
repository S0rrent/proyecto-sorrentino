import { useState, useEffect, Fragment } from "react";
import { DARK, LIGHT, FONT_SANS, FONT_MONO, EASE_OUT, DUR } from "./tokens.js";
import { useViewport } from "./hooks.js";
import {
  Ingresos as IcoIngresos, Movimientos as IcoMovimientos, Carga as IcoCarga,
  Fortificados as IcoFortificados, CIP as IcoCIP, Stock as IcoStock,
  Supervisor as IcoSupervisor, Jefe as IcoJefe,
  ThemeLight, ThemeDark, DatePicker as IcoDate, Informe as IcoInforme, Offline as IcoOffline,
  Destino as IcoDestino, Concentrado as IcoConcentrado, Calidad as IcoCalidad,
  Temperatura as IcoTemp, Buscar as IcoBuscar, Instalacion as IcoInstalacion,
  Mantenimiento as IcoMant, ControlSilo as IcoCtrl, LecheIcon as IcoLeche,
  Balance as IcoBalance, AlertaError, AlertaWarn, AlertaOk, CheckMark,
  Eliminar as IcoEliminar, TabResumen, TabSilos, TabCalidad, TabDifs,
  TabSemana, TabHistorial, TabExportar, CamionIcon, UsuariosOnline,
  SW,
} from "./icons.js";

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
  supervisor: { usuario: "Supervisor", clave: "Yatasto2026$", label: "Supervisor", Icon: IcoSupervisor },
  jefe: { usuario: "Jefe", clave: "BuenaLeche123$", label: "Jefe de Planta", Icon: IcoJefe },
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
  { id: "ingresos",    label: "Ingr.",  Icon: IcoIngresos },
  { id: "movimientos", label: "Movim.", Icon: IcoMovimientos },
  { id: "carga",       label: "Carga",  Icon: IcoCarga },
  { id: "fortificados",label: "Fort.",  Icon: IcoFortificados },
  { id: "cip",         label: "CIP",    Icon: IcoCIP },
  { id: "stock",       label: "Stock",  Icon: IcoStock },
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
const getPreviousDate = (dateStr) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; };
const getLastNDays = (n) => { const days = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split("T")[0]); } return days; };
const getDaysInRange = (from, to) => { const days = []; const cur = new Date(from + "T00:00:00"); const end = new Date(to + "T00:00:00"); while (cur <= end && days.length < 90) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); } return days; };
const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const getNow = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const getCurrentTurno = () => { const h = new Date().getHours(); return h >= 7 && h < 14 ? "07:00" : h >= 14 && h < 21 ? "14:00" : "21:00"; };
const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const sKey = (date, sec) => `yatasto:${date}:${sec}`;
const CFG_KEY = "yatasto:config";

// ─── COLORS / THEME ──────────────────────────────────────────
const _THEME = (() => { try { return localStorage.getItem("yatasto:theme") || "dark"; } catch { return "dark"; } })();
const C_DARK  = DARK;
const C_LIGHT = LIGHT;
const C = _THEME === "light" ? C_LIGHT : C_DARK;

// ─── SHARED STYLES ───────────────────────────────────────────
const inp = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
  color: C.text, padding: "11px 12px", fontSize: 16, width: "100%",
  outline: "none", fontFamily: FONT_MONO, boxSizing: "border-box",
};
const lbl = { fontSize: 12, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block", fontWeight: 600 };
const secTitle = { fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };
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
const ELIM_KEY   = "yatasto:eliminados";
const USERS_KEY  = "yatasto:usuarios";
const SALDO_KEY  = "yatasto:saldo-silos";
const SR_KEY     = "yatasto:session-restore";  // sesión guardada antes de recargar tema

function saveSessionForReload(state) {
  try { localStorage.setItem(SR_KEY, JSON.stringify(state)); } catch {}
}
function popSavedSession() {
  try {
    const raw = localStorage.getItem(SR_KEY);
    if (!raw) return null;
    localStorage.removeItem(SR_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}
// Lee una vez al cargar la página (antes del primer render de App)
const _restoredSession = popSavedSession();
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
  const prefersReduced = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const siloTransition = prefersReduced ? "none" : `y ${DUR.silo} ${EASE_OUT}`;
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
          style={{ transition: siloTransition }}
        />
      )}

      {/* Brillo lateral izquierdo (reflejo líquido) */}
      {fillColor && fillPct > 0.04 && (
        <rect
          x="24" y={rectY} width="6" height="200"
          fill="white" fillOpacity="0.07"
          clipPath={`url(#${uid})`}
          style={{ transition: siloTransition }}
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
  <button type="button" onClick={onClick} style={{
    position: "fixed", right: 20, bottom: 82, width: 56, height: 56, borderRadius: 28,
    background: C.accent, border: "none", color: "#000", fontSize: 28, fontWeight: 700,
    cursor: "pointer", boxShadow: `0 4px 24px ${C.accent}55`,
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
  }}>+</button>
);
const Modal = ({ title, onClose, children, zIndex = 100 }) => {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex, display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center" }}>
      <div style={{
        background: C.bg, padding: 20, overflowY: "auto",
        border: `1px solid ${C.border}`,
        ...(isDesktop ? {
          borderRadius: 16, width: "min(580px, 90vw)", maxHeight: "85vh",
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        } : {
          borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "93vh", borderBottom: "none",
        }),
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{title}</span>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: C.card, border: "none", color: C.sub, borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        {children}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
};

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
        <button type="button" onClick={onNuevoTambo} style={{ marginTop: 6, background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", padding: "4px 0", textDecoration: "underline" }}>
          + Agregar nuevo tambo
        </button>
      </F>
      <F label="Producto">
        <Sel value={f.producto || ""} onChange={set("producto")} options={PRODUCTOS} placeholder="Seleccionar producto..." />
      </F>

      {/* Badge que distingue el formulario */}
      {isConcentrado && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <IcoCalidad size={16} strokeWidth={SW} color={C.accent} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Formulario simplificado — Producto concentrado</div>
            <div style={{ fontSize: 11, color: C.sub }}>Solo se requieren los parámetros esenciales para este tipo de producto.</div>
          </div>
        </div>
      )}

      {/* ── Formulario CONCENTRADOS (Lactosa / Suero / Concentrado) ── */}
      {isConcentrado ? (
        <>
          <div style={panel}>
            <div style={secTitle}>Destino & Litros</div>
            <F label="Destino — Silo"><Sel value={f.destino} onChange={set("destino")} options={SILOS} placeholder="Seleccionar silo..." /></F>
            <F label="Litros"><Inp type="number" value={f.litrosFca} onChange={set("litrosFca")} placeholder="0" /></F>
            <F label="Temperatura llegada (°C)">
              <Inp type="number" value={f.tC} onChange={set("tC")} step="0.1" placeholder="°C" />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 3 – 8 °C</div>
            </F>
          </div>
          <div style={panel}>
            <div style={secTitle}>Parámetros</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez">
                <Inp type="number" value={f.acidezFca} onChange={set("acidezFca")} step="0.1" />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 14 – 18 °D</div>
              </F>
              <F label="pH">
                <Inp type="number" value={f.phFca} onChange={set("phFca")} step="0.01" />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 6.6 – 6.8</div>
              </F>
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
            <div style={secTitle}>Litros & Destino</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Litros Fábrica"><Inp type="number" value={f.litrosFca} onChange={set("litrosFca")} placeholder="0" /></F>
              <F label="Litros Tambo"><Inp type="number" value={f.litrosTbo} onChange={set("litrosTbo")} placeholder="0" /></F>
            </div>
            <F label="Destino — Silo"><Sel value={f.destino} onChange={set("destino")} options={SILOS} placeholder="Seleccionar silo..." /></F>
            <F label="Temperatura llegada (°C)">
              <Inp type="number" value={f.tC} onChange={set("tC")} step="0.1" placeholder="°C" />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 3 – 8 °C</div>
            </F>
          </div>
          <div style={panel}>
            <div style={secTitle}>Parámetros básicos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez Fca.">
                <Inp type="number" value={f.acidezFca} onChange={set("acidezFca")} step="0.1" />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 14 – 18 °D</div>
              </F>
              <F label="pH Fca.">
                <Inp type="number" value={f.phFca} onChange={set("phFca")} step="0.01" />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 6.6 – 6.8</div>
              </F>
            </div>
            <Pair label="Prueba Alcohol" v1={f.alcFca} v2={f.alcTbo} on1={set("alcFca")} on2={set("alcTbo")} />
          </div>
          <div style={panel}>
            <div style={secTitle}>Composición</div>
            <Pair label="Grasa Butirosa (GB)" v1={f.gbFca} v2={f.gbTbo} on1={set("gbFca")} on2={set("gbTbo")} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 12 }}>Ref: 3.0 – 4.0 %</div>
            <Pair label="Sólidos No Grasos (SNG)" v1={f.sngFca} v2={f.sngTbo} on1={set("sngFca")} on2={set("sngTbo")} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 12 }}>Ref: 8.0 – 8.7 %</div>
            <Pair label="Densidad" v1={f.densFca} v2={f.densTbo} on1={set("densFca")} on2={set("densTbo")} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 12 }}>Ref: 1.028 – 1.033 g/mL</div>
            <Pair label="Aguado" v1={f.aguadoFca} v2={f.aguadoTbo} on1={set("aguadoFca")} on2={set("aguadoTbo")} />
            <div style={{ fontSize: 11, color: C.danger, marginTop: -8, marginBottom: 12 }}>Debe ser exactamente 0 — indica adulteración</div>
            <Pair label="Leche de Descarte" v1={f.dcFca} v2={f.dcTbo} on1={set("dcFca")} on2={set("dcTbo")} />
            <Pair label="Proteína" v1={f.protFca} v2={f.protTbo} on1={set("protFca")} on2={set("protTbo")} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 12 }}>Ref: 2.9 – 3.5 %</div>
            <F label="ATM"><Sel value={f.atm || ""} onChange={set("atm")} options={["Sí", "No"]} placeholder="ATM..." /></F>
          </div>
        </>
      )}

      <F label="Observaciones">
        <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} placeholder="Observaciones..." />
      </F>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
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
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar este ingreso</button>}
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
  const [filtro, setFiltro] = useState("");

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
          <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Total del día</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.accent, fontFamily: FONT_MONO, lineHeight: 1 }}>
            {totalFca.toLocaleString("es-AR")} <span style={{ fontSize: 16 }}>L</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Camiones</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{list.length}</div>
        </div>
      </div>
      {/* Buscador de tambo */}
      {list.length > 0 && (
        <div style={{ position: "relative", marginBottom: 10 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.45, pointerEvents: "none", display: "flex" }}><IcoBuscar size={14} strokeWidth={SW} /></span>
          <input
            style={{ ...inp, paddingLeft: 36, paddingRight: filtro ? 36 : 12 }}
            type="text"
            placeholder="Buscar por tambo o N°…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
          {filtro && (
            <button type="button" onClick={() => setFiltro("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: C.muted, border: "none", color: C.sub, cursor: "pointer",
              borderRadius: "50%", width: 20, height: 20, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}>×</button>
          )}
        </div>
      )}
      {(() => {
        const q = filtro.trim().toLowerCase();
        const vista = q
          ? list.filter(ing =>
              (ing.tambo || "").toLowerCase().includes(q) ||
              String(ing.num || "").toLowerCase().includes(q)
            )
          : list;
        if (list.length === 0) return (
          <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoIngresos size={48} strokeWidth={1} /></div>
            <div style={{ fontSize: 15 }}>Sin ingresos registrados hoy</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div>
          </div>
        );
        if (vista.length === 0) return (
          <div style={{ textAlign: "center", padding: "32px 24px", color: C.sub }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoBuscar size={32} strokeWidth={1} /></div>
            <div style={{ fontSize: 14 }}>Sin resultados para "{filtro}"</div>
            <button type="button" onClick={() => setFiltro("")} style={{ marginTop: 10, background: "none", border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
              Limpiar búsqueda
            </button>
          </div>
        );
        return vista.map(ing => (
          <div key={ing.id} onClick={() => setModal(ing)} style={{ ...card, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.accent, fontSize: 17 }}>{ing.hora}</span>
              <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{ing.destino || "Sin destino"}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>[{ing.num}] {ing.tambo || "—"}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 13, color: C.sub, flexWrap: "wrap" }}>
              {ing.litrosFca && <span>{parseFloat(ing.litrosFca).toLocaleString("es-AR")} L Fca.</span>}
              {ing.litrosTbo && <span>{parseFloat(ing.litrosTbo).toLocaleString("es-AR")} L Tbo.</span>}
              {ing.tC && <span>{ing.tC}°C</span>}
              {ing.phFca && <span>pH {ing.phFca}</span>}
              {ing.producto && <span style={{ color: C.accent }}>· {ing.producto}</span>}
            </div>
          </div>
        ));
      })()}
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
            <button type="button" style={btnSecondary} onClick={() => setTamboModal(false)}>Cancelar</button>
            <button type="button" style={btnPrimary} onClick={saveNuevoTambo}>Guardar</button>
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
          {data?.hora && <span style={{ fontSize: 12, color: C.success, fontFamily: FONT_MONO }}>{data.hora}</span>}
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
        {[["silos", "Silos / Líneas"], ["camiones", "Camiones"]].map(([t, l]) => (
          <button type="button" key={t} onClick={() => setTab(t)} style={{ ...(tab === t ? btnPrimary : btnSecondary), padding: "10px 6px" }}>{l}</button>
        ))}
      </div>
      {tab === "silos" && (
        <>
          {CIP_SILOS.map(s => <CIPRow key={s} nombre={s} tipo="SILO" data={(data.silos || {})[s] || {}} onChange={v => updateSilo(s, v)} />)}
          <div style={{ ...panel, marginTop: 8 }}>
            <div style={secTitle}>Desarme Filtro — Limpieza Manual</div>
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
          <button type="button" onClick={() => setCamionModal(true)} style={{ ...btnSecondary, marginTop: 8, borderStyle: "dashed", color: C.accent, borderColor: C.accentDark }}>
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
            <button type="button" style={btnSecondary} onClick={() => setCamionModal(false)}>Cancelar</button>
            <button type="button" style={btnPrimary} onClick={saveNuevoCamion}>Guardar</button>
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
          <button type="button" key={l} onClick={() => set("label")(l)} style={{ ...(f.label === l ? btnPrimary : btnSecondary), padding: "10px 6px", fontSize: 13 }}>{l}</button>
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
          <button type="button" onClick={() => setProdModal(true)} style={{
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
          <button type="button" onClick={() => setTransModal(true)} style={{
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
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["destino", "Destino"], ["siloProveniente", "Silo Proveniente"], ["limpCisterna", "Limpieza Cisterna"],
          ["litros", "Litros"], ["hora", "Hora"], ["responsable", "Responsable"],
          ["T", "T"], ["gC", "°C"], ["pH", "pH"], ["A", "A"], ["gD", "°D"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}

      {transModal && (
        <Modal title="Agregar Transportista" onClose={() => setTransModal(false)}>
          <F label="Nombre del transportista">
            <input style={inp} type="text" autoFocus value={newTrans}
              onChange={e => setNewTrans(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveNuevoTrans()}
              placeholder="Ej: MARTINEZ" />
          </F>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" style={btnSecondary} onClick={() => setTransModal(false)}>Cancelar</button>
            <button type="button" style={btnPrimary} onClick={saveNuevoTrans}>Guardar</button>
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
            <button type="button" style={btnSecondary} onClick={() => setProdModal(false)}>Cancelar</button>
            <button type="button" style={btnPrimary} onClick={saveNuevoProd}>Guardar</button>
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
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ marginBottom: 12, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoCarga size={48} strokeWidth={1} /></div><div>Sin cargas registradas</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
      ) : list.map(c => (
        <div key={c.id} onClick={() => setModal(c)} style={{ ...card, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.accent, fontSize: 16 }}>{c.hora}</span>
            <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{c.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, color: C.text }}>{c.destino || "Sin destino"}</span>
            {c.producto && <span style={{ fontSize: 11, background: C.accentDim, color: C.accent, borderRadius: 6, padding: "2px 8px", fontWeight: 700, border: `1px solid ${C.border}` }}>{c.producto}</span>}
          </div>
          {c.transportista && (
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><CamionIcon size={12} strokeWidth={SW} />{c.transportista}</div>
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
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["litros", "Litros"], ["desde", "Desde"], ["hasta", "Hasta"], ["motivo", "Motivo"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
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
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["silo", "Silo"], ["ph", "pH"], ["gD", "°D"], ["gC", "°C"], ["alc", "Alc."], ["mg", "MG"], ["sng", "SNG"], ["dens", "Densidad"], ["fp", "FP"], ["prot", "Proteína"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { alert("Campos obligatorios sin completar:\n• " + miss.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
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
        {[["movs", "Movimientos"], ["ctrls", "Control Silos"]].map(([t, l]) => (
          <button type="button" key={t} onClick={() => setTab(t)} style={{ ...(tab === t ? btnPrimary : btnSecondary), padding: "10px 6px" }}>{l}</button>
        ))}
      </div>
      {tab === "movs" && (
        <>
          {data.movs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoMovimientos size={48} strokeWidth={1} /></div><div>Sin movimientos</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
          ) : data.movs.map(m => (
            <div key={m.id} onClick={() => setModal({ type: "mov", item: m })} style={{ ...card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_MONO, color: C.accent, fontWeight: 700, fontSize: 16 }}>{m.hora}</span>
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
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}><div style={{ display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoCtrl size={48} strokeWidth={1} /></div><div>Sin controles registrados</div><div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div></div>
          ) : data.ctrls.map(c => (
            <div key={c.id} onClick={() => setModal({ type: "ctrl", item: c })} style={{ ...card, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_MONO, color: C.accent, fontWeight: 700, fontSize: 16 }}>{c.hora}</span>
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
      // Guardar snapshot del día actual para carry-over automático al día siguiente
      if (date === getToday() && Object.values(autoTotals).some(v => v > 0)) {
        saveSaldo(autoTotals, date);
      }
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

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;
  const td = data[turno] || {};

  return (
    <div>
      {/* Banner silos vaciados */}
      {silosVaciados.length > 0 && (
        <div style={{ ...card, borderColor: C.danger.replace(/\)$/, " / 0.5)"), background: C.danger.replace(/\)$/, " / 0.10)"), marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><AlertaError size={11} strokeWidth={SW} />Silos vaciados — requieren lavado CIP</span>
            </div>
            <div style={{ fontSize: 13, color: C.text }}>{silosVaciados.join(", ")} → marcados como Sucio (vacío)</div>
          </div>
          <button type="button" onClick={() => setSilosVaciados([])} style={{ background: "none", border: "none", color: C.sub, fontSize: 22, cursor: "pointer", padding: "0 4px" }}>×</button>
        </div>
      )}

      {/* Selector de turno */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
        {TURNOS.map(t => {
          const filled = Object.values((data[t] || {}).silos || {}).filter(s => s.ph && s.grasa).length;
          const isActive = t === getCurrentTurno() && date === getToday();
          return (
            <button type="button" key={t} onClick={() => setTurno(t)} style={{ ...(turno === t ? btnPrimary : btnSecondary), padding: "8px 4px", position: "relative" }}>
              {isActive && <span style={{ position: "absolute", top: 4, right: 6, width: 6, height: 6, borderRadius: 3, background: turno === t ? C.bg : C.success, display: "inline-block" }} />}
              <div style={{ fontSize: 13, fontWeight: 700 }}>{TURNO_LABELS[t]}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{t}–{TURNO_CIERRE[t]} hs.</div>
              <div style={{ fontSize: 10, marginTop: 2, color: turno === t ? C.text.replace(/\)$/, " / 0.6)") : C.success.replace(/\)$/, " / 0.55)") }}>
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
                <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Acumulado del día</div>
                <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 16, color: litrosAuto > 0 ? C.accent : C.sub }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.sub, marginBottom: 4 }}>
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
                  <span style={{ color: litrosAuto > 0 ? C.text : C.sub, fontFamily: FONT_MONO, fontWeight: 600 }}>
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
        <div style={secTitle}>Adiciones</div>
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
              ? <button type="button" onClick={() => delAdicion(a.id)} style={{ background: "none", border: `1px solid ${C.danger}55`, borderRadius: 6, color: C.danger, cursor: "pointer", height: 42, width: 28, fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
              : <div />
            }
          </div>
        ))}
        <button type="button" onClick={addAdicion} style={{ ...btnSecondary, marginTop: 6, borderStyle: "dashed", color: C.accent, borderColor: C.accentDark, fontSize: 13, padding: "9px 12px" }}>
          + Agregar producto
        </button>
      </div>

      <div style={panel}>
        <div style={secTitle}>Control de calidad</div>
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
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["siloOrigen", "Silo Origen"], ["litrosBase", "Litros base"], ["siloDestino", "Silo Destino"], ["responsable", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          const sinCant = f.adiciones.filter(a => !String(a.cantidad || "").trim()).map(a => a.producto || "Adición");
          const all = [...miss, ...sinCant.map(p => `Cantidad de ${p}`)];
          if (all.length) { alert("Campos obligatorios sin completar:\n• " + all.join("\n• ")); return; }
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
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
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: C.success.replace(/\)$/, " / 0.35)"), marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Total del día</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.success, fontFamily: FONT_MONO, lineHeight: 1 }}>
              {totalL.toLocaleString("es-AR")} <span style={{ fontSize: 14 }}>L</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Lotes</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1 }}>{list.length}</div>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoFortificados size={48} strokeWidth={1} /></div>
          <div style={{ fontSize: 15 }}>Sin lotes de leche fortificada hoy</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Tocá + para agregar</div>
        </div>
      ) : list.map(f => (
        <div key={f.id} onClick={() => setModal(f)} style={{ ...card, cursor: "pointer", border: `1px solid ${C.success.replace(/\)$/, " / 0.3)")}`, background: C.success.replace(/\)$/, " / 0.06)") }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: C.accent, fontSize: 17 }}>{f.hora}</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {f.paraQue && <span style={{ background: C.success.replace(/\)$/, " / 0.15)"), color: C.success, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, border: `1px solid ${C.success.replace(/\)$/, " / 0.35)")}` }}>{f.paraQue}</span>}
              <span style={{ background: C.success.replace(/\)$/, " / 0.15)"), color: C.success, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
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
      <span style={{ fontSize: 12, fontWeight: 700, color: color || C.text, fontFamily: FONT_MONO, marginLeft: 8 }}>{val}</span>
    </div>
  );

  if (!d) return (
    <Modal title={`Informe — ${fmtDate(date)}`} onClose={onClose}>
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
    <Modal title={`Informe — ${fmtDate(date)}`} onClose={onClose}>

      {/* Resumen */}
      <div style={{ ...card, borderColor: C.accentDark, marginBottom: 14 }}>
        <Fila lbl="Total ingresado" val={`${totalIng.toLocaleString("es-AR")} L`} color={C.accent} />
        <Fila lbl="Total cargado (salidas)" val={`${totalCarg.toLocaleString("es-AR")} L`} />
        <Fila lbl="Total fortificado" val={`${totalFort.toLocaleString("es-AR")} L`} color={C.success} />
        <Fila lbl="Camiones ingresados" val={String(d.ing.length)} />
        <Fila lbl="Movimientos entre silos" val={String((d.mov.movs || []).length)} />
        {resps.length > 0 && <Fila lbl="Responsables del día" val={resps.join(" · ")} />}
      </div>

      {/* Estado silos */}
      <Blk title="Estado de silos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {STOCK_SILOS.map(s => {
            const l = d.litros[s] || 0, cap = SILO_CAP[s] || 100000;
            const pct = (l / cap * 100).toFixed(0);
            const col = l <= 0 ? C.danger : l / cap > 0.8 ? C.success : C.text;
            return (
              <div key={s} style={{ background: C.surface, borderRadius: 8, padding: "8px 10px", border: `1px solid ${l <= 0 ? C.danger + "55" : C.border}` }}>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 2 }}>{s}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: FONT_MONO }}>
                  {l <= 0 ? "VACÍO" : `${l.toLocaleString("es-AR")} L`}
                </div>
                {l > 0 && <div style={{ fontSize: 10, color: C.muted }}>{pct}% de {cap.toLocaleString("es-AR")} L</div>}
              </div>
            );
          })}
        </div>
      </Blk>

      {/* Ingresos */}
      {d.ing.length > 0 && (
        <Blk title={`Ingresos (${d.ing.length} camiones · ${totalIng.toLocaleString("es-AR")} L)`}>
          {d.ing.map(i => (
            <div key={i.id}>
              <Fila lbl={`${i.hora}  [${i.num}] ${i.tambo || "—"}${i.producto ? "  ·  " + i.producto : ""}`} val={`${parseFloat(i.litrosFca || 0).toLocaleString("es-AR")} L`} color={C.accent} />
              {i.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>{i.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* Movimientos */}
      {(d.mov.movs || []).length > 0 && (
        <Blk title="Movimientos">
          {d.mov.movs.map(m => (
            <div key={m.id}>
              <Fila lbl={`${m.hora}  ${m.desde || "?"}→${m.hasta || "?"}${m.motivo ? " · " + m.motivo : ""}`} val={`${parseFloat(m.litros || 0).toLocaleString("es-AR")} L`} />
            </div>
          ))}
        </Blk>
      )}

      {/* Cargas */}
      {d.carg.length > 0 && (
        <Blk title={`Cargas (${totalCarg.toLocaleString("es-AR")} L)`}>
          {d.carg.map(c => (
            <div key={c.id}>
              <Fila lbl={`${c.hora}  ${c.label || ""}  ${c.destino || "—"}`} val={`${parseFloat(c.litros || 0).toLocaleString("es-AR")} L`} />
              {c.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>{c.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* Fortificados */}
      {d.fort.length > 0 && (
        <Blk title={`Fortificados (${totalFort.toLocaleString("es-AR")} L)`}>
          {d.fort.map(f => (
            <div key={f.id}>
              <Fila lbl={`${f.hora}  ${f.paraQue || ""}  ${f.siloOrigen || "?"}→${f.siloDestino || "?"}`} val={`${parseFloat(f.litrosBase || 0).toLocaleString("es-AR")} L`} color={C.success} />
              {f.obs && <div style={{ fontSize: 11, color: C.sub, padding: "2px 0 4px 8px", borderBottom: `1px solid ${C.border}22`, fontStyle: "italic" }}>{f.obs}</div>}
            </div>
          ))}
        </Blk>
      )}

      {/* CIP realizado */}
      {CIP_SILOS.some(s => (d.cip.silos || {})[s]?.hora) && (
        <Blk title="CIP realizado">
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
        <div style={{ ...card, borderColor: C.danger.replace(/\)$/, " / 0.4)"), background: C.danger.replace(/\)$/, " / 0.07)"), marginBottom: 8 }}>
          <div style={{ ...secTitle, color: C.danger }}>Pendientes</div>
          {vacios.length > 0 && <div style={{ fontSize: 12, color: C.danger, marginBottom: 6 }}>Silos vacíos (requieren CIP): {vacios.join(", ")}</div>}
          {silosPend.length > 0 && <div style={{ fontSize: 12, color: C.accent, marginBottom: 4 }}>CIP silos sin registrar: {silosPend.join(", ")}</div>}
          {camsPend.length > 0 && <div style={{ fontSize: 12, color: C.accent }}>CIP camiones sin registrar: {camsPend.join(", ")}</div>}
        </div>
      ) : d.ing.length > 0 && (
        <div style={{ ...card, borderColor: C.success.replace(/\)$/, " / 0.35)"), background: C.success.replace(/\)$/, " / 0.08)"), textAlign: "center", padding: 16 }}>
          <div style={{ marginBottom: 4, display: "flex", justifyContent: "center", color: C.success }}><AlertaOk size={22} strokeWidth={1.5} /></div>
          <div style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>Todo en orden</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Sin pendientes registrados</div>
        </div>
      )}
    </Modal>
  );
};

// ─── DASHBOARD SUPERVISOR / JEFE ─────────────────────────────
// ── Mini sparkline SVG (analytics) ──────────────────────────
// ─── YATASTO COW SILHOUETTE (logo real) ───────────────────────
// Basado en la silueta oficial de la vaquita de Lacteos Yatasto SA
// fillRule="evenodd" crea el hueco interior sin depender del color de fondo
const COW_PATH =
  "M50,6 C60,6 66,8 69,13 C72,18 75,24 78,29 C82,32 88,34 94,36 " +
  "C99,38 101,44 99,50 C97,54 93,57 87,57 C84,56 81,54 79,52 " +
  "C79,58 78,65 78,71 C77,78 69,82 50,82 C31,82 23,78 22,71 " +
  "C22,65 21,58 21,52 C19,54 16,56 13,57 C7,57 3,54 1,50 " +
  "C0,44 2,38 6,36 C12,34 18,32 22,29 C25,24 28,18 31,13 " +
  "C34,8 40,6 50,6Z " +
  "M41,14 C41,8 45,5 50,5 C55,5 59,8 59,14 C59,20 55,24 50,25 " +
  "C45,24 41,20 41,14Z";

// Colores de logo según tema: oscuro→rojo corporativo, claro→negro elegante
const LOGO_COLOR = _THEME === "light" ? "#0f172a" : "#dc2626";

const CowIcon = ({ size = 36 }) => (
  <svg
    width={size}
    height={Math.round(size * 0.88)}
    viewBox="0 0 100 88"
    fill="none"
    style={{ display: "block", flexShrink: 0 }}
  >
    <path fillRule="evenodd" fill={LOGO_COLOR} d={COW_PATH} />
  </svg>
);

// ─── YATASTO LOGO ─────────────────────────────────────────────
const YataLogo = ({ compact = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: compact ? 7 : 10, userSelect: "none" }}>
    <CowIcon size={compact ? 28 : 40} />
    <div>
      <div style={{
        fontSize: compact ? 14 : 20,
        fontWeight: 900,
        color: LOGO_COLOR,
        lineHeight: 1,
        letterSpacing: compact ? "0.12em" : "0.1em",
        fontFamily: "'Arial Black','Arial Bold',Arial,sans-serif",
      }}>YATASTO</div>
      {!compact && (
        <div style={{
          fontSize: 8, color: C.sub, fontStyle: "italic",
          letterSpacing: "0.16em", marginTop: 2, textTransform: "lowercase",
        }}>Buena Leche</div>
      )}
    </div>
  </div>
);

// ─── DONUT CHART ──────────────────────────────────────────────
const DonutChart = ({ pct = 0, color, size = 74, label }) => {
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  const dash = circ * Math.min(1, Math.max(0, pct / 100));
  return (
    <svg width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.muted} strokeWidth={sw} />
      {pct > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color || C.accent} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: `stroke-dasharray 0.6s ${EASE_OUT}` }}
        />
      )}
      {label !== undefined && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13}
          fontWeight="800" fill={C.text} fontFamily={FONT_MONO}>{label}</text>
      )}
    </svg>
  );
};

const Sparkline = ({ values, color, w = 64, h = 24 }) => {
  const sparkColor = color || C.accent;
  const clean = (values || []).filter(v => v != null && !isNaN(v) && v > 0);
  if (clean.length < 2) return <span style={{ fontSize: 9, color: C.muted }}>—</span>;
  const lo = Math.min(...clean), hi = Math.max(...clean), span = hi - lo || 0.001;
  const pts = clean.map((v, i) => {
    const x = 2 + (i / (clean.length - 1)) * (w - 4);
    const y = h - 2 - ((v - lo) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lx, ly] = pts[pts.length - 1].split(",");
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={sparkColor} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={lx} cy={ly} r="2.2" fill={sparkColor} />
    </svg>
  );
};

const SecDashboard = ({ date, perfil, perfilLabel, syncKey = 0 }) => {
  const [tab, setTab] = useState("resumen");
  const [d, setD] = useState(null);
  const [users, setUsers] = useState([]);
  const [exportFrom, setExportFrom] = useState(date);
  const [exportTo, setExportTo] = useState(date);
  const [exporting, setExporting] = useState(false);
  const [weekData, setWeekData] = useState(null);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [tamboSel, setTamboSel] = useState(null);

  useEffect(() => {
    setExportFrom(date);
    setExportTo(date);
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

  // Cargar 14 días al activar tab semana/tambos
  useEffect(() => {
    if (tab !== "semana" && tab !== "tambos") return;
    setLoadingWeek(true);
    setWeekData(null);
    setTamboSel(null);
    const days14 = getLastNDays(14);
    const days7  = days14.slice(-7);
    Promise.all([
      ...days14.map(dy => load(dy, "ingresos", []).then(ing => ({ date: dy, ing }))),
      ...days7.map(dy  => load(dy, "carga",    []).then(car => ({ date: dy, car }))),
    ]).then(all => {
      const byDate = {};
      days14.forEach(dy => { byDate[dy] = { ingresados: 0, cargados: 0, camiones: 0, ingresos: [] }; });
      all.forEach(r => {
        if (r.ing !== undefined) {
          byDate[r.date].ingresados = r.ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
          byDate[r.date].camiones   = r.ing.length;
          byDate[r.date].ingresos   = r.ing;
        }
        if (r.car !== undefined) {
          byDate[r.date].cargados = r.car.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
        }
      });
      setWeekData(byDate);
      setLoadingWeek(false);
    });
  }, [tab, date]);

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
  const TIPO_COL = { ingreso: C.accent, carga: C.sub, movimiento: C.muted, control: C.success, fortificado: C.success };

  // ── Componentes visuales ─────────────────────────────────────
  const StatCard = ({ Icon: StatIcon, label, value, unit, color, sub, trend }) => {
    const col = color || C.text;
    return (
      <div style={{
        background: _THEME === "light"
          ? `linear-gradient(145deg, #fff 0%, ${col}0d 100%)`
          : `linear-gradient(145deg, ${C.card} 0%, ${col}10 100%)`,
        borderRadius: 14, padding: "14px 10px",
        border: `1px solid ${col}33`,
        textAlign: "center", position: "relative", overflow: "hidden",
        boxShadow: _THEME === "light" ? `0 2px 12px ${col}18` : "none",
      }}>
        <div style={{
          position: "absolute", top: -12, right: -12, width: 50, height: 50,
          borderRadius: "50%", background: col + "18",
        }} />
        <div style={{ marginBottom: 5, position: "relative", display: "flex", justifyContent: "center", color: col }}>
          {StatIcon && <StatIcon size={20} strokeWidth={SW} />}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: FONT_MONO, lineHeight: 1, position: "relative" }}>
          {typeof value === "number" ? value.toLocaleString("es-AR") : value}
          {unit && <span style={{ fontSize: 11, fontWeight: 400, color: C.sub, marginLeft: 3 }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 5, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
        {trend !== undefined && (
          <div style={{ fontSize: 11, color: trend >= 0 ? C.success : C.danger, marginTop: 3, fontWeight: 700 }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const SiloBar = ({ silo }) => {
    const litros = d.autoLitros[silo] || 0;
    const cap = SILO_CAP[silo] || 10000;
    const pct = Math.min(100, Math.max(0, (litros / cap) * 100));
    let prod = "";
    for (const t of TURNOS) { const p = ((((d.stock[t] || {}).silos || {})[silo]) || {}).producto; if (p) { prod = p; break; } }
    const fillColor = PROD_COLOR[prod] || C.accent;
    const isEmpty = litros <= 0;
    const isAlert = litros > 0 && pct > 88;
    const statusColor = isEmpty ? C.danger : isAlert ? C.accent : fillColor;
    return (
      <div style={{
        background: _THEME === "light"
          ? `linear-gradient(135deg, #fff 0%, ${statusColor}0a 100%)`
          : `linear-gradient(135deg, ${C.card} 0%, ${statusColor}0d 100%)`,
        borderRadius: 14, padding: "12px 14px", marginBottom: 8,
        border: `1px solid ${isAlert ? C.accent + "55" : isEmpty ? C.danger + "33" : C.border}`,
        boxShadow: isAlert ? `0 0 12px ${C.accent}20` : "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Silo {silo}</span>
            {isAlert && <span style={{ fontSize: 9, background: C.accent + "22", color: C.accent, borderRadius: 5, padding: "1px 6px", fontWeight: 700, letterSpacing: "0.05em" }}>⚠ LLENO</span>}
          </div>
          <span style={{ fontSize: 15, fontFamily: FONT_MONO, fontWeight: 800, color: isEmpty ? C.danger : C.accent }}>
            {isEmpty ? "—" : litros >= 1000 ? `${(litros / 1000).toFixed(1)}k` : litros.toLocaleString("es-AR")}
            {!isEmpty && <span style={{ fontSize: 9, fontWeight: 400, color: C.sub, marginLeft: 2 }}>L</span>}
          </span>
        </div>
        {/* Bar */}
        <div style={{ background: C.muted, borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 7 }}>
          <div style={{
            width: `${Math.max(pct, isEmpty ? 0 : 1)}%`, height: "100%",
            background: isEmpty ? C.danger + "44" : `linear-gradient(90deg, ${statusColor}aa, ${statusColor})`,
            borderRadius: 8, transition: `width 0.6s ${EASE_OUT}`,
            boxShadow: pct > 5 ? `0 0 8px ${statusColor}44` : "none",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: isEmpty ? C.danger : C.sub, fontWeight: isEmpty ? 700 : 400 }}>
            {isEmpty ? "Sin contenido" : prod || "Sin producto"}
          </span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: FONT_MONO }}>
            {pct.toFixed(1)}% <span style={{ color: C.border }}>·</span> {(cap / 1000).toFixed(0)}k cap.
          </span>
        </div>
      </div>
    );
  };

  // ── Funciones de exportación ─────────────────────────────────
  const doExportCSV = async () => {
    setExporting(true);
    try {
      const days = getDaysInRange(exportFrom, exportTo);
      const multiDay = days.length > 1;
      const diffVal = (fca, tbo) => { const f = parseFloat(fca), t = parseFloat(tbo); return (!isNaN(f) && !isNaN(t)) ? (f - t).toFixed(3) : ""; };
      const rangeLabel = multiDay ? `${fmtDate(exportFrom)} al ${fmtDate(exportTo)}` : fmtDate(exportFrom);
      let csv = `YATASTO - INFORME - ${rangeLabel}\n\n`;
      csv += "INGRESOS\n";
      csv += `${multiDay ? "Fecha," : ""}Hora,Tambo,LitrosFca,LitrosTbo,ΔLitros,Destino,pH,Acidez,GBFca,GBTbo,ΔGB,SNGFca,SNGTbo,ΔSNG,DensFca,DensTbo,ΔDens,AguadoFca,AguadoTbo,ΔAguado,ProtFca,ProtTbo,ΔProt,AlcFca,AlcTbo,ΔAlc,Responsable\n`;
      for (const day of days) {
        const ing = await load(day, "ingresos", []);
        ing.forEach(i => {
          const prefix = multiDay ? `${fmtDate(day)},` : "";
          csv += `${prefix}${i.hora || ""},${i.tambo || ""},${i.litrosFca || ""},${i.litrosTbo || ""},${diffVal(i.litrosFca, i.litrosTbo)},${i.destino || ""},${i.phFca || ""},${i.acidezFca || ""},${i.gbFca || ""},${i.gbTbo || ""},${diffVal(i.gbFca, i.gbTbo)},${i.sngFca || ""},${i.sngTbo || ""},${diffVal(i.sngFca, i.sngTbo)},${i.densFca || ""},${i.densTbo || ""},${diffVal(i.densFca, i.densTbo)},${i.aguadoFca || ""},${i.aguadoTbo || ""},${diffVal(i.aguadoFca, i.aguadoTbo)},${i.protFca || ""},${i.protTbo || ""},${diffVal(i.protFca, i.protTbo)},${i.alcFca || ""},${i.alcTbo || ""},${diffVal(i.alcFca, i.alcTbo)},${i.responsable || ""}\n`;
        });
      }
      csv += "\nCARGAS\n";
      csv += `${multiDay ? "Fecha," : ""}Hora,Label,Destino,Transportista,Silo,Litros,pH,Temp,Responsable\n`;
      for (const day of days) {
        const cargas = await load(day, "carga", []);
        cargas.forEach(c => {
          const prefix = multiDay ? `${fmtDate(day)},` : "";
          csv += `${prefix}${c.hora || ""},${c.label || ""},${c.destino || ""},${c.transportista || ""},${c.siloProveniente || ""},${c.litros || ""},${c.pH || ""},${c.gC || ""},${c.responsable || ""}\n`;
        });
      }
      csv += "\nMOVIMIENTOS\n";
      csv += `${multiDay ? "Fecha," : ""}Hora,Desde,Hasta,Litros,Motivo,Responsable\n`;
      for (const day of days) {
        const movData = await load(day, "movimientos", { movs: [] });
        (movData.movs || []).forEach(m => {
          const prefix = multiDay ? `${fmtDate(day)},` : "";
          csv += `${prefix}${m.hora || ""},${m.desde || ""},${m.hasta || ""},${m.litros || ""},${m.motivo || ""},${m.resp || ""}\n`;
        });
      }
      const fname = multiDay ? `yatasto_${exportFrom}_${exportTo}.csv` : `yatasto_${exportFrom}.csv`;
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const doExportXLS = async () => {
    setExporting(true);
    try {
      const xlsDays = getDaysInRange(exportFrom, exportTo);
      const xlsMulti = xlsDays.length > 1;
      const allDayData = await Promise.all(xlsDays.map(async day => {
        const [ing, cargas, movData, stk, forts] = await Promise.all([
          load(day, "ingresos", []),
          load(day, "carga", []),
          load(day, "movimientos", { movs: [] }),
          load(day, "stock", {}),
          load(day, "fortificados", []),
        ]);
        const autoL = await calcAutoLitros(day);
        return { day, ing, cargas, movData, stk, forts, autoL };
      }));
      const { ing, cargas, movData, stk, forts, autoL } = allDayData[0];
      const exportDate = exportFrom;

      // ── KPIs ─────────────────────────────────────────────────
      const totIng   = ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
      const totCarg  = cargas.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
      const balance  = totIng - totCarg;
      const totCap   = STOCK_SILOS.reduce((s, k) => s + (SILO_CAP[k] || 0), 0);
      const totSilos = STOCK_SILOS.reduce((s, k) => s + (autoL[k] || 0), 0);
      const fillPct  = totCap > 0 ? (totSilos / totCap) * 100 : 0;
      const fmtN = n => Math.round(n).toLocaleString("es-AR");
      const fmtD = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;

      // ── Calidad promedio ──────────────────────────────────────
      const qAvg = key => {
        const vals = ing.map(i => parseFloat(i[key])).filter(v => !isNaN(v) && v > 0);
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      };

      // ── Timestamp ────────────────────────────────────────────
      const now = new Date();
      const ts  = now.toLocaleDateString("es-AR") + " " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

      // ── Donut SVG (silo utilization) ─────────────────────────
      const dpct  = Math.min(100, Math.max(0, fillPct));
      const dR    = 44, dSW = 10, dCX = 54, dCY = 54;
      const dCirc = 2 * Math.PI * dR;
      const dDash = (dCirc * dpct / 100).toFixed(2);
      const dColor = dpct > 88 ? "#ef4444" : dpct > 65 ? "#f59e0b" : "#10b981";
      const donutSVG = `<svg width="108" height="108" viewBox="0 0 108 108" style="display:block">
        <circle cx="${dCX}" cy="${dCY}" r="${dR}" fill="none" stroke="#e2e8f0" stroke-width="${dSW}"/>
        ${dpct > 0 ? `<circle cx="${dCX}" cy="${dCY}" r="${dR}" fill="none" stroke="${dColor}" stroke-width="${dSW}"
          stroke-dasharray="${dDash} ${dCirc.toFixed(2)}" stroke-linecap="round"
          transform="rotate(-90 ${dCX} ${dCY})"/>` : ""}
        <text x="${dCX}" y="${dCY - 2}" text-anchor="middle" font-size="17" font-weight="800"
          fill="#0f172a" font-family="'Consolas','Courier New',monospace">${fillPct.toFixed(1)}%</text>
        <text x="${dCX}" y="${dCY + 15}" text-anchor="middle" font-size="9" fill="#94a3b8"
          font-family="'Segoe UI',Arial,sans-serif" letter-spacing="0.08em">SILOS</text>
      </svg>`;

      // ── CSS ───────────────────────────────────────────────────
      const css = `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
          background: #eef2f7; color: #0f172a; font-size: 12px;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .page { max-width: 980px; margin: 0 auto; padding: 28px 22px 52px; }

        /* ── Cover ── */
        .cover {
          background: linear-gradient(135deg, #0c1a3a 0%, #1a3470 55%, #0d274f 100%);
          border-radius: 18px; padding: 38px 44px 32px; margin-bottom: 22px;
          position: relative; overflow: hidden;
        }
        .cover::after {
          content: ""; position: absolute; right: -60px; top: -60px;
          width: 260px; height: 260px; border-radius: 50%;
          background: rgba(255,255,255,0.025); pointer-events: none;
        }
        .cover-inner { display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
        .brand { line-height: 1; }
        .brand-name {
          font-size: 46px; font-weight: 900; color: #f0a500;
          letter-spacing: 0.14em; font-family: 'Arial Black', 'Segoe UI Black', Arial, sans-serif;
        }
        .brand-tagline { font-size: 9px; color: #5a7aaa; letter-spacing: 0.32em; font-style: italic; margin-top: 7px; }
        .cover-right { text-align: right; }
        .cover-date { font-size: 24px; font-weight: 700; color: #fff; letter-spacing: 0.02em; }
        .cover-doc  { font-size: 11px; color: #7a9acc; margin-top: 6px; letter-spacing: 0.06em; text-transform: uppercase; }
        .cover-user { font-size: 11px; color: #5a7aaa; margin-top: 4px; }
        .cover-sep  { height: 1px; background: rgba(255,255,255,0.1); margin: 26px 0 18px; position: relative; }
        .cover-meta { display: flex; gap: 28px; font-size: 10px; color: #4a6a8a; }
        .cover-meta span b { color: #7a9acc; }

        /* ── KPI Grid ── */
        .kpi-grid { display: flex; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
        .kpi-card {
          flex: 1; min-width: 130px; background: #fff; border-radius: 14px;
          padding: 22px 20px 18px; position: relative; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .kpi-card::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--kpi-color, #3b82f6); border-radius: 14px 14px 0 0;
        }
        .kpi-label {
          font-size: 9px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 12px;
        }
        .kpi-number {
          font-size: 32px; font-weight: 800; line-height: 1; color: #0f172a;
          font-family: 'Cascadia Code','Fira Code','Consolas','Courier New',monospace;
        }
        .kpi-number.accent { color: var(--kpi-color, #3b82f6); }
        .kpi-unit  { font-size: 14px; font-weight: 500; color: #94a3b8; margin-left: 3px; }
        .kpi-sub   { font-size: 11px; color: #64748b; margin-top: 9px; }

        /* ── Section header ── */
        .sec-head {
          display: flex; align-items: center; gap: 12px; margin: 30px 0 14px;
        }
        .sec-head-title {
          font-size: 11px; font-weight: 800; color: #0c1a3a;
          text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap;
        }
        .sec-head-line { flex: 1; height: 1px; background: #e2e8f0; }
        .sec-head-pill {
          font-size: 9px; font-weight: 700; color: #3b82f6;
          background: #eff6ff; border-radius: 20px; padding: 3px 11px; white-space: nowrap;
        }

        /* ── Quality strip ── */
        .qual-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
        .qual-card {
          flex: 1; min-width: 105px; background: #fff; border-radius: 12px;
          padding: 16px 16px 13px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .qual-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
        .qual-name { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; }
        .qual-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .qual-val  {
          font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;
          font-family: 'Cascadia Code','Consolas','Courier New',monospace;
        }
        .qual-unit { font-size: 12px; font-weight: 400; color: #94a3b8; }
        .qual-ref  { font-size: 8px; color: #cbd5e1; margin-top: 6px; }

        /* ── Silo chart card ── */
        .silo-card {
          background: #fff; border-radius: 14px; padding: 22px 26px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05);
          margin-bottom: 22px;
        }
        .silo-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .silo-card-title { font-size: 13px; font-weight: 800; color: #0c1a3a; }
        .silo-card-sub   { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .silo-list { display: flex; flex-direction: column; gap: 14px; }
        .silo-item { }
        .silo-item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
        .silo-item-left { display: flex; align-items: center; gap: 9px; }
        .silo-item-name { font-size: 12px; font-weight: 700; color: #0f172a; }
        .silo-item-prod { font-size: 9px; background: #f1f5f9; color: #64748b; border-radius: 5px; padding: 2px 8px; }
        .silo-item-stat {
          font-size: 12px; font-weight: 700; color: #0f172a;
          font-family: 'Cascadia Code','Consolas','Courier New',monospace;
        }
        .bar-track { background: #f1f5f9; border-radius: 100px; height: 9px; overflow: hidden; }
        .bar-fill  { height: 100%; border-radius: 100px; transition: width 0.4s; }

        /* ── Tables ── */
        .table-card {
          background: #fff; border-radius: 14px; overflow: hidden; margin-bottom: 22px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .table-card-head {
          padding: 18px 22px 14px; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .table-card-title { font-size: 13px; font-weight: 700; color: #0c1a3a; }
        .table-card-badge {
          font-size: 9px; font-weight: 700; color: #3b82f6;
          background: #eff6ff; border-radius: 20px; padding: 3px 11px;
        }
        table { width: 100%; border-collapse: collapse; }
        thead tr { border-bottom: 1.5px solid #e2e8f0; }
        th {
          padding: 11px 16px; font-size: 9px; font-weight: 700;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;
          text-align: left; background: transparent; white-space: nowrap;
        }
        th.r { text-align: right; }
        td {
          padding: 12px 16px; font-size: 11px; color: #0f172a;
          border-bottom: 1px solid #f8fafc; vertical-align: middle;
        }
        td.r { text-align: right; font-family: 'Cascadia Code','Consolas','Courier New',monospace; font-size: 12px; }
        tbody tr:last-child td { border-bottom: none; }
        .td-muted { color: #94a3b8; }
        .td-mono  { font-family: 'Cascadia Code','Consolas','Courier New',monospace; }
        .td-bold  { font-weight: 700; }

        /* Total row */
        .total-row td { background: #fafbff; border-top: 1.5px solid #e2e8f0; font-weight: 700; border-bottom: none; }
        .total-row .r { color: #1e40af; font-size: 13px; }

        /* Badges */
        .badge {
          display: inline-block; border-radius: 6px; padding: 2px 8px;
          font-size: 9px; font-weight: 700; white-space: nowrap;
        }
        .ok   { background: #dcfce7; color: #15803d; }
        .warn { background: #fef9c3; color: #92400e; }
        .err  { background: #fee2e2; color: #b91c1c; }
        .neu  { background: #f1f5f9; color: #475569; }

        /* ── Footer ── */
        .footer {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 18px; border-top: 1px solid #e2e8f0; margin-top: 10px;
          font-size: 9px; color: #94a3b8;
        }
        .footer-brand { font-weight: 700; color: #64748b; font-size: 10px; }
      `;

      // ── COVER ─────────────────────────────────────────────────
      let H = `
        <div class="cover">
          <div class="cover-inner">
            <div class="brand">
              <div class="brand-name">YATASTO</div>
              <div class="brand-tagline">lácteos · buena leche</div>
            </div>
            <div class="cover-right">
              <div class="cover-date">${fmtDate(exportDate)}</div>
              <div class="cover-doc">Informe Ejecutivo de Producción</div>
              ${perfilLabel ? `<div class="cover-user">Operador: ${perfilLabel}</div>` : ""}
            </div>
          </div>
          <div class="cover-sep"></div>
          <div class="cover-meta">
            <span><b>${ing.length}</b> camiones ingresados</span>
            <span><b>${cargas.length}</b> cargas despachadas</span>
            <span><b>${STOCK_SILOS.length}</b> silos monitoreados</span>
            <span>Generado: <b>${ts}</b></span>
          </div>
        </div>
      `;

      // ── KPI CARDS ─────────────────────────────────────────────
      const balColor = balance >= 0 ? "#10b981" : "#ef4444";
      const ocpColor = fillPct > 88 ? "#ef4444" : fillPct > 65 ? "#f59e0b" : "#10b981";
      H += `
        <div class="kpi-grid">
          <div class="kpi-card" style="--kpi-color:#f59e0b">
            <div class="kpi-label">Litros Ingresados</div>
            <div class="kpi-number accent">${fmtD(totIng)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${fmtN(totIng)} litros totales</div>
          </div>
          <div class="kpi-card" style="--kpi-color:#3b82f6">
            <div class="kpi-label">Litros Despachados</div>
            <div class="kpi-number accent">${fmtD(totCarg)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${cargas.length} carga${cargas.length !== 1 ? "s" : ""}</div>
          </div>
          <div class="kpi-card" style="--kpi-color:${balColor}">
            <div class="kpi-label">Balance del Día</div>
            <div class="kpi-number accent">${balance >= 0 ? "+" : ""}${fmtD(balance)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${balance >= 0 ? "Superávit operativo" : "Déficit operativo"}</div>
          </div>
          <div class="kpi-card" style="--kpi-color:#6366f1">
            <div class="kpi-label">Camiones</div>
            <div class="kpi-number accent">${ing.length}</div>
            <div class="kpi-sub">${new Set(ing.map(i => i.tambo).filter(Boolean)).size} tambos distintos</div>
          </div>
          <div class="kpi-card" style="--kpi-color:#8b5cf6">
            <div class="kpi-label">Calidad — pH Promedio</div>
            <div class="kpi-number accent">${qAvg("phFca") != null ? qAvg("phFca").toFixed(2) : "—"}</div>
            <div class="kpi-sub">Acidez: ${qAvg("acidezFca") != null ? qAvg("acidezFca").toFixed(1) + " °D" : "—"}</div>
          </div>
          <div class="kpi-card" style="--kpi-color:${ocpColor}">
            <div class="kpi-label">Ocupación Silos</div>
            <div class="kpi-number accent">${fillPct.toFixed(1)}<span class="kpi-unit">%</span></div>
            <div class="kpi-sub">${fmtD(totSilos)} L de ${fmtD(totCap)} L cap.</div>
          </div>
        </div>
      `;

      // ── CALIDAD DEL DÍA ───────────────────────────────────────
      const qualDefs = [
        { key: "phFca",     label: "pH",          unit: "",    dec: 2, min: 6.6,  max: 6.8 },
        { key: "acidezFca", label: "Acidez",       unit: "°D",  dec: 1, min: 14,   max: 18 },
        { key: "gbFca",     label: "Grasa",        unit: "%",   dec: 2, min: 3.0,  max: null },
        { key: "sngFca",    label: "SNG",          unit: "%",   dec: 2, min: 8.2,  max: null },
        { key: "densFca",   label: "Densidad",     unit: "",    dec: 3, min: 1.028, max: 1.034 },
        { key: "protFca",   label: "Proteína",     unit: "%",   dec: 2, min: 2.9,  max: null },
        { key: "tC",        label: "Temperatura",  unit: "°C",  dec: 1, min: null, max: 6 },
        { key: "aguadoFca", label: "Aguado",       unit: "",    dec: 3, min: null, max: 0 },
      ];
      if (ing.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-head-title">Calidad Promedio</span>
            <div class="sec-head-line"></div>
            <span class="sec-head-pill">${ing.length} muestras</span>
          </div>
          <div class="qual-strip">
        `;
        qualDefs.forEach(({ key, label, unit, dec, min, max }) => {
          const v = qAvg(key);
          if (v == null) return;
          const inRange = (min == null || v >= min) && (max == null || v <= max);
          const dotColor = inRange ? "#10b981" : (key === "aguadoFca" ? "#ef4444" : "#f59e0b");
          const rangeStr = min != null && max != null ? `${min} – ${max}${unit}`
            : min != null ? `≥ ${min}${unit}`
            : max != null ? `≤ ${max}${unit}` : "";
          H += `<div class="qual-card">
            <div class="qual-top">
              <span class="qual-name">${label}</span>
              <span class="qual-dot" style="background:${dotColor}"></span>
            </div>
            <div class="qual-val">${v.toFixed(dec)}<span class="qual-unit">${unit ? " " + unit : ""}</span></div>
            ${rangeStr ? `<div class="qual-ref">ref ${rangeStr}</div>` : ""}
          </div>`;
        });
        H += `</div>`;
      }

      // ── ESTADO DE SILOS (visual, no tabla) ───────────────────
      H += `
        <div class="sec-head">
          <span class="sec-head-title">Estado de Silos</span>
          <div class="sec-head-line"></div>
          <span class="sec-head-pill">${fillPct.toFixed(1)}% ocupado</span>
        </div>
        <div class="silo-card">
          <div class="silo-card-head">
            <div>
              <div class="silo-card-title">Distribución de Volumen</div>
              <div class="silo-card-sub">${fmtN(totSilos)} L en ${STOCK_SILOS.length} silos · cap. total ${fmtN(totCap)} L</div>
            </div>
            ${donutSVG}
          </div>
          <div class="silo-list">
      `;
      STOCK_SILOS.forEach(silo => {
        const litros = autoL[silo] || 0;
        const cap    = SILO_CAP[silo] || 10000;
        const pct    = cap > 0 ? (litros / cap) * 100 : 0;
        let prod = "";
        for (const t of TURNOS) { const p = (((stk[t] || {}).silos || {})[silo] || {}).producto; if (p) { prod = p; break; } }
        const barColor = pct === 0 ? "#e2e8f0" : pct > 88 ? "#ef4444" : pct > 65 ? "#f59e0b" : "#10b981";
        const barGrad  = pct === 0 ? "#e2e8f0"
          : pct > 88 ? "linear-gradient(90deg,#f87171,#ef4444)"
          : pct > 65 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
          : "linear-gradient(90deg,#34d399,#10b981)";
        const statText = litros > 0 ? `${fmtN(litros)} L · ${pct.toFixed(1)}%` : "Vacío";
        H += `<div class="silo-item">
          <div class="silo-item-head">
            <div class="silo-item-left">
              <span class="silo-item-name">Silo ${silo}</span>
              ${prod ? `<span class="silo-item-prod">${prod}</span>` : ""}
            </div>
            <span class="silo-item-stat" style="color:${barColor}">${statText}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(100, Math.max(litros > 0 ? 1 : 0, pct))}%;background:${barGrad}"></div>
          </div>
        </div>`;
      });
      H += `</div></div>`;

      // ── INGRESOS ──────────────────────────────────────────────
      H += `
        <div class="sec-head">
          <span class="sec-head-title">Ingresos de Leche</span>
          <div class="sec-head-line"></div>
          <span class="sec-head-pill">${ing.length} registros</span>
        </div>
        <div class="table-card">
          <div class="table-card-head">
            <span class="table-card-title">Detalle por Camión</span>
            <span class="table-card-badge">Total: ${fmtN(totIng)} L</span>
          </div>
          <table><thead><tr>
            ${xlsMulti ? `<th>Fecha</th>` : ""}<th>Hora</th><th>Tambo</th><th class="r">Litros Fca</th><th class="r">Litros Tbo</th><th class="r">ΔLitros</th>
            <th>Destino</th><th class="r">pH</th><th class="r">Acidez</th>
            <th class="r">GBFca</th><th class="r">GBTbo</th><th class="r">ΔGB</th>
            <th class="r">SNGFca</th><th class="r">SNGTbo</th><th class="r">ΔSNG</th>
            <th class="r">DensFca</th><th class="r">DensTbo</th><th class="r">ΔDens</th>
            <th class="r">AguFca</th><th class="r">AguTbo</th><th class="r">ΔAgu</th>
            <th class="r">ProtFca</th><th class="r">ProtTbo</th><th class="r">ΔProt</th>
            <th>Responsable</th>
          </tr></thead><tbody>
      `;
      const xlsDiffVal = (fca, tbo) => { const f = parseFloat(fca), t = parseFloat(tbo); return (!isNaN(f) && !isNaN(t)) ? (f - t).toFixed(3) : "—"; };
      const xlsIngRows = xlsMulti ? allDayData.flatMap(dd => dd.ing.map(i => ({ ...i, _day: dd.day }))) : ing.map(i => ({ ...i, _day: exportDate }));
      if (xlsIngRows.length === 0) {
        H += `<tr><td colspan="${xlsMulti ? 25 : 24}" style="text-align:center;color:#94a3b8;padding:24px">Sin ingresos registrados para este período</td></tr>`;
      } else {
        xlsIngRows.forEach(i => {
          const lFca = parseFloat(i.litrosFca) || 0;
          const lTbo = parseFloat(i.litrosTbo) || 0;
          const difL = lFca - lTbo;
          const agu  = parseFloat(i.aguadoFca);
          const aguHTML = isNaN(agu) || agu === 0
            ? `<span class="badge ok">0.000</span>`
            : `<span class="badge err">${agu.toFixed(3)} ⚠</span>`;
          const difHTML = Math.abs(difL) > 150 ? ` <span class="badge warn">Δ${fmtN(Math.round(Math.abs(difL)))}L</span>` : "";
          H += `<tr>
            ${xlsMulti ? `<td class="td-muted">${fmtDate(i._day)}</td>` : ""}
            <td class="td-mono">${i.hora || "—"}</td>
            <td class="td-bold">${i.tambo || "—"}</td>
            <td class="r td-bold">${lFca ? fmtN(lFca) : "—"}${difHTML}</td>
            <td class="r td-muted">${lTbo ? fmtN(lTbo) : "—"}</td>
            <td class="r">${xlsDiffVal(i.litrosFca, i.litrosTbo)}</td>
            <td>${i.destino || "—"}</td>
            <td class="r">${i.phFca || "—"}</td>
            <td class="r">${i.acidezFca || "—"}</td>
            <td class="r">${i.gbFca || "—"}</td>
            <td class="r">${i.gbTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.gbFca, i.gbTbo)}</td>
            <td class="r">${i.sngFca || "—"}</td>
            <td class="r">${i.sngTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.sngFca, i.sngTbo)}</td>
            <td class="r">${i.densFca || "—"}</td>
            <td class="r">${i.densTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.densFca, i.densTbo)}</td>
            <td class="r">${aguHTML}</td>
            <td class="r">${i.aguadoTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.aguadoFca, i.aguadoTbo)}</td>
            <td class="r">${i.protFca || "—"}</td>
            <td class="r">${i.protTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.protFca, i.protTbo)}</td>
            <td class="td-muted">${i.responsable || "—"}</td>
          </tr>`;
        });
        const tFca = xlsIngRows.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
        const tTbo = xlsIngRows.reduce((s, i) => s + (parseFloat(i.litrosTbo) || 0), 0);
        H += `<tr class="total-row">
          ${xlsMulti ? "<td></td>" : ""}<td></td><td class="td-bold">TOTAL</td>
          <td class="r">${fmtN(tFca)} L</td>
          <td class="r">${fmtN(tTbo)} L</td>
          <td colspan="20"></td>
        </tr>`;
      }
      H += `</tbody></table></div>`;

      // ── CARGAS ────────────────────────────────────────────────
      const xlsCargRows = xlsMulti ? allDayData.flatMap(dd => dd.cargas.map(c => ({ ...c, _day: dd.day }))) : cargas.map(c => ({ ...c, _day: exportDate }));
      H += `
        <div class="sec-head">
          <span class="sec-head-title">Cargas Despachadas</span>
          <div class="sec-head-line"></div>
          <span class="sec-head-pill">${xlsCargRows.length} registros</span>
        </div>
        <div class="table-card">
          <div class="table-card-head">
            <span class="table-card-title">Detalle de Despachos</span>
            <span class="table-card-badge">Total: ${fmtN(xlsCargRows.reduce((s,c)=>s+(parseFloat(c.litros)||0),0))} L</span>
          </div>
          <table><thead><tr>
            ${xlsMulti ? `<th>Fecha</th>` : ""}<th>Hora</th><th>Denominación</th><th>Destino</th><th>Transportista</th>
            <th>Silo Origen</th><th class="r">Litros</th><th class="r">pH</th><th class="r">Temp°C</th><th>Responsable</th>
          </tr></thead><tbody>
      `;
      if (xlsCargRows.length === 0) {
        H += `<tr><td colspan="${xlsMulti ? 10 : 9}" style="text-align:center;color:#94a3b8;padding:24px">Sin cargas registradas para este período</td></tr>`;
      } else {
        xlsCargRows.forEach(c => {
          H += `<tr>
            ${xlsMulti ? `<td class="td-muted">${fmtDate(c._day)}</td>` : ""}
            <td class="td-mono">${c.hora || "—"}</td>
            <td class="td-bold">${c.label || "—"}</td>
            <td>${c.destino || "—"}</td>
            <td>${c.transportista || "—"}</td>
            <td>${c.siloProveniente || "—"}</td>
            <td class="r td-bold">${c.litros ? fmtN(parseFloat(c.litros)) : "—"}</td>
            <td class="r">${c.pH || "—"}</td>
            <td class="r">${c.gC || "—"}</td>
            <td class="td-muted">${c.responsable || "—"}</td>
          </tr>`;
        });
        const tC = xlsCargRows.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
        H += `<tr class="total-row">
          ${xlsMulti ? "<td></td>" : ""}<td></td><td class="td-bold">TOTAL</td><td></td><td></td><td></td>
          <td class="r">${fmtN(tC)} L</td><td colspan="3"></td>
        </tr>`;
      }
      H += `</tbody></table></div>`;

      // ── MOVIMIENTOS (si hay) ──────────────────────────────────
      const xlsMovRows = xlsMulti ? allDayData.flatMap(dd => (dd.movData.movs||[]).map(m => ({ ...m, _day: dd.day }))) : (movData.movs||[]).map(m => ({ ...m, _day: exportDate }));
      if (xlsMovRows.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-head-title">Movimientos entre Silos</span>
            <div class="sec-head-line"></div>
            <span class="sec-head-pill">${xlsMovRows.length} registros</span>
          </div>
          <div class="table-card">
            <div class="table-card-head">
              <span class="table-card-title">Transferencias internas</span>
            </div>
            <table><thead><tr>
              ${xlsMulti ? `<th>Fecha</th>` : ""}<th>Hora</th><th>Desde</th><th>Hasta</th><th class="r">Litros</th><th>Motivo</th><th>Responsable</th>
            </tr></thead><tbody>
        `;
        xlsMovRows.forEach(m => {
          H += `<tr>
            ${xlsMulti ? `<td class="td-muted">${fmtDate(m._day)}</td>` : ""}
            <td class="td-mono">${m.hora || "—"}</td>
            <td>${m.desde || "—"}</td><td>${m.hasta || "—"}</td>
            <td class="r td-bold">${m.litros ? fmtN(parseFloat(m.litros)) : "—"}</td>
            <td>${m.motivo || "—"}</td>
            <td class="td-muted">${m.resp || "—"}</td>
          </tr>`;
        });
        H += `</tbody></table></div>`;
      }

      // ── FORTIFICADOS (si hay) ─────────────────────────────────
      const xlsFortRows = xlsMulti ? allDayData.flatMap(dd => dd.forts.map(f => ({ ...f, _day: dd.day }))) : forts.map(f => ({ ...f, _day: exportDate }));
      if (xlsFortRows.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-head-title">Lotes Fortificados</span>
            <div class="sec-head-line"></div>
            <span class="sec-head-pill">${xlsFortRows.length} lotes</span>
          </div>
          <div class="table-card">
            <div class="table-card-head">
              <span class="table-card-title">Producción Especial</span>
            </div>
            <table><thead><tr>
              ${xlsMulti ? `<th>Fecha</th>` : ""}<th>Hora</th><th>Lote</th><th>Producto</th><th class="r">Litros</th>
              <th>Tanque</th><th>Adiciones</th><th>Responsable</th>
            </tr></thead><tbody>
        `;
        xlsFortRows.forEach(f => {
          const adic = (f.adiciones || []).map(a => `${a.producto} ${a.cantidad}${a.unidad}`).join(" · ") || "—";
          H += `<tr>
            ${xlsMulti ? `<td class="td-muted">${fmtDate(f._day)}</td>` : ""}
            <td class="td-mono">${f.hora || "—"}</td>
            <td class="td-bold">${f.lote || "—"}</td>
            <td>${f.producto || "—"}</td>
            <td class="r">${f.litros ? fmtN(parseFloat(f.litros)) : "—"}</td>
            <td>${f.tanque || "—"}</td>
            <td style="font-size:10px;color:#64748b">${adic}</td>
            <td class="td-muted">${f.responsable || "—"}</td>
          </tr>`;
        });
        H += `</tbody></table></div>`;
      }

      // ── FOOTER ────────────────────────────────────────────────
      const xlsRangeLabel = xlsMulti ? `${fmtDate(exportFrom)} al ${fmtDate(exportTo)}` : fmtDate(exportDate);
      H += `
        <div class="footer">
          <span class="footer-brand">Lacteos Yatasto SA · Sistema de Gestión v2.0</span>
          <span>Generado: ${ts} &nbsp;·&nbsp; Período: ${xlsRangeLabel}</span>
        </div>
      `;

      // ── Ensamblar y descargar ─────────────────────────────────
      const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8">
        <xml><x:ExcelWorkbook><x:ExcelWorksheets>
          <x:ExcelWorksheet><x:Name>Informe Yatasto</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
        <style>${css}</style></head>
        <body><div class="page">${H}</div></body></html>`;

      const blob = new Blob([full], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = xlsMulti ? `yatasto_informe_${exportFrom}_${exportTo}.xls` : `yatasto_informe_${exportDate}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };


  const doExportPDF = async () => {
    setExporting(true);
    try {
      const exportDate = exportFrom;
      const [ing, cargas, movData, stk, forts] = await Promise.all([
        load(exportDate, "ingresos", []),
        load(exportDate, "carga", []),
        load(exportDate, "movimientos", { movs: [] }),
        load(exportDate, "stock", {}),
        load(exportDate, "fortificados", []),
      ]);
      const autoL = await calcAutoLitros(exportDate);

      // ── KPIs ─────────────────────────────────────────────────
      const totIng   = ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
      const totCarg  = cargas.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
      const balance  = totIng - totCarg;
      const totCap   = STOCK_SILOS.reduce((s, k) => s + (SILO_CAP[k] || 0), 0);
      const totSilos = STOCK_SILOS.reduce((s, k) => s + (autoL[k] || 0), 0);
      const fillPct  = totCap > 0 ? (totSilos / totCap) * 100 : 0;
      const fmtN  = n => Math.round(n).toLocaleString("es-AR");
      const fmtD  = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`;
      const qAvg  = key => {
        const vals = ing.map(i => parseFloat(i[key])).filter(v => !isNaN(v) && v > 0);
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      };
      const now = new Date();
      const ts  = now.toLocaleDateString("es-AR") + " " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

      // ── Donut SVG ─────────────────────────────────────────────
      const dpct  = Math.min(100, Math.max(0, fillPct));
      const dR = 44, dSW = 10, dCX = 54, dCY = 54;
      const dCirc = 2 * Math.PI * dR;
      const dDash = (dCirc * dpct / 100).toFixed(2);
      const dColor = dpct > 88 ? "#ef4444" : dpct > 65 ? "#f59e0b" : "#10b981";
      const donutSVG = `<svg width="108" height="108" viewBox="0 0 108 108" style="display:block;flex-shrink:0">
        <circle cx="${dCX}" cy="${dCY}" r="${dR}" fill="none" stroke="#e8ecf3" stroke-width="${dSW}"/>
        ${dpct > 0 ? `<circle cx="${dCX}" cy="${dCY}" r="${dR}" fill="none" stroke="${dColor}" stroke-width="${dSW}"
          stroke-dasharray="${dDash} ${dCirc.toFixed(2)}" stroke-linecap="round"
          transform="rotate(-90 ${dCX} ${dCY})"/>` : ""}
        <text x="${dCX}" y="${dCY - 2}" text-anchor="middle" font-size="17" font-weight="800"
          fill="#0f172a" font-family="'Consolas','Courier New',monospace">${fillPct.toFixed(1)}%</text>
        <text x="${dCX}" y="${dCY + 15}" text-anchor="middle" font-size="9" fill="#94a3b8"
          font-family="'Segoe UI',Arial,sans-serif" letter-spacing="1">SILOS</text>
      </svg>`;

      // ── Alertas de calidad ────────────────────────────────────
      const alertas = [];
      STOCK_SILOS.forEach(s => {
        const l = autoL[s] || 0, cap = SILO_CAP[s] || 10000;
        if (l > 0 && (l / cap) * 100 > 90) alertas.push({ tipo: "warn", msg: `Silo ${s} al ${((l/cap)*100).toFixed(0)}% — casi lleno` });
        if (l < 0) alertas.push({ tipo: "err", msg: `Silo ${s}: balance negativo (${fmtN(l)} L)` });
      });
      ing.filter(i => parseFloat(i.aguadoFca) > 0).forEach(i =>
        alertas.push({ tipo: "err", msg: `AGUADO — ${i.tambo || "?"}: ${parseFloat(i.aguadoFca).toFixed(3)}` })
      );
      ing.filter(i => Math.abs((parseFloat(i.litrosFca)||0)-(parseFloat(i.litrosTbo)||0)) > 150).forEach(i =>
        alertas.push({ tipo: "warn", msg: `Diferencia Tbo/Fca > 150L — ${i.tambo || "?"}` })
      );

      // ── CSS ───────────────────────────────────────────────────
      const css = `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
          background: #eef2f7; color: #0f172a; font-size: 12px;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }

        /* ── Print bar ── */
        .print-bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(12,26,58,0.97); backdrop-filter: blur(8px);
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .print-bar-brand { font-size: 14px; font-weight: 800; color: #f0a500; letter-spacing: 0.12em; }
        .print-bar-sub   { font-size: 10px; color: #5a7aaa; margin-left: 10px; }
        .print-btn {
          background: #f0a500; color: #0c1a3a; border: none; border-radius: 8px;
          padding: 9px 22px; font-size: 12px; font-weight: 800; cursor: pointer;
          letter-spacing: 0.04em; transition: background 0.15s;
        }
        .print-btn:hover { background: #f5b830; }

        /* ── Page ── */
        .page { max-width: 980px; margin: 0 auto; padding: 80px 22px 52px; }

        /* ── Cover ── */
        .cover {
          background: linear-gradient(135deg, #0c1a3a 0%, #1a3470 55%, #0d274f 100%);
          border-radius: 18px; padding: 38px 44px 32px; margin-bottom: 22px;
          position: relative; overflow: hidden;
        }
        .cover::after {
          content: ""; position: absolute; right: -70px; top: -70px;
          width: 280px; height: 280px; border-radius: 50%;
          background: rgba(255,255,255,0.025); pointer-events: none;
        }
        .cover-inner { display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
        .brand-name {
          font-size: 46px; font-weight: 900; color: #f0a500;
          letter-spacing: 0.14em; font-family: 'Arial Black','Segoe UI Black',Arial,sans-serif; line-height: 1;
        }
        .brand-tagline { font-size: 9px; color: #4a6a8a; letter-spacing: 0.32em; font-style: italic; margin-top: 7px; }
        .cover-right  { text-align: right; }
        .cover-date   { font-size: 24px; font-weight: 700; color: #fff; }
        .cover-doc    { font-size: 11px; color: #7a9acc; margin-top: 6px; letter-spacing: 0.06em; text-transform: uppercase; }
        .cover-user   { font-size: 11px; color: #4a6a8a; margin-top: 4px; }
        .cover-sep    { height: 1px; background: rgba(255,255,255,0.1); margin: 26px 0 18px; }
        .cover-meta   { display: flex; gap: 28px; font-size: 10px; color: #4a6a8a; }
        .cover-meta b { color: #7a9acc; }

        /* ── Alerts ── */
        .alerts { display: flex; flex-direction: column; gap: 7px; margin-bottom: 22px; }
        .alert {
          display: flex; align-items: center; gap: 11px;
          border-radius: 10px; padding: 11px 16px; font-size: 11px; font-weight: 600;
        }
        .alert-err  { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .alert-warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .alert-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* ── KPI Grid ── */
        .kpi-grid { display: flex; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
        .kpi-card {
          flex: 1; min-width: 130px; background: #fff; border-radius: 14px;
          padding: 22px 20px 18px; position: relative; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .kpi-card::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--kc, #3b82f6); border-radius: 14px 14px 0 0;
        }
        .kpi-label  { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 12px; }
        .kpi-number { font-size: 32px; font-weight: 800; line-height: 1; color: var(--kc, #0f172a); font-family: 'Cascadia Code','Consolas','Courier New',monospace; }
        .kpi-unit   { font-size: 14px; font-weight: 500; color: #94a3b8; margin-left: 3px; }
        .kpi-sub    { font-size: 11px; color: #64748b; margin-top: 9px; }

        /* ── Section header ── */
        .sec-head { display: flex; align-items: center; gap: 12px; margin: 30px 0 14px; }
        .sec-title { font-size: 11px; font-weight: 800; color: #0c1a3a; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
        .sec-line  { flex: 1; height: 1px; background: #e2e8f0; }
        .sec-pill  { font-size: 9px; font-weight: 700; color: #3b82f6; background: #eff6ff; border-radius: 20px; padding: 3px 11px; white-space: nowrap; }

        /* ── Quality strip ── */
        .qual-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
        .qual-card  {
          flex: 1; min-width: 105px; background: #fff; border-radius: 12px; padding: 16px 16px 13px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .qual-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
        .qual-name { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; }
        .qual-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .qual-val  { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1; font-family: 'Cascadia Code','Consolas','Courier New',monospace; }
        .qual-unit { font-size: 12px; font-weight: 400; color: #94a3b8; }
        .qual-ref  { font-size: 8px; color: #cbd5e1; margin-top: 6px; }

        /* ── Silo chart ── */
        .silo-card {
          background: #fff; border-radius: 14px; padding: 22px 26px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05); margin-bottom: 22px;
        }
        .silo-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .silo-card-title { font-size: 13px; font-weight: 800; color: #0c1a3a; }
        .silo-card-sub   { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .silo-list { display: flex; flex-direction: column; gap: 14px; }
        .silo-row  { }
        .silo-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
        .silo-left { display: flex; align-items: center; gap: 9px; }
        .silo-name { font-size: 12px; font-weight: 700; color: #0f172a; }
        .silo-prod { font-size: 9px; background: #f1f5f9; color: #64748b; border-radius: 5px; padding: 2px 8px; }
        .silo-stat { font-size: 12px; font-weight: 700; font-family: 'Cascadia Code','Consolas','Courier New',monospace; }
        .bar-track { background: #f1f5f9; border-radius: 100px; height: 9px; overflow: hidden; }
        .bar-fill  { height: 100%; border-radius: 100px; }

        /* ── Tables ── */
        .table-card {
          background: #fff; border-radius: 14px; overflow: hidden; margin-bottom: 22px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05);
        }
        .table-head {
          padding: 18px 22px 14px; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .table-title { font-size: 13px; font-weight: 700; color: #0c1a3a; }
        .table-badge { font-size: 9px; font-weight: 700; color: #3b82f6; background: #eff6ff; border-radius: 20px; padding: 3px 11px; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { border-bottom: 1.5px solid #e2e8f0; }
        th {
          padding: 11px 16px; font-size: 9px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.1em; text-align: left; white-space: nowrap;
        }
        th.r { text-align: right; }
        td { padding: 12px 16px; font-size: 11px; color: #0f172a; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        td.r { text-align: right; font-family: 'Cascadia Code','Consolas','Courier New',monospace; font-size: 12px; }
        tbody tr:last-child td { border-bottom: none; }
        .mn { font-family: 'Cascadia Code','Consolas','Courier New',monospace; }
        .mu { color: #94a3b8; }
        .mb { font-weight: 700; }
        .total-row td { background: #fafbff; border-top: 1.5px solid #e2e8f0; font-weight: 700; border-bottom: none; }
        .total-row .r { color: #1e40af; font-size: 13px; }
        .badge { display: inline-block; border-radius: 6px; padding: 2px 8px; font-size: 9px; font-weight: 700; white-space: nowrap; }
        .ok   { background: #dcfce7; color: #15803d; }
        .warn { background: #fef9c3; color: #92400e; }
        .err  { background: #fee2e2; color: #b91c1c; }

        /* ── Footer ── */
        .footer { display: flex; justify-content: space-between; align-items: center; padding-top: 18px; border-top: 1px solid #e2e8f0; margin-top: 10px; font-size: 9px; color: #94a3b8; }
        .footer-brand { font-weight: 700; color: #64748b; font-size: 10px; }

        /* ── Print overrides ── */
        @media print {
          body { background: #fff !important; }
          .print-bar { display: none !important; }
          .page { padding-top: 24px !important; }
          .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .kpi-card, .qual-card, .silo-card, .table-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          .kpi-card::before { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sec-head { page-break-after: avoid; }
          .table-card { page-break-inside: avoid; }
          .silo-card  { page-break-inside: avoid; }
        }
        @page { margin: 15mm 12mm; }
      `;

      // ── COVER ─────────────────────────────────────────────────
      let H = `
        <div class="cover">
          <div class="cover-inner">
            <div>
              <div class="brand-name">YATASTO</div>
              <div class="brand-tagline">lácteos · buena leche</div>
            </div>
            <div class="cover-right">
              <div class="cover-date">${fmtDate(exportDate)}</div>
              <div class="cover-doc">Informe Ejecutivo de Producción</div>
              ${perfilLabel ? `<div class="cover-user">Operador: ${perfilLabel}</div>` : ""}
            </div>
          </div>
          <div class="cover-sep"></div>
          <div class="cover-meta">
            <span><b>${ing.length}</b> camiones ingresados</span>
            <span><b>${cargas.length}</b> cargas despachadas</span>
            <span><b>${STOCK_SILOS.length}</b> silos monitoreados</span>
            <span>Generado: <b>${ts}</b></span>
          </div>
        </div>
      `;

      // ── ALERTAS ───────────────────────────────────────────────
      if (alertas.length > 0) {
        H += `<div class="alerts">`;
        alertas.forEach(a => {
          const isErr = a.tipo === "err";
          H += `<div class="alert ${isErr ? "alert-err" : "alert-warn"}">
            <span class="alert-dot" style="background:${isErr ? "#ef4444" : "#f59e0b"}"></span>
            ${a.msg}
          </div>`;
        });
        H += `</div>`;
      }

      // ── KPI CARDS ─────────────────────────────────────────────
      const balColor = balance >= 0 ? "#10b981" : "#ef4444";
      const ocpColor = fillPct > 88 ? "#ef4444" : fillPct > 65 ? "#f59e0b" : "#10b981";
      H += `
        <div class="kpi-grid">
          <div class="kpi-card" style="--kc:#f59e0b">
            <div class="kpi-label">Litros Ingresados</div>
            <div class="kpi-number">${fmtD(totIng)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${fmtN(totIng)} litros · ${ing.length} camiones</div>
          </div>
          <div class="kpi-card" style="--kc:#3b82f6">
            <div class="kpi-label">Litros Despachados</div>
            <div class="kpi-number">${fmtD(totCarg)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${cargas.length} carga${cargas.length !== 1 ? "s" : ""} realizadas</div>
          </div>
          <div class="kpi-card" style="--kc:${balColor}">
            <div class="kpi-label">Balance del Día</div>
            <div class="kpi-number">${balance >= 0 ? "+" : ""}${fmtD(balance)}<span class="kpi-unit">L</span></div>
            <div class="kpi-sub">${balance >= 0 ? "Superávit operativo" : "Déficit operativo"}</div>
          </div>
          <div class="kpi-card" style="--kc:#6366f1">
            <div class="kpi-label">Tambos</div>
            <div class="kpi-number">${new Set(ing.map(i => i.tambo).filter(Boolean)).size}</div>
            <div class="kpi-sub">proveedores activos hoy</div>
          </div>
          <div class="kpi-card" style="--kc:#8b5cf6">
            <div class="kpi-label">pH Promedio</div>
            <div class="kpi-number">${qAvg("phFca") != null ? qAvg("phFca").toFixed(2) : "—"}</div>
            <div class="kpi-sub">Acidez: ${qAvg("acidezFca") != null ? qAvg("acidezFca").toFixed(1) + " °D" : "—"}</div>
          </div>
          <div class="kpi-card" style="--kc:${ocpColor}">
            <div class="kpi-label">Ocupación Silos</div>
            <div class="kpi-number">${fillPct.toFixed(1)}<span class="kpi-unit">%</span></div>
            <div class="kpi-sub">${fmtD(totSilos)} L de ${fmtD(totCap)} L cap.</div>
          </div>
        </div>
      `;

      // ── CALIDAD ───────────────────────────────────────────────
      const qualDefs = [
        { key: "phFca",     label: "pH",         unit: "",    dec: 2, min: 6.6,  max: 6.8   },
        { key: "acidezFca", label: "Acidez",      unit: "°D",  dec: 1, min: 14,   max: 18    },
        { key: "gbFca",     label: "Grasa",       unit: "%",   dec: 2, min: 3.0,  max: null  },
        { key: "sngFca",    label: "SNG",         unit: "%",   dec: 2, min: 8.2,  max: null  },
        { key: "densFca",   label: "Densidad",    unit: "",    dec: 3, min: 1.028, max: 1.034 },
        { key: "protFca",   label: "Proteína",    unit: "%",   dec: 2, min: 2.9,  max: null  },
        { key: "tC",        label: "Temperatura", unit: "°C",  dec: 1, min: null, max: 6     },
        { key: "aguadoFca", label: "Aguado",      unit: "",    dec: 3, min: null, max: 0     },
      ];
      if (ing.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-title">Calidad Promedio</span>
            <div class="sec-line"></div>
            <span class="sec-pill">${ing.length} muestras</span>
          </div>
          <div class="qual-strip">
        `;
        qualDefs.forEach(({ key, label, unit, dec, min, max }) => {
          const v = qAvg(key);
          if (v == null) return;
          const inRange  = (min == null || v >= min) && (max == null || v <= max);
          const dotColor = inRange ? "#10b981" : (key === "aguadoFca" ? "#ef4444" : "#f59e0b");
          const rangeStr = min != null && max != null ? `${min} – ${max}${unit}`
            : min != null ? `≥ ${min}${unit}` : max != null ? `≤ ${max}${unit}` : "";
          H += `<div class="qual-card">
            <div class="qual-top">
              <span class="qual-name">${label}</span>
              <span class="qual-dot" style="background:${dotColor}"></span>
            </div>
            <div class="qual-val">${v.toFixed(dec)}<span class="qual-unit">${unit ? " " + unit : ""}</span></div>
            ${rangeStr ? `<div class="qual-ref">ref ${rangeStr}</div>` : ""}
          </div>`;
        });
        H += `</div>`;
      }

      // ── SILOS (visual) ────────────────────────────────────────
      H += `
        <div class="sec-head">
          <span class="sec-title">Estado de Silos</span>
          <div class="sec-line"></div>
          <span class="sec-pill">${fillPct.toFixed(1)}% ocupado</span>
        </div>
        <div class="silo-card">
          <div class="silo-card-head">
            <div>
              <div class="silo-card-title">Distribución de Volumen</div>
              <div class="silo-card-sub">${fmtN(totSilos)} L en ${STOCK_SILOS.length} silos · cap. total ${fmtN(totCap)} L</div>
            </div>
            ${donutSVG}
          </div>
          <div class="silo-list">
      `;
      STOCK_SILOS.forEach(silo => {
        const litros = autoL[silo] || 0;
        const cap    = SILO_CAP[silo] || 10000;
        const pct    = cap > 0 ? (litros / cap) * 100 : 0;
        let prod = "";
        for (const t of TURNOS) { const p = (((stk[t] || {}).silos || {})[silo] || {}).producto; if (p) { prod = p; break; } }
        const barColor = pct === 0 ? "#e2e8f0" : pct > 88 ? "#ef4444" : pct > 65 ? "#f59e0b" : "#10b981";
        const barGrad  = pct === 0 ? "#e2e8f0"
          : pct > 88 ? "linear-gradient(90deg,#f87171,#ef4444)"
          : pct > 65 ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
          : "linear-gradient(90deg,#34d399,#10b981)";
        const statTxt = litros > 0 ? `${fmtN(litros)} L · ${pct.toFixed(1)}%` : "Vacío";
        H += `<div class="silo-row">
          <div class="silo-meta">
            <div class="silo-left">
              <span class="silo-name">Silo ${silo}</span>
              ${prod ? `<span class="silo-prod">${prod}</span>` : ""}
            </div>
            <span class="silo-stat" style="color:${barColor}">${statTxt}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(100, Math.max(litros > 0 ? 1 : 0, pct))}%;background:${barGrad}"></div>
          </div>
        </div>`;
      });
      H += `</div></div>`;

      // ── INGRESOS ──────────────────────────────────────────────
      H += `
        <div class="sec-head">
          <span class="sec-title">Ingresos de Leche</span>
          <div class="sec-line"></div>
          <span class="sec-pill">${ing.length} registros</span>
        </div>
        <div class="table-card">
          <div class="table-head">
            <span class="table-title">Detalle por Camión</span>
            <span class="table-badge">Total: ${fmtN(totIng)} L</span>
          </div>
          <table><thead><tr>
            <th>Hora</th><th>Tambo</th>
            <th class="r">Litros Fca</th><th class="r">Litros Tbo</th>
            <th>Destino</th><th class="r">pH</th><th class="r">Acidez</th>
            <th class="r">GB%</th><th class="r">SNG%</th><th class="r">Densidad</th>
            <th class="r">Aguado</th><th>Responsable</th>
          </tr></thead><tbody>
      `;
      if (ing.length === 0) {
        H += `<tr><td colspan="12" style="text-align:center;color:#94a3b8;padding:24px">Sin ingresos registrados</td></tr>`;
      } else {
        ing.forEach(i => {
          const lFca = parseFloat(i.litrosFca) || 0;
          const lTbo = parseFloat(i.litrosTbo) || 0;
          const difL = Math.abs(lFca - lTbo);
          const agu  = parseFloat(i.aguadoFca);
          const aguH = isNaN(agu) || agu === 0
            ? `<span class="badge ok">0.000</span>`
            : `<span class="badge err">${agu.toFixed(3)} ⚠</span>`;
          const difH = difL > 150 ? ` <span class="badge warn">Δ${fmtN(Math.round(difL))}L</span>` : "";
          H += `<tr>
            <td class="mn">${i.hora || "—"}</td>
            <td class="mb">${i.tambo || "—"}</td>
            <td class="r mb">${lFca ? fmtN(lFca) : "—"}${difH}</td>
            <td class="r mu">${lTbo ? fmtN(lTbo) : "—"}</td>
            <td>${i.destino || "—"}</td>
            <td class="r">${i.phFca || "—"}</td>
            <td class="r">${i.acidezFca || "—"}</td>
            <td class="r">${i.gbFca || "—"}</td>
            <td class="r">${i.sngFca || "—"}</td>
            <td class="r">${i.densFca || "—"}</td>
            <td class="r">${aguH}</td>
            <td class="mu">${i.responsable || "—"}</td>
          </tr>`;
        });
        const tFca = ing.reduce((s, i) => s + (parseFloat(i.litrosFca) || 0), 0);
        const tTbo = ing.reduce((s, i) => s + (parseFloat(i.litrosTbo) || 0), 0);
        H += `<tr class="total-row">
          <td></td><td class="mb">TOTAL</td>
          <td class="r">${fmtN(tFca)} L</td><td class="r">${fmtN(tTbo)} L</td>
          <td colspan="8"></td>
        </tr>`;
      }
      H += `</tbody></table></div>`;

      // ── CARGAS ────────────────────────────────────────────────
      H += `
        <div class="sec-head">
          <span class="sec-title">Cargas Despachadas</span>
          <div class="sec-line"></div>
          <span class="sec-pill">${cargas.length} registros</span>
        </div>
        <div class="table-card">
          <div class="table-head">
            <span class="table-title">Detalle de Despachos</span>
            <span class="table-badge">Total: ${fmtN(totCarg)} L</span>
          </div>
          <table><thead><tr>
            <th>Hora</th><th>Denominación</th><th>Destino</th><th>Transportista</th>
            <th>Silo Origen</th><th class="r">Litros</th><th class="r">pH</th><th class="r">Temp°C</th><th>Responsable</th>
          </tr></thead><tbody>
      `;
      if (cargas.length === 0) {
        H += `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px">Sin cargas registradas</td></tr>`;
      } else {
        cargas.forEach(c => {
          H += `<tr>
            <td class="mn">${c.hora || "—"}</td>
            <td class="mb">${c.label || "—"}</td>
            <td>${c.destino || "—"}</td>
            <td>${c.transportista || "—"}</td>
            <td>${c.siloProveniente || "—"}</td>
            <td class="r mb">${c.litros ? fmtN(parseFloat(c.litros)) : "—"}</td>
            <td class="r">${c.pH || "—"}</td>
            <td class="r">${c.gC || "—"}</td>
            <td class="mu">${c.responsable || "—"}</td>
          </tr>`;
        });
        const tC = cargas.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
        H += `<tr class="total-row">
          <td></td><td class="mb">TOTAL</td><td></td><td></td><td></td>
          <td class="r">${fmtN(tC)} L</td><td colspan="3"></td>
        </tr>`;
      }
      H += `</tbody></table></div>`;

      // ── MOVIMIENTOS (si hay) ──────────────────────────────────
      const movs = movData.movs || [];
      if (movs.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-title">Movimientos entre Silos</span>
            <div class="sec-line"></div>
            <span class="sec-pill">${movs.length} registros</span>
          </div>
          <div class="table-card">
            <div class="table-head"><span class="table-title">Transferencias internas</span></div>
            <table><thead><tr>
              <th>Hora</th><th>Desde</th><th>Hasta</th><th class="r">Litros</th><th>Motivo</th><th>Responsable</th>
            </tr></thead><tbody>
        `;
        movs.forEach(m => {
          H += `<tr>
            <td class="mn">${m.hora || "—"}</td>
            <td>${m.desde || "—"}</td><td>${m.hasta || "—"}</td>
            <td class="r mb">${m.litros ? fmtN(parseFloat(m.litros)) : "—"}</td>
            <td>${m.motivo || "—"}</td>
            <td class="mu">${m.resp || "—"}</td>
          </tr>`;
        });
        H += `</tbody></table></div>`;
      }

      // ── FORTIFICADOS (si hay) ─────────────────────────────────
      if (forts.length > 0) {
        H += `
          <div class="sec-head">
            <span class="sec-title">Lotes Fortificados</span>
            <div class="sec-line"></div>
            <span class="sec-pill">${forts.length} lotes</span>
          </div>
          <div class="table-card">
            <div class="table-head"><span class="table-title">Producción Especial</span></div>
            <table><thead><tr>
              <th>Hora</th><th>Lote</th><th>Producto</th><th class="r">Litros</th>
              <th>Tanque</th><th>Adiciones</th><th>Responsable</th>
            </tr></thead><tbody>
        `;
        forts.forEach(f => {
          const adic = (f.adiciones || []).map(a => `${a.producto} ${a.cantidad}${a.unidad}`).join(" · ") || "—";
          H += `<tr>
            <td class="mn">${f.hora || "—"}</td>
            <td class="mb">${f.lote || "—"}</td>
            <td>${f.producto || "—"}</td>
            <td class="r">${f.litros ? fmtN(parseFloat(f.litros)) : "—"}</td>
            <td>${f.tanque || "—"}</td>
            <td style="font-size:10px;color:#64748b">${adic}</td>
            <td class="mu">${f.responsable || "—"}</td>
          </tr>`;
        });
        H += `</tbody></table></div>`;
      }

      // ── FOOTER ────────────────────────────────────────────────
      H += `
        <div class="footer">
          <span class="footer-brand">Lacteos Yatasto SA · Sistema de Gestión v2.0</span>
          <span>Generado: ${ts} &nbsp;·&nbsp; Fecha informe: ${fmtDate(exportDate)}</span>
        </div>
      `;

      // ── Abrir ventana ─────────────────────────────────────────
      const printBar = `
        <div class="print-bar">
          <div>
            <span class="print-bar-brand">YATASTO</span>
            <span class="print-bar-sub">Informe Ejecutivo · ${fmtDate(exportDate)}</span>
          </div>
          <button type="button" class="print-btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
        </div>
      `;

      const full = `<!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Yatasto — Informe ${exportDate}</title>
          <style>${css}</style>
        </head>
        <body>
          ${printBar}
          <div class="page">${H}</div>
        </body>
        </html>`;

      const w = window.open("", "_blank");
      if (w) {
        w.document.write(full);
        w.document.close();
      } else {
        alert("El navegador bloqueó la ventana emergente. Permitir popups para este sitio y volver a intentar.");
      }
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
          ? `AGUADO detectado — promedio ${v.avg.toFixed(3)} (debe ser 0) — revisar adulteración`
          : `${label} fuera de rango: promedio ${v.avg.toFixed(2)} (ref: ${ref.min}–${ref.max})`,
      });
    }
  });
  // Alertas por desvíos Tambo vs Fábrica (cualquier ingreso con aguado > 0 = crítico)
  const ingConAguado = d.ing.filter(i => parseFloat(i.aguadoFca) > 0 || parseFloat(i.aguadoTbo) > 0);
  if (ingConAguado.length > 0)
    alertas.push({ tipo: "err", msg: `${ingConAguado.length} camión/es con AGUADO detectado: ${ingConAguado.map(i => i.tambo || "?").join(", ")}` });
  const ingConDesvio = d.ing.filter(i => {
    const dL = Math.abs((parseFloat(i.litrosFca) || 0) - (parseFloat(i.litrosTbo) || 0));
    return dL > 150;
  });
  if (ingConDesvio.length > 0)
    alertas.push({ tipo: "warn", msg: `${ingConDesvio.length} camión/es con diferencia de litros Tbo/Fca > 150 L` });

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
      {/* ── HEADER PREMIUM ── */}
      <div style={{
        background: _THEME === "light"
          ? `linear-gradient(135deg, #fff 0%, ${C.accent}08 100%)`
          : `linear-gradient(135deg, #0a0e1f 0%, #1a0808 60%, #0a0f1e 100%)`,
        borderRadius: 18, padding: "18px 18px 14px", marginBottom: 16,
        border: `1px solid ${C.accent}33`,
        position: "relative", overflow: "hidden",
        boxShadow: _THEME === "light" ? `0 4px 24px ${C.accent}14` : `0 4px 24px #00000055`,
      }}>
        {/* Dot pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: _THEME === "light" ? 0.04 : 0.025,
          backgroundImage: "radial-gradient(circle, #888 1px, transparent 1px)",
          backgroundSize: "18px 18px", pointerEvents: "none",
        }} />
        {/* Glow strip */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
          opacity: 0.7,
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <YataLogo compact />
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                Panel de Control · {fmtDate(date)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 3 }}>{perfilLabel}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", position: "relative" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center",
              justifyContent: "center",
              background: _THEME === "light" ? C.accentDim : `${C.accent}15`,
              border: `1px solid ${C.accent}33`,
            }}><CowIcon size={30} /></div>
            {users.length > 0 && (
              <div style={{ fontSize: 11, color: C.success, marginTop: 5, fontWeight: 700 }}>
                ● {users.length} online
              </div>
            )}
          </div>
        </div>

        {users.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, position: "relative" }}>
            {users.map(u => (
              <span key={u.id} style={{
                fontSize: 11, background: C.accent + "18",
                border: `1px solid ${C.accent}30`, borderRadius: 20,
                padding: "3px 10px", color: C.accent, fontWeight: 600,
              }}>
                {u.nombre} · {u.rol}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── TABS PREMIUM ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {[
          ["resumen",  TabResumen,   "Resumen"],
          ["silos",    TabSilos,     "Silos"],
          ["calidad",  TabCalidad,   "Calidad"],
          ["difs",     TabDifs,      "Difs."],
          ["semana",   TabSemana,    "Semana"],
          ["tambos",   IcoLeche,     "Tambos"],
          ["historial",TabHistorial, "Historial"],
          ["exportar", TabExportar,  "Exportar"],
        ].map(([t, TabIcon, lbl]) => {
          const active = tab === t;
          return (
            <button type="button" key={t} onClick={() => setTab(t)} style={{
              background: active
                ? `linear-gradient(145deg, ${C.accent}, ${C.accent}cc)`
                : (_THEME === "light" ? "#fff" : C.card),
              border: active ? "none" : `1px solid ${C.border}`,
              borderRadius: 12, padding: "9px 5px",
              flex: 1, minWidth: 0, cursor: "pointer",
              color: active ? "#000" : C.sub,
              fontWeight: active ? 800 : 500,
              boxShadow: active ? `0 4px 14px ${C.accent}44` : "none",
              transition: "all 0.18s",
              whiteSpace: "nowrap",
            }}>
              <div style={{ display: "flex", justifyContent: "center" }}><TabIcon size={15} strokeWidth={SW} /></div>
              <div style={{ fontSize: 9, letterSpacing: "0.03em", marginTop: 3, textTransform: "uppercase" }}>{lbl}</div>
            </button>
          );
        })}
      </div>

      {/* ── RESUMEN ── */}
      {tab === "resumen" && (() => {
        const totalCap   = STOCK_SILOS.reduce((s, k) => s + (SILO_CAP[k] || 0), 0);
        const totalStock = STOCK_SILOS.reduce((s, k) => s + Math.max(0, d.autoLitros[k] || 0), 0);
        const capPct     = totalCap > 0 ? (totalStock / totalCap) * 100 : 0;
        const capColor   = capPct > 88 ? C.danger : capPct > 65 ? C.accent : C.success;
        const balColor   = balance >= 0 ? C.success : C.danger;
        return (
          <div>
            {/* Capacity hero card */}
            <div style={{
              background: _THEME === "light"
                ? `linear-gradient(135deg, #fff 0%, ${capColor}0a 100%)`
                : `linear-gradient(135deg, ${C.card} 0%, ${capColor}12 100%)`,
              borderRadius: 16, padding: 16, marginBottom: 14,
              border: `1px solid ${capColor}44`,
              boxShadow: `0 2px 16px ${capColor}18`,
            }}>
              <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12 }}>
                Capacidad total de silos · {fmtDate(date)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <DonutChart pct={capPct} color={capColor} size={78} label={`${capPct.toFixed(0)}%`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: capColor, fontFamily: FONT_MONO, lineHeight: 1 }}>
                    {(totalStock / 1000).toFixed(1)}
                    <span style={{ fontSize: 13, fontWeight: 400, color: C.sub, marginLeft: 4 }}>k L</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                    de {(totalCap / 1000).toFixed(0)}k L capacidad
                  </div>
                  <div style={{ background: C.muted, borderRadius: 6, height: 5, marginTop: 10, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, capPct)}%`, height: "100%", background: capColor, borderRadius: 6, transition: "width 1s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: C.muted }}>0%</span>
                    <span style={{ fontSize: 9, color: capPct > 88 ? C.danger : C.muted }}>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <StatCard Icon={IcoLeche}       label="Ingresados" value={totalIngresados} unit="L" color={C.accent} />
              <StatCard Icon={IcoCarga}       label="Cargados"   value={totalCargados}   unit="L" color={C.sub} />
              <StatCard Icon={IcoBalance}     label="Balance"    value={balance}         unit="L" color={balColor} />
              <StatCard Icon={CamionIcon}     label="Camiones"   value={d.ing.length}    color={C.text} sub={`${tambosUnicos} tambos`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              <StatCard Icon={IcoDestino}      label="Cargas"  value={d.cargas.length}           color={C.text} />
              <StatCard Icon={IcoFortificados} label="Fort."   value={d.forts.length}            color={C.success} />
              <StatCard Icon={IcoMovimientos}  label="Movim."  value={(d.movData.movs || []).length} color={C.sub} />
            </div>

            {/* Alerts */}
            {alertas.length === 0 ? (
              <div style={{
                ...card,
                borderColor: C.success + "44",
                background: _THEME === "light" ? "#f0fdf4" : "#081608",
                textAlign: "center", padding: 18,
                boxShadow: `0 0 20px ${C.success}10`,
              }}>
                <div style={{ marginBottom: 6, display: "flex", justifyContent: "center", color: C.success }}><AlertaOk size={28} strokeWidth={1.5} /></div>
                <div style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>Sin alertas activas</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>Todo dentro de parámetros normales</div>
              </div>
            ) : (
              <div style={{
                ...card,
                borderColor: C.danger + "44",
                background: _THEME === "light" ? "#fef2f2" : "#160808",
              }}>
                <div style={{ ...secTitle, color: C.danger, marginBottom: 10 }}>Alertas activas ({alertas.length})</div>
                {alertas.map((a, i) => (
                  <div key={i} style={{
                    fontSize: 12, color: a.tipo === "err" ? C.danger : C.accent,
                    padding: "7px 0", borderBottom: i < alertas.length - 1 ? `1px solid ${C.border}44` : "none",
                    display: "flex", alignItems: "flex-start", gap: 6,
                  }}>
                    <span style={{ display: "flex", flexShrink: 0 }}>{a.tipo === "err" ? <AlertaError size={14} strokeWidth={SW} /> : <AlertaWarn size={14} strokeWidth={SW} />}</span>
                    <span>{a.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
              <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", opacity: 0.35 }}><TabCalidad size={40} strokeWidth={1} /></div>
              <div>Sin ingresos registrados</div>
            </div>
          ) : (
            <>
              <div style={{ ...secTitle }}>Promedios del día · {d.ing.length} camión/es · {fmtDate(date)}</div>
              {Object.entries(quality).map(([label, v]) => {
                const ref = QUALITY_REFS[label];
                const ok = !ref || (v.avg >= ref.min && v.avg <= ref.max);
                const barColor = ok ? C.success : C.danger;
                // Use ref range as scale if available, else fallback
                const scale = ref ? (ref.max * 1.3) : 20;
                const barW = Math.min(100, (v.avg / scale) * 100);
                return (
                  <div key={label} style={{
                    background: _THEME === "light"
                      ? `linear-gradient(135deg, #fff 0%, ${barColor}08 100%)`
                      : `linear-gradient(135deg, ${C.card} 0%, ${barColor}10 100%)`,
                    borderRadius: 14, padding: "12px 14px", marginBottom: 8,
                    border: `1px solid ${ok ? C.border : barColor + "44"}`,
                    boxShadow: ok ? "none" : `0 0 10px ${barColor}14`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {ref && <span style={{ fontSize: 11, color: ok ? C.success : C.danger, fontWeight: 700 }}>{ok ? "OK" : "Fuera"}</span>}
                        <span style={{ fontSize: 20, fontWeight: 900, color: ok ? C.accent : C.danger, fontFamily: FONT_MONO }}>{v.avg.toFixed(3)}</span>
                      </div>
                    </div>
                    <div style={{ background: C.muted, borderRadius: 6, height: 7, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${barW}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}88, ${barColor})`, transition: "width 0.7s", borderRadius: 6 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.muted }}>mín <b style={{ color: C.text }}>{v.min.toFixed(3)}</b></span>
                      <span style={{ fontSize: 11, color: C.sub }}>n={v.n}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>máx <b style={{ color: C.text }}>{v.max.toFixed(3)}</b></span>
                    </div>
                    {ref && (
                      <div style={{ marginTop: 6, fontSize: 9, color: ok ? C.muted : C.danger, borderTop: `1px solid ${C.border}44`, paddingTop: 5 }}>
                        Referencia: {ref.min} – {ref.max}{ref.critical ? " · Debe ser exactamente 0" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
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

        const lt = _THEME === "light";
        const SEV = {
          crit: { label: "ADULTERACIÓN",  bg: lt ? "#fef2f2" : "#450a0a", border: "#ef444466", text: lt ? "#b91c1c" : "#fca5a5", badge: "#ef4444" },
          warn: { label: "ALERTA",        bg: lt ? "#fff7ed" : "#431407", border: "#f9731644", text: lt ? "#c2410c" : "#fdba74", badge: "#f97316" },
          attn: { label: "DESVÍO",        bg: lt ? "#fffbeb" : "#422006", border: "#d9770644", text: lt ? "#92400e" : "#fde68a", badge: "#f59e0b" },
          ok:   { label: "Normal",        bg: C.card,    border: C.border,    text: C.sub,    badge: "#22c55e" },
        };

        return (
          <div>
            {/* Banner resumen */}
            <div style={{ ...panel, marginBottom: 14, borderColor: critCount > 0 ? "#ef444466" : warnCount > 0 ? "#f9731644" : "#f59e0b44", background: _THEME === "light" ? "#fff" : C.surface }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                Auditoría Tambo vs Fábrica — {fmtDate(date)}
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
                    <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {critCount === 0 && conProblemas.length === 0 && (
                <div style={{ textAlign: "center", marginTop: 10, color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
                  Todos los camiones dentro de parámetros normales
                </div>
              )}
            </div>

            {/* Umbral de referencia */}
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, padding: "6px 10px", background: C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
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
                      <div style={{ fontSize: 11, color: sev.text, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 700 }}>
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
                              <div style={{ fontSize: 11, fontWeight: 700, color: rowCol }}>{df.label}{df.critical ? " !" : ""}</div>
                              <div style={{ fontSize: 11, color: C.text, fontFamily: FONT_MONO }}>{df.label === "Litros" ? (df.vTbo || 0).toLocaleString("es-AR") : df.vTbo.toFixed(3)}</div>
                              <div style={{ fontSize: 11, color: C.text, fontFamily: FONT_MONO }}>{df.label === "Litros" ? (df.vFca || 0).toLocaleString("es-AR") : df.vFca.toFixed(3)}</div>
                              <div style={{ fontSize: 11, color: rowCol, fontFamily: FONT_MONO, fontWeight: 600 }}>{diffStr}</div>
                              <div style={{ fontSize: 11, color: df.pctDiff !== null && Math.abs(df.pctDiff) > 5 ? rowCol : C.muted, fontFamily: FONT_MONO }}>{pctStr}</div>
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
                        <span key={i} style={{ fontSize: 11, background: "#16a34a22", color: "#4ade80", borderRadius: 5, padding: "2px 7px" }}>
                          ✓ {df.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {severity !== "ok" && okDiffs.length > 0 && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
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
            {[[IcoIngresos, "Ingresos", d.ing.length], [IcoCarga, "Cargas", d.cargas.length], [IcoFortificados, "Fort.", d.forts.length], [IcoMovimientos, "Movim.", (d.movData.movs || []).length]].map(([Ico, lbl, cnt]) => (
              <div key={lbl} style={{ ...card, textAlign: "center", padding: "12px 8px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 2, color: C.sub }}><Ico size={20} strokeWidth={SW} /></div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{cnt}</div>
                <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase" }}>{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ ...secTitle }}>Eliminaciones recientes</div>
          {d.historial.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: C.sub, fontSize: 12 }}>Sin eliminaciones registradas</div>
          ) : d.historial.slice(0, 30).map((e, i) => (
            <div key={i} style={{ ...card, padding: 10, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, background: TIPO_COL[e.tipo] + "22", color: TIPO_COL[e.tipo], borderRadius: 4, padding: "2px 7px", fontWeight: 700, textTransform: "uppercase" }}>
                  {TIPO_LABEL[e.tipo] || e.tipo}
                </span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: FONT_MONO }}>{e.fecha} {e.hora}</span>
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
            <div style={secTitle}>Rango de fechas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Desde</div>
                <input type="date" value={exportFrom} onChange={e => { setExportFrom(e.target.value); if (e.target.value > exportTo) setExportTo(e.target.value); }} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Hasta</div>
                <input type="date" value={exportTo} onChange={e => { setExportTo(e.target.value); if (e.target.value < exportFrom) setExportFrom(e.target.value); }} style={{ ...inp, width: "100%" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: "Hoy", fn: () => { setExportFrom(date); setExportTo(date); } },
                { label: "7 días", fn: () => { const d7 = getLastNDays(7); setExportFrom(d7[0]); setExportTo(date); } },
                { label: "14 días", fn: () => { const d14 = getLastNDays(14); setExportFrom(d14[0]); setExportTo(date); } },
                { label: "30 días", fn: () => { const d30 = getLastNDays(30); setExportFrom(d30[0]); setExportTo(date); } },
              ].map(({ label, fn }) => (
                <button type="button" key={label} onClick={fn} style={{ ...btnSecondary, width: "auto", padding: "6px 12px", fontSize: 12 }}>{label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 8, textAlign: "center" }}>
              {exportFrom === exportTo
                ? `Exportando datos del ${fmtDate(exportFrom)}`
                : `Exportando del ${fmtDate(exportFrom)} al ${fmtDate(exportTo)} (${getDaysInRange(exportFrom, exportTo).length} días)`}
            </div>
          </div>

          <div style={{ ...secTitle }}>Formato de exportación</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <button type="button" onClick={doExportCSV} disabled={exporting} style={{ background: C.success.replace(/\)$/, " / 0.12)"), color: C.success, border: `1px solid ${C.success.replace(/\)$/, " / 0.35)")}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>Exportar CSV</div>
              <div style={{ fontSize: 11, color: C.sub }}>Ingresos · Cargas · Movimientos — Compatible con Excel, Google Sheets y cualquier planilla</div>
            </button>
            <button type="button" onClick={doExportXLS} disabled={exporting} style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>Exportar Excel (.xls)</div>
              <div style={{ fontSize: 11, color: C.sub }}>Tabla formateada lista para abrir en Microsoft Excel</div>
            </button>
            <button type="button" onClick={doExportPDF} disabled={exporting} style={{ background: C.danger.replace(/\)$/, " / 0.10)"), color: C.danger, border: `1px solid ${C.danger.replace(/\)$/, " / 0.30)")}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left", opacity: exporting ? 0.6 : 1 }}>
              <div style={{ fontSize: 17, marginBottom: 3, fontWeight: 700 }}>Ver / Imprimir PDF</div>
              <div style={{ fontSize: 11, color: C.sub }}>Abre una vista de impresión — guardá como PDF desde el navegador</div>
            </button>
          </div>
          {exporting && <div style={{ textAlign: "center", marginTop: 14, color: C.accent, fontSize: 13 }}>Preparando exportación...</div>}
        </div>
      )}

      {/* ── SEMANA ── */}
      {tab === "semana" && (() => {
        const loadingPlaceholder = (
          <div style={{ padding: "48px 0", textAlign: "center", color: C.sub }}>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", opacity: 0.35 }}><TabSemana size={36} strokeWidth={1} /></div>
            <div style={{ fontSize: 13 }}>Cargando datos semanales...</div>
          </div>
        );
        if (loadingWeek || !weekData) return loadingPlaceholder;

        const last7  = getLastNDays(7);
        const rows   = last7.map(dy => ({ date: dy, ...(weekData[dy] || { ingresados: 0, cargados: 0, camiones: 0 }) }));
        const maxIng = Math.max(...rows.map(r => r.ingresados), 1);
        const totalSem  = rows.reduce((s, r) => s + r.ingresados, 0);
        const totalCam  = rows.reduce((s, r) => s + r.camiones, 0);
        const totalCarg = rows.reduce((s, r) => s + (r.cargados || 0), 0);
        const diasActivos = rows.filter(r => r.ingresados > 0).length;

        return (
          <div>
            {/* KPI pills */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <StatCard Icon={IcoLeche}   label="Total semana" value={totalSem} unit="L" color={C.accent} sub={`${diasActivos} días con entrega`} />
              <StatCard Icon={CamionIcon} label="Camiones" value={totalCam} color={C.text} sub={`prom. ${diasActivos > 0 ? (totalCam / diasActivos).toFixed(1) : 0}/día`} />
            </div>

            {/* Bar chart card */}
            <div style={{ ...card, padding: 16, marginBottom: 14 }}>
              <div style={{ ...secTitle, marginBottom: 14 }}>Litros ingresados — últimos 7 días</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 110, marginBottom: 10 }}>
                {rows.map(({ date: dy, ingresados }) => {
                  const pct    = (ingresados / maxIng) * 100;
                  const isHoy  = dy === getToday();
                  const barCol = isHoy ? C.accent : ingresados > 0 ? "#3b82f6" : C.muted;
                  const dayDate = new Date(dy + "T00:00:00");
                  return (
                    <div key={dy} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                      <div style={{ fontSize: 8, color: ingresados > 0 ? (isHoy ? C.accent : C.sub) : "transparent", fontFamily: FONT_MONO, marginBottom: 3 }}>
                        {ingresados >= 1000 ? `${(ingresados / 1000).toFixed(1)}k` : ingresados || ""}
                      </div>
                      <div style={{ flex: 1, width: "100%", background: C.muted, borderRadius: "4px 4px 0 0", position: "relative", overflow: "hidden" }}>
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0,
                          height: `${Math.max(pct, ingresados > 0 ? 3 : 0)}%`,
                          background: barCol,
                          borderRadius: "3px 3px 0 0",
                          transition: `height 0.6s ${EASE_OUT}`,
                          boxShadow: isHoy ? `0 0 12px ${C.accent}66` : "none",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Day labels */}
              <div style={{ display: "flex", gap: 5 }}>
                {rows.map(({ date: dy }) => {
                  const isHoy   = dy === getToday();
                  const dayDate = new Date(dy + "T00:00:00");
                  const [, , dd] = dy.split("-");
                  return (
                    <div key={dy} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: isHoy ? 700 : 400, color: isHoy ? C.accent : C.sub }}>
                        {DIAS_ES[dayDate.getDay()]}
                      </div>
                      <div style={{ fontSize: 8, color: isHoy ? C.accent : C.muted }}>{dd}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily table */}
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={secTitle}>Detalle diario</div>
              </div>
              {rows.map(({ date: dy, ingresados, cargados, camiones }, i) => {
                const bal     = ingresados - (cargados || 0);
                const isHoy   = dy === getToday();
                const sinData = ingresados === 0;
                const dayDate = new Date(dy + "T00:00:00");
                const [, mm, dd] = dy.split("-");
                return (
                  <div key={dy} style={{
                    display: "grid", gridTemplateColumns: "56px 1fr 1fr 1fr",
                    padding: "10px 14px", gap: 6, alignItems: "center",
                    borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
                    background: isHoy ? C.accentDim + "44" : "transparent",
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isHoy ? C.accent : C.text }}>
                        {DIAS_ES[dayDate.getDay()]}
                      </div>
                      <div style={{ fontSize: 9, color: C.muted, fontFamily: FONT_MONO }}>{dd}/{mm}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: sinData ? C.muted : C.text }}>
                        {sinData ? "—" : ingresados >= 1000 ? `${(ingresados / 1000).toFixed(1)}k` : ingresados}
                      </div>
                      <div style={{ fontSize: 9, color: C.sub }}>Ingresos L</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: sinData ? C.muted : C.text }}>
                        {sinData ? "—" : camiones}
                      </div>
                      <div style={{ fontSize: 9, color: C.sub }}>Camiones</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT_MONO, color: sinData ? C.muted : (bal >= 0 ? C.success : C.danger) }}>
                        {sinData ? "—" : (bal >= 0 ? "+" : "") + (Math.abs(bal) >= 1000 ? `${(bal / 1000).toFixed(1)}k` : bal)}
                      </div>
                      <div style={{ fontSize: 9, color: C.sub }}>Balance L</div>
                    </div>
                  </div>
                );
              })}
              {/* Total footer */}
              <div style={{
                display: "grid", gridTemplateColumns: "56px 1fr 1fr 1fr",
                padding: "10px 14px", gap: 6, alignItems: "center",
                background: C.muted, borderTop: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase" }}>Total</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT_MONO, color: C.accent }}>
                    {totalSem >= 1000 ? `${(totalSem / 1000).toFixed(1)}k` : totalSem}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT_MONO, color: C.text }}>{totalCam}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  {(() => { const b = totalSem - totalCarg; return (
                    <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT_MONO, color: b >= 0 ? C.success : C.danger }}>
                      {(b >= 0 ? "+" : "") + (Math.abs(b) >= 1000 ? `${(b / 1000).toFixed(1)}k` : b)}
                    </div>
                  ); })()}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TAMBOS / TENDENCIAS ── */}
      {tab === "tambos" && (() => {
        if (loadingWeek || !weekData) return (
          <div style={{ padding: "48px 0", textAlign: "center", color: C.sub }}>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoLeche size={36} strokeWidth={1} /></div>
            <div style={{ fontSize: 13 }}>Cargando tendencias por tambo...</div>
          </div>
        );

        const days14 = getLastNDays(14);
        // Construir mapa por tambo con todas las entregas de los últimos 14 días
        const tamboMap = {};
        days14.forEach(dy => {
          (weekData[dy]?.ingresos || []).forEach(ing => {
            const nombre = ing.tambo || "Sin identificar";
            if (!tamboMap[nombre]) tamboMap[nombre] = [];
            tamboMap[nombre].push({
              date:   dy,
              litros: parseFloat(ing.litrosFca)  || 0,
              acidez: parseFloat(ing.acidezFca),
              ph:     parseFloat(ing.phFca),
              gb:     parseFloat(ing.gbFca),
              sng:    parseFloat(ing.sngFca),
              dens:   parseFloat(ing.densFca),
              prot:   parseFloat(ing.protFca),
            });
          });
        });

        const avg = (arr, key) => {
          const vals = arr.filter(e => !isNaN(e[key]) && e[key] > 0);
          return vals.length ? vals.reduce((s, e) => s + e[key], 0) / vals.length : 0;
        };

        const tambos = Object.entries(tamboMap)
          .map(([nombre, entregas]) => ({
            nombre, entregas,
            totalLitros: entregas.reduce((s, e) => s + e.litros, 0),
            avgAcidez: avg(entregas, "acidez"),
            avgPh:     avg(entregas, "ph"),
            avgGb:     avg(entregas, "gb"),
            lastDate:  entregas[entregas.length - 1]?.date,
          }))
          .sort((a, b) => b.totalLitros - a.totalLitros);

        if (tambos.length === 0) return (
          <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", opacity: 0.35 }}><IcoLeche size={40} strokeWidth={1} /></div>
            <div>Sin entregas en los últimos 14 días</div>
          </div>
        );

        const PARAM_DEFS = [
          { key: "acidez", label: "Acidez", ref: QUALITY_REFS["Acidez"],   col: C.accent },
          { key: "ph",     label: "pH",     ref: QUALITY_REFS["pH"],       col: C.sub },
          { key: "gb",     label: "GB %",   ref: QUALITY_REFS["GB"],       col: C.success },
        ];

        return (
          <div>
            <div style={{ ...secTitle, marginBottom: 12 }}>
              Proveedores activos — últimos 14 días · {tambos.length} tambos
            </div>

            {tambos.map(({ nombre, entregas, totalLitros, avgAcidez, avgPh, avgGb, lastDate }) => {
              const isOpen = tamboSel === nombre;
              const avgVals = { acidez: avgAcidez, ph: avgPh, gb: avgGb };
              const anyAlert = PARAM_DEFS.some(({ key, ref }) => {
                const v = avgVals[key];
                return v > 0 && ref && (v < ref.min || v > ref.max);
              });

              return (
                <div key={nombre} style={{
                  ...card, marginBottom: 8, cursor: "pointer",
                  borderColor: anyAlert ? C.accent + "77" : C.border,
                  transition: "border-color 0.3s",
                }} onClick={() => setTamboSel(isOpen ? null : nombre)}>

                  {/* Cabecera */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{nombre}</span>
                        {anyAlert && <span style={{ fontSize: 11, background: C.accentDim, color: C.accent, borderRadius: 6, padding: "1px 7px", fontWeight: 700 }}>⚠ Fuera de ref.</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>
                        {entregas.length} entrega{entregas.length !== 1 ? "s" : ""} ·{" "}
                        <span style={{ fontFamily: FONT_MONO, color: C.accent }}>
                          {(totalLitros / 1000).toFixed(1)}k L
                        </span>
                        {lastDate && <span style={{ marginLeft: 6, color: C.muted }}>· último {fmtDate(lastDate)}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {/* Chips de parámetros con sparklines */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {PARAM_DEFS.map(({ key, label, ref, col }) => {
                      const v = avgVals[key];
                      const ok = v <= 0 || !ref || (v >= ref.min && v <= ref.max);
                      const chipBg  = !ok ? "#1a0808" : C.surface;
                      const chipBdr = !ok ? C.danger + "55" : C.border;
                      return (
                        <div key={key} style={{ background: chipBg, border: `1px solid ${chipBdr}`, borderRadius: 8, padding: "7px 8px" }}>
                          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_MONO, color: v > 0 ? (ok ? col : C.danger) : C.muted, marginBottom: 4 }}>
                            {v > 0 ? v.toFixed(2) : "—"}
                          </div>
                          <Sparkline values={entregas.map(e => e[key])} color={v > 0 ? (ok ? col : C.danger) : C.muted} w={54} h={20} />
                          {ref && v > 0 && (
                            <div style={{ fontSize: 8, color: ok ? C.muted : C.danger, marginTop: 3 }}>
                              {ok ? `✓ ${ref.min}–${ref.max}` : `⚠ ref ${ref.min}–${ref.max}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabla expandida */}
                  {isOpen && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
                        Historial de entregas
                      </div>
                      {/* Header */}
                      <div style={{ display: "grid", gridTemplateColumns: "74px 54px 46px 44px 44px 44px 56px", gap: 3, marginBottom: 5 }}>
                        {["Fecha", "Litros", "Acidez", "pH", "GB", "SNG", "Densidad"].map(h => (
                          <div key={h} style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{h}</div>
                        ))}
                      </div>
                      {/* Rows (newest first) */}
                      {[...entregas].reverse().map((e, i) => {
                        const fieldDefs = [
                          { v: e.acidez, ref: QUALITY_REFS["Acidez"] },
                          { v: e.ph,     ref: QUALITY_REFS["pH"] },
                          { v: e.gb,     ref: QUALITY_REFS["GB"] },
                          { v: e.sng,    ref: QUALITY_REFS["SNG"] },
                          { v: e.dens,   ref: QUALITY_REFS["Densidad"] },
                        ];
                        return (
                          <div key={i} style={{
                            display: "grid", gridTemplateColumns: "74px 54px 46px 44px 44px 44px 56px",
                            gap: 3, padding: "5px 0",
                            borderBottom: i < entregas.length - 1 ? `1px solid ${C.border}22` : "none",
                          }}>
                            <div style={{ fontSize: 11, fontFamily: FONT_MONO, color: e.date === getToday() ? C.accent : C.sub }}>
                              {fmtDate(e.date)}
                            </div>
                            <div style={{ fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, color: C.accent }}>
                              {e.litros > 0 ? e.litros.toLocaleString("es-AR") : "—"}
                            </div>
                            {fieldDefs.map(({ v, ref: r }, j) => {
                              const valid = !isNaN(v) && v > 0;
                              const outRef = valid && r && (v < r.min || v > r.max);
                              return (
                                <div key={j} style={{ fontSize: 11, fontFamily: FONT_MONO, color: outRef ? C.danger : valid ? C.text : C.muted }}>
                                  {valid ? (j === 4 ? v.toFixed(3) : v.toFixed(2)) : "—"}{outRef ? " ⚠" : ""}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};

// ─── APP PRINCIPAL ────────────────────────────────────────────
const SIDEBAR_W = 220;

export default function App() {
  // Restaura sección/fecha/perfil guardados justo antes de recargar para cambio de tema
  const { isDesktop } = useViewport();
  const [section, setSection] = useState(_restoredSession?.section || "ingresos");
  const [date, setDate]       = useState(_restoredSession?.date    || getToday());
  const [datePicker, setDatePicker] = useState(false);
  const [informe, setInforme] = useState(false);
  const [initModal, setInitModal] = useState(false);
  const [initNombre, setInitNombre] = useState(_restoredSession?.nombre || "");
  const [perfil, setPerfil] = useState(_restoredSession?.perfil || null); // null | "supervisor" | "jefe"
  const [perfilModal, setPerfilModal] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [syncKey, setSyncKey] = useState(0); // incrementa cada 10s → refresca datos en todas las secciones
  const [storageOk, setStorageOk] = useState(true);
  const isToday = date === getToday();

  const navItems = perfil
    ? [...NAV, { id: "supervisor", label: "Superv.", Icon: PERFILES[perfil]?.Icon || IcoSupervisor }]
    : NAV;

  // Verificar disponibilidad del storage al iniciar
  useEffect(() => {
    const HC = "yatasto:_hc";
    window.storage.set(HC, "1")
      .then(() => window.storage.get(HC))
      .then(r => setStorageOk(!!r))
      .catch(() => setStorageOk(false));
  }, []);

  // Carry-over automático: al abrir la app traspasa el saldo del día anterior
  useEffect(() => {
    const today = getToday();
    const yesterday = getPreviousDate(today);
    loadSaldo().then(async saldo => {
      if (saldo && saldo.fromDate === yesterday) return; // ya está actualizado
      const totals = await calcAutoLitros(yesterday);
      await saveSaldo(totals, yesterday);
    });
  }, []);

  // Pedir identificación al inicio si el turno actual no tiene responsable
  useEffect(() => {
    if (date !== getToday()) return;
    const t = getCurrentTurno();
    load(date, "stock", {}).then(d => {
      if (!(d[t] || {}).resp) setInitModal(true);
    });
  }, []);

  // Sync cada 10s: refresca datos en tiempo real + heartbeat cada 30s + detección de cambio de día
  useEffect(() => {
    const rol = perfil ? PERFILES[perfil].label : "Operario";
    const nombre = initNombre || "Operario";
    updateHeartbeat(nombre, rol);
    let hbTick = 0;
    let lastDate = getToday();
    const interval = setInterval(() => {
      setSyncKey(k => k + 1);
      hbTick++;
      if (hbTick % 3 === 0) updateHeartbeat(nombre, rol); // heartbeat cada 30 s
      // Detectar cambio de día (app abierta al cruzar la medianoche)
      const today = getToday();
      if (today !== lastDate) {
        const yesterday = getPreviousDate(today);
        calcAutoLitros(yesterday).then(totals => saveSaldo(totals, yesterday));
        lastDate = today;
      }
    }, 10000);
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
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: FONT_SANS, paddingBottom: isDesktop ? 0 : 72 }}>

      {/* Sidebar — desktop only */}
      {isDesktop && (
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
          background: C.surface, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", zIndex: 50,
          boxShadow: _THEME === "light" ? "2px 0 12px rgba(0,0,0,0.06)" : "2px 0 12px rgba(0,0,0,0.3)",
        }}>
          {/* Sidebar header — logo */}
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <YataLogo />
            <div style={{ fontSize: 10, color: C.muted, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Lacteos Yatasto SA
            </div>
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
            {navItems.map(n => {
              const active = section === n.id;
              return (
                <button type="button" key={n.id} onClick={() => setSection(n.id)} style={{
                  width: "100%", border: "none", cursor: "pointer", textAlign: "left",
                  background: active ? C.accentDim : "none",
                  color: active ? C.accent : C.sub,
                  padding: "10px 16px",
                  display: "flex", alignItems: "center", gap: 10,
                  borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                  transition: `background ${DUR.fast}, color ${DUR.fast}, border-color ${DUR.fast}`,
                }}>
                  <n.Icon size={17} strokeWidth={SW} />
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>
                    {n.id === "supervisor" ? "Dashboard" : n.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sidebar footer — date picker */}
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button type="button" onClick={() => setDatePicker(!datePicker)} style={{
              width: "100%", background: isToday ? C.card : C.accentDim,
              border: `1px solid ${isToday ? C.border : C.accentDark}`,
              borderRadius: 8, color: isToday ? C.text : C.accent,
              padding: "8px 10px", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <IcoDate size={13} strokeWidth={SW} />
              <span style={{ fontSize: 12, fontFamily: FONT_MONO, fontWeight: 700 }}>
                {isToday ? "Hoy" : fmtDate(date)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Banner offline — almacenamiento no disponible */}
      {!storageOk && (
        <div style={{
          background: C.danger.replace(/\)$/, " / 0.12)"), borderBottom: `2px solid ${C.danger}`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 300,
          marginLeft: isDesktop ? SIDEBAR_W : 0,
        }}>
          <IcoOffline size={20} strokeWidth={SW} color={C.danger} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.danger }}>Sin acceso al almacenamiento</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
              Los datos no se guardarán. Verificá la conexión con el sistema Antigravity.
            </div>
          </div>
          <button type="button" onClick={() => {
            const HC = "yatasto:_hc";
            window.storage.set(HC, "1").then(() => window.storage.get(HC)).then(r => setStorageOk(!!r)).catch(() => setStorageOk(false));
          }} style={{ background: C.danger.replace(/\)$/, " / 0.15)"), border: `1px solid ${C.danger.replace(/\)$/, " / 0.4)")}`, color: C.danger, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Reintentar
          </button>
        </div>
      )}

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
            <button type="button" style={btnSecondary} onClick={() => setInitModal(false)}>Ahora no</button>
            <button type="button" style={btnPrimary} onClick={guardarResponsable}>Ingresar</button>
          </div>
        </Modal>
      )}

      {/* Modal perfil / login */}
      {perfilModal && (
        <Modal title={perfil ? "Perfil activo" : ""} onClose={closePerfilModal} zIndex={200}>
          {perfil ? (
            <div>
              {/* Logged-in view */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 24, margin: "0 auto 12px",
                  background: _THEME === "light" ? C.accentDim : `${C.accent}18`,
                  border: `2px solid ${C.accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><CowIcon size={40} /></div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{PERFILES[perfil].label}</div>
                <div style={{ fontSize: 11, color: C.success, marginTop: 5, fontWeight: 700, letterSpacing: "0.05em" }}>
                  ● SESIÓN ACTIVA
                </div>
              </div>
              <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger + "55", width: "100%" }} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div>
              {/* Logo header */}
              <div style={{
                textAlign: "center", paddingBottom: 20,
                borderBottom: `1px solid ${C.border}`, marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <YataLogo />
                </div>
                <div style={{ fontSize: 12, color: C.sub, letterSpacing: "0.06em" }}>
                  Lacteos Yatasto SA · Panel de Acceso
                </div>
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
                <div style={{ color: C.danger, fontSize: 12, marginBottom: 12, padding: "8px 12px", background: C.danger.replace(/\)$/, " / 0.08)"), borderRadius: 8, border: `1px solid ${C.danger.replace(/\)$/, " / 0.3)")}` }}>
                  {loginError}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" style={btnSecondary} onClick={closePerfilModal}>Cancelar</button>
                <button type="button" style={btnPrimary} onClick={handleLogin}>Ingresar</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal informe */}
      {informe && <InformeModal date={date} onClose={() => setInforme(false)} />}

      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "9px 14px", position: "sticky", top: 0, zIndex: 40,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: _THEME === "light" ? "0 1px 8px rgba(0,0,0,0.07)" : "0 1px 8px rgba(0,0,0,0.4)",
        marginLeft: isDesktop ? SIDEBAR_W : 0,
      }}>
        {/* Left: Logo + section indicator (mobile only) */}
        {!isDesktop ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <YataLogo compact />
            <div style={{ width: 1, height: 26, background: C.border }} />
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              {(() => { const n = navItems.find(item => item.id === section); return n ? <n.Icon size={14} strokeWidth={SW} /> : null; })()}
              <span>{navItems.find(n => n.id === section)?.label}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
            {(() => { const n = navItems.find(item => item.id === section); return n ? <n.Icon size={15} strokeWidth={SW} color={C.accent} /> : null; })()}
            <span>{navItems.find(n => n.id === section)?.id === "supervisor" ? "Dashboard" : navItems.find(n => n.id === section)?.label}</span>
          </div>
        )}

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Theme toggle */}
          <button type="button" onClick={() => {
            const next = _THEME === "dark" ? "light" : "dark";
            saveSessionForReload({ section, date, perfil, nombre: initNombre });
            try { localStorage.setItem("yatasto:theme", next); } catch {}
            window.location.reload();
          }} title={_THEME === "dark" ? "Modo Yatasto (claro)" : "Modo oscuro"}
             aria-label={_THEME === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
             style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 9, color: C.sub, width: 34, height: 34,
            cursor: "pointer", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>{_THEME === "dark" ? <ThemeLight size={16} strokeWidth={SW} /> : <ThemeDark size={16} strokeWidth={SW} />}</button>

          {/* Botón perfil */}
          <button type="button" onClick={() => setPerfilModal(true)}
            title={perfil ? PERFILES[perfil].label : "Acceder con perfil"}
            aria-label={perfil ? `Perfil: ${PERFILES[perfil].label}` : "Acceder con perfil"}
            style={{
            background: perfil ? C.accentDim : C.card,
            border: `1px solid ${perfil ? C.accentDark : C.border}`,
            borderRadius: 9,
            width: 34, height: 34, cursor: "pointer",
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CowIcon size={20} />
            {perfil && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: C.success, borderRadius: "50%", display: "block", border: `1.5px solid ${C.surface}` }} />
            )}
          </button>

          <button type="button" onClick={() => setInforme(true)} title="Informe del día" aria-label="Ver informe del día" style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 9, color: C.sub, width: 34, height: 34,
            cursor: "pointer", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><IcoInforme size={16} strokeWidth={SW} /></button>

          {!isDesktop && (
            <button type="button" onClick={() => setDatePicker(!datePicker)} style={{
              background: isToday ? C.card : C.accentDim,
              border: `1px solid ${isToday ? C.border : C.accentDark}`,
              borderRadius: 9, color: isToday ? C.text : C.accent,
              padding: "0 10px", height: 34, cursor: "pointer",
              fontSize: 12, fontFamily: FONT_MONO, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <IcoDate size={13} strokeWidth={SW} />
              <span>{isToday ? "Hoy" : fmtDate(date)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Date picker */}
      {datePicker && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 8, marginLeft: isDesktop ? SIDEBAR_W : 0 }}>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setDatePicker(false); }} style={{ ...inp, flex: 1 }} />
          <button type="button" onClick={() => { setDate(getToday()); setDatePicker(false); }} style={{ ...btnPrimary, width: "auto", padding: "10px 16px", whiteSpace: "nowrap" }}>Hoy</button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: isDesktop ? "16px 24px 24px" : "12px 16px 0", marginLeft: isDesktop ? SIDEBAR_W : 0 }}>
        <div style={{ maxWidth: isDesktop ? 960 : "100%", margin: isDesktop ? "0 auto" : undefined }}>
        {section === "ingresos" && <SecIngresos date={date} syncKey={syncKey} />}
        {section === "cip" && <SecCIP date={date} syncKey={syncKey} />}
        {section === "carga" && <SecCarga date={date} syncKey={syncKey} />}
        {section === "movimientos" && <SecMovimientos date={date} syncKey={syncKey} />}
        {section === "stock" && <SecStock date={date} syncKey={syncKey} />}
        {section === "fortificados" && <SecFortificados date={date} syncKey={syncKey} />}
        {section === "supervisor" && perfil && <SecDashboard date={date} perfil={perfil} perfilLabel={PERFILES[perfil]?.label || ""} syncKey={syncKey} />}
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      {!isDesktop && <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.surface, borderTop: `1px solid ${C.border}`,
        display: "grid", gridTemplateColumns: `repeat(${navItems.length},1fr)`,
        zIndex: 40,
        boxShadow: _THEME === "light" ? "0 -2px 12px rgba(0,0,0,0.08)" : "0 -2px 12px rgba(0,0,0,0.4)",
      }}>
        {navItems.map(n => {
          const active = section === n.id;
          return (
            <button type="button" key={n.id} onClick={() => setSection(n.id)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 0 13px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              borderTop: active ? `2.5px solid ${C.accent}` : "2.5px solid transparent",
              transition: "border-color 0.18s",
            }}>
              <span style={{
                display: "flex",
                color: active ? C.accent : C.sub,
                filter: active ? `drop-shadow(0 0 6px ${C.accent}88)` : "none",
                transition: "filter 0.18s, color 0.18s",
              }}><n.Icon size={20} strokeWidth={SW} /></span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: active ? C.accent : C.sub,
                letterSpacing: "0.05em", textTransform: "uppercase",
                transition: "color 0.18s",
              }}>{n.label}</span>
            </button>
          );
        })}
      </div>}
    </div>
  );
}
