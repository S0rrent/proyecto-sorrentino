import { useState, useEffect, Fragment } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { DARK, LIGHT, FONT_SANS, FONT_MONO, EASE_OUT, DUR } from "./tokens.js";
import { useViewport } from "./hooks.js";
import { db, onWriteQueueChange, onSessionExpired, clearSessionExpired } from "./db-adapter.js";
import {
  Ingresos as IcoIngresos, Movimientos as IcoMovimientos, Carga as IcoCarga,
  Fortificados as IcoFortificados, CIP as IcoCIP, Stock as IcoStock, Produccion as IcoProduccion,
  Supervisor as IcoSupervisor, Jefe as IcoJefe, Admin as IcoAdmin,
  ThemeLight, ThemeDark, DatePicker as IcoDate, Informe as IcoInforme, Offline as IcoOffline,
  Destino as IcoDestino, Concentrado as IcoConcentrado, Calidad as IcoCalidad,
  Temperatura as IcoTemp, Buscar as IcoBuscar, Instalacion as IcoInstalacion,
  Mantenimiento as IcoMant, ControlSilo as IcoCtrl, LecheIcon as IcoLeche,
  Balance as IcoBalance, AlertaError, AlertaWarn, AlertaOk, CheckMark,
  Eliminar as IcoEliminar, TabResumen, TabSilos, TabCalidad, TabDifs,
  TabSemana, TabHistorial, TabExportar, CamionIcon, UsuariosOnline,
  DiaCerrado as IcoCerrado, DiaAbierto as IcoAbierto, SyncError as IcoSyncError, Syncing as IcoSyncing,
  SW,
} from "./icons.js";

// ─── HELPERS DE EXPORTACIÓN ───────────────────────────────────
const escapeHtml = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const escapeCsv = s => {
  const str = String(s == null ? "" : s);
  return /[,"\n\r=+\-@|]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// ─── CONSTANTES ───────────────────────────────────────────────
const TAMBOS_BASE = [
  { num: 13,  nombre: "SEIVANE" },    { num: 90,  nombre: "ESTAR 1" },
  { num: 91,  nombre: "ESTAR 2" },    { num: 93,  nombre: "ESTAR 3" },
  { num: 16,  nombre: "TUESO" },      { num: 30,  nombre: "CARPINETI" },
  { num: 24,  nombre: "COGORNO" },    { num: 26,  nombre: "PAZOS 2" },
  { num: 60,  nombre: "BRUNO" },      { num: 104, nombre: "VIVOT" },
  { num: 1,   nombre: "MURPHY 1" },   { num: 2,   nombre: "MURPHY 2" },
  { num: 89,  nombre: "OPOCA" },      { num: 35,  nombre: "ETCHEVERRY" },
  { num: 14,  nombre: "ZIVERRA" },    { num: 65,  nombre: "MELO" },
  { num: 17,  nombre: "GIORGI G." },  { num: 18,  nombre: "GIORGI F." },
  { num: 21,  nombre: "GUSTI CARLOS" },{ num: 46, nombre: "PINIERO JORGE" },
  { num: 49,  nombre: "STA ROSA" },   { num: 49,  nombre: "CEJAS" },
  { num: 50,  nombre: "VAQUERIA" },   { num: 51,  nombre: "SPINELLI" },
  { num: "-", nombre: "FAISAN" },     { num: 4,   nombre: "ZONA" },
  { num: "-", nombre: "CANAGRO" },    { num: "-", nombre: "CHAMEN" },
  { num: "-", nombre: "ANDORNO" },
  { num: "-", nombre: "HOURCADE 1" }, { num: "-", nombre: "HOURCADE 2" },
  { num: "-", nombre: "HOURCADE 3" }, { num: "-", nombre: "HOURCADE 5" },
  { num: "-", nombre: "NANFARO" },
];
// Mapa de transportista → tambos que habitualmente traslada (el operario puede cambiar)
const TRANSPORTISTAS = {
  GRISARO:    ["SEIVANE", "ETCHEVERRY", "MELO", "ANDORNO"],
  CUARELA:    ["ESTAR 1", "ESTAR 2", "BRUNO", "PINIERO JORGE"],
  LLANOS:     ["TUESO", "COGORNO", "VIVOT", "STA ROSA", "HOURCADE 1", "HOURCADE 2", "HOURCADE 3", "HOURCADE 5"],
  GALVAN:     ["CARPINETI", "MURPHY 1", "MURPHY 2", "OPOCA", "GIORGI G."],
  ANGRIGIANI: ["NANFARO"],
};
const CAMIONES_BASE = ["GRISARO", "CUARELA", "BARTOLINI", "LLANO 1", "LLANO 2", "GALVAN", "ANGRIGIANI"];
const FORT_DESTINOS = ["Tetra", "Ultra", "Yogur", "Postre", "Acción Correctiva"];
const PERFILES = {
  supervisor:   { usuario: "Supervisor",    email: "supervisor@yatasto.internal", label: "Supervisor",       Icon: IcoSupervisor },
  jefe:         { usuario: "Jefe",          email: "jefe@yatasto.internal",       label: "Jefe de Planta",   Icon: IcoJefe },
  admin:        { usuario: "Administracion",email: "admin@yatasto.internal",      label: "Administración",   Icon: IcoAdmin },
};
const SILOS = ["100 NUEVO", "100 VIEJO", "80", "60", "42", "40F", "20", "15"];
const SILOS_TODOS = [...SILOS, "TQ1", "TQ2", "TQ3", "TQ5", "TQ6", "TQ7", "TQ8", "TQ9", "POSTRE", "TINA", "DULCE"];
const CIP_SILOS = ["100 N", "100 V", "80", "60", "42", "40F", "20", "15", "LINEA 1", "LINEA 2"];
const SILOS_GRUPO   = ["100 N","100 V","80","60","42","40F","20","15"];
const PROCESO_GRUPO = ["TQ1","TQ2","TQ3","TQ5","TQ6","TQ7","TQ8","TQ9","TINA","DULCE","POSTRE"];
const STOCK_SILOS   = [...SILOS_GRUPO, ...PROCESO_GRUPO];
const TURNOS = ["07:00", "14:00", "21:00"];
const TURNO_LABELS = { "07:00": "Mañana", "14:00": "Tarde", "21:00": "Noche" };
const TURNO_CIERRE = { "07:00": "14:00", "14:00": "21:00", "21:00": "07:00" }; // hora de cierre
const PRODUCTOS = ["Leche Cruda", "Leche Descremada", "Lactosa", "Suero"];
const PRODS_STOCK = [
  "Leche Cruda", "Leche Entera", "Leche Descremada", "Leche Fortificada",
  "Lactosa", "Suero", "Yogurt", "Sucio (vacío)", "Limpio",
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
  "TQ1": 5000, "TQ2": 5000, "TQ3": 6000, "TQ5": 3000,
  "TQ6": 15000, "TQ7": 15000, "TQ8": 3000, "TQ9": 4000,
  "TINA": 6000, "DULCE": 1900, "POSTRE": 1850,
};
// Mínimos recomendados por silo (litros)
const SILO_MIN = {
  "100 N": 5000, "100 V": 5000,
  "80": 4000, "60": 3000, "42": 2000,
  "40F": 2000, "20": 1000, "15": 1000,
  "TQ1": 300, "TQ2": 300, "TQ3": 300, "TQ5": 200,
  "TQ6": 500, "TQ7": 500, "TQ8": 200, "TQ9": 200,
  "TINA": 300, "DULCE": 100, "POSTRE": 100,
};
// Máximos recomendados por silo (litros) — 95% de capacidad aprox.
const SILO_MAX = {
  "100 N": 95000, "100 V": 95000,
  "80": 76000, "60": 57000, "42": 40000,
  "40F": 38000, "20": 19000, "15": 14000,
  "TQ1": 4750, "TQ2": 4750, "TQ3": 5700, "TQ5": 2850,
  "TQ6": 14250, "TQ7": 14250, "TQ8": 2850, "TQ9": 3800,
  "TINA": 5700, "DULCE": 1800, "POSTRE": 1760,
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
  "Limpio": "#16a34a",
};

// Mapeo de nombres de silos → clave en STOCK_SILOS
const SILO_STOCK_KEY = {
  "100 NUEVO": "100 N", "100 N": "100 N",
  "100 VIEJO": "100 V", "100 V": "100 V",
  "80": "80", "60": "60", "42": "42", "40F": "40F",
  "20": "20", "15": "15",
  "TQ1": "TQ1", "TQ2": "TQ2", "TQ3": "TQ3", "TQ5": "TQ5",
  "TQ6": "TQ6", "TQ7": "TQ7", "TQ8": "TQ8", "TQ9": "TQ9",
  "TINA": "TINA", "DULCE": "DULCE", "POSTRE": "POSTRE",
};
// Productos de despacho para carga de camiones
const CARGA_PRODUCTOS_BASE = ["Leche Entera", "Leche Descremada", "Suero", "Lactosa", "Concentrado", "Crema", "Otro"];
// Categorías de producción y sus variantes para el wizard
const PROD_CATEGORIAS = {
  "Leche Tetra":    ["Entera", "Descremada"],
  "Leche Ultra":    ["Entera", "Descremada"],
  "Yogurt Bebible": ["Frutilla", "Durazno", "Vainilla"],
  "Yogurt Batido":  ["Frutilla", "Vainilla"],
  "Yogurt Firme":   ["Frutilla", "Vainilla"],
  "Flan":           ["Vainilla", "Chocolate"],
  "Postre 100g":    ["Chocolate", "DDL", "Vainilla"],
  "Postre 230g":    ["Chocolate", "DDL", "Vainilla"],
  "Gelatina":       ["Manzana", "Frutilla"],
  "DDL":            ["Familiar 400g", "Repostero 400g"],
  "Otro":           null,
};
// Productos de producción con unidades/caja y volumen por unidad (litros)
const PRODS_PRODUCCION_LIST = [
  { cat: "Leche Tetra",    variant: "Entera",        nombre: "TETRA Entera",            up: 12, vol: 1.0  },
  { cat: "Leche Tetra",    variant: "Descremada",     nombre: "TETRA Descremada",        up: 12, vol: 1.0  },
  { cat: "Leche Ultra",    variant: "Entera",         nombre: "ULTRA Entera",            up: 12, vol: 1.0  },
  { cat: "Leche Ultra",    variant: "Descremada",     nombre: "ULTRA Descremada",        up: 12, vol: 1.0  },
  { cat: "Yogurt Bebible", variant: "Frutilla",       nombre: "Yogurt Bebible Frutilla", up: 24, vol: 0.2  },
  { cat: "Yogurt Bebible", variant: "Durazno",        nombre: "Yogurt Bebible Durazno",  up: 24, vol: 0.2  },
  { cat: "Yogurt Bebible", variant: "Vainilla",       nombre: "Yogurt Bebible Vainilla", up: 24, vol: 0.2  },
  { cat: "Yogurt Batido",  variant: "Frutilla",       nombre: "Yogurt Batido Frutilla",  up: 12, vol: 0.4  },
  { cat: "Yogurt Batido",  variant: "Vainilla",       nombre: "Yogurt Batido Vainilla",  up: 12, vol: 0.4  },
  { cat: "Yogurt Firme",   variant: "Frutilla",       nombre: "Yogurt Firme Frutilla",   up: 20, vol: 0.2  },
  { cat: "Yogurt Firme",   variant: "Vainilla",       nombre: "Yogurt Firme Vainilla",   up: 20, vol: 0.2  },
  { cat: "Flan",           variant: "Vainilla",       nombre: "Flan Vainilla",           up: 24, vol: 0.1  },
  { cat: "Flan",           variant: "Chocolate",      nombre: "Flan Chocolate",          up: 24, vol: 0.1  },
  { cat: "Postre 100g",    variant: "Chocolate",      nombre: "Postre 100g Chocolate",   up: 24, vol: 0.1  },
  { cat: "Postre 100g",    variant: "DDL",            nombre: "Postre 100g DDL",         up: 24, vol: 0.1  },
  { cat: "Postre 100g",    variant: "Vainilla",       nombre: "Postre 100g Vainilla",    up: 24, vol: 0.1  },
  { cat: "Postre 230g",    variant: "Chocolate",      nombre: "Postre 230g Chocolate",   up: 20, vol: 0.23 },
  { cat: "Postre 230g",    variant: "DDL",            nombre: "Postre 230g DDL",         up: 20, vol: 0.23 },
  { cat: "Postre 230g",    variant: "Vainilla",       nombre: "Postre 230g Vainilla",    up: 20, vol: 0.23 },
  { cat: "Gelatina",       variant: "Manzana",        nombre: "Gelatina Manzana",        up: 24, vol: 0.1  },
  { cat: "Gelatina",       variant: "Frutilla",       nombre: "Gelatina Frutilla",       up: 24, vol: 0.1  },
  { cat: "DDL",            variant: "Familiar 400g",  nombre: "DDL Familiar 400g",       up: 12, vol: 0.4  },
  { cat: "DDL",            variant: "Repostero 400g", nombre: "DDL Repostero 400g",      up: 12, vol: 0.4  },
  { cat: "Otro",           variant: "Otro",           nombre: "Otro",                    up: 1,  vol: 1.0  },
];
// Productos concentrados que usan formulario simplificado en ingresos
const PRODS_CONCENTRADOS = ["Lactosa", "Suero", "Concentrado"];

// ─── UTILS ────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];
const getPreviousDate = (dateStr) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; };
const addDay = (dateStr) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };
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
  try {
    const r = await db.get(sKey(date, sec));
    _loadedAt.set(sKey(date, sec), r ? (r.updatedAt || null) : null);
    return r ? JSON.parse(r.value) : def;
  }
  catch { return def; }
}
async function save(date, sec, data) {
  if (_closedDates.has(date)) { _onSaveBlocked?.(); return false; }
  _autoLitrosCache.delete(date);
  const key = sKey(date, sec);
  // C5: detectar modificación concurrente antes de escribir
  const lastKnown = _loadedAt.get(key);
  if (lastKnown !== undefined) {
    try {
      const remote = await db.getTimestamp(key);
      if (remote?.updatedAt && remote.updatedAt !== lastKnown) {
        _onSaveConflict?.({ sec, date });
        return false;
      }
    } catch { /* error de red — continuar con el save */ }
  }
  try {
    const ts = await db.set(key, JSON.stringify(data));
    if (ts) _loadedAt.set(key, ts);
    else _loadedAt.delete(key);
  } catch (e) { console.error(e); }
  // Edición retroactiva: cualquier guardado en una fecha anterior a ayer
  // invalida el saldo encadenado y dispara una reconstrucción debounceada.
  const today = getToday();
  const yesterday = getPreviousDate(today);
  if (date < yesterday) {
    // Invalidar inmediatamente todas las fechas posteriores (no esperar al rebuild)
    invalidateAutoLitrosFrom(date);
    scheduleRebuildSaldoChain(date, `edit-retro:${sec}`);
  }
  return true;
}

// Guarda de cierre de día — sincronizada desde App vía _markDayClosed()
const _closedDates = new Set();
let _onSaveBlocked = null;
// C5: timestamps de última carga por clave de sección; detecta modificaciones concurrentes
const _loadedAt = new Map();
let _onSaveConflict = null;
function _markDayClosed(date, closed) {
  if (closed) _closedDates.add(date); else _closedDates.delete(date);
}
async function loadCfg() {
  const def = { tambosCustom: [], camionesCustom: [], transportistas: [], cargaProductosCustom: [] };
  try { const r = await db.get(CFG_KEY); return r ? { ...def, ...JSON.parse(r.value) } : def; }
  catch { return def; }
}
// Saldo de silos entre días
// SALDO_KEY = fast path para hoy: resultado encadenado hasta ayer (actualizado por cadena y cierre del día)
// SALDO_BASE_KEY = ancla permanente: ingresado manualmente; nunca sobreescrito por la cadena
async function loadSaldo() {
  try { const r = await db.get(SALDO_KEY); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function saveSaldo(data, fromDate, productos) {
  try {
    const payload = { data, fromDate };
    if (productos && Object.keys(productos).length > 0) payload.productos = productos;
    await db.set(SALDO_KEY, JSON.stringify(payload));
  } catch { }
}
async function loadBaseSaldo() {
  try { const r = await db.get(SALDO_BASE_KEY); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function saveBaseSaldo(data, fromDate, productos) {
  try {
    const payload = { data, fromDate };
    if (productos && Object.keys(productos).length > 0) payload.productos = productos;
    await db.set(SALDO_BASE_KEY, JSON.stringify(payload));
  } catch { }
}
async function saveCfg(data) {
  try { await db.set(CFG_KEY, JSON.stringify(data)); } catch (e) { console.error(e); }
}
const ELIM_KEY        = "yatasto:eliminados";
const USERS_KEY       = "yatasto:usuarios";
const SALDO_KEY       = "yatasto:saldo-silos";  // fast path: cadena hasta ayer
const SALDO_BASE_KEY  = "yatasto:saldo-base";   // ancla manual permanente
const SR_KEY          = "yatasto:session-restore";
const estadoKey  = d => `yatasto:${d}:estado`;
const auditKey   = d => `yatasto:audit:${d}`;

async function loadEstado(d) {
  try { const r = await db.get(estadoKey(d)); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function saveEstado(d, est) {
  try { await db.set(estadoKey(d), JSON.stringify(est)); } catch { }
}
async function logAudit(d, action, tipo, resumen, by) {
  try {
    const r = await db.get(auditKey(d));
    const log = r ? JSON.parse(r.value) : [];
    log.push({ ts: new Date().toISOString(), action, tipo, resumen, by: by || "Operario" });
    await db.set(auditKey(d), JSON.stringify(log));
  } catch { }
}

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
  "pH":          { min: 6.6,   max: 6.8   },
  "Acidez":      { min: 14,    max: 18    },
  "GB":          { min: 3,     max: 4     },
  "SNG":         { min: 8,     max: 8.7   },
  "Proteína":    { min: 2.9,   max: 3.5   },
  "Temperatura": { min: 3,     max: 8     },
  "Aguado":      { min: 0,     max: 0,    critical: true },
  "Densidad":    { min: 1.028, max: 1.034 },
};

// ─── DENSIDAD: normalización formato Ecomilk ─────────────────────────────────
// El Ecomilk muestra: 28, 29, 30, 31, 34
// Formato técnico:    1.028, 1.029, 1.030, 1.031, 1.034
// Regla: entero sin punto decimal en rango [20, 40] → interpretar como Ecomilk.

function isEcomilkDensity(v) {
  const s = String(v == null ? "" : v).trim().replace(",", ".");
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 20 && n <= 40;
}

// Convierte cualquier formato válido al valor técnico con 3 decimales (4 si Ecomilk con decimal).
function normalizeDensity(v) {
  if (v === "" || v == null) return "";
  const s = String(v).trim().replace(",", ".");
  if (isEcomilkDensity(s)) {
    const n = parseFloat(s);
    return (1 + n / 1000).toFixed(Number.isInteger(n) ? 3 : 4);
  }
  const n = parseFloat(s);
  return !isNaN(n) ? n.toFixed(3) : String(v);
}

// Para display en auditorías, reportes y exports.
// Retro-compatible: si un registro viejo tuviera "28" guardado, lo convierte al mostrarlo.
function formatDensity(v) {
  if (v === "" || v == null) return "";
  const s = String(v).trim().replace(",", ".");
  if (isEcomilkDensity(s)) {
    const n = parseFloat(s);
    return (1 + n / 1000).toFixed(Number.isInteger(n) ? 3 : 4);
  }
  const n = parseFloat(s);
  return !isNaN(n) ? n.toFixed(3) : String(v);
}

// Retorna null si el valor es válido; string de error si no.
function validateDensity(raw) {
  if (raw === "" || raw == null) return null;
  const s = String(raw).trim().replace(",", ".");
  if (isEcomilkDensity(s)) return null; // 20–40 Ecomilk → OK
  const n = parseFloat(s);
  if (isNaN(n)) return "Valor inválido";
  if (n < 1.020 || n > 1.040) return `Fuera de rango (1.020–1.040 ó 20–40 Ecomilk)`;
  return null;
}

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
    const r = await db.get(USERS_KEY);
    const users = r ? JSON.parse(r.value) : [];
    const now = Date.now();
    const filtered = users.filter(u => u.id !== SESSION_ID && now - u.ts < 120000);
    filtered.push({ id: SESSION_ID, nombre: nombre || "Operario", rol: rol || "Operario", ts: now });
    await db.set(USERS_KEY, JSON.stringify(filtered));
  } catch { }
}
async function getActiveUsers() {
  try {
    const r = await db.get(USERS_KEY);
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
async function logDelete(tipo, item, by) {
  const resumen = buildResumen(tipo, item);
  // Registro global (para dashboard de historial)
  try {
    const r = await db.get(ELIM_KEY);
    const log = r ? JSON.parse(r.value) : [];
    log.unshift({ fecha: getToday(), hora: getNow(), tipo, resumen, by: by || "Operario" });
    await db.set(ELIM_KEY, JSON.stringify(log.slice(0, 500)));
  } catch { }
  // Registro por día (sin cap, consultable por fecha)
  await logAudit(getToday(), "delete", tipo, resumen, by);
}

// Backup completo: descarga todas las keys "yatasto:*" como JSON al dispositivo
async function generateBackup() {
  const rows = await db.list("yatasto:");
  const pad = n => String(n).padStart(2, "0");
  const now = new Date();
  const payload = {
    generado: now.toISOString(),
    version: "1.0",
    total_registros: rows.length,
    datos: Object.fromEntries(rows.map(r => {
      try { return [r.key, JSON.parse(r.value)]; } catch { return [r.key, r.value]; }
    })),
  };
  const filename = `yatasto-backup-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  try { localStorage.setItem("yatasto:ultimo-backup-date", now.toISOString().split("T")[0]); } catch {}
}

// Calcula litros netos por silo: saldo_anterior + ingresos + movimientos − cargas − fort_origen + fort_destino
const _autoLitrosCache = new Map(); // key: date → { result, ts }
const _AUTO_LITROS_TTL = 15000;     // 15 s — suficiente para una navegación completa

// Invalida todas las entradas de cache con fecha >= fromDate (inclusivo).
// Necesario cuando una edición retroactiva afecta cálculos de días posteriores.
function invalidateAutoLitrosFrom(fromDate) {
  let count = 0;
  for (const key of _autoLitrosCache.keys()) {
    if (key >= fromDate) { _autoLitrosCache.delete(key); count++; }
  }
  return count;
}

// calcAutoLitros puede llamarse en dos modos:
// - modo normal (sin args extra): lee el saldo desde DB
// - modo cadena (con _baseTotals y _baseProductos): usa la base provista, no va a DB para el saldo
async function calcAutoLitros(date, _baseTotals, _baseProductos) {
  const chainMode = _baseTotals != null;

  if (!chainMode) {
    const hit = _autoLitrosCache.get(date);
    if (hit && Date.now() - hit.ts < _AUTO_LITROS_TTL) return hit.result;
  }

  const [ingresos, movData, cargas, forts, produccion, saldo, baseSaldo] = await Promise.all([
    load(date, "ingresos", []),
    load(date, "movimientos", { movs: [], ctrls: [] }),
    load(date, "carga", []),
    load(date, "fortificados", []),
    load(date, "produccion", []),
    chainMode ? Promise.resolve(null) : loadSaldo(),
    chainMode ? Promise.resolve(null) : loadBaseSaldo(),
  ]);
  const totals = {};
  // productosBase: carry-over de productos del día anterior, luego sobreescrito por operaciones del día
  const productosBase = {};

  if (chainMode) {
    // Base provista externamente (cadena de días) — modo chain no toca DB para el saldo
    Object.entries(_baseTotals).forEach(([k, v]) => { if (v > 0) totals[k] = v; });
    Object.entries(_baseProductos || {}).forEach(([k, p]) => { if (p) productosBase[k] = p; });
  } else if (saldo && saldo.fromDate && saldo.fromDate < date) {
    // Fast path: SALDO_KEY tiene el resultado encadenado hasta (al menos) ayer → usarlo directo
    Object.entries(saldo.data || {}).forEach(([key, litros]) => {
      if (litros > 0) totals[key] = (totals[key] || 0) + litros;
    });
    Object.entries(saldo.productos || {}).forEach(([key, prod]) => {
      if (prod) productosBase[key] = prod;
    });
  } else if (baseSaldo && baseSaldo.fromDate && baseSaldo.fromDate < date) {
    // Fallback: SALDO_KEY es demasiado reciente (o no existe) para esta fecha histórica.
    // Usar SALDO_BASE_KEY (ancla manual) y encadenar día a día hasta date-1.
    const prevDate = getPreviousDate(date);
    if (baseSaldo.fromDate === prevDate) {
      // Base es exactamente el día anterior — usar directamente sin encadenar
      Object.entries(baseSaldo.data || {}).forEach(([k, v]) => { if (v > 0) totals[k] = v; });
      Object.entries(baseSaldo.productos || {}).forEach(([k, p]) => { if (p) productosBase[k] = p; });
    } else {
      // Encadenar desde baseSaldo hasta prevDate (date-1)
      const chain = await buildChainedSaldo(baseSaldo, prevDate);
      Object.entries(chain.totals).forEach(([k, v]) => { if (v > 0) totals[k] = v; });
      Object.assign(productosBase, chain.productosBase);
    }
  }
  ingresos.forEach(ing => {
    const key = SILO_STOCK_KEY[ing.destino];
    if (key) {
      totals[key] = (totals[key] || 0) + (parseFloat(ing.litrosFca) || 0);
      // Ingreso define el producto del silo (sobreescribe el carry-over)
      if (ing.producto) productosBase[key] = ing.producto;
    }
  });
  (movData.movs || []).forEach(mov => {
    const from = SILO_STOCK_KEY[mov.desde];
    const to = SILO_STOCK_KEY[mov.hasta];
    const L = parseFloat(mov.litros) || 0;
    if (from) totals[from] = (totals[from] || 0) - L;
    if (to) {
      totals[to] = (totals[to] || 0) + L;
      // Movimiento lleva el producto del silo origen al destino
      if (productosBase[from] && !productosBase[to]) productosBase[to] = productosBase[from];
    }
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
    if (to && L > 0) {
      totals[to] = (totals[to] || 0) + L;
      productosBase[to] = "Leche Fortificada"; // fortified overrides
    }
    // Adiciones líquidas (L / mL) suman volumen al destino
    (f.adiciones || []).forEach(a => {
      const qty = parseFloat(a.cantidad) || 0;
      if (qty > 0 && to) {
        if (a.unidad === "L") totals[to] = (totals[to] || 0) + qty;
        if (a.unidad === "mL") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "cc") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "kg") totals[to] = (totals[to] || 0) + qty; // 1 kg ≈ 1 L
        if (a.unidad === "g") totals[to] = (totals[to] || 0) + qty / 1000;
        if (a.unidad === "mg") totals[to] = (totals[to] || 0) + qty / 1000000;
      }
    });
  });
  // Producción: reservados (enviado/envasando) o descuentos reales (finalizado)
  const reservados = {};
  produccion.forEach(p => {
    if (p.estado === "cancelado") return;
    if (p.estado === "finalizado") {
      // Para lotes finalizados con merma/decomiso: descontar todo el enviado (sobrante también se pierde)
      const useMerma = p.destinoSobrante === "merma" || p.destinoSobrante === "decomiso";
      const sources = useMerma
        ? (p.origenes || [])
        : (p.litrosUsados && p.litrosUsados.length > 0 ? p.litrosUsados : (p.origenes || []));
      sources.forEach(o => {
        const from = SILO_STOCK_KEY[o.silo];
        const L = parseFloat(o.litros) || 0;
        if (from && L > 0) totals[from] = (totals[from] || 0) - L;
      });
      // Si el sobrante va a otro silo lo maneja el movimiento automático (procesado arriba)
    } else if (!("litrosUsados" in p)) {
      // Lote anterior a la nueva lógica (sin campo litrosUsados): descontar directamente
      (p.origenes || []).forEach(o => {
        const from = SILO_STOCK_KEY[o.silo];
        const L = parseFloat(o.litros) || 0;
        if (from && L > 0) totals[from] = (totals[from] || 0) - L;
      });
    } else {
      // enviado / envasando con nueva lógica: reservar sin descontar stock real
      (p.origenes || []).forEach(o => {
        const from = SILO_STOCK_KEY[o.silo];
        const L = parseFloat(o.litros) || 0;
        if (from && L > 0) reservados[from] = (reservados[from] || 0) + L;
      });
    }
    // Sobrante "reservado": lote finalizado pero el sobrante sigue reservado (no vuelve al stock libre)
    if (p.estado === "finalizado" && p.destinoSobrante === "reservado" && p.sobranteL > 0 && p.litrosUsados?.length > 0) {
      (p.origenes || []).forEach((o, i) => {
        const from = SILO_STOCK_KEY[o.silo];
        const sob = Math.max(0, (parseFloat(o.litros) || 0) - (parseFloat((p.litrosUsados)[i]?.litros) || 0));
        if (from && sob > 0) reservados[from] = (reservados[from] || 0) + sob;
      });
    }
  });
  const result = { totals, productosBase, reservados };
  // Solo cachear en modo normal (no en cadena, que es one-shot)
  if (!chainMode) _autoLitrosCache.set(date, { result, ts: Date.now() });
  return result;
}

// buildChainedSaldo: dada una base (saldo de fecha X), recorre cada día hasta targetDate
// calculando las operaciones de cada jornada sobre el resultado del día anterior.
// Corrige el problema de gaps multi-día en el carry-over.
// Retorna { totals, productosBase, truncated, daysProcessed, lastDate }.
const _CHAIN_MAX_DAYS = 365;
async function buildChainedSaldo(baseSaldo, targetDate) {
  let totals = { ...baseSaldo.data };
  let productosBase = { ...(baseSaldo.productos || {}) };
  let d = addDay(baseSaldo.fromDate);
  let iters = 0;
  let lastDate = baseSaldo.fromDate;
  while (d <= targetDate && iters < _CHAIN_MAX_DAYS) {
    const r = await calcAutoLitros(d, totals, productosBase);
    totals = r.totals;
    productosBase = r.productosBase;
    lastDate = d;
    d = addDay(d);
    iters++;
  }
  const truncated = iters >= _CHAIN_MAX_DAYS && d <= targetDate;
  if (truncated) {
    console.warn(`[buildChainedSaldo] cadena truncada: ${iters} iteraciones, último día procesado ${lastDate}, falta llegar a ${targetDate}`);
  }
  return { totals, productosBase, truncated, daysProcessed: iters, lastDate };
}

// ─── REBUILD SALDO CHAIN ─────────────────────────────────────
// Helper centralizado para reconstruir el saldo encadenado (SALDO_KEY) tras una
// edición retroactiva. Lee SALDO_BASE_KEY (ancla manual) y encadena hasta ayer.
// Idempotente — se puede ejecutar múltiples veces sin efectos colaterales.
// Invalida _autoLitrosCache desde fromDate en adelante.
async function rebuildSaldoChain(fromDate, reason = "manual") {
  const today = getToday();
  const yesterday = getPreviousDate(today);
  if (fromDate > yesterday) {
    return { rebuilt: false, reason: "fromDate posterior a ayer" };
  }
  const base = await loadBaseSaldo();
  if (!base || !base.fromDate) {
    console.warn(`[rebuildSaldoChain] sin SALDO_BASE_KEY — no se puede reconstruir desde ${fromDate} (${reason})`);
    invalidateAutoLitrosFrom(fromDate);
    return { rebuilt: false, reason: "sin SALDO_BASE_KEY" };
  }
  // El base debe ser anterior a fromDate; si es posterior, no podemos reconstruir desde antes
  if (base.fromDate >= fromDate) {
    console.warn(`[rebuildSaldoChain] base (${base.fromDate}) >= fromDate (${fromDate}) — no se puede reconstruir desde antes del ancla`);
    invalidateAutoLitrosFrom(fromDate);
    return { rebuilt: false, reason: "ancla posterior a fromDate" };
  }
  // Invalidar cache para que el chain re-lea datos frescos de los días afectados
  invalidateAutoLitrosFrom(addDay(base.fromDate));
  console.log(`[rebuildSaldoChain] motivo="${reason}" base=${base.fromDate} → hasta=${yesterday}`);
  const result = await buildChainedSaldo(base, yesterday);
  if (result.truncated) {
    console.warn(`[rebuildSaldoChain] cadena TRUNCADA en ${result.lastDate}, falta hasta ${yesterday} (${result.daysProcessed} días procesados)`);
  }
  await saveSaldo(result.totals, yesterday, result.productosBase);
  // Cache de hoy debe regenerarse en próxima lectura
  invalidateAutoLitrosFrom(today);
  return { rebuilt: true, truncated: result.truncated, base: base.fromDate, lastDate: result.lastDate, daysProcessed: result.daysProcessed };
}

// Coalesce de rebuilds: si llegan varios en rato corto, ejecutamos uno solo
// con la fecha más antigua. Throttle de 2s.
let _rebuildPendingFrom = null;
let _rebuildTimer = null;
let _rebuildLog = [];
function scheduleRebuildSaldoChain(fromDate, reason) {
  if (_rebuildPendingFrom === null || fromDate < _rebuildPendingFrom) {
    _rebuildPendingFrom = fromDate;
  }
  if (_rebuildTimer) clearTimeout(_rebuildTimer);
  _rebuildTimer = setTimeout(async () => {
    const fd = _rebuildPendingFrom;
    _rebuildPendingFrom = null;
    _rebuildTimer = null;
    try {
      const r = await rebuildSaldoChain(fd, reason || "edición retroactiva");
      _rebuildLog.unshift({ ts: new Date().toISOString(), from: fd, reason, ...r });
      _rebuildLog = _rebuildLog.slice(0, 20); // últimos 20
    } catch (e) {
      console.error("[scheduleRebuildSaldoChain] error:", e);
      _rebuildLog.unshift({ ts: new Date().toISOString(), from: fd, reason, error: String(e) });
    }
  }, 2000);
}

// Expone el log de rebuilds para el panel técnico.
function getRebuildLog() { return [..._rebuildLog]; }

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
  const isLimpio = producto === "Limpio";
  const rawPct = Math.min(1, Math.max(0, (litros || 0) / cap));
  const fillPct = (isSucio || isLimpio) && rawPct === 0 ? 0.06 : rawPct;
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
// Input decimal inteligente para parámetros de calidad.
// - Acepta tanto "," como "." como separador decimal (iOS decimal keyboard usa ",")
// - Normaliza a "," para display, a "." para almacenamiento (parseFloat-compatible)
// - decimalAfter: posición donde se inserta la coma automáticamente al salir del campo
//   (ej: decimalAfter=1 → "66" se formatea como "6,6"; decimalAfter=2 → "166" → "16,6")
const SmartDecInp = ({ value, onChange, decimalAfter = 1, placeholder, readOnly }) => {
  const [local, setLocal] = useState(() =>
    value != null && value !== "" ? String(value).replace(".", ",") : ""
  );
  useEffect(() => {
    setLocal(value != null && value !== "" ? String(value).replace(".", ",") : "");
  }, [value]);
  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9.,]/g, "");
    const parts = raw.split(/[.,]/);
    if (parts.length > 2) {
      raw = parts[0] + "," + parts.slice(1).join("");
    } else {
      raw = raw.replace(".", ",");
    }
    setLocal(raw);
    onChange(raw.replace(",", "."));
  };
  const handleBlur = () => {
    if (!local.trim()) return;
    if (!local.includes(",")) {
      const digits = local.replace(/[^0-9]/g, "");
      if (digits.length >= decimalAfter) {
        const intPart = digits.slice(0, decimalAfter);
        const decPart = digits.slice(decimalAfter);
        const formatted = decPart ? `${intPart},${decPart}` : `${intPart},`;
        setLocal(formatted);
        onChange(`${intPart}.${decPart}`);
      }
    }
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      style={{ ...inp, ...(readOnly ? { opacity: 0.6, cursor: "default" } : {}) }}
      value={local}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  );
};
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
const Pair = ({ label, v1, v2, on1, on2, decimalAfter = 1 }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={lbl}>{label} — <span style={{ color: C.text }}>Fca.</span> / <span style={{ color: C.sub }}>Tbo.</span></label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <SmartDecInp value={v1} onChange={on1} decimalAfter={decimalAfter} placeholder="Fca." />
      <SmartDecInp value={v2} onChange={on2} decimalAfter={decimalAfter} placeholder="Tbo." />
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
  // Body scroll lock — evita que el contenido detrás scrollee mientras hay un modal abierto.
  // Restaura el overflow original al desmontar (soporta modales anidados via contador en dataset).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const count = parseInt(body.dataset.yatModalCount || "0", 10);
    if (count === 0) {
      body.dataset.yatModalPrevOverflow = body.style.overflow || "";
      body.style.overflow = "hidden";
    }
    body.dataset.yatModalCount = String(count + 1);
    return () => {
      const c = parseInt(body.dataset.yatModalCount || "1", 10);
      if (c <= 1) {
        body.style.overflow = body.dataset.yatModalPrevOverflow || "";
        delete body.dataset.yatModalPrevOverflow;
        delete body.dataset.yatModalCount;
      } else {
        body.dataset.yatModalCount = String(c - 1);
      }
    };
  }, []);
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
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: C.card, border: "none", color: C.sub, borderRadius: 8, width: 44, height: 44, cursor: "pointer", fontSize: 22, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {children}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
};

// Hook imperativo de confirmación — reemplazo de window.confirm()
// Uso: const [confirmUI, askConfirm] = useConfirm();
//      if (await askConfirm({ title: "...", message: "...", danger: true })) { ... }
function useConfirm() {
  const [state, setState] = useState(null); // { title, message, danger, confirmLabel, resolve }
  const ask = ({ title = "Confirmar", message, danger = false, confirmLabel = "Confirmar" }) =>
    new Promise(resolve => setState({ title, message, danger, confirmLabel, resolve }));
  const ui = state ? (
    <Modal title={state.title} onClose={() => { state.resolve(false); setState(null); }} zIndex={350}>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, marginBottom: 20, whiteSpace: "pre-wrap" }}>
        {state.message}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={() => { state.resolve(false); setState(null); }}>Cancelar</button>
        <button type="button" autoFocus
          style={{ ...btnPrimary, ...(state.danger ? { background: C.danger, color: "#fff" } : {}) }}
          onClick={() => { state.resolve(true); setState(null); }}>
          {state.confirmLabel}
        </button>
      </div>
    </Modal>
  ) : null;
  return [ui, ask];
}

// ─── DENSIDAD — Componentes de entrada ───────────────────────────────────────
// Normaliza en onBlur: "28" → "1.028". Valida rango. Muestra error inline.
const DensityInput = ({ value, onChange, placeholder = "ej. 28 ó 1.028" }) => {
  const [local, setLocal] = useState(String(value || ""));
  const [err, setErr] = useState("");
  useEffect(() => { setLocal(String(value || "")); }, [value]);
  const handleBlur = () => {
    if (!local.trim()) { onChange(""); setErr(""); return; }
    const errMsg = validateDensity(local);
    if (errMsg) { setErr(errMsg); return; }
    const norm = normalizeDensity(local);
    setErr(""); setLocal(norm); onChange(norm);
  };
  return (
    <div>
      <input
        style={inp} type="text" inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*" autoComplete="off" autoCorrect="off" spellCheck={false}
        value={local} placeholder={placeholder}
        onChange={e => { setLocal(e.target.value.replace(/[^0-9.,]/g, "")); setErr(""); }}
        onBlur={handleBlur}
      />
      {err && <div style={{ fontSize: 11, color: C.danger, marginTop: 3, lineHeight: 1.4 }}>{err}</div>}
    </div>
  );
};

// Versión Fca/Tbo en dos columnas, reemplaza el <Pair> genérico para densidad.
const DensityPair = ({ v1, v2, on1, on2 }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={lbl}>Densidad — <span style={{ color: C.text }}>Fca.</span> / <span style={{ color: C.sub }}>Tbo.</span></label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <DensityInput value={v1} onChange={on1} />
      <DensityInput value={v2} onChange={on2} />
    </div>
    <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
      Ecomilk: 28–34 · Técnico: 1.028–1.034 · Ref: 1.028–1.033 g/mL
    </div>
  </div>
);

// Calcula el balance actual de un silo y verifica si una operación lo dejaría negativo.
// excludeFn permite restar la contribución del item que se está editando para no contarlo dos veces.
async function checkSiloBalance(date, siloRaw, litrosImpacto, excludeFn = null) {
  const litros = parseFloat(litrosImpacto) || 0;
  if (!siloRaw || litros <= 0) return { ok: true };
  const siloKey = SILO_STOCK_KEY[siloRaw] || siloRaw;
  const { totals, reservados } = await calcAutoLitros(date);
  // Disponible real = stock acumulado menos lo que ya está reservado para producción
  let current = (totals[siloKey] || 0) - (reservados[siloKey] || 0);
  if (excludeFn) current = current + (excludeFn() || 0); // re-sumar el aporte del item editado
  const next = current - litros;
  return { ok: next >= 0, current, next, silo: siloKey, missing: next < 0 ? -next : 0 };
}

// ─── INGRESOS ────────────────────────────────────────────────
const emptyIng = () => ({
  id: crypto.randomUUID(), hora: getNow(), tambo: "", num: "", transportista: "",
  litrosFca: "", litrosTbo: "", destino: "", tC: "",
  acidezFca: "", phFca: "", alcFca: "", alcTbo: "",
  gbFca: "", gbTbo: "", sngFca: "", sngTbo: "",
  densFca: "", densTbo: "", aguadoFca: "", aguadoTbo: "",
  dcFca: "", dcTbo: "", protFca: "", protTbo: "", atm: "", obs: "",
  producto: "", brix: "", organoleptico: "",
});

// Mapeo de campos del formulario → rangos de referencia para advertencias en vivo.
// Solo Fábrica; Aguado tiene su propio modal bloqueante.
const QUALITY_WARN_MAP = [
  { key: "phFca",     label: "pH",          ref: QUALITY_REFS["pH"]          },
  { key: "acidezFca", label: "Acidez",      ref: QUALITY_REFS["Acidez"]      },
  { key: "gbFca",     label: "GB",          ref: QUALITY_REFS["GB"]          },
  { key: "sngFca",    label: "SNG",         ref: QUALITY_REFS["SNG"]         },
  { key: "protFca",   label: "Proteína",    ref: QUALITY_REFS["Proteína"]    },
  { key: "tC",        label: "Temperatura", ref: QUALITY_REFS["Temperatura"] },
  { key: "densFca",   label: "Densidad",    ref: QUALITY_REFS["Densidad"]    },
];

const IngresoForm = ({ initial, onSave, onClose, onDelete, tambos, onNuevoTambo, siloStates = { totals: {}, productosBase: {} }, perfil = null }) => {
  const [f, setF] = useState(initial || emptyIng());
  const [aguadoAlerta, setAguadoAlerta] = useState(false);
  const [cipForzado, setCipForzado] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const set = k => v => { setFieldError(""); setF(p => ({ ...p, [k]: v })); };
  const pickTambo = nombre => {
    const t = tambos.find(t => t.nombre === nombre);
    setF(p => ({ ...p, tambo: nombre, num: t ? String(t.num) : p.num }));
  };
  const pickTransportista = trans => {
    setF(p => {
      const nuevoF = { ...p, transportista: trans };
      // Si el tambo actual no pertenece al nuevo transportista, limpiar la selección
      if (trans && TRANSPORTISTAS[trans] && p.tambo && !TRANSPORTISTAS[trans].includes(p.tambo)) {
        nuevoF.tambo = "";
        nuevoF.num = "";
      }
      return nuevoF;
    });
  };
  const transCarrierTambos = f.transportista ? (TRANSPORTISTAS[f.transportista] || []) : [];
  const tambosPropios  = tambos.filter(t => transCarrierTambos.includes(t.nombre));
  const tambosOtros    = tambos.filter(t => !transCarrierTambos.includes(t.nombre));
  const isConcentrado = PRODS_CONCENTRADOS.includes(f.producto);

  // Detección de silo sucio para el destino seleccionado
  const destKey = f.destino ? (SILO_STOCK_KEY[f.destino] || f.destino) : null;
  const destProd = destKey ? (siloStates.productosBase[destKey] || null) : null;
  const destLitros = destKey ? (siloStates.totals[destKey] || 0) : 0;
  const siloSucioLevel = destProd === "Sucio (vacío)"
    ? (destLitros === 0 ? "bloqueado" : "inconsistente")
    : null;
  const canForce = perfil === "supervisor" || perfil === "jefe";

  // Advertencias de calidad derivadas del estado del formulario — sin useState, sin bloqueo.
  const qualityWarnings = isConcentrado ? [] : QUALITY_WARN_MAP.filter(({ key, ref }) => {
    if (!ref) return false;
    const v = parseFloat(f[key]);
    return !isNaN(v) && (v < ref.min || v > ref.max);
  }).map(({ label, ref, key }) => `${label}: ${f[key]}  (ref ${ref.min}–${ref.max})`);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="N° Tambo"><Inp value={f.num} onChange={set("num")} placeholder="Nº" /></F>
      </div>
      <F label="Transportista">
        <select value={f.transportista || ""} onChange={e => pickTransportista(e.target.value)} style={inp}>
          <option value="">Sin especificar</option>
          {Object.keys(TRANSPORTISTAS).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </F>
      <F label="Tambo / Procedencia">
        <select value={f.tambo || ""} onChange={e => pickTambo(e.target.value)} style={inp}>
          <option value="">Seleccionar tambo...</option>
          {f.transportista && tambosPropios.length > 0 ? (
            <>
              <optgroup label={`Tambos de ${f.transportista}`}>
                {tambosPropios.map(t => (
                  <option key={t.nombre} value={t.nombre}>{t.num} — {t.nombre}</option>
                ))}
              </optgroup>
              <optgroup label="Otros tambos">
                {tambosOtros.map(t => (
                  <option key={t.nombre} value={t.nombre}>{t.num} — {t.nombre}</option>
                ))}
              </optgroup>
            </>
          ) : (
            tambos.map(t => (
              <option key={t.nombre} value={t.nombre}>{t.num} — {t.nombre}</option>
            ))
          )}
        </select>
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
              <SmartDecInp value={f.tC} onChange={set("tC")} decimalAfter={1} placeholder="°C" />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 3 – 8 °C</div>
            </F>
          </div>
          <div style={panel}>
            <div style={secTitle}>Parámetros</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez">
                <SmartDecInp value={f.acidezFca} onChange={set("acidezFca")} decimalAfter={2} />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 14 – 18 °D</div>
              </F>
              <F label="pH">
                <SmartDecInp value={f.phFca} onChange={set("phFca")} decimalAfter={1} />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 6.6 – 6.8</div>
              </F>
            </div>
            <F label="°BRIX"><SmartDecInp value={f.brix || ""} onChange={set("brix")} decimalAfter={2} placeholder="°Brix" /></F>
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
              <SmartDecInp value={f.tC} onChange={set("tC")} decimalAfter={1} placeholder="°C" />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 3 – 8 °C</div>
            </F>
          </div>
          <div style={panel}>
            <div style={secTitle}>Parámetros básicos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F label="Acidez Fca.">
                <SmartDecInp value={f.acidezFca} onChange={set("acidezFca")} decimalAfter={2} />
                <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>Ref: 14 – 18 °D</div>
              </F>
              <F label="pH Fca.">
                <SmartDecInp value={f.phFca} onChange={set("phFca")} decimalAfter={1} />
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
            <DensityPair v1={f.densFca} v2={f.densTbo} on1={set("densFca")} on2={set("densTbo")} />
            <Pair label="Aguado" v1={f.aguadoFca} v2={f.aguadoTbo} on1={set("aguadoFca")} on2={set("aguadoTbo")} />
            <div style={{ fontSize: 11, color: C.danger, marginTop: -8, marginBottom: 12 }}>Debe ser exactamente 0 — indica adulteración</div>
            <Pair label="Descenso Crioscópico" v1={f.dcFca} v2={f.dcTbo} on1={set("dcFca")} on2={set("dcTbo")} />
            <Pair label="Proteína" v1={f.protFca} v2={f.protTbo} on1={set("protFca")} on2={set("protTbo")} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: -8, marginBottom: 12 }}>Ref: 2.9 – 3.5 %</div>
            <F label="ATB"><Sel value={f.atm || ""} onChange={set("atm")} options={["-", "+"]} placeholder="ATB..." /></F>
          </div>
        </>
      )}

      <F label="Observaciones">
        <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={f.obs} onChange={e => set("obs")(e.target.value)} placeholder="Observaciones..." />
      </F>
      {qualityWarnings.length > 0 && (
        <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
            <AlertaWarn size={13} strokeWidth={SW} /> Parámetros fuera de rango de referencia
          </div>
          {qualityWarnings.map((w, i) => <div key={i} style={{ color: C.sub }}>• {w}</div>)}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>El ingreso se guarda igual — revisar con supervisor si corresponde.</div>
        </div>
      )}
      {siloSucioLevel === "bloqueado" && (
        <div style={{ background: `${C.danger}15`, border: `1px solid ${C.danger}50`, borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertaWarn size={16} strokeWidth={2} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, marginBottom: 3 }}>
              Silo {f.destino} pendiente de CIP
            </div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
              Este silo está vacío y marcado como sucio. Debe realizarse la limpieza CIP antes de recibir producto.
              {canForce ? " Como supervisor podés autorizar y forzar el ingreso." : " Solo el supervisor puede autorizar este ingreso."}
            </div>
          </div>
        </div>
      )}
      {siloSucioLevel === "inconsistente" && (
        <div style={{ background: "#7c2d1215", border: "1px solid #f9731640", borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertaWarn size={16} strokeWidth={2} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "#f97316", lineHeight: 1.5 }}>
            <strong>Estado inconsistente:</strong> el silo {f.destino} figura como "Sucio" pero registra {destLitros.toLocaleString("es-AR")} L. Verificar con supervisor antes de continuar.
          </div>
        </div>
      )}
      {fieldError && (
        <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: C.danger, whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          let req;
          if (isConcentrado) {
            req = [["tambo", "Tambo"], ["litrosFca", "Litros"], ["destino", "Destino"],
                   ["acidezFca", "Acidez"], ["phFca", "pH"]];
          } else {
            req = [["tambo", "Tambo"], ["litrosFca", "Litros Fábrica"], ["destino", "Destino"], ["producto", "Producto"],
                   ["acidezFca", "Acidez Fca."], ["phFca", "pH Fca."],
                   ["gbFca", "GB Fca."], ["sngFca", "SNG Fca."], ["densFca", "Densidad Fca."], ["protFca", "Proteína Fca."], ["atm", "ATB"]];
          }
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { setFieldError("Faltan completar:\n• " + miss.join("\n• ")); return; }
          // Silo sucio bloqueado
          if (siloSucioLevel === "bloqueado") {
            if (!canForce) { setFieldError("El silo " + f.destino + " está pendiente de CIP. Solo el supervisor puede autorizar este ingreso."); return; }
            setCipForzado(true);
            return;
          }
          // Aguado > 0 = adulteración — requiere confirmación explícita
          const aguFca = parseFloat(f.aguadoFca);
          const aguTbo = parseFloat(f.aguadoTbo);
          if ((!isNaN(aguFca) && aguFca > 0) || (!isNaN(aguTbo) && aguTbo > 0)) {
            setAguadoAlerta(true);
            return;
          }
          setFieldError("");
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar este ingreso</button>}

      {/* Modal de override CIP — solo supervisor/jefe */}
      {cipForzado && (
        <Modal title="⚠ Forzar ingreso a silo sucio" onClose={() => setCipForzado(false)} zIndex={300}>
          <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.danger, fontSize: 14, marginBottom: 6 }}>
              Silo {f.destino} marcado como Sucio (vacío)
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Este silo está pendiente de limpieza CIP. Forzar el ingreso puede comprometer la calidad del producto.
              La acción quedará registrada en el historial de auditoría con tu usuario.
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
            Solo continuar si el desvío fue verificado y autorizado. El registro quedará en el historial.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" style={btnSecondary} onClick={() => setCipForzado(false)}>Cancelar</button>
            <button type="button" style={{ ...btnPrimary, background: C.danger, borderColor: C.danger }}
              onClick={() => { setCipForzado(false); onSave({ ...f, _forzadoCIP: true }); }}>
              Autorizar y forzar ingreso
            </button>
          </div>
        </Modal>
      )}

      {/* Modal bloqueante de Aguado */}
      {aguadoAlerta && (
        <Modal title="⚠ Aguado detectado" onClose={() => setAguadoAlerta(false)} zIndex={300}>
          <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.danger, fontSize: 14, marginBottom: 6 }}>
              Aguado Fábrica: {f.aguadoFca || "—"} &nbsp;|&nbsp; Aguado Tambo: {f.aguadoTbo || "—"}
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              Un valor de aguado mayor a 0 indica posible <strong>adulteración de leche con agua</strong>. Este ingreso no debería procesarse sin autorización del supervisor o jefe de planta.
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
            Solo continuar si el desvío fue verificado y autorizado. El registro quedará en el historial.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" style={btnSecondary} onClick={() => setAguadoAlerta(false)}>Corregir valores</button>
            <button type="button" style={{ ...btnPrimary, background: C.danger, borderColor: C.danger }} onClick={() => { setAguadoAlerta(false); onSave(f); }}>
              Guardar de todas formas
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const SecIngresos = ({ date, syncKey = 0, dayClosed = false, perfil = null }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tambos, setTambos] = useState(TAMBOS_BASE);
  const [tamboModal, setTamboModal] = useState(false);
  const [newTambo, setNewTambo] = useState({ nombre: "", num: "" });
  const [filtro, setFiltro] = useState("");
  const [siloStates, setSiloStates] = useState({ totals: {}, productosBase: {} });
  const [confirmUI, askConfirm] = useConfirm();

  useEffect(() => {
    load(date, "ingresos", []).then(d => { setList(d); setLoading(false); });
    loadCfg().then(cfg => setTambos([...TAMBOS_BASE, ...(cfg.tambosCustom || [])]));
    calcAutoLitros(date).then(r => setSiloStates(r)).catch(() => {});
  }, [date, syncKey]);

  const persist = async updated => {
    const ok = await save(date, "ingresos", updated);
    if (ok !== false) setList(updated);
    return ok;
  };
  const onSave = async item => {
    const forzado = item._forzadoCIP;
    const { _forzadoCIP, ...itemClean } = item;
    if (forzado) {
      await logAudit(date, "forzar_ingreso_silo_sucio", "ingreso",
        `Ingreso forzado a silo ${item.destino || "?"} (estado Sucio) — ${item.litrosFca || 0} L de ${item.tambo || "?"}`,
        PERFILES[perfil]?.label || perfil || "Supervisor");
    }
    const ex = list.find(i => i.id === itemClean.id);
    const ok = await persist(ex ? list.map(i => i.id === itemClean.id ? itemClean : i) : [...list, itemClean]);
    if (ok !== false) setModal(null);
  };
  const onDelete = async id => {
    const item = list.find(i => i.id === id);
    const resumen = item ? buildResumen("ingreso", item) : "";
    if (await askConfirm({
      title: "Eliminar ingreso",
      message: `¿Eliminar este ingreso?${resumen ? "\n\n" + resumen : ""}\n\nLa acción quedará registrada en el historial.`,
      danger: true,
      confirmLabel: "Eliminar",
    })) {
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
              String(ing.num || "").toLowerCase().includes(q) ||
              (ing.transportista || "").toLowerCase().includes(q)
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>[{ing.num}] {ing.tambo || "—"}</span>
              {ing.transportista && (
                <span style={{ fontSize: 11, color: C.sub, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.03em" }}>
                  {ing.transportista}
                </span>
              )}
            </div>
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
      {!dayClosed && <FAB onClick={() => setModal("new")} />}
      {modal && (
        <Modal title={modal === "new" ? "Nuevo Ingreso" : "Editar Ingreso"} onClose={() => setModal(null)}>
          <IngresoForm
            initial={modal === "new" ? null : modal}
            onSave={onSave} onClose={() => setModal(null)}
            onDelete={modal !== "new" ? () => onDelete(modal.id) : null}
            tambos={tambos} onNuevoTambo={() => setTamboModal(true)}
            siloStates={siloStates} perfil={perfil}
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
      {confirmUI}
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

const SecCIP = ({ date, syncKey = 0, readOnly = false }) => {
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

  const updateSilo = async (s, v) => {
    if (readOnly) return;
    const prev = data; const u = { ...data, silos: { ...(data.silos || {}), [s]: v } };
    setData(u); if (await save(date, "cip", u) === false) setData(prev);
  };
  const updateCamion = async (c, v) => {
    if (readOnly) return;
    const prev = data; const u = { ...data, camiones: { ...(data.camiones || {}), [c]: v } };
    setData(u); if (await save(date, "cip", u) === false) setData(prev);
  };
  const setFiltro = async (k, v) => {
    if (readOnly) return;
    const prev = data; const u = { ...data, [k]: v };
    setData(u); if (await save(date, "cip", u) === false) setData(prev);
  };

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
const emptyCarga = () => ({ id: crypto.randomUUID(), label: "CARGA 1", destino: "", transportista: "", producto: "", siloProveniente: "", limpCisterna: "", litros: "", T: "", gC: "", pH: "", A: "", gD: "", hora: getNow(), responsable: "", obs: "" });
const CargaForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyCarga());
  const [fieldError, setFieldError] = useState("");
  const set = k => v => { setFieldError(""); setF(p => ({ ...p, [k]: v })); };
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
      {fieldError && (
        <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: C.danger, whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["destino", "Destino"], ["siloProveniente", "Silo Proveniente"], ["limpCisterna", "Limpieza Cisterna"],
          ["litros", "Litros"], ["hora", "Hora"], ["responsable", "Responsable"],
          ["T", "T"], ["gC", "°C"], ["pH", "pH"], ["A", "A"], ["gD", "°D"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { setFieldError("Faltan completar:\n• " + miss.join("\n• ")); return; }
          setFieldError("");
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
const SecCarga = ({ date, syncKey = 0, dayClosed = false }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmUI, askConfirm] = useConfirm();
  useEffect(() => { load(date, "carga", []).then(d => { setList(d); setLoading(false); }); }, [date, syncKey]);
  const persist = async u => {
    const ok = await save(date, "carga", u);
    if (ok !== false) setList(u);
    return ok;
  };
  const onSave = async item => {
    const existing = list.find(i => i.id === item.id);
    const exclude = existing ? () => parseFloat(existing.litros) || 0 : null;
    const check = await checkSiloBalance(date, item.siloProveniente, item.litros, exclude);
    if (!check.ok) {
      const ok = await askConfirm({
        title: "Saldo insuficiente",
        message: `Esta carga dejaría el silo ${check.silo} con saldo negativo.\n\nDisponible: ${check.current.toFixed(0)} L\nSe restan: ${parseFloat(item.litros).toFixed(0)} L\nResultado: ${check.next.toFixed(0)} L\n\n¿Guardar de todas formas?`,
        danger: true,
        confirmLabel: "Guardar igual",
      });
      if (!ok) return;
    }
    const ex = list.find(i => i.id === item.id);
    const ok = await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    if (ok !== false) setModal(null);
  };
  const onDelete = async id => {
    const item = list.find(i => i.id === id);
    const resumen = item ? buildResumen("carga", item) : "";
    if (await askConfirm({ title: "Eliminar carga", message: `¿Eliminar esta carga?${resumen ? "\n\n" + resumen : ""}`, danger: true, confirmLabel: "Eliminar" })) {
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
      {!dayClosed && <FAB onClick={() => setModal("new")} />}
      {modal && (
        <Modal title={modal === "new" ? "Nueva Carga" : "Editar Carga"} onClose={() => setModal(null)}>
          <CargaForm initial={modal === "new" ? null : modal} onSave={onSave} onClose={() => setModal(null)} onDelete={modal !== "new" ? () => onDelete(modal.id) : null} />
        </Modal>
      )}
      {confirmUI}
    </div>
  );
};

// ─── MOVIMIENTOS ─────────────────────────────────────────────
const emptyMov = () => ({ id: crypto.randomUUID(), hora: getNow(), desde: "", hasta: "", litros: "", producto: "", motivo: "", resp: "" });
const emptyCtrl = () => ({ id: crypto.randomUUID(), hora: getNow(), silo: "", ph: "", gD: "", gC: "", alc: "", mg: "", sng: "", dens: "", fp: "", prot: "", resp: "" });

const MovForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyMov());
  const [fieldError, setFieldError] = useState("");
  const set = k => v => { setFieldError(""); setF(p => ({ ...p, [k]: v })); };
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
      {fieldError && (
        <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: C.danger, whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["litros", "Litros"], ["desde", "Desde"], ["hasta", "Hasta"], ["motivo", "Motivo"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { setFieldError("Faltan completar:\n• " + miss.join("\n• ")); return; }
          setFieldError("");
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};
const CtrlForm = ({ initial, onSave, onClose, onDelete }) => {
  const [f, setF] = useState(initial || emptyCtrl());
  const [fieldError, setFieldError] = useState("");
  const set = k => v => { setFieldError(""); setF(p => ({ ...p, [k]: v })); };
  // "dens" se renderiza aparte con DensityInput; el resto se mapea con Inp genérico.
  const campos = [["pH", "ph"], ["°D", "gD"], ["°C", "gC"], ["Alc.", "alc"], ["MG", "mg"], ["SNG", "sng"], ["FP", "fp"], ["Prot.", "prot"]];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
        <F label="Hora"><input style={inp} type="time" value={f.hora} onChange={e => set("hora")(e.target.value)} /></F>
        <F label="Silo"><Sel value={f.silo} onChange={set("silo")} options={SILOS} placeholder="Silo..." /></F>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {campos.map(([l, k]) => <F key={k} label={l}><Inp type="number" value={f[k]} onChange={set(k)} step="0.01" /></F>)}
      </div>
      <F label="Dens."><DensityInput value={f.dens} onChange={set("dens")} /></F>
      <F label="Responsable"><Inp value={f.resp} onChange={set("resp")} /></F>
      {fieldError && (
        <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: C.danger, whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["silo", "Silo"], ["ph", "pH"], ["gD", "°D"], ["gC", "°C"], ["alc", "Alc."], ["mg", "MG"], ["sng", "SNG"], ["dens", "Densidad"], ["fp", "FP"], ["prot", "Proteína"], ["resp", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          if (miss.length) { setFieldError("Faltan completar:\n• " + miss.join("\n• ")); return; }
          setFieldError("");
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};

const SecMovimientos = ({ date, syncKey = 0, dayClosed = false }) => {
  const [data, setData] = useState({ movs: [], ctrls: [] });
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("movs");
  const [loading, setLoading] = useState(true);
  const [confirmUI, askConfirm] = useConfirm();
  useEffect(() => { load(date, "movimientos", { movs: [], ctrls: [] }).then(d => { setData(d); setLoading(false); }); }, [date, syncKey]);
  const persist = async u => {
    const ok = await save(date, "movimientos", u);
    if (ok !== false) setData(u);
    return ok;
  };
  const saveMov = async item => {
    const existing = data.movs.find(i => i.id === item.id);
    const exclude = existing ? () => parseFloat(existing.litros) || 0 : null;
    const check = await checkSiloBalance(date, item.desde, item.litros, exclude);
    if (!check.ok) {
      const ok = await askConfirm({
        title: "Saldo insuficiente",
        message: `Este movimiento dejaría el silo ${check.silo} con saldo negativo.\n\nDisponible: ${check.current.toFixed(0)} L\nSe mueven: ${parseFloat(item.litros).toFixed(0)} L\nResultado: ${check.next.toFixed(0)} L\n\n¿Guardar de todas formas?`,
        danger: true,
        confirmLabel: "Guardar igual",
      });
      if (!ok) return;
    }
    const l = data.movs; const ex = l.find(i => i.id === item.id);
    const ok = await persist({ ...data, movs: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] });
    if (ok !== false) setModal(null);
  };
  const saveCtrl = async item => {
    const l = data.ctrls; const ex = l.find(i => i.id === item.id);
    const ok = await persist({ ...data, ctrls: ex ? l.map(i => i.id === item.id ? item : i) : [...l, item] });
    if (ok !== false) setModal(null);
  };
  const delMov = async id => {
    const item = data.movs.find(i => i.id === id);
    const resumen = item ? buildResumen("movimiento", item) : "";
    if (await askConfirm({ title: "Eliminar movimiento", message: `¿Eliminar este movimiento?${resumen ? "\n\n" + resumen : ""}`, danger: true, confirmLabel: "Eliminar" })) {
      if (item) await logDelete("movimiento", item);
      await persist({ ...data, movs: data.movs.filter(i => i.id !== id) });
    }
    setModal(null);
  };
  const delCtrl = async id => {
    const item = data.ctrls.find(i => i.id === id);
    const resumen = item ? buildResumen("control", item) : "";
    if (await askConfirm({ title: "Eliminar control", message: `¿Eliminar este control?${resumen ? "\n\n" + resumen : ""}`, danger: true, confirmLabel: "Eliminar" })) {
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
          {!dayClosed && <FAB onClick={() => setModal({ type: "mov", item: null })} />}
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
          {!dayClosed && <FAB onClick={() => setModal({ type: "ctrl", item: null })} />}
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
      {confirmUI}
    </div>
  );
};

// ─── PRODUCCIÓN ──────────────────────────────────────────────
// Estados de lote:
//   - "envasando"  → lote activo, litros reservados (no descontados del stock)
//   - "finalizado" → lote cerrado, litros usados reales descontados
// Compat legacy: "enviado" se trata como "envasando"; "cancelado" se filtra de
// las vistas activas y dashboard (no se migra, sólo se ignora).
const isLoteActivo     = e => e === "envasando" || e === "enviado";
const isLoteFinalizado = e => e === "finalizado";
const isLoteLegacyCancelado = e => e === "cancelado";

const emptyLote = (preOrigen = null) => ({
  id: crypto.randomUUID(),
  hora: getNow(),
  producto: "",
  lote: "",
  origenes: preOrigen ? [preOrigen] : [],
  cajas: "",
  observaciones: "",
  estado: "envasando",
  responsable: "",
  litrosUsados: null,
  destinoSobrante: null,
  siloSobrante: null,
  sobranteL: 0,
});

const ProduccionForm = ({ initial, onSave, onClose, onDelete, date, perfil, isEdit = false }) => {
  const [view, setView] = useState(!isEdit ? "cat" : "main");
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [selCat, setSelCat] = useState(() => {
    const prod = PRODS_PRODUCCION_LIST.find(p => p.nombre === initial.producto);
    return prod?.cat || null;
  });
  const [showAddOrigen, setShowAddOrigen] = useState(false);
  const [newOrigen, setNewOrigen] = useState({ silo: "", litros: "" });
  const [confirmUI, askConfirm] = useConfirm();

  const prodInfo = PRODS_PRODUCCION_LIST.find(p => p.nombre === f.producto);
  const totalEnviado = (f.origenes || []).reduce((s, o) => s + (parseFloat(o.litros) || 0), 0);
  const origenesWithIdx = (f.origenes || [])
    .map((o, idx) => ({ ...o, _idx: idx }))
    .filter(o => o.silo && parseFloat(o.litros) > 0);

  // Solo "envasando" y "finalizado" son estados activos. Legacy "enviado" se trata como "envasando".
  const estadoColor = est => (isLoteFinalizado(est) ? C.success : C.accent);
  const estadoLabel = est => (isLoteFinalizado(est) ? "Finalizado" : "Envasando");

  const delOrigen = realIdx => {
    setF(p => {
      const newOrigenes = (p.origenes || []).filter((_, i) => i !== realIdx);
      const newFilled = newOrigenes.filter(o => o.silo && parseFloat(o.litros) > 0);
      return {
        ...p,
        origenes: newOrigenes,
        litrosUsados: isLoteFinalizado(p.estado) || finalizing
          ? newFilled.map(o => ({ silo: o.silo, litros: o.litros }))
          : null,
      };
    });
  };

  const addOrigen = () => {
    if (!newOrigen.silo || !(parseFloat(newOrigen.litros) > 0)) return;
    const nuevo = { silo: newOrigen.silo, litros: newOrigen.litros };
    setF(p => {
      const newOrigenes = [...(p.origenes || []).filter(o => o.silo), nuevo];
      const newFilled = newOrigenes.filter(o => o.silo && parseFloat(o.litros) > 0);
      return {
        ...p,
        origenes: newOrigenes,
        litrosUsados: isLoteFinalizado(p.estado) || finalizing
          ? newFilled.map(o => ({ silo: o.silo, litros: o.litros }))
          : null,
      };
    });
    setNewOrigen({ silo: "", litros: "" });
    setShowAddOrigen(false);
  };

  // "finalizing": el operador apretó FINALIZAR LOTE y está cargando los datos
  // reales (litros usados, cajas, destino sobrante) antes de confirmar.
  // Si cancela, el lote sigue siendo envasando.
  const [finalizing, setFinalizing] = useState(isLoteFinalizado(f.estado));

  const startFinalizar = () => {
    const currFilled = (f.origenes || []).filter(o => o.silo && parseFloat(o.litros) > 0);
    const existingLU = f.litrosUsados || [];
    setF(p => ({
      ...p,
      litrosUsados: currFilled.map((o, i) => ({
        silo: o.silo,
        litros: existingLU[i]?.litros ?? o.litros,
      })),
    }));
    setFinalizing(true);
  };

  const cancelFinalizar = () => {
    setFinalizing(false);
    setF(p => ({ ...p, litrosUsados: null, sobranteL: 0, destinoSobrante: null, siloSobrante: null }));
  };

  const runBalance = async (filled) => {
    const byKey = {};
    filled.forEach(o => {
      const k = SILO_STOCK_KEY[o.silo] || o.silo;
      byKey[k] = (byKey[k] || 0) + (parseFloat(o.litros) || 0);
    });
    for (const [siloKey, totalL] of Object.entries(byKey)) {
      // Si estamos editando un lote activo (envasando/enviado-legacy), descontar
      // sus litros previos para no contarlos dos veces. Los finalizados no
      // reservan, así que no aplican.
      const excludeFn = isEdit && isLoteActivo(initial?.estado)
        ? () => (initial.origenes || []).reduce((s, o) => {
            const k = SILO_STOCK_KEY[o.silo] || o.silo;
            return k === siloKey ? s + (parseFloat(o.litros) || 0) : s;
          }, 0)
        : null;
      const check = await checkSiloBalance(date, siloKey, totalL, excludeFn);
      if (!check.ok) {
        alert(`Silo ${siloKey}: ${Math.round(check.current).toLocaleString("es-AR")} L disponibles, necesitás ${Math.round(totalL).toLocaleString("es-AR")} L.`);
        return false;
      }
    }
    return true;
  };

  // Guardar lote activo (envasando) — datos básicos
  const doGuardarEnvasando = async () => {
    const filled = (f.origenes || []).filter(o => o.silo && parseFloat(o.litros) > 0);
    if (!f.lote?.trim()) { alert("Ingresá el número de lote."); return; }
    if (filled.length === 0) { alert("Agregá al menos un silo origen con litros."); return; }
    setSaving(true);
    try {
      if (!(await runBalance(filled))) return;
      // Normalizar estado: si era legacy "enviado", pasarlo a "envasando" al guardar.
      onSave({ ...f, estado: "envasando", origenes: filled, litrosUsados: null, sobranteL: 0, destinoSobrante: null, siloSobrante: null }, initial);
    } finally { setSaving(false); }
  };

  // Confirmar finalización — pide litros reales, cajas y destino sobrante
  const doConfirmarFinalizacion = async () => {
    const filled = (f.origenes || []).filter(o => o.silo && parseFloat(o.litros) > 0);
    if (!f.lote?.trim()) { alert("Ingresá el número de lote."); return; }
    if (filled.length === 0) { alert("Agregá al menos un silo origen con litros."); return; }

    const lu = f.litrosUsados || [];
    for (let i = 0; i < filled.length; i++) {
      const env = parseFloat(filled[i].litros) || 0;
      const us = parseFloat(lu[i]?.litros);
      if (isNaN(us)) { alert(`Ingresá los litros realmente usados del ${filled[i].silo}.`); return; }
      if (us < 0) { alert(`Litros usados no puede ser negativo (${filled[i].silo}).`); return; }
      if (us > env) { alert(`${filled[i].silo}: usados (${us.toLocaleString("es-AR")}) no puede superar enviados (${env.toLocaleString("es-AR")}).`); return; }
    }
    const totalUsadoFinal = lu.reduce((s, u) => s + (parseFloat(u.litros) || 0), 0);
    const sobranteCalcFinal = Math.max(0, totalEnviado - totalUsadoFinal);
    if (sobranteCalcFinal > 0 && !f.destinoSobrante) {
      alert(`Sobraron ${Math.round(sobranteCalcFinal).toLocaleString("es-AR")} L. Indicá qué hacer con ellos.`); return;
    }
    if (f.destinoSobrante === "otro_silo" && !f.siloSobrante) { alert("Seleccioná el silo destino del sobrante."); return; }
    const usadosStr = `${Math.round(totalUsadoFinal).toLocaleString("es-AR")} L usados` + (sobranteCalcFinal > 0 ? ` · Sobrante: ${Math.round(sobranteCalcFinal).toLocaleString("es-AR")} L` : "");
    if (!(await askConfirm({ title: "Finalizar lote", message: usadosStr, confirmLabel: "Finalizar" }))) return;
    const litrosUsadosFinal = filled.map((o, i) => ({
      silo: o.silo,
      litros: String(Math.round(parseFloat(lu[i]?.litros) || 0)),
    }));
    setSaving(true);
    try { onSave({ ...f, estado: "finalizado", origenes: filled, litrosUsados: litrosUsadosFinal, sobranteL: sobranteCalcFinal }, initial); }
    finally { setSaving(false); }
  };

  // Re-guardar un lote ya finalizado (editar datos del cierre)
  const doGuardarFinalizado = doConfirmarFinalizacion;

  const requestDelete = async () => {
    if (!onDelete) return;
    const confirmed = await askConfirm({
      title: "Eliminar lote",
      message: `¿Eliminar el lote ${f.lote || f.producto || "?"}? Esto libera los litros reservados.`,
      danger: true,
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;
    onDelete(initial);
  };

  // ── VIEW: cat ─────────────────────────────────────────────────
  if (view === "cat") {
    const cats = Object.keys(PROD_CATEGORIAS);
    return (
      <Modal title="Nuevo lote — Producto" onClose={onClose}>
        {confirmUI}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {cats.map(cat => (
            <button key={cat} type="button"
              onClick={() => {
                if (PROD_CATEGORIAS[cat] === null) {
                  setF(p => ({ ...p, producto: "Otro" }));
                  setView("main");
                } else {
                  setSelCat(cat);
                  setView("variant");
                }
              }}
              style={{
                padding: "18px 6px", borderRadius: 12, fontWeight: 700, fontSize: 13,
                border: `1.5px solid ${C.border}`, background: C.surface, color: C.text,
                cursor: "pointer", textAlign: "center", lineHeight: 1.3,
              }}>{cat}</button>
          ))}
        </div>
      </Modal>
    );
  }

  // ── VIEW: variant ─────────────────────────────────────────────
  if (view === "variant") {
    const variants = PROD_CATEGORIAS[selCat] || [];
    return (
      <Modal title={selCat} onClose={onClose}>
        {confirmUI}
        <button type="button" onClick={() => setView("cat")}
          style={{ ...btnSecondary, fontSize: 12, marginBottom: 12, alignSelf: "flex-start", padding: "6px 12px" }}>← Volver</button>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {variants.map(v => {
            const prod = PRODS_PRODUCCION_LIST.find(p => p.cat === selCat && p.variant === v);
            return (
              <button key={v} type="button"
                onClick={() => { setF(p => ({ ...p, producto: prod?.nombre || v })); setView("main"); }}
                style={{
                  padding: "16px 18px", borderRadius: 10, fontWeight: 600, fontSize: 16,
                  border: `1.5px solid ${C.border}`, background: C.surface, color: C.text,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <span>{v}</span>
                {prod && <span style={{ fontSize: 11, color: C.sub }}>
                  {prod.up} u/caja · {prod.vol < 1 ? `${prod.vol * 1000} mL` : `${prod.vol} L`}/u
                </span>}
              </button>
            );
          })}
        </div>
      </Modal>
    );
  }

  // ── VIEW: main — pantalla operativa única ─────────────────────
  if (view === "main") {
    const lu = f.litrosUsados || [];
    const totalUsado = lu.reduce((s, u) => s + (parseFloat(u.litros) || 0), 0);
    const showFinalFields = finalizing || isLoteFinalizado(f.estado);
    const sobranteCalc = showFinalFields ? Math.max(0, totalEnviado - totalUsado) : 0;
    const cajasN = parseFloat(f.cajas) || 0;
    const volEnv = prodInfo && cajasN > 0 ? cajasN * prodInfo.up * prodInfo.vol : 0;
    const rend = totalUsado > 0 && volEnv > 0 ? (volEnv / totalUsado * 100) : null;
    const sobranteLabelMap = {
      origen: "volvió al silo", otro_silo: `silo ${f.siloSobrante || "?"}`,
      merma: "merma", reproceso: "reproceso", decomiso: "decomiso",
      reservado: "sigue reservado", proceso: "en proceso",
    };

    const yaFinalizado = isLoteFinalizado(f.estado);
    const titleEstadoBadge = yaFinalizado ? "FINALIZADO" : (finalizing ? "FINALIZANDO" : (isEdit ? "ENVASANDO" : "NUEVO LOTE"));
    const titleEstadoColor = yaFinalizado ? C.success : (finalizing ? C.danger : C.accent);

    return (
      <Modal title={f.producto || "Nuevo lote"} onClose={onClose}>
        {confirmUI}
        {!isEdit && (
          <button type="button" onClick={() => setView(selCat ? "variant" : "cat")}
            style={{ ...btnSecondary, fontSize: 12, marginBottom: 12, alignSelf: "flex-start", padding: "6px 12px" }}>← Volver</button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Badge de estado + recordatorio reservados */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 12,
              background: titleEstadoColor + "22", color: titleEstadoColor,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>{titleEstadoBadge}</span>
            {!yaFinalizado && !finalizing && totalEnviado > 0 && (
              <span style={{ fontSize: 11, color: C.sub }}>
                Reserva: <span style={{ fontFamily: FONT_MONO, color: C.accent, fontWeight: 700 }}>{totalEnviado.toLocaleString("es-AR")} L</span>
              </span>
            )}
          </div>

          {/* Datos básicos: lote + hora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <F label="Nº Lote">
              <Inp value={f.lote} onChange={v => setF(p => ({ ...p, lote: v }))} placeholder="Ej: L-001" />
            </F>
            <F label="Hora">
              <input style={inp} type="time" value={f.hora || ""} onChange={e => setF(p => ({ ...p, hora: e.target.value }))} />
            </F>
          </div>

          {/* Origenes */}
          <div style={{ ...card, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 0.5 }}>SILOS ORIGEN</span>
              {!yaFinalizado && (
                <button type="button" onClick={() => setShowAddOrigen(p => !p)}
                  style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "2px 4px" }}>
                  {showAddOrigen ? "− Cerrar" : "+ Agregar"}
                </button>
              )}
            </div>

            {origenesWithIdx.length === 0 && !showAddOrigen && (
              <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "8px 0" }}>Sin silos cargados</div>
            )}

            {origenesWithIdx.map(o => (
              <div key={o._idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}33` }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{o.silo}</span>
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 15, color: C.accent, marginLeft: 10 }}>
                    {parseFloat(o.litros).toLocaleString("es-AR")} L
                  </span>
                </div>
                {!yaFinalizado && (
                  <button type="button" onClick={() => delOrigen(o._idx)}
                    style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: "4px 12px", fontSize: 20 }}>✕</button>
                )}
              </div>
            ))}

            {origenesWithIdx.length > 0 && (
              <div style={{ textAlign: "right", marginTop: 6, fontSize: 12, color: C.sub }}>
                Total: <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 14, color: C.text }}>{totalEnviado.toLocaleString("es-AR")} L</span>
              </div>
            )}

            {showAddOrigen && !yaFinalizado && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}44` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <F label="Silo">
                    <Sel value={newOrigen.silo} onChange={v => setNewOrigen(p => ({ ...p, silo: v }))} options={SILOS_TODOS} placeholder="Silo..." />
                  </F>
                  <F label="Litros">
                    <Inp type="number" value={newOrigen.litros} onChange={v => setNewOrigen(p => ({ ...p, litros: v }))} placeholder="0" />
                  </F>
                </div>
                <button type="button" onClick={addOrigen}
                  disabled={!newOrigen.silo || !(parseFloat(newOrigen.litros) > 0)}
                  style={{ ...btnSecondary, width: "100%", fontSize: 13, padding: "10px", opacity: (!newOrigen.silo || !(parseFloat(newOrigen.litros) > 0)) ? 0.45 : 1 }}>
                  Confirmar origen
                </button>
              </div>
            )}
          </div>

          {/* Responsable + observaciones */}
          <F label="Responsable">
            <Inp value={f.responsable || ""} onChange={v => setF(p => ({ ...p, responsable: v }))} placeholder="Nombre" />
          </F>
          <F label="Observaciones">
            <Inp value={f.observaciones || ""} onChange={v => setF(p => ({ ...p, observaciones: v }))} placeholder="(opcional)" />
          </F>

          {/* ── Sección de finalización (sólo visible al apretar FINALIZAR o si ya está finalizado) ── */}
          {showFinalFields && origenesWithIdx.length > 0 && (
            <>
              <div style={{ ...card, padding: 12, borderColor: C.success + "55" }}>
                <div style={{ fontSize: 11, color: C.success, fontWeight: 800, marginBottom: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>Datos reales del cierre</div>

                {/* Cajas */}
                <F label="Cajas realizadas">
                  <Inp type="number" value={f.cajas} onChange={v => setF(p => ({ ...p, cajas: v }))} placeholder="0" />
                </F>

                <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, margin: "12px 0 8px", letterSpacing: 0.5 }}>LITROS REALMENTE UTILIZADOS</div>
                {origenesWithIdx.map((o, i) => {
                  const env = parseFloat(o.litros) || 0;
                  const us = parseFloat(lu[i]?.litros);
                  const sobrEste = !isNaN(us) ? Math.max(0, env - us) : 0;
                  return (
                    <div key={o._idx} style={{ marginBottom: i < origenesWithIdx.length - 1 ? 12 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{o.silo}</span>
                        <span style={{ fontSize: 11, color: C.sub, fontFamily: FONT_MONO }}>env. {env.toLocaleString("es-AR")} L</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <Inp type="number" value={lu[i]?.litros ?? ""}
                            onChange={v => setF(p => {
                              const curFilled = (p.origenes || []).filter(oo => oo.silo && parseFloat(oo.litros) > 0);
                              const newLU = curFilled.map((oo, ii) => ({
                                silo: oo.silo,
                                litros: ii === i ? v : ((p.litrosUsados || [])[ii]?.litros ?? oo.litros),
                              }));
                              return { ...p, litrosUsados: newLU };
                            })}
                            placeholder={env.toString()} />
                        </div>
                        {sobrEste > 0 && !isNaN(us) && (
                          <span style={{ fontSize: 11, color: C.accent, fontFamily: FONT_MONO, whiteSpace: "nowrap" }}>
                            sobra {sobrEste.toLocaleString("es-AR")} L
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {lu.length > 0 && lu.some(u => !isNaN(parseFloat(u.litros))) && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}44` }}>
                    {[
                      ["Usados", `${Math.round(totalUsado).toLocaleString("es-AR")} L`, C.text],
                      ["Sobrante", sobranteCalc > 0 ? `${Math.round(sobranteCalc).toLocaleString("es-AR")} L` : "—", sobranteCalc > 0 ? C.accent : C.success],
                      ["Rendim.", rend !== null ? `${rend.toFixed(1)}%` : "—", rend !== null && rend >= 95 ? C.success : C.accent],
                    ].map(([lbl, val, col]) => (
                      <div key={lbl} style={{ textAlign: "center", padding: "8px 4px", background: C.surface, borderRadius: 8 }}>
                        <div style={{ fontFamily: FONT_MONO, fontWeight: 800, fontSize: 14, color: col }}>{val}</div>
                        <div style={{ fontSize: 9, color: C.sub, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destino sobrante */}
              {sobranteCalc > 0 && (
                <div style={{ ...card, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>
                    Sobraron {Math.round(sobranteCalc).toLocaleString("es-AR")} L — ¿qué hacemos?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["origen",    "Volver al silo"],
                      ["otro_silo", "Otro silo"],
                      ["reproceso", "Reproceso"],
                      ["decomiso",  "Decomiso"],
                      ["reservado", "Seguir reservado"],
                    ].map(([val, lbl]) => (
                      <button key={val} type="button"
                        onClick={() => setF(p => ({ ...p, destinoSobrante: val, siloSobrante: val !== "otro_silo" ? null : p.siloSobrante }))}
                        style={{
                          padding: "13px 8px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                          border: `2px solid ${f.destinoSobrante === val ? C.accent : C.border}`,
                          background: f.destinoSobrante === val ? C.accent + "22" : C.surface,
                          color: f.destinoSobrante === val ? C.accent : C.sub, cursor: "pointer",
                        }}>{lbl}</button>
                    ))}
                  </div>
                  {f.destinoSobrante === "otro_silo" && (
                    <div style={{ marginTop: 10 }}>
                      <F label="Silo destino">
                        <Sel value={f.siloSobrante || ""} onChange={v => setF(p => ({ ...p, siloSobrante: v }))}
                          options={SILOS_TODOS} placeholder="Seleccionar silo..." />
                      </F>
                    </div>
                  )}
                  {f.destinoSobrante === "reservado" && (
                    <div style={{ marginTop: 8, fontSize: 11, color: C.sub, padding: "6px 10px", background: C.surface, borderRadius: 8 }}>
                      Los {Math.round(sobranteCalc).toLocaleString("es-AR")} L quedarán reservados (no se descontarán del silo).
                    </div>
                  )}
                </div>
              )}

              {/* Resumen sobrante registrado (lote ya finalizado) */}
              {yaFinalizado && f.litrosUsados?.length > 0 && totalUsado > 0 && f.sobranteL > 0 && (
                <div style={{ fontSize: 12, color: C.accent, padding: "8px 12px", background: C.surface, borderRadius: 8 }}>
                  Sobrante registrado: {Math.round(f.sobranteL).toLocaleString("es-AR")} L → {sobranteLabelMap[f.destinoSobrante] || f.destinoSobrante || "—"}
                </div>
              )}
            </>
          )}

          {/* ─── BOTONES DE ACCIÓN ─────────────────────────────────── */}
          {(() => {
            // Caso 1: lote nuevo (no edit) → ENVASAR
            if (!isEdit) {
              return (
                <button type="button" onClick={doGuardarEnvasando} disabled={saving || !f.lote?.trim()}
                  style={{ ...btnPrimary, fontSize: 17, fontWeight: 800, padding: "18px", letterSpacing: "0.06em", opacity: (saving || !f.lote?.trim()) ? 0.45 : 1 }}>
                  {saving ? "Guardando..." : "ENVASAR"}
                </button>
              );
            }

            // Caso 2: lote finalizado → editar datos del cierre
            if (yaFinalizado) {
              return (
                <>
                  <button type="button" onClick={doGuardarFinalizado} disabled={saving || !f.lote?.trim()}
                    style={{ ...btnPrimary, fontSize: 16, fontWeight: 800, padding: "17px", letterSpacing: "0.04em", opacity: (saving || !f.lote?.trim()) ? 0.45 : 1 }}>
                    {saving ? "Guardando..." : "GUARDAR CAMBIOS"}
                  </button>
                  {onDelete && (perfil === "jefe" || perfil === "supervisor") && (
                    <button type="button" onClick={requestDelete}
                      style={{ ...btnSecondary, fontSize: 13, color: C.danger, borderColor: C.danger + "55", padding: "12px", fontWeight: 700 }}>
                      Eliminar lote
                    </button>
                  )}
                </>
              );
            }

            // Caso 3: lote envasando + finalizando → CONFIRMAR / CANCELAR
            if (finalizing) {
              return (
                <>
                  <button type="button" onClick={doConfirmarFinalizacion} disabled={saving || !f.lote?.trim()}
                    style={{ ...btnPrimary, background: C.success, fontSize: 17, fontWeight: 800, padding: "18px", letterSpacing: "0.06em", opacity: (saving || !f.lote?.trim()) ? 0.45 : 1 }}>
                    {saving ? "Guardando..." : "CONFIRMAR FINALIZACIÓN"}
                  </button>
                  <button type="button" onClick={cancelFinalizar}
                    style={{ ...btnSecondary, fontSize: 13, padding: "12px", fontWeight: 700 }}>
                    Volver — seguir envasando
                  </button>
                </>
              );
            }

            // Caso 4: lote envasando → FINALIZAR / GUARDAR / ELIMINAR
            return (
              <>
                <button type="button" onClick={startFinalizar} disabled={saving || !f.lote?.trim() || origenesWithIdx.length === 0}
                  style={{ ...btnPrimary, background: C.success, fontSize: 17, fontWeight: 800, padding: "18px", letterSpacing: "0.06em", opacity: (saving || !f.lote?.trim() || origenesWithIdx.length === 0) ? 0.45 : 1 }}>
                  FINALIZAR LOTE
                </button>
                <button type="button" onClick={doGuardarEnvasando} disabled={saving || !f.lote?.trim()}
                  style={{ ...btnSecondary, fontSize: 14, padding: "13px", fontWeight: 700, opacity: (saving || !f.lote?.trim()) ? 0.45 : 1 }}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
                {onDelete && (perfil === "jefe" || perfil === "supervisor") && (
                  <button type="button" onClick={requestDelete}
                    style={{ ...btnSecondary, fontSize: 13, color: C.danger, borderColor: C.danger + "55", padding: "12px", fontWeight: 700 }}>
                    Eliminar lote
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </Modal>
    );
  }

  return null;
};

const SecProduccion = ({ date, syncKey = 0, dayClosed = false, perfil = null }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmUI, askConfirm] = useConfirm();

  useEffect(() => {
    load(date, "produccion", []).then(d => { setList(d); setLoading(false); });
  }, [date, syncKey]);

  const persist = async updated => {
    const ok = await save(date, "produccion", updated);
    if (ok !== false) setList(updated);
    return ok;
  };

  const onSave = async (item, oldItem) => {
    const isEditOp = list.some(x => x.id === item.id);
    const updated = isEditOp
      ? list.map(x => x.id === item.id ? item : x)
      : [...list, item];
    const ok = await persist(updated);
    if (ok !== false) {
      _autoLitrosCache.delete(date);

      // Auto-movimiento si el sobrante va a otro silo (sólo al primer finalizado)
      if (
        item.estado === "finalizado" &&
        item.destinoSobrante === "otro_silo" &&
        item.siloSobrante &&
        item.sobranteL > 0 &&
        oldItem?.estado !== "finalizado"
      ) {
        const desde = (item.origenes || [])[0]?.silo || "Producción";
        const movData = await load(date, "movimientos", { movs: [], ctrls: [] });
        const autoMov = {
          id: crypto.randomUUID(),
          hora: getNow(),
          desde,
          hasta: item.siloSobrante,
          litros: String(Math.round(item.sobranteL)),
          motivo: `Sobrante lote ${item.lote || item.producto || "?"} (automático)`,
          resp: perfil || "",
        };
        await save(date, "movimientos", { ...movData, movs: [...(movData.movs || []), autoMov] });
        _autoLitrosCache.delete(date);
        await logAudit(date, "mov_sobrante_produccion", "movimiento",
          `Sobrante ${item.sobranteL} L de ${desde} → ${item.siloSobrante} (lote ${item.lote || "?"})`, perfil || "");
      }

      let resumen = `${item.producto} — Lote ${item.lote || "—"} — ${item.estado}`;
      if (isEditOp && oldItem) {
        const oldL = (oldItem.origenes || []).reduce((s, o) => s + (parseFloat(o.litros) || 0), 0);
        const newL = (item.origenes || []).reduce((s, o) => s + (parseFloat(o.litros) || 0), 0);
        const parts = [];
        if (Math.round(oldL) !== Math.round(newL))
          parts.push(`litros: ${Math.round(oldL).toLocaleString("es-AR")} → ${Math.round(newL).toLocaleString("es-AR")} L`);
        if (oldItem.estado !== item.estado)
          parts.push(`estado: ${oldItem.estado} → ${item.estado}`);
        if (item.sobranteL > 0)
          parts.push(`sobrante: ${Math.round(item.sobranteL).toLocaleString("es-AR")} L → ${item.destinoSobrante}`);
        if (parts.length > 0) resumen += ` (${parts.join(", ")})`;
      }
      await logAudit(date, isEditOp ? "actualizar_produccion" : "nueva_produccion",
        "produccion", resumen, perfil || "");
      setModal(null);
    }
  };

  const onDelete = async item => {
    // VALIDACIÓN INTERNA: el botón se renderiza solo con perfil supervisor/jefe,
    // pero el handler también valida por seguridad (evita escalación via devtools).
    if (perfil !== "supervisor" && perfil !== "jefe") {
      console.warn("[onDelete produccion] perfil sin permiso:", perfil);
      return;
    }
    const esFinal = isLoteFinalizado(item.estado);
    const confirmed = await askConfirm({
      title: esFinal ? "Eliminar lote FINALIZADO" : "Eliminar lote",
      message: esFinal
        ? `¿Eliminar lote ${item.lote || item.producto || "?"}? Estaba finalizado: al borrarlo se RESTITUYEN los litros usados al silo de origen. Esto es irreversible.`
        : `¿Eliminar lote ${item.lote || item.producto || "?"}? Esto libera los litros reservados.`,
      danger: true,
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;
    await persist(list.filter(x => x.id !== item.id));
    _autoLitrosCache.delete(date);
    // Auditoría diferenciada por estado del lote eliminado
    await logAudit(date,
      esFinal ? "eliminar_produccion_finalizada" : "eliminar_produccion",
      "produccion",
      `${item.producto} — Lote ${item.lote || "—"} — estado ${item.estado || "envasando"}`,
      perfil || "");
    setModal(null);
  };

  // Color de borde / badge según estado. Compat: legacy "enviado" se ve igual que "envasando".
  const estadoColor = est => (isLoteFinalizado(est) ? C.success : C.accent);
  const estadoLabel = est => (isLoteFinalizado(est) ? "Finalizado" : "Envasando");

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.sub }}>Cargando...</div>;

  // Filtrar lotes legacy "cancelado" silenciosamente.
  const visibles = list.filter(it => !isLoteLegacyCancelado(it.estado));
  const activos = visibles.filter(it => isLoteActivo(it.estado));
  const historial = visibles.filter(it => isLoteFinalizado(it.estado));

  const renderLote = item => {
    const prodInfo = PRODS_PRODUCCION_LIST.find(p => p.nombre === item.producto);
    const totalL = (item.origenes || []).reduce((s, o) => s + (parseFloat(o.litros) || 0), 0);
    const cajas = parseFloat(item.cajas) || 0;
    const volEnv = prodInfo && cajas > 0 ? cajas * prodInfo.up * prodInfo.vol : null;
    const esFinal = isLoteFinalizado(item.estado);
    const litrosUsadosTotal = esFinal && item.litrosUsados?.length > 0
      ? item.litrosUsados.reduce((s, o) => s + (parseFloat(o.litros) || 0), 0) : null;
    const rendDenom = litrosUsadosTotal ?? totalL;
    const rend = (volEnv && rendDenom > 0) ? (volEnv / rendDenom * 100).toFixed(1) : null;
    const sobranteLabelCard = { origen: "vuelve al silo", otro_silo: `→ ${item.siloSobrante || "otro"}`, reproceso: "reproceso", decomiso: "decomiso", reservado: "reservado" };
    const col = estadoColor(item.estado);
    const lbl = estadoLabel(item.estado);
    return (
      <div key={item.id} onClick={() => !dayClosed && setModal(item)}
        style={{ ...card, borderLeft: `3px solid ${col}`, marginBottom: 10, cursor: dayClosed ? "default" : "pointer" }}>
        {/* Header: producto + estado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{item.producto || "—"}</span>
            {item.lote && <span style={{ fontSize: 11, color: C.accent, marginLeft: 8, fontFamily: FONT_MONO }}>#{item.lote}</span>}
            {item.hora && <span style={{ fontSize: 10, color: C.muted, marginLeft: 8, fontFamily: FONT_MONO }}>{item.hora}</span>}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 10,
            background: col + "22", color: col,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{lbl}</span>
        </div>

        {/* Litros grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
          <div style={{ background: C.panel, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{esFinal ? "Enviado" : "Reservado"}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, fontFamily: FONT_MONO }}>{totalL.toLocaleString("es-AR")} L</div>
          </div>
          <div style={{ background: C.panel, borderRadius: 6, padding: "6px 8px", textAlign: "center", opacity: litrosUsadosTotal == null ? 0.4 : 1 }}>
            <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Usado real</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: FONT_MONO }}>
              {litrosUsadosTotal != null ? `${litrosUsadosTotal.toLocaleString("es-AR")} L` : "—"}
            </div>
          </div>
          <div style={{ background: C.panel, borderRadius: 6, padding: "6px 8px", textAlign: "center", opacity: cajas === 0 ? 0.4 : 1 }}>
            <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Cajas</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: FONT_MONO }}>{cajas > 0 ? cajas.toLocaleString("es-AR") : "—"}</div>
          </div>
        </div>

        {/* Rendimiento + sobrante */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {rend && (
            <span style={{ fontSize: 12, color: C.sub }}>
              Rend. <span style={{ color: parseFloat(rend) >= 90 ? C.success : parseFloat(rend) >= 75 ? C.accent : C.danger, fontFamily: FONT_MONO, fontWeight: 800 }}>{rend}%</span>
            </span>
          )}
          {esFinal && item.sobranteL > 0 && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Sobrante <span style={{ color: C.text, fontFamily: FONT_MONO, fontWeight: 700 }}>{Math.round(item.sobranteL).toLocaleString("es-AR")} L</span>
              {item.destinoSobrante && <span style={{ color: C.sub }}> · {sobranteLabelCard[item.destinoSobrante] || item.destinoSobrante}</span>}
            </span>
          )}
        </div>

        {/* Orígenes */}
        {(item.origenes || []).filter(o => o.silo).length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: C.sub, borderTop: `1px solid ${C.border}`, paddingTop: 5 }}>
            <span style={{ color: C.muted, marginRight: 4 }}>Silos:</span>
            {(item.origenes || []).filter(o => o.silo).map((o, i) => (
              <span key={i} style={{ marginRight: 8 }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{o.silo}</span>
                {o.litros && <span style={{ color: C.accent, fontFamily: FONT_MONO }}> {parseFloat(o.litros).toLocaleString("es-AR")} L</span>}
                {item.litrosUsados?.[i]?.litros != null && parseFloat(item.litrosUsados[i].litros) !== parseFloat(o.litros) && (
                  <span style={{ color: C.success, fontFamily: FONT_MONO }}> →{parseFloat(item.litrosUsados[i].litros).toLocaleString("es-AR")} L</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {confirmUI}
      <div style={secTitle}>Producción — {fmtDate(date)}</div>

      {visibles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.sub }}>
          <div style={{ marginBottom: 10, opacity: 0.35, display: "flex", justifyContent: "center" }}>
            <IcoProduccion size={40} strokeWidth={1} />
          </div>
          <div>Sin lotes registrados</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Usá el botón + para iniciar producción</div>
        </div>
      ) : (
        <>
          {/* Activos — envasando */}
          {activos.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 800, margin: "8px 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: C.accent, animation: "yatPulse 1.8s ease-in-out infinite" }} />
                En envasado · {activos.length} lote{activos.length !== 1 ? "s" : ""}
              </div>
              {activos.map(renderLote)}
            </>
          )}

          {/* Historial — finalizados */}
          {historial.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, margin: "20px 0 10px", paddingBottom: 4, borderBottom: `1px solid ${C.border}44` }}>
                Historial · {historial.length} finalizado{historial.length !== 1 ? "s" : ""}
              </div>
              {historial.map(renderLote)}
            </>
          )}
        </>
      )}

      {!dayClosed && <FAB onClick={() => setModal("new")} />}

      {modal && (
        <ProduccionForm
          initial={modal === "new" ? emptyLote() : modal}
          isEdit={modal !== "new"}
          onSave={onSave}
          onClose={() => setModal(null)}
          onDelete={modal !== "new" ? onDelete : null}
          date={date}
          perfil={perfil}
        />
      )}
    </div>
  );
};

// ─── STOCK POR TURNO ─────────────────────────────────────────
const SecStock = ({ date, syncKey = 0, perfil = null }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState(getCurrentTurno());
  const [autoLitros, setAutoLitros] = useState({});
  const [autoReservados, setAutoReservados] = useState({});
  const [silosVaciados, setSilosVaciados] = useState([]);
  const [envasarModal, setEnvasarModal] = useState(null);

  useEffect(() => {
    Promise.all([
      load(date, "stock", {}),
      calcAutoLitros(date),
      load(date, "cip", {}),
    ]).then(([d, { totals: autoTotals, productosBase, reservados: rsv }, cipData]) => {
      setAutoLitros(autoTotals);
      setAutoReservados(rsv || {});

      // Silos con CIP completado hoy (tienen hora registrada)
      const cipDone = {};
      Object.entries((cipData.silos) || {}).forEach(([silo, rec]) => {
        if (rec?.hora) {
          const key = SILO_STOCK_KEY[silo] || silo;
          if (STOCK_SILOS.includes(key)) cipDone[key] = true;
        }
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
          const litros = autoTotals[silo] || 0;
          const curProd = (((updated[t] || {}).silos || {})[silo] || {}).producto || sd.producto;
          if (litros > 0) {
            // El silo tiene contenido.
            // Si estaba marcado como "Sucio (vacío)" o "Limpio" por un cálculo anterior con saldo
            // incorrecto (litros=0 cuando no debía ser), corregirlo con el producto real inferido.
            const estadoIncorrecto = curProd === "Sucio (vacío)" || curProd === "Limpio";
            if ((estadoIncorrecto || !sd.producto) && productosBase[silo]) {
              upd(updated, { producto: productosBase[silo] });
            }
          } else {
            // litros = 0: aplicar lógica de vaciado (Limpio si tuvo CIP, Sucio si no)
            if (cipDone[silo] && curProd !== "Limpio") {
              upd(updated, { producto: "Limpio" });
            } else if (!cipDone[silo] && curProd && curProd !== "Sucio (vacío)" && curProd !== "Limpio") {
              upd(updated, { producto: "Sucio (vacío)" });
              if (!vaciados.includes(silo)) vaciados.push(silo);
            }
          }
        });
      });

      if (changed) save(date, "stock", updated);
      if (vaciados.length > 0) setSilosVaciados(vaciados);
      // El saldo se actualiza al cerrar el día (handleCerrarDia) o al arrancar la app.
      // No se guarda aquí para evitar pisar valores manuales del panel "Saldo Silos".
      setData(updated);
      setLoading(false);
    });
  }, [date, syncKey]);

  const updateSilo = async (t, s, k, v) => {
    const prev = data;
    const u = {
      ...data,
      [t]: { ...(data[t] || {}), silos: { ...((data[t] || {}).silos || {}), [s]: { ...(((data[t] || {}).silos || {})[s] || {}), [k]: v } } }
    };
    setData(u); if (await save(date, "stock", u) === false) setData(prev);
  };
  const updateResp = async (t, v) => {
    const prev = data;
    const u = { ...data, [t]: { ...(data[t] || {}), resp: v } };
    setData(u); if (await save(date, "stock", u) === false) setData(prev);
  };

  const onEnvasarSave = async (item, oldItem) => {
    const prev = await load(date, "produccion", []);
    const exists = prev.some(x => x.id === item.id);
    const updated = exists ? prev.map(x => x.id === item.id ? item : x) : [...prev, item];
    await save(date, "produccion", updated);
    _autoLitrosCache.delete(date);
    await logAudit(date, exists ? "actualizar_produccion" : "nueva_produccion", "produccion",
      `${item.producto} — Lote ${item.lote || "—"} — ${item.estado} (Stock)`, perfil || "");
    const { totals, reservados } = await calcAutoLitros(date);
    setAutoLitros(totals);
    setAutoReservados(reservados || {});
    setEnvasarModal(null);
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
            <div style={{ fontSize: 13, color: C.text }}>{silosVaciados.join(", ")} → requieren CIP</div>
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

      {/* Tarjetas de silos — agrupadas */}
      {[{ label: "Silos", keys: SILOS_GRUPO }, { label: "Proceso", keys: PROCESO_GRUPO }].map(({ label, keys }) => (
        <Fragment key={label}>
          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, margin: "16px 0 8px", paddingBottom: 4, borderBottom: `1px solid ${C.border}44` }}>
            {label}
          </div>
          {keys.map(silo => {
            const sd = ((td.silos || {})[silo]) || {};
            const litrosAuto = Math.max(0, autoLitros[silo] || 0);
            const reservadoL = autoReservados[silo] || 0;
            const disponibleL = Math.max(0, litrosAuto - reservadoL);
            const cap = SILO_CAP[silo] || 100000;
            const fillPct = Math.min(1, litrosAuto / cap);
            const reservPct = litrosAuto > 0 ? Math.min(1, reservadoL / litrosAuto) : 0;
            const fillColor = PROD_COLOR[sd.producto] || (litrosAuto > 0 ? PROD_COLOR["Leche Cruda"] : null);
            const hasData = litrosAuto > 0 || sd.producto || sd.ph;
            const pct = (fillPct * 100).toFixed(1);
            const tieneReserva = reservadoL > 0;

            return (
              <div key={silo} style={{
                ...card,
                borderColor: tieneReserva ? C.accent + "88" : (hasData ? C.accentDark : C.border),
                padding: 12,
                animation: tieneReserva ? "yatReservaGlow 2.6s ease-in-out infinite" : "none",
              }}>
                {/* Header: nombre + litros acumulados + badge reservado */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "0.04em" }}>
                      {silo.startsWith("TQ") ? "TQ" : (["TINA","DULCE","POSTRE"].includes(silo) ? "" : "SILO ")}
                      {silo.replace("TQ", "")}
                    </span>
                    {tieneReserva && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10,
                        background: C.accent + "22", color: C.accent,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: C.accent, animation: "yatPulse 1.8s ease-in-out infinite" }} />
                        Reservado
                      </span>
                    )}
                  </div>
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
                    {/* Barra de nivel: muestra disponible (color producto) + reservado (acento) */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.sub, marginBottom: 4 }}>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Nivel</span>
                        <span style={{ fontWeight: 700, color: litrosAuto > 0 ? C.text : C.sub }}>{pct}%</span>
                      </div>
                      <div style={{ background: C.muted, borderRadius: 4, height: 8, overflow: "hidden", display: "flex" }}>
                        {/* Tramo disponible */}
                        <div style={{
                          height: "100%",
                          background: fillColor || "#3a4460",
                          width: `${fillPct * 100 * (1 - reservPct)}%`,
                          transition: "width 1.2s ease, background 0.6s ease",
                          boxShadow: fillColor ? `0 0 6px ${fillColor}66` : "none",
                        }} />
                        {/* Tramo reservado */}
                        {tieneReserva && (
                          <div style={{
                            height: "100%",
                            background: `repeating-linear-gradient(45deg, ${C.accent} 0 6px, ${C.accentDark} 6px 12px)`,
                            width: `${fillPct * 100 * reservPct}%`,
                            transition: "width 1.2s ease",
                            boxShadow: `0 0 6px ${C.accent}88`,
                          }} />
                        )}
                      </div>
                    </div>

                    {/* Litros: total / reservado / disponible — más visual */}
                    {litrosAuto > 0 ? (
                      <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: C.panel, border: `1px solid ${tieneReserva ? C.accent + "55" : C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
                          <span style={{ fontSize: 11, color: C.text, fontFamily: FONT_MONO, fontWeight: 700 }}>{litrosAuto.toLocaleString("es-AR")} L</span>
                        </div>
                        {tieneReserva && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Reservado</span>
                            <span style={{ fontSize: 11, color: C.accent, fontFamily: FONT_MONO, fontWeight: 800 }}>−{reservadoL.toLocaleString("es-AR")} L</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                          <span style={{ fontSize: 10, color: C.success, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Disponible</span>
                          <span style={{ fontSize: 12, color: C.success, fontFamily: FONT_MONO, fontWeight: 800 }}>{disponibleL.toLocaleString("es-AR")} L</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                        <span style={{ fontFamily: FONT_MONO }}>0</span> / {cap.toLocaleString("es-AR")} L
                      </div>
                    )}

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

                {disponibleL > 0 && (perfil === "supervisor" || perfil === "jefe") && (
                  <button type="button"
                    onClick={() => setEnvasarModal(emptyLote({ silo, litros: String(Math.round(disponibleL)) }))}
                    style={{ ...btnPrimary, marginTop: 12, width: "100%", fontSize: 16, fontWeight: 800, padding: "15px", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    ENVASAR · {disponibleL.toLocaleString("es-AR")} L
                  </button>
                )}
              </div>
            );
          })}
        </Fragment>
      ))}

      {envasarModal && (
        <ProduccionForm
          initial={envasarModal}
          onSave={onEnvasarSave}
          onClose={() => setEnvasarModal(null)}
          date={date}
          perfil={perfil}
        />
      )}
    </div>
  );
};

// ─── FORTIFICADOS ────────────────────────────────────────────
const UNIDADES_FORT = ["kg", "g", "L", "mL", "mg", "cc"];

const emptyFort = () => ({
  id: crypto.randomUUID(),
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
  const [fieldError, setFieldError] = useState("");
  const set = k => v => { setFieldError(""); setF(p => ({ ...p, [k]: v })); };

  const updAdicion = (id, key, val) =>
    setF(p => ({ ...p, adiciones: p.adiciones.map(a => a.id === id ? { ...a, [key]: val } : a) }));
  const addAdicion = () =>
    setF(p => ({ ...p, adiciones: [...p.adiciones, { id: crypto.randomUUID(), producto: "", cantidad: "", unidad: "kg" }] }));
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
      {fieldError && (
        <div style={{ background: `${C.danger}18`, border: `1px solid ${C.danger}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13, color: C.danger, whiteSpace: "pre-line", lineHeight: 1.6 }}>
          {fieldError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" style={btnSecondary} onClick={onClose}>Cancelar</button>
        <button type="button" style={btnPrimary} onClick={() => {
          const req = [["siloOrigen", "Silo Origen"], ["litrosBase", "Litros base"], ["siloDestino", "Silo Destino"], ["responsable", "Responsable"]];
          const miss = req.filter(([k]) => !String(f[k] || "").trim()).map(([, v]) => v);
          const sinCant = f.adiciones.filter(a => !String(a.cantidad || "").trim()).map(a => a.producto || "Adición");
          const all = [...miss, ...sinCant.map(p => `Cantidad de ${p}`)];
          if (all.length) { setFieldError("Faltan completar:\n• " + all.join("\n• ")); return; }
          setFieldError("");
          onSave(f);
        }}>Guardar</button>
      </div>
      {onDelete && <button type="button" style={{ ...btnSecondary, color: C.danger, borderColor: C.danger, marginTop: 8 }} onClick={onDelete}>Eliminar</button>}
    </div>
  );
};

const SecFortificados = ({ date, syncKey = 0, dayClosed = false }) => {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmUI, askConfirm] = useConfirm();

  useEffect(() => {
    load(date, "fortificados", []).then(d => { setList(d); setLoading(false); });
  }, [date, syncKey]);

  const persist = async u => {
    const ok = await save(date, "fortificados", u);
    if (ok !== false) setList(u);
    return ok;
  };
  const onSave = async item => {
    const existing = list.find(i => i.id === item.id);
    const exclude = existing ? () => parseFloat(existing.litrosBase) || 0 : null;
    const check = await checkSiloBalance(date, item.siloOrigen, item.litrosBase, exclude);
    if (!check.ok) {
      const ok = await askConfirm({
        title: "Saldo insuficiente",
        message: `Este fortificado dejaría el silo origen ${check.silo} con saldo negativo.\n\nDisponible: ${check.current.toFixed(0)} L\nSe usan: ${parseFloat(item.litrosBase).toFixed(0)} L\nResultado: ${check.next.toFixed(0)} L\n\n¿Guardar de todas formas?`,
        danger: true,
        confirmLabel: "Guardar igual",
      });
      if (!ok) return;
    }
    const ex = list.find(i => i.id === item.id);
    const ok = await persist(ex ? list.map(i => i.id === item.id ? item : i) : [...list, item]);
    if (ok !== false) setModal(null);
  };
  const onDelete = async id => {
    const item = list.find(i => i.id === id);
    const resumen = item ? buildResumen("fortificado", item) : "";
    if (await askConfirm({ title: "Eliminar lote fortificado", message: `¿Eliminar este lote?${resumen ? "\n\n" + resumen : ""}`, danger: true, confirmLabel: "Eliminar" })) {
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
      {!dayClosed && <FAB onClick={() => setModal("new")} />}
      {modal && (
        <Modal title={modal === "new" ? "Nuevo Lote Fortificado" : "Editar Lote Fortificado"} onClose={() => setModal(null)}>
          <FortForm
            initial={modal === "new" ? null : modal}
            onSave={onSave} onClose={() => setModal(null)}
            onDelete={modal !== "new" ? () => onDelete(modal.id) : null}
          />
        </Modal>
      )}
      {confirmUI}
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
    ]).then(([ing, cip, carg, mov, stk, fort, { totals: litros }]) => setD({ ing, cip, carg, mov, stk, fort, litros }));
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
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [weekData, setWeekData] = useState(null);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [tamboSel, setTamboSel] = useState(null);
  const [modalProd, setModalProd] = useState(null); // { silo, litros } | null

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
      load(date, "produccion", []),
      calcAutoLitros(date),
      db.get(ELIM_KEY).then(r => r ? JSON.parse(r.value) : []).catch(() => []),
      getActiveUsers(),
      db.get(auditKey(date)).then(r => r ? JSON.parse(r.value) : []).catch(() => []),
    ]).then(([ing, cargas, movData, stock, forts, cip, produccion, _autoL, historial, activeUsers, auditLog]) => {
      setD({ ing, cargas, movData, stock, forts, cip, produccion, autoLitros: _autoL.totals, autoReservados: _autoL.reservados || {}, historial, auditLog });
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
  const AUDIT_LABEL = { delete: "Eliminación", close_day: "Cierre de día", reopen_day: "Reapertura" };
  const AUDIT_COL   = { delete: C.danger, close_day: "#f97316", reopen_day: C.success };

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
    const reservado = d.autoReservados?.[silo] || 0;
    const disponible = Math.max(0, litros - reservado);
    const cap = SILO_CAP[silo] || 10000;
    const pct = Math.min(100, Math.max(0, (litros / cap) * 100));
    let prod = "";
    for (const t of TURNOS) { const p = ((((d.stock[t] || {}).silos || {})[silo]) || {}).producto; if (p) { prod = p; break; } }
    // Fortifications override product type directly (no need to wait for SecStock to save)
    if (d.fort && d.fort.length > 0) {
      for (const fort of d.fort) {
        const destKey = SILO_STOCK_KEY[fort.siloDestino] || fort.siloDestino;
        if (destKey === silo) { prod = "Leche Fortificada"; break; }
      }
    }
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
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {silo.startsWith("TQ") ? `TQ${silo.replace("TQ","")}`
                : ["TINA","DULCE","POSTRE"].includes(silo) ? silo
                : `Silo ${silo}`}
            </span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {disponible > 0 && (perfil === "supervisor" || perfil === "jefe") && (
              <button type="button" onClick={() => setModalProd({ silo, litros: disponible })} style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 7, fontWeight: 800,
                background: C.accent, color: C.bg,
                border: "none", cursor: "pointer", letterSpacing: "0.04em",
              }}>ENVASAR</button>
            )}
            <span style={{ fontSize: 11, color: C.muted, fontFamily: FONT_MONO }}>
              {pct.toFixed(1)}% <span style={{ color: C.border }}>·</span> {(cap / 1000).toFixed(0)}k cap.
            </span>
          </div>
        </div>
        {reservado > 0 && (
          <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, background: C.accent + "15", border: `1px solid ${C.accent}33`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: C.accent, fontFamily: FONT_MONO }}>
              Reservado prod.: {reservado.toLocaleString("es-AR")} L
            </span>
            <span style={{ fontSize: 10, color: C.success, fontFamily: FONT_MONO }}>
              Disp.: {disponible.toLocaleString("es-AR")} L
            </span>
          </div>
        )}
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
          csv += `${prefix}${i.hora || ""},${escapeCsv(i.tambo || "")},${i.litrosFca || ""},${i.litrosTbo || ""},${diffVal(i.litrosFca, i.litrosTbo)},${escapeCsv(i.destino || "")},${i.phFca || ""},${i.acidezFca || ""},${i.gbFca || ""},${i.gbTbo || ""},${diffVal(i.gbFca, i.gbTbo)},${i.sngFca || ""},${i.sngTbo || ""},${diffVal(i.sngFca, i.sngTbo)},${formatDensity(i.densFca) || ""},${formatDensity(i.densTbo) || ""},${diffVal(i.densFca, i.densTbo)},${i.aguadoFca || ""},${i.aguadoTbo || ""},${diffVal(i.aguadoFca, i.aguadoTbo)},${i.protFca || ""},${i.protTbo || ""},${diffVal(i.protFca, i.protTbo)},${i.alcFca || ""},${i.alcTbo || ""},${diffVal(i.alcFca, i.alcTbo)},${escapeCsv(i.responsable || "")}\n`;
        });
      }
      csv += "\nCARGAS\n";
      csv += `${multiDay ? "Fecha," : ""}Hora,Label,Destino,Transportista,Silo,Litros,pH,Temp,Responsable\n`;
      for (const day of days) {
        const cargas = await load(day, "carga", []);
        cargas.forEach(c => {
          const prefix = multiDay ? `${fmtDate(day)},` : "";
          csv += `${prefix}${c.hora || ""},${escapeCsv(c.label || "")},${escapeCsv(c.destino || "")},${escapeCsv(c.transportista || "")},${escapeCsv(c.siloProveniente || "")},${c.litros || ""},${c.pH || ""},${c.gC || ""},${escapeCsv(c.responsable || "")}\n`;
        });
      }
      csv += "\nMOVIMIENTOS\n";
      csv += `${multiDay ? "Fecha," : ""}Hora,Desde,Hasta,Litros,Motivo,Responsable\n`;
      for (const day of days) {
        const movData = await load(day, "movimientos", { movs: [] });
        (movData.movs || []).forEach(m => {
          const prefix = multiDay ? `${fmtDate(day)},` : "";
          csv += `${prefix}${m.hora || ""},${escapeCsv(m.desde || "")},${escapeCsv(m.hasta || "")},${m.litros || ""},${escapeCsv(m.motivo || "")},${escapeCsv(m.resp || "")}\n`;
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
        const { totals: autoL } = await calcAutoLitros(day);
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
            <td class="td-bold">${escapeHtml(i.tambo) || "—"}</td>
            <td class="r td-bold">${lFca ? fmtN(lFca) : "—"}${difHTML}</td>
            <td class="r td-muted">${lTbo ? fmtN(lTbo) : "—"}</td>
            <td class="r">${xlsDiffVal(i.litrosFca, i.litrosTbo)}</td>
            <td>${escapeHtml(i.destino) || "—"}</td>
            <td class="r">${i.phFca || "—"}</td>
            <td class="r">${i.acidezFca || "—"}</td>
            <td class="r">${i.gbFca || "—"}</td>
            <td class="r">${i.gbTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.gbFca, i.gbTbo)}</td>
            <td class="r">${i.sngFca || "—"}</td>
            <td class="r">${i.sngTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.sngFca, i.sngTbo)}</td>
            <td class="r">${formatDensity(i.densFca) || "—"}</td>
            <td class="r">${formatDensity(i.densTbo) || "—"}</td>
            <td class="r">${xlsDiffVal(i.densFca, i.densTbo)}</td>
            <td class="r">${aguHTML}</td>
            <td class="r">${i.aguadoTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.aguadoFca, i.aguadoTbo)}</td>
            <td class="r">${i.protFca || "—"}</td>
            <td class="r">${i.protTbo || "—"}</td>
            <td class="r">${xlsDiffVal(i.protFca, i.protTbo)}</td>
            <td class="td-muted">${escapeHtml(i.responsable) || "—"}</td>
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
            <td class="td-bold">${escapeHtml(c.label) || "—"}</td>
            <td>${escapeHtml(c.destino) || "—"}</td>
            <td>${escapeHtml(c.transportista) || "—"}</td>
            <td>${escapeHtml(c.siloProveniente) || "—"}</td>
            <td class="r td-bold">${c.litros ? fmtN(parseFloat(c.litros)) : "—"}</td>
            <td class="r">${c.pH || "—"}</td>
            <td class="r">${c.gC || "—"}</td>
            <td class="td-muted">${escapeHtml(c.responsable) || "—"}</td>
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
            <td>${escapeHtml(m.desde) || "—"}</td><td>${escapeHtml(m.hasta) || "—"}</td>
            <td class="r td-bold">${m.litros ? fmtN(parseFloat(m.litros)) : "—"}</td>
            <td>${escapeHtml(m.motivo) || "—"}</td>
            <td class="td-muted">${escapeHtml(m.resp) || "—"}</td>
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
          const adic = escapeHtml((f.adiciones || []).map(a => `${a.producto} ${a.cantidad}${a.unidad}`).join(" · ") || "—");
          H += `<tr>
            ${xlsMulti ? `<td class="td-muted">${fmtDate(f._day)}</td>` : ""}
            <td class="td-mono">${f.hora || "—"}</td>
            <td class="td-bold">${escapeHtml(f.lote) || "—"}</td>
            <td>${escapeHtml(f.producto) || "—"}</td>
            <td class="r">${f.litros ? fmtN(parseFloat(f.litros)) : "—"}</td>
            <td>${escapeHtml(f.tanque) || "—"}</td>
            <td style="font-size:10px;color:#64748b">${adic}</td>
            <td class="td-muted">${escapeHtml(f.responsable) || "—"}</td>
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
      const { totals: autoL } = await calcAutoLitros(exportDate);

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
            <td class="mb">${escapeHtml(i.tambo) || "—"}</td>
            <td class="r mb">${lFca ? fmtN(lFca) : "—"}${difH}</td>
            <td class="r mu">${lTbo ? fmtN(lTbo) : "—"}</td>
            <td>${escapeHtml(i.destino) || "—"}</td>
            <td class="r">${i.phFca || "—"}</td>
            <td class="r">${i.acidezFca || "—"}</td>
            <td class="r">${i.gbFca || "—"}</td>
            <td class="r">${i.sngFca || "—"}</td>
            <td class="r">${formatDensity(i.densFca) || "—"}</td>
            <td class="r">${aguH}</td>
            <td class="mu">${escapeHtml(i.responsable) || "—"}</td>
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
            <td class="mb">${escapeHtml(c.label) || "—"}</td>
            <td>${escapeHtml(c.destino) || "—"}</td>
            <td>${escapeHtml(c.transportista) || "—"}</td>
            <td>${escapeHtml(c.siloProveniente) || "—"}</td>
            <td class="r mb">${c.litros ? fmtN(parseFloat(c.litros)) : "—"}</td>
            <td class="r">${c.pH || "—"}</td>
            <td class="r">${c.gC || "—"}</td>
            <td class="mu">${escapeHtml(c.responsable) || "—"}</td>
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
            <td>${escapeHtml(m.desde) || "—"}</td><td>${escapeHtml(m.hasta) || "—"}</td>
            <td class="r mb">${m.litros ? fmtN(parseFloat(m.litros)) : "—"}</td>
            <td>${escapeHtml(m.motivo) || "—"}</td>
            <td class="mu">${escapeHtml(m.resp) || "—"}</td>
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
          const adic = escapeHtml((f.adiciones || []).map(a => `${a.producto} ${a.cantidad}${a.unidad}`).join(" · ") || "—");
          H += `<tr>
            <td class="mn">${f.hora || "—"}</td>
            <td class="mb">${escapeHtml(f.lote) || "—"}</td>
            <td>${escapeHtml(f.producto) || "—"}</td>
            <td class="r">${f.litros ? fmtN(parseFloat(f.litros)) : "—"}</td>
            <td>${escapeHtml(f.tanque) || "—"}</td>
            <td style="font-size:10px;color:#64748b">${adic}</td>
            <td class="mu">${escapeHtml(f.responsable) || "—"}</td>
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
        setPopupBlocked(true);
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
      {/* Modal popup bloqueado */}
      {popupBlocked && (
        <Modal title="Popup bloqueado" onClose={() => setPopupBlocked(false)}>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>
            El navegador bloqueó la ventana emergente del informe.
          </div>
          <div style={{ ...panel, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>Cómo habilitarlo:</div>
            <div>1. Buscá el ícono de popup bloqueado en la barra de dirección.</div>
            <div>2. Hacé clic y elegí <strong>"Permitir siempre popups de este sitio"</strong>.</div>
            <div>3. Volvé a tocar Exportar.</div>
          </div>
          <button type="button" style={btnPrimary} onClick={() => setPopupBlocked(false)}>Entendido</button>
        </Modal>
      )}

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
          ...(perfil === "jefe" ? [["auditoria", AlertaOk, "Auditoría"]] : []),
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 8 }}>
              <StatCard Icon={IcoDestino}      label="Cargas"  value={d.cargas.length}           color={C.text} />
              <StatCard Icon={IcoFortificados} label="Fort."   value={d.forts.length}            color={C.success} />
              <StatCard Icon={IcoMovimientos}  label="Movim."  value={(d.movData.movs || []).length} color={C.sub} />
            </div>

            {/* Producción del día */}
            {(d.produccion || []).length > 0 && (() => {
              const activos = (d.produccion || []).filter(p => p.estado !== "cancelado");
              const consumido = activos.reduce((s, p) => {
                if (p.estado === "finalizado" && p.litrosUsados?.length > 0) {
                  return s + p.litrosUsados.reduce((ss, o) => ss + (parseFloat(o.litros) || 0), 0);
                }
                return s + (p.origenes || []).reduce((ss, o) => ss + (parseFloat(o.litros) || 0), 0);
              }, 0);
              const envasado = activos.reduce((s, p) => {
                const info = PRODS_PRODUCCION_LIST.find(x => x.nombre === p.producto);
                const caj = parseFloat(p.cajas) || 0;
                return info ? s + caj * info.up * info.vol : s;
              }, 0);
              const mermaP = consumido > 0 ? consumido - envasado : null;
              const rendP = (consumido > 0 && envasado > 0) ? (envasado / consumido * 100) : null;
              const finalizados = activos.filter(p => p.estado === "finalizado").length;
              return (
                <div style={{
                  ...card, padding: "12px 14px", marginBottom: 14,
                  borderColor: C.accent + "33",
                  background: _THEME === "light"
                    ? `linear-gradient(135deg, #fff 0%, ${C.accent}08 100%)`
                    : `linear-gradient(135deg, ${C.card} 0%, ${C.accent}10 100%)`,
                }}>
                  <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <IcoProduccion size={12} strokeWidth={SW} />
                    Producción · {(d.produccion || []).length} lote{(d.produccion || []).length !== 1 ? "s" : ""}
                    {finalizados > 0 && <span style={{ color: C.success }}>{" "}· {finalizados} finalizado{finalizados !== 1 ? "s" : ""}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                    {[
                      ["Consumido", consumido > 0 ? `${Math.round(consumido).toLocaleString("es-AR")} L` : "—", C.accent],
                      ["Envasado",  envasado > 0  ? `${Math.round(envasado).toLocaleString("es-AR")} L`  : "—", C.text],
                      ["Merma",     mermaP !== null ? `${Math.round(mermaP).toLocaleString("es-AR")} L` : "—", mermaP !== null && mermaP < 0 ? C.danger : C.sub],
                      ["Rend.",     rendP  !== null ? `${rendP.toFixed(1)}%` : "—", rendP !== null && rendP >= 90 ? C.success : C.accent],
                    ].map(([lbl, val, col]) => (
                      <div key={lbl} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT_MONO, color: col, lineHeight: 1 }}>{val}</div>
                        <div style={{ fontSize: 9, color: C.sub, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3, fontWeight: 700 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.border}44` }}>
            Silos
          </div>
          {SILOS_GRUPO.map(s => <SiloBar key={s} silo={s} />)}
          <div style={{ fontSize: 10, color: C.sub, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, margin: "16px 0 8px", paddingBottom: 4, borderBottom: `1px solid ${C.border}44` }}>
            Proceso
          </div>
          {PROCESO_GRUPO.map(s => <SiloBar key={s} silo={s} />)}
        </div>
      )}

      {/* Modal "Enviar a producción" desde SiloBar */}
      {modalProd && (
        <ProduccionForm
          initial={emptyLote({ silo: modalProd.silo, litros: String(Math.round(modalProd.litros)) })}
          onSave={async (item, oldItem) => {
            const prev = await load(date, "produccion", []);
            const exists = prev.some(x => x.id === item.id);
            const updated = exists ? prev.map(x => x.id === item.id ? item : x) : [...prev, item];
            await save(date, "produccion", updated);
            _autoLitrosCache.delete(date);
            const r = await calcAutoLitros(date);
            setD(p => ({ ...p, autoLitros: r.totals, autoReservados: r.reservados || {} }));
            await logAudit(date, exists ? "actualizar_produccion" : "nueva_produccion", "produccion",
              `${item.producto} — Lote ${item.lote || "—"} — ${item.estado} (SiloBar)`, perfil || "");
            setModalProd(null);
          }}
          onClose={() => setModalProd(null)}
          date={date}
          perfil={perfil}
        />
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

      {/* ── AUDITORÍA (solo jefe) ── */}
      {tab === "auditoria" && perfil === "jefe" && (
        <div>
          <div style={{ ...panel, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: C.sub }}>Eventos auditados del <strong style={{ color: C.text }}>{fmtDate(date)}</strong></div>
            <div style={{ fontSize: 11, color: C.muted }}>{(d.auditLog || []).length} evento{(d.auditLog || []).length !== 1 ? "s" : ""}</div>
          </div>
          {(d.auditLog || []).length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 24px", color: C.sub }}>
              <div style={{ display: "flex", justifyContent: "center", opacity: 0.35, marginBottom: 10 }}><AlertaOk size={40} strokeWidth={1} /></div>
              <div style={{ fontSize: 14 }}>Sin eventos registrados para esta fecha</div>
            </div>
          ) : [...(d.auditLog || [])].reverse().map((e, i) => {
            const col = AUDIT_COL[e.action] || C.sub;
            const ts = new Date(e.ts);
            const hora = isNaN(ts) ? "" : ts.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={i} style={{ ...card, padding: 10, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, background: col + "22", color: col, borderRadius: 4, padding: "2px 8px", fontWeight: 700, textTransform: "uppercase" }}>
                    {AUDIT_LABEL[e.action] || e.action}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: FONT_MONO }}>{hora} · {e.by || "—"}</span>
                </div>
                {e.resumen && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{e.resumen}</div>}
              </div>
            );
          })}
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

// ─── ADMINISTRACIÓN ───────────────────────────────────────────

async function loadRangeData(from, to, section) {
  const days = getDaysInRange(from, to);
  const results = await Promise.all(
    days.map(d =>
      load(d, section, []).then(items =>
        (Array.isArray(items) ? items : []).map(item => ({ ...item, _date: d }))
      )
    )
  );
  return results.flat();
}

const ADMIN_TABS = [
  ["resumen",        IcoBalance,   "Resumen"],
  ["ingresos",       IcoIngresos,  "Ingresos"],
  ["salidas",        IcoCarga,     "Salidas"],
  ["tambos",         IcoLeche,     "Tambos"],
  ["transportistas", CamionIcon,   "Transportistas"],
  ["diferencias",    AlertaWarn,   "Diferencias"],
  ["exportar",       TabExportar,  "Exportar"],
  ["saldo",          IcoStock,     "Saldo Silos"],
];

const RANGE_PRESETS = [
  ["hoy",       "Hoy"],
  ["ayer",      "Ayer"],
  ["semana",    "7 días"],
  ["quincena",  "15 días"],
  ["mes",       "30 días"],
  ["custom",    "Personalizado"],
];

function computeRange(preset, from, to) {
  const today = getToday();
  switch (preset) {
    case "hoy":       return { from: today, to: today };
    case "ayer":      { const y = getPreviousDate(today); return { from: y, to: y }; }
    case "semana":    return { from: getLastNDays(7)[0],  to: today };
    case "quincena":  return { from: getLastNDays(15)[0], to: today };
    case "mes":       return { from: getLastNDays(30)[0], to: today };
    default:          return { from, to };
  }
}

const AdminTabIngresos = ({ ingresos, isDesktop }) => {
  const tambosOpts = [...new Set(ingresos.map(r => r.tambo).filter(Boolean))].sort();
  const prodOpts   = [...new Set(ingresos.map(r => r.producto).filter(Boolean))].sort();
  const [filtTambo, setFiltTambo] = useState("");
  const [filtProd,  setFiltProd]  = useState("");
  const [filtText,  setFiltText]  = useState("");
  const filtered = ingresos.filter(r => {
    if (filtTambo && r.tambo !== filtTambo) return false;
    if (filtProd  && r.producto !== filtProd) return false;
    if (filtText) {
      const q = filtText.toLowerCase();
      if (!(r.tambo || "").toLowerCase().includes(q) &&
          !(r.destino || "").toLowerCase().includes(q) &&
          !(r.obs || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const totalFca = filtered.reduce((s, r) => s + (parseFloat(r.litrosFca) || 0), 0);
  const totalTbo = filtered.reduce((s, r) => s + (parseFloat(r.litrosTbo) || 0), 0);
  const totalDif = totalFca - totalTbo;
  const th = { padding: "8px 10px", fontSize: 11, color: C.sub, textAlign: "left",
    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.04em" };
  const td = (right = false) => ({
    padding: "8px 10px", fontSize: 12, color: C.text,
    borderBottom: `1px solid ${C.border}`, fontFamily: right ? FONT_MONO : FONT_SANS,
    textAlign: right ? "right" : "left",
  });
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <select value={filtTambo} onChange={e => setFiltTambo(e.target.value)}
          style={{ ...inp, width: "auto", fontSize: 13, padding: "5px 10px" }}>
          <option value="">Todos los tambos</option>
          {tambosOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtProd} onChange={e => setFiltProd(e.target.value)}
          style={{ ...inp, width: "auto", fontSize: 13, padding: "5px 10px" }}>
          <option value="">Todos los productos</option>
          {prodOpts.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input placeholder="Buscar tambo, destino…" value={filtText}
          onChange={e => setFiltText(e.target.value)}
          style={{ ...inp, width: isDesktop ? 220 : "100%", fontSize: 13, padding: "5px 10px" }} />
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.sub, alignSelf: "center" }}>
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          ["Fábrica",    totalFca, C.accent],
          ["Tambo",      totalTbo, "#a78bfa"],
          ["Diferencia", Math.abs(totalDif), totalDif > 0 ? C.success : totalDif < 0 ? C.danger : C.sub],
        ].map(([l, v, col]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "8px 14px", display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: C.sub }}>{l}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: col }}>
              {Math.round(v).toLocaleString("es-AR")} L
            </span>
          </div>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.surface }}>
              <th style={th}>Fecha</th>
              <th style={th}>Hora</th>
              <th style={th}>Tambo</th>
              <th style={th}>Producto</th>
              <th style={th}>Destino</th>
              <th style={{ ...th, textAlign: "right" }}>L Fca.</th>
              <th style={{ ...th, textAlign: "right" }}>L Tbo.</th>
              <th style={{ ...th, textAlign: "right" }}>Dif.</th>
              <th style={th}>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ ...td(), textAlign: "center", color: C.sub, padding: "24px 0" }}>
                Sin registros
              </td></tr>
            )}
            {filtered.map(r => {
              const dif = (parseFloat(r.litrosFca) || 0) - (parseFloat(r.litrosTbo) || 0);
              const difCol = Math.abs(dif) > 50 ? C.danger : dif > 0 ? C.success : C.sub;
              return (
                <tr key={r.id + r._date} style={{ background: "transparent" }}>
                  <td style={td()}>{fmtDate(r._date)}</td>
                  <td style={td()}>{r.hora || "—"}</td>
                  <td style={td()}>{r.tambo || "—"}</td>
                  <td style={td()}>{r.producto || "—"}</td>
                  <td style={td()}>{r.destino || "—"}</td>
                  <td style={td(true)}>{r.litrosFca != null ? Math.round(r.litrosFca).toLocaleString("es-AR") : "—"}</td>
                  <td style={td(true)}>{r.litrosTbo != null ? Math.round(r.litrosTbo).toLocaleString("es-AR") : "—"}</td>
                  <td style={{ ...td(true), color: difCol, fontWeight: 600 }}>
                    {isNaN(dif) ? "—" : (dif >= 0 ? "+" : "") + Math.round(dif).toLocaleString("es-AR")}
                  </td>
                  <td style={{ ...td(), color: C.sub }}>{r.obs || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminTabSalidas = ({ cargas, isDesktop }) => {
  const transOpts = [...new Set(cargas.map(r => r.transportista).filter(Boolean))].sort();
  const destOpts  = [...new Set(cargas.map(r => r.destino).filter(Boolean))].sort();
  const [filtTrans, setFiltTrans] = useState("");
  const [filtDest,  setFiltDest]  = useState("");
  const filtered = cargas.filter(r => {
    if (filtTrans && r.transportista !== filtTrans) return false;
    if (filtDest  && r.destino !== filtDest) return false;
    return true;
  });
  const totalLitros = filtered.reduce((s, r) => s + (parseFloat(r.litros) || 0), 0);
  const th = { padding: "8px 10px", fontSize: 11, color: C.sub, textAlign: "left",
    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.04em" };
  const td = (right = false) => ({
    padding: "8px 10px", fontSize: 12, color: C.text,
    borderBottom: `1px solid ${C.border}`,
    fontFamily: right ? FONT_MONO : FONT_SANS, textAlign: right ? "right" : "left",
  });
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <select value={filtTrans} onChange={e => setFiltTrans(e.target.value)}
          style={{ ...inp, width: "auto", fontSize: 13, padding: "5px 10px" }}>
          <option value="">Todos los transportistas</option>
          {transOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtDest} onChange={e => setFiltDest(e.target.value)}
          style={{ ...inp, width: "auto", fontSize: 13, padding: "5px 10px" }}>
          <option value="">Todos los destinos</option>
          {destOpts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.sub, alignSelf: "center" }}>
          {filtered.length} despacho{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 14px", display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: C.sub }}>Total despachado</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: "#60a5fa" }}>
            {Math.round(totalLitros).toLocaleString("es-AR")} L
          </span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.surface }}>
              <th style={th}>Fecha</th>
              <th style={th}>Hora</th>
              <th style={th}>Carga</th>
              <th style={th}>Transportista</th>
              <th style={th}>Destino</th>
              <th style={th}>Producto</th>
              <th style={th}>Silo</th>
              <th style={{ ...th, textAlign: "right" }}>Litros</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...td(), textAlign: "center", color: C.sub, padding: "24px 0" }}>
                Sin registros
              </td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id + r._date}>
                <td style={td()}>{fmtDate(r._date)}</td>
                <td style={td()}>{r.hora || "—"}</td>
                <td style={td()}>{r.label || "—"}</td>
                <td style={td()}>{r.transportista || "—"}</td>
                <td style={td()}>{r.destino || "—"}</td>
                <td style={td()}>{r.producto || "—"}</td>
                <td style={td()}>{r.siloProveniente || "—"}</td>
                <td style={td(true)}>{r.litros != null ? Math.round(r.litros).toLocaleString("es-AR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SecAdmin = ({ date, syncKey, perfil }) => {
  const { isDesktop } = useViewport();
  const [tab, setTab] = useState("resumen");
  const [preset, setPreset] = useState("hoy");
  const [customFrom, setCustomFrom] = useState(date);
  const [customTo, setCustomTo] = useState(date);
  const [ingresos, setIngresos] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [loading, setLoading] = useState(false);

  const range = computeRange(preset, customFrom, customTo);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadRangeData(range.from, range.to, "ingresos"),
      loadRangeData(range.from, range.to, "carga"),
    ]).then(([ing, car]) => {
      if (!active) return;
      setIngresos(ing);
      setCargas(car);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range.from, range.to, syncKey]);

  // ── KPIs ──────────────────────────────────────────────────────
  const litrosIn  = ingresos.reduce((s, r) => s + (parseFloat(r.litrosFca) || 0), 0);
  const litrosOut = cargas.reduce((s, r) => s + (parseFloat(r.litros) || 0), 0);
  const balance   = litrosIn - litrosOut;
  const tambosSet = new Set(ingresos.map(r => r.tambo).filter(Boolean));
  const transSet  = new Set(cargas.map(r => r.transportista).filter(Boolean));

  const rangeLabel = range.from === range.to
    ? fmtDate(range.from)
    : `${fmtDate(range.from)} → ${fmtDate(range.to)}`;

  // ── Styles ────────────────────────────────────────────────────
  const tabBtn = (active) => ({
    background: active ? C.accentDim : "none",
    color: active ? C.accent : C.sub,
    border: "none", cursor: "pointer",
    padding: isDesktop ? "8px 14px" : "7px 8px",
    fontSize: isDesktop ? 13 : 11,
    fontWeight: active ? 700 : 400,
    borderRadius: 8,
    display: "flex", alignItems: "center", gap: 5,
    whiteSpace: "nowrap", flexShrink: 0,
  });

  const KpiCard = ({ Icon, label, value, unit, color = C.accent, sub = null }) => (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={SW} color={color} />
        <span style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString("es-AR") : value}
        <span style={{ fontSize: 12, fontWeight: 400, color: C.sub, marginLeft: 5 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );

  const Placeholder = ({ id }) => (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "48px 24px", textAlign: "center", color: C.sub,
    }}>
      <IcoAdmin size={30} strokeWidth={SW} color={C.accent} />
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 12, marginBottom: 4 }}>
        {ADMIN_TABS.find(([t]) => t === id)?.[2]} — próximamente
      </div>
      <div style={{ fontSize: 12 }}>En construcción.</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isDesktop ? "20px 24px" : "12px 14px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <IcoAdmin size={22} strokeWidth={SW} color={C.accent} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Administración</div>
          <div style={{ fontSize: 12, color: C.sub }}>Control de entradas, salidas y logística</div>
        </div>
      </div>

      {/* Range Picker */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: "10px 14px", marginBottom: 16,
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 11, color: C.sub, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Período:</span>
        {RANGE_PRESETS.map(([p, l]) => (
          <button key={p} type="button" onClick={() => setPreset(p)} style={{
            background: preset === p ? C.accent : C.bg,
            color: preset === p ? "#000" : C.sub,
            border: `1px solid ${preset === p ? C.accent : C.border}`,
            borderRadius: 6, padding: "3px 9px", fontSize: 12,
            fontWeight: preset === p ? 700 : 400, cursor: "pointer",
          }}>{l}</button>
        ))}
        {preset === "custom" && (
          <>
            <input type="date" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ ...inp, width: "auto", fontSize: 13, padding: "3px 8px", flex: "none" }} />
            <span style={{ color: C.sub, fontSize: 12 }}>→</span>
            <input type="date" value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ ...inp, width: "auto", fontSize: 13, padding: "3px 8px", flex: "none" }} />
          </>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.accent, fontFamily: FONT_MONO, fontWeight: 600, whiteSpace: "nowrap" }}>
          {rangeLabel}
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", overflowX: "auto", gap: 2,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 2, marginBottom: 18,
        scrollbarWidth: "none",
      }}>
        {ADMIN_TABS.filter(([id]) => !(id === "saldo" && perfil === "admin")).map(([id, Icon, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={tabBtn(tab === id)}>
            <Icon size={13} strokeWidth={SW} />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.sub, fontSize: 13 }}>
          Cargando…
        </div>
      )}

      {/* ── RESUMEN ── */}
      {!loading && tab === "resumen" && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
            gap: 12, marginBottom: 20,
          }}>
            <KpiCard Icon={IcoIngresos} label="Litros ingresados"  value={Math.round(litrosIn)}  unit="L" color={C.accent} />
            <KpiCard Icon={IcoCarga}    label="Litros despachados" value={Math.round(litrosOut)} unit="L" color="#60a5fa" />
            <KpiCard Icon={IcoBalance}  label="Balance neto"
              value={Math.round(Math.abs(balance))} unit="L"
              color={balance >= 0 ? C.success : C.danger}
              sub={balance >= 0 ? "Superávit" : "Déficit"} />
            <KpiCard Icon={CamionIcon}  label="Viajes de entrada"  value={ingresos.length}       unit="viajes" color={C.accent} />
            <KpiCard Icon={IcoLeche}    label="Tambos activos"      value={tambosSet.size}         unit="tambos" color="#a78bfa" />
            <KpiCard Icon={IcoCarga}    label="Despachos"           value={cargas.length}          unit="cargas" color="#f97316" />
          </div>
          {ingresos.length === 0 && cargas.length === 0 && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "24px 20px", textAlign: "center", color: C.sub, fontSize: 13,
            }}>
              No hay registros en el período seleccionado.
            </div>
          )}
        </div>
      )}

      {/* ── INGRESOS ── */}
      {!loading && tab === "ingresos" && <AdminTabIngresos ingresos={ingresos} isDesktop={isDesktop} />}

      {/* ── SALIDAS ── */}
      {!loading && tab === "salidas" && <AdminTabSalidas cargas={cargas} isDesktop={isDesktop} />}

      {/* ── TAMBOS ── */}
      {!loading && tab === "tambos" && (() => {
        const byTambo = {};
        for (const r of ingresos) {
          const k = r.tambo || "—";
          if (!byTambo[k]) byTambo[k] = { tambo: k, viajes: 0, litrosFca: 0, litrosTbo: 0, aguados: 0 };
          byTambo[k].viajes++;
          byTambo[k].litrosFca += parseFloat(r.litrosFca) || 0;
          byTambo[k].litrosTbo += parseFloat(r.litrosTbo) || 0;
          if ((parseFloat(r.aguadoFca) || 0) > 0) byTambo[k].aguados++;
        }
        const rows = Object.values(byTambo).sort((a, b) => b.litrosFca - a.litrosFca);
        const th = { padding: "8px 10px", fontSize: 11, color: C.sub, textAlign: "left",
          borderBottom: `1px solid ${C.border}`, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
        const td = (right = false) => ({
          padding: "8px 10px", fontSize: 12, color: C.text,
          borderBottom: `1px solid ${C.border}`,
          fontFamily: right ? FONT_MONO : FONT_SANS, textAlign: right ? "right" : "left",
        });
        return rows.length === 0
          ? <div style={{ textAlign: "center", color: C.sub, padding: "40px 0" }}>Sin datos en el período.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: C.surface }}>
                  <th style={{ ...th, width: 28 }}>#</th>
                  <th style={th}>Tambo</th>
                  <th style={{ ...th, textAlign: "right" }}>Viajes</th>
                  <th style={{ ...th, textAlign: "right" }}>L Fca.</th>
                  <th style={{ ...th, textAlign: "right" }}>L Tbo.</th>
                  <th style={{ ...th, textAlign: "right" }}>Dif. prom.</th>
                  <th style={{ ...th, textAlign: "right" }}>Aguados</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const promDif = r.viajes > 0 ? (r.litrosFca - r.litrosTbo) / r.viajes : 0;
                    const hasAlert = r.aguados > 0;
                    return (
                      <tr key={r.tambo} style={{ background: i % 2 === 0 ? "transparent" : `${C.surface}55` }}>
                        <td style={{ ...td(), color: C.muted }}>{i + 1}</td>
                        <td style={td()}>
                          <span style={{ fontWeight: 600 }}>{r.tambo}</span>
                          {hasAlert && <span style={{ marginLeft: 6, fontSize: 10, color: C.danger,
                            background: `${C.danger}20`, borderRadius: 4, padding: "1px 5px" }}>
                            aguado ×{r.aguados}
                          </span>}
                        </td>
                        <td style={td(true)}>{r.viajes}</td>
                        <td style={td(true)}>{Math.round(r.litrosFca).toLocaleString("es-AR")}</td>
                        <td style={td(true)}>{Math.round(r.litrosTbo).toLocaleString("es-AR")}</td>
                        <td style={{ ...td(true), color: Math.abs(promDif) > 30 ? C.danger : C.sub }}>
                          {(promDif >= 0 ? "+" : "") + Math.round(promDif).toLocaleString("es-AR")}
                        </td>
                        <td style={{ ...td(true), color: r.aguados > 0 ? C.danger : C.muted }}>
                          {r.aguados || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
      })()}

      {/* ── TRANSPORTISTAS ── */}
      {!loading && tab === "transportistas" && (() => {
        const byTrans = {};
        for (const r of ingresos) {
          const k = r.transportista || r.camion || "—";
          if (!byTrans[k]) byTrans[k] = { trans: k, viajes: 0, litros: 0, destinos: new Set() };
          byTrans[k].viajes++;
          byTrans[k].litros += parseFloat(r.litrosFca) || 0;
          if (r.destino) byTrans[k].destinos.add(r.destino);
        }
        for (const r of cargas) {
          const k = r.transportista || "—";
          if (!byTrans[k]) byTrans[k] = { trans: k, viajes: 0, litros: 0, destinos: new Set() };
          byTrans[k].viajes++;
          byTrans[k].litros += parseFloat(r.litros) || 0;
          if (r.destino) byTrans[k].destinos.add(r.destino);
        }
        const rows = Object.values(byTrans)
          .map(r => ({ ...r, destinos: [...r.destinos] }))
          .sort((a, b) => b.viajes - a.viajes);
        const th = { padding: "8px 10px", fontSize: 11, color: C.sub, textAlign: "left",
          borderBottom: `1px solid ${C.border}`, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
        const td = (right = false) => ({
          padding: "8px 10px", fontSize: 12, color: C.text,
          borderBottom: `1px solid ${C.border}`,
          fontFamily: right ? FONT_MONO : FONT_SANS, textAlign: right ? "right" : "left",
        });
        return rows.length === 0
          ? <div style={{ textAlign: "center", color: C.sub, padding: "40px 0" }}>Sin datos en el período.</div>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: C.surface }}>
                  <th style={{ ...th, width: 28 }}>#</th>
                  <th style={th}>Transportista</th>
                  <th style={{ ...th, textAlign: "right" }}>Viajes</th>
                  <th style={{ ...th, textAlign: "right" }}>Litros</th>
                  <th style={{ ...th, textAlign: "right" }}>Prom/viaje</th>
                  <th style={th}>Destinos</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.trans} style={{ background: i % 2 === 0 ? "transparent" : `${C.surface}55` }}>
                      <td style={{ ...td(), color: C.muted }}>{i + 1}</td>
                      <td style={{ ...td(), fontWeight: 600 }}>{r.trans}</td>
                      <td style={td(true)}>{r.viajes}</td>
                      <td style={td(true)}>{Math.round(r.litros).toLocaleString("es-AR")}</td>
                      <td style={td(true)}>
                        {r.viajes > 0 ? Math.round(r.litros / r.viajes).toLocaleString("es-AR") : "—"}
                      </td>
                      <td style={{ ...td(), color: C.sub, fontSize: 11 }}>
                        {r.destinos.length ? r.destinos.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
      })()}

      {/* ── DIFERENCIAS ── */}
      {!loading && tab === "diferencias" && (() => {
        const UMBRAL = 50;
        const diffs = ingresos
          .map(r => {
            const fca = parseFloat(r.litrosFca) || 0;
            const tbo = parseFloat(r.litrosTbo) || 0;
            const dif = fca - tbo;
            const pct = tbo > 0 ? (dif / tbo) * 100 : 0;
            return { ...r, _dif: dif, _pct: pct };
          })
          .filter(r => Math.abs(r._dif) >= UMBRAL || (parseFloat(r.aguadoFca) || 0) > 0)
          .sort((a, b) => Math.abs(b._dif) - Math.abs(a._dif));
        const th = { padding: "8px 10px", fontSize: 11, color: C.sub, textAlign: "left",
          borderBottom: `1px solid ${C.border}`, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
        const td = (right = false) => ({
          padding: "8px 10px", fontSize: 12, color: C.text,
          borderBottom: `1px solid ${C.border}`,
          fontFamily: right ? FONT_MONO : FONT_SANS, textAlign: right ? "right" : "left",
        });
        return (
          <div>
            <div style={{ background: `${C.accent}14`, border: `1px solid ${C.accentDark}`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.text }}>
              Se muestran ingresos con diferencia Fca/Tbo ≥ {UMBRAL} L o con registro de aguado.
              Útil para control de liquidación de tambos.
            </div>
            {diffs.length === 0
              ? <div style={{ textAlign: "center", color: C.sub, padding: "40px 0" }}>
                  No hay diferencias relevantes en el período.
                </div>
              : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: C.surface }}>
                      <th style={th}>Fecha</th>
                      <th style={th}>Hora</th>
                      <th style={th}>Tambo</th>
                      <th style={{ ...th, textAlign: "right" }}>L Fca.</th>
                      <th style={{ ...th, textAlign: "right" }}>L Tbo.</th>
                      <th style={{ ...th, textAlign: "right" }}>Dif.</th>
                      <th style={{ ...th, textAlign: "right" }}>%</th>
                      <th style={th}>Alerta</th>
                    </tr></thead>
                    <tbody>
                      {diffs.map(r => {
                        const isAguado = (parseFloat(r.aguadoFca) || 0) > 0;
                        const difColor = r._dif < 0 ? C.danger : Math.abs(r._dif) >= UMBRAL ? "#f97316" : C.success;
                        return (
                          <tr key={r.id + r._date}>
                            <td style={td()}>{fmtDate(r._date)}</td>
                            <td style={td()}>{r.hora || "—"}</td>
                            <td style={{ ...td(), fontWeight: 600 }}>{r.tambo || "—"}</td>
                            <td style={td(true)}>{Math.round(r.litrosFca || 0).toLocaleString("es-AR")}</td>
                            <td style={td(true)}>{Math.round(r.litrosTbo || 0).toLocaleString("es-AR")}</td>
                            <td style={{ ...td(true), color: difColor, fontWeight: 700 }}>
                              {(r._dif >= 0 ? "+" : "") + Math.round(r._dif).toLocaleString("es-AR")}
                            </td>
                            <td style={{ ...td(true), color: difColor }}>
                              {r._pct.toFixed(1)}%
                            </td>
                            <td style={td()}>
                              {isAguado && <span style={{ fontSize: 10, color: C.danger,
                                background: `${C.danger}20`, borderRadius: 4, padding: "2px 6px",
                                fontWeight: 700 }}>AGUADO</span>}
                              {!isAguado && Math.abs(r._dif) >= UMBRAL &&
                                <span style={{ fontSize: 10, color: "#f97316",
                                  background: "#f9731620", borderRadius: 4, padding: "2px 6px",
                                  fontWeight: 700 }}>DESVÍO</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        );
      })()}

      {/* ── EXPORTAR ── */}
      {!loading && tab === "exportar" && (() => {
        const exportCSV = () => {
          const header = ["Fecha","Hora","Tambo","Producto","Destino","L Fca","L Tbo","Diferencia","Aguado Fca","Aguado Tbo","pH","Acidez","Obs"];
          const rows = ingresos.map(r => [
            r._date, r.hora||"", escapeCsv(r.tambo||""), escapeCsv(r.producto||""),
            escapeCsv(r.destino||""), r.litrosFca||"", r.litrosTbo||"",
            ((parseFloat(r.litrosFca)||0)-(parseFloat(r.litrosTbo)||0)).toFixed(0),
            r.aguadoFca||"", r.aguadoTbo||"", r.phFca||"", r.acidezFca||"",
            escapeCsv(r.obs||""),
          ].join(","));
          const csv = [header.join(","), ...rows].join("\n");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
          a.download = `yatasto-ingresos-${range.from}-${range.to}.csv`;
          a.click();
        };
        const exportSalidasCSV = () => {
          const header = ["Fecha","Hora","Carga","Transportista","Destino","Producto","Silo","Litros"];
          const rows = cargas.map(r => [
            r._date, r.hora||"", escapeCsv(r.label||""),
            escapeCsv(r.transportista||""), escapeCsv(r.destino||""),
            escapeCsv(r.producto||""), escapeCsv(r.siloProveniente||""),
            r.litros||"",
          ].join(","));
          const csv = [header.join(","), ...rows].join("\n");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
          a.download = `yatasto-salidas-${range.from}-${range.to}.csv`;
          a.click();
        };
        const exportHTML = () => {
          const totalIn  = ingresos.reduce((s,r) => s+(parseFloat(r.litrosFca)||0), 0);
          const totalOut = cargas.reduce((s,r) => s+(parseFloat(r.litros)||0), 0);
          const byTamboMap = {};
          for (const r of ingresos) {
            const k = r.tambo||"—";
            if (!byTamboMap[k]) byTamboMap[k] = 0;
            byTamboMap[k] += parseFloat(r.litrosFca)||0;
          }
          const byTamboRows = Object.entries(byTamboMap)
            .sort((a,b) => b[1]-a[1])
            .map(([t,l]) => `<tr><td>${escapeHtml(t)}</td><td style="text-align:right;font-family:monospace">${Math.round(l).toLocaleString("es-AR")}</td></tr>`)
            .join("");
          const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Yatasto — Administración ${rangeLabel}</title>
<style>
  body{font-family:Arial,sans-serif;background:#0f0f0f;color:#e5e5e5;margin:0;padding:24px}
  .header{border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:20px}
  .title{font-size:22px;font-weight:700;color:#f59e0b}
  .sub{font-size:12px;color:#888;margin-top:4px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:14px}
  .kpi-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .kpi-val{font-size:22px;font-weight:700;font-family:monospace;color:#f59e0b}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;border-bottom:1px solid #333;text-align:left}
  td{font-size:12px;color:#e5e5e5;padding:7px 10px;border-bottom:1px solid #222}
  h2{font-size:14px;color:#f59e0b;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 10px}
  .footer{font-size:10px;color:#555;border-top:1px solid #333;padding-top:10px;margin-top:24px}
  @media print{body{background:#fff;color:#000}.kpi{background:#f5f5f5;border-color:#ddd}.kpi-val{color:#b45309}th{color:#666}td{color:#222}}
</style></head><body>
<div class="header">
  <div class="title">Lácteos Yatasto SA — Administración</div>
  <div class="sub">Período: ${rangeLabel} · Generado: ${new Date().toLocaleString("es-AR")}</div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Litros ingresados</div><div class="kpi-val">${Math.round(totalIn).toLocaleString("es-AR")} L</div></div>
  <div class="kpi"><div class="kpi-label">Litros despachados</div><div class="kpi-val">${Math.round(totalOut).toLocaleString("es-AR")} L</div></div>
  <div class="kpi"><div class="kpi-label">Balance neto</div><div class="kpi-val">${Math.round(totalIn-totalOut).toLocaleString("es-AR")} L</div></div>
  <div class="kpi"><div class="kpi-label">Viajes entrada</div><div class="kpi-val">${ingresos.length}</div></div>
  <div class="kpi"><div class="kpi-label">Tambos activos</div><div class="kpi-val">${new Set(ingresos.map(r=>r.tambo).filter(Boolean)).size}</div></div>
  <div class="kpi"><div class="kpi-label">Despachos</div><div class="kpi-val">${cargas.length}</div></div>
</div>
<h2>Ingresos por tambo</h2>
<table><thead><tr><th>Tambo</th><th>Litros Fca.</th></tr></thead><tbody>${byTamboRows}</tbody></table>
<h2>Detalle de ingresos</h2>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Tambo</th><th>Producto</th><th>Destino</th><th>L Fca.</th><th>L Tbo.</th><th>Dif.</th></tr></thead><tbody>
${ingresos.map(r=>{const d=(parseFloat(r.litrosFca)||0)-(parseFloat(r.litrosTbo)||0);return`<tr><td>${r._date}</td><td>${r.hora||""}</td><td>${escapeHtml(r.tambo||"")}</td><td>${escapeHtml(r.producto||"")}</td><td>${escapeHtml(r.destino||"")}</td><td style="text-align:right;font-family:monospace">${Math.round(r.litrosFca||0).toLocaleString("es-AR")}</td><td style="text-align:right;font-family:monospace">${Math.round(r.litrosTbo||0).toLocaleString("es-AR")}</td><td style="text-align:right;font-family:monospace;color:${d<0?"#dc2626":d>50?"#f97316":"#22c55e"}">${d>=0?"+":""}${Math.round(d).toLocaleString("es-AR")}</td></tr>`;}).join("")}
</tbody></table>
<h2>Detalle de salidas</h2>
<table><thead><tr><th>Fecha</th><th>Hora</th><th>Carga</th><th>Transportista</th><th>Destino</th><th>Producto</th><th>Litros</th></tr></thead><tbody>
${cargas.map(r=>`<tr><td>${r._date}</td><td>${r.hora||""}</td><td>${escapeHtml(r.label||"")}</td><td>${escapeHtml(r.transportista||"")}</td><td>${escapeHtml(r.destino||"")}</td><td>${escapeHtml(r.producto||"")}</td><td style="text-align:right;font-family:monospace">${Math.round(r.litros||0).toLocaleString("es-AR")}</td></tr>`).join("")}
</tbody></table>
<div class="footer">Lácteos Yatasto SA · Sistema de Gestión v2.0 · Solo para uso interno</div>
</body></html>`;
          const w = window.open("", "_blank");
          if (w) { w.document.write(html); w.document.close(); w.print(); }
        };
        const btnStyle = (color = C.accent) => ({
          background: color, color: "#000", border: "none", borderRadius: 8,
          padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        });
        return (
          <div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
              Exportaciones para el período <strong style={{ color: C.accent }}>{rangeLabel}</strong>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button type="button" style={btnStyle(C.accent)} onClick={exportCSV}>
                <TabExportar size={15} strokeWidth={SW} />
                Exportar Ingresos CSV
              </button>
              <button type="button" style={btnStyle("#60a5fa")} onClick={exportSalidasCSV}>
                <TabExportar size={15} strokeWidth={SW} />
                Exportar Salidas CSV
              </button>
              <button type="button" style={btnStyle("#22c55e")} onClick={exportHTML}>
                <TabExportar size={15} strokeWidth={SW} />
                Informe PDF completo
              </button>
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: C.muted }}>
              El PDF abre en una pestaña nueva lista para imprimir (Ctrl+P / ⌘P).
              Los CSV incluyen BOM UTF-8 para compatibilidad con Excel.
            </div>
            <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                Backup de seguridad
              </div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 12, lineHeight: 1.6 }}>
                Descarga un JSON con todos los registros de la base de datos.
                Guardá este archivo en un lugar seguro como respaldo ante pérdida de datos.
                {(() => {
                  const lastBackup = localStorage.getItem("yatasto:ultimo-backup-date");
                  const today = new Date().toISOString().split("T")[0];
                  if (!lastBackup) return <span style={{ color: C.danger, fontWeight: 700 }}> No se generó ningún backup todavía.</span>;
                  if (lastBackup < today) return <span style={{ color: "#f97316", fontWeight: 600 }}> Último backup: {new Date(lastBackup + "T00:00:00").toLocaleDateString("es-AR")}.</span>;
                  return <span style={{ color: C.success, fontWeight: 600 }}> Backup del día descargado.</span>;
                })()}
              </div>
              <button
                type="button"
                style={{ ...btnStyle("#6366f1"), fontSize: 13 }}
                onClick={async e => {
                  const btn = e.currentTarget;
                  btn.disabled = true;
                  btn.textContent = "Generando…";
                  try { await generateBackup(); btn.textContent = "✓ Descargado"; }
                  catch { btn.textContent = "Error — intentá de nuevo"; }
                  finally { setTimeout(() => { btn.disabled = false; btn.textContent = "Descargar backup completo"; }, 3000); }
                }}
              >
                <TabExportar size={15} strokeWidth={SW} />
                Descargar backup completo
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── SALDO INICIAL ── (solo supervisor/jefe) */}
      {tab === "saldo" && perfil !== "admin" && <SaldoInicialPanel perfil={perfil} />}

    </div>
  );
};

// ─── SALDO INICIAL ────────────────────────────────────────────
const SaldoInicialPanel = ({ perfil }) => {
  const [confirmUI, askConfirm] = useConfirm();
  const [baseSaldo, setBaseSaldo] = useState(null);
  const [editSilos, setEditSilos] = useState(() =>
    Object.fromEntries(STOCK_SILOS.map(s => [s, { litros: "", producto: "" }]))
  );
  const [editing, setEditing] = useState(false);
  const [viewDate, setViewDate] = useState(getToday());
  const [viewResult, setViewResult] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const [status, setStatus] = useState(null); // null | "saving" | "chaining" | "saved"

  const canEdit = perfil === "supervisor" || perfil === "jefe";

  useEffect(() => {
    loadBaseSaldo().then(s => {
      setBaseSaldo(s);
      if (!s) return;
      setEditSilos(prev => {
        const next = { ...prev };
        Object.entries(s.data || {}).forEach(([k, v]) => {
          if (next[k] !== undefined) next[k] = { ...next[k], litros: v > 0 ? String(v) : "" };
        });
        Object.entries(s.productos || {}).forEach(([k, p]) => {
          if (next[k] !== undefined && p) next[k] = { ...next[k], producto: p };
        });
        return next;
      });
    });
  }, []);

  const handleSave = async () => {
    // VALIDACIÓN INTERNA: sólo supervisor/jefe pueden modificar saldo base
    if (perfil !== "supervisor" && perfil !== "jefe") {
      console.warn("[SaldoInicialPanel.handleSave] perfil sin permiso:", perfil);
      return;
    }
    const baseDate = baseSaldo?.fromDate || getPreviousDate(getToday());
    const baseDateLabel = new Date(baseDate + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const ok = await askConfirm({
      title: "Modificar Saldo Base Oficial",
      message: `⚠️ Esta acción recalculará toda la cadena histórica desde el ${baseDateLabel} hasta hoy.\n\nTodos los valores calculados de stock e ingresos anteriores serán afectados.\n\n¿Confirmar modificación?`,
      danger: true,
      confirmLabel: "Guardar saldo base",
    });
    if (!ok) return;

    setStatus("saving");
    const data = Object.fromEntries(
      STOCK_SILOS.map(s => [s, parseFloat(editSilos[s]?.litros) || 0])
    );
    const productos = Object.fromEntries(
      STOCK_SILOS.filter(s => editSilos[s]?.producto).map(s => [s, editSilos[s].producto])
    );

    await saveBaseSaldo(data, baseDate, productos);
    _autoLitrosCache.clear();

    const today = getToday();
    const yesterday = getPreviousDate(today);
    if (baseDate < yesterday) {
      setStatus("chaining");
      const { totals, productosBase } = await buildChainedSaldo({ data, fromDate: baseDate, productos }, yesterday);
      await saveSaldo(totals, yesterday, productosBase);
      _autoLitrosCache.clear();
    } else if (baseDate <= today) {
      await saveSaldo(data, baseDate, productos);
    }

    setBaseSaldo({ data, fromDate: baseDate, productos });
    setEditing(false);
    setStatus("saved");
    setTimeout(() => setStatus(null), 5000);
  };

  const handleCalculate = async () => {
    setLoadingView(true);
    setViewResult(null);
    try {
      const result = await calcAutoLitros(viewDate);
      setViewResult(result);
    } finally {
      setLoadingView(false);
    }
  };

  const baseDate = baseSaldo?.fromDate;
  const baseDateLabel = baseDate
    ? new Date(baseDate + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div>
      {confirmUI}

      {/* ── ZONA 1: Saldo Base Oficial ── */}
      <div style={{ ...card, marginBottom: 16, borderColor: `${C.accent}50` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: C.accent, color: "#000", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 4,
              textTransform: "uppercase", flexShrink: 0,
            }}>SALDO BASE OFICIAL</span>
            {baseDate && (
              <span style={{ fontSize: 12, color: C.sub }}>Cierre {baseDateLabel}</span>
            )}
          </div>
          {canEdit && !editing && (
            <button type="button"
              style={{ ...btnSecondary, fontSize: 11, padding: "5px 12px", width: "auto", flexShrink: 0 }}
              onClick={() => setEditing(true)}>
              Modificar
            </button>
          )}
        </div>

        {/* Vista colapsada — solo lectura */}
        {!editing && (
          <div>
            {baseSaldo ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {STOCK_SILOS.map(silo => {
                  const litros = baseSaldo.data?.[silo] || 0;
                  const prod = baseSaldo.productos?.[silo] || "";
                  return (
                    <div key={silo} style={{
                      background: C.surface, borderRadius: 6, padding: "7px 10px",
                      border: `1px solid ${litros > 0 ? C.border : "#2a2a2a"}`,
                    }}>
                      <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
                        {silo.startsWith("TQ") ? "TQ" : "SILO"} {silo.replace("TQ", "")}
                      </div>
                      <div style={{ fontSize: 13, color: litros > 0 ? C.text : C.muted, fontFamily: FONT_MONO }}>
                        {litros > 0 ? litros.toLocaleString("es-AR") + " L" : "—"}
                      </div>
                      {prod && <div style={{ fontSize: 10, color: C.accent, marginTop: 2 }}>{prod}</div>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>
                No hay saldo base registrado.{canEdit ? " Usá el botón Modificar para cargarlo." : ""}
              </div>
            )}
            {status === "saved" && (
              <div style={{
                background: `${C.success}15`, border: `1px solid ${C.success}44`,
                borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.success, marginTop: 10,
              }}>
                Saldo base actualizado y cadena de días recalculada.
              </div>
            )}
          </div>
        )}

        {/* Modo edición */}
        {editing && canEdit && (
          <div>
            <div style={{
              background: `${C.danger}12`, border: `1px solid ${C.danger}44`,
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <AlertaWarn size={16} strokeWidth={2} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "#f97316", lineHeight: 1.6 }}>
                <strong>Modificar este saldo recalculará toda la cadena histórica</strong> desde el {baseDateLabel} hasta hoy.
                Esta operación no se puede deshacer.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {STOCK_SILOS.map(silo => {
                const v = parseFloat(editSilos[silo]?.litros) || 0;
                const cap = SILO_CAP[silo] || 100000;
                const pct = Math.min(100, (v / cap) * 100);
                return (
                  <div key={silo} style={{ ...card, padding: 10, marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>
                        {silo.startsWith("TQ") ? "TQ" : "SILO"} {silo.replace("TQ", "")}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted }}>{pct.toFixed(0)}%</span>
                    </div>
                    <input
                      type="number" inputMode="decimal"
                      style={{ ...inp, fontSize: 13, marginBottom: 6 }}
                      placeholder="0 L"
                      value={editSilos[silo]?.litros || ""}
                      onChange={e => setEditSilos(prev => ({
                        ...prev, [silo]: { ...prev[silo], litros: e.target.value },
                      }))}
                    />
                    <div style={{ background: C.muted, borderRadius: 3, height: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: v > 0 ? C.accent : C.border,
                        width: `${pct}%`, transition: "width 0.4s ease",
                      }} />
                    </div>
                    <Sel
                      value={editSilos[silo]?.producto || ""}
                      onChange={val => setEditSilos(prev => ({
                        ...prev, [silo]: { ...prev[silo], producto: val },
                      }))}
                      options={PRODS_STOCK.filter(p => p !== "Sucio (vacío)" && p !== "Limpio")}
                      placeholder="Producto..."
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>
              Total: <strong style={{ color: C.text, fontFamily: FONT_MONO }}>
                {STOCK_SILOS.reduce((acc, s) => acc + (parseFloat(editSilos[s]?.litros) || 0), 0).toLocaleString("es-AR")} L
              </strong>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={{ ...btnSecondary, flex: 1 }}
                onClick={() => { setEditing(false); setStatus(null); }}>
                Cancelar
              </button>
              <button type="button" style={{ ...btnPrimary, flex: 2 }}
                disabled={status === "saving" || status === "chaining"}
                onClick={handleSave}>
                {status === "saving" ? "Guardando…"
                  : status === "chaining" ? "Recalculando cadena…"
                  : "Guardar saldo base"}
              </button>
            </div>

            {status === "chaining" && (
              <div style={{
                background: `${C.accent}10`, border: `1px solid ${C.accent}40`,
                borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.accent, marginTop: 10,
              }}>
                Reconstruyendo la cadena de días. No cerres esta pantalla.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ZONA 2: Consultar estado calculado ── */}
      <div style={{ ...card, borderColor: C.border }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Consultar estado calculado
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <F label="Fecha a consultar">
              <input type="date" style={inp} value={viewDate} max={getToday()}
                onChange={e => { setViewDate(e.target.value); setViewResult(null); }} />
            </F>
          </div>
          <button type="button"
            style={{ ...btnSecondary, width: "auto", padding: "13px 16px", flexShrink: 0 }}
            disabled={loadingView} onClick={handleCalculate}>
            {loadingView ? "…" : "Calcular"}
          </button>
        </div>

        {viewResult && (
          <div>
            <div style={{
              background: `${C.success}12`, border: `1px solid ${C.success}44`,
              borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.success,
              marginBottom: 12, lineHeight: 1.6,
            }}>
              Estado calculado al cierre del{" "}
              <strong>{new Date(viewDate + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}</strong>
              {" "}— acumulado desde el saldo base + operaciones de cada día en la cadena. Solo lectura.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {STOCK_SILOS.map(silo => {
                const litros = viewResult.totals?.[silo] || 0;
                const prod = viewResult.productosBase?.[silo] || "";
                return (
                  <div key={silo} style={{
                    background: C.surface, borderRadius: 6, padding: "7px 10px",
                    border: `1px solid ${litros > 0 ? C.border : "#2a2a2a"}`,
                  }}>
                    <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
                      {silo.startsWith("TQ") ? "TQ" : "SILO"} {silo.replace("TQ", "")}
                    </div>
                    <div style={{ fontSize: 13, color: litros > 0 ? C.text : C.muted, fontFamily: FONT_MONO }}>
                      {litros > 0 ? litros.toLocaleString("es-AR") + " L" : "—"}
                    </div>
                    {prod && <div style={{ fontSize: 10, color: C.accent, marginTop: 2 }}>{prod}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── JEFE HUB — acceso a Dashboard + Oficina ─────────────────
const SecJefeHub = ({ date, perfil, perfilLabel, syncKey }) => {
  const [tab, setTab] = useState("dashboard");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px" }}>
        {[["dashboard", "Dashboard"], ["oficina", "Oficina"]].map(([id, label]) => (
          <button key={id} type="button"
            style={{ ...btnSecondary, flex: 1,
              ...(tab === id ? { background: C.accentDim, color: C.accent, borderColor: C.accent } : {}) }}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <SecDashboard date={date} perfil={perfil} perfilLabel={perfilLabel} syncKey={syncKey} />}
      {tab === "oficina" && <SecAdmin date={date} syncKey={syncKey} perfil={perfil} />}
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
  // Perfil NO se inicializa desde localStorage por seguridad — sólo desde Supabase session.
  // Hasta que la sesión resuelva (perfilLoading=true), la UI muestra acciones bloqueadas.
  const [perfil, setPerfil] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(true);
  const [perfilModal, setPerfilModal] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [syncKey, setSyncKey] = useState(0); // incrementa cada 10s → refresca datos en todas las secciones
  const [storageOk, setStorageOk] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [queueLen, setQueueLen] = useState(0);
  const [queueRetrying, setQueueRetrying] = useState(false);
  const [backupSuggestion, setBackupSuggestion] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [dayClosedBy, setDayClosedBy] = useState(null);
  const [dayClosedBlocked, setDayClosedBlocked] = useState(false);
  const [saveConflict, setSaveConflict] = useState(null); // C5: { sec, date }
  const [confirmUI, askConfirm] = useConfirm();
  const [turnoActual, setTurnoActual] = useState(getCurrentTurno());
  const isToday = date === getToday();

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  const navItems = perfil
    ? [
        ...NAV,
        ...((perfil === "supervisor" || perfil === "jefe")
          ? [{ id: "produccion", label: "Prod.", Icon: IcoProduccion }]
          : []),
        { id: "supervisor", label: perfil === "admin" ? "Admin" : "Superv.", Icon: PERFILES[perfil]?.Icon || IcoSupervisor },
      ]
    : NAV;

  // Verificar disponibilidad del storage al iniciar
  useEffect(() => {
    const HC = "yatasto:_hc";
    db.set(HC, "1")
      .then(() => db.get(HC))
      .then(r => setStorageOk(!!r))
      .catch(() => setStorageOk(false));
  }, []);

  // Suscribir al estado de la cola de escritura
  useEffect(() => onWriteQueueChange((len, retrying) => {
    setQueueLen(len);
    setQueueRetrying(retrying);
  }), []);

  useEffect(() => onSessionExpired(() => setSessionExpired(true)), []);

  // Cargar estado de cierre del día al cambiar fecha o en cada sync
  useEffect(() => {
    loadEstado(date).then(est => {
      const closed = est?.closed || false;
      setDayClosed(closed);
      setDayClosedBy(est?.closedBy || null);
      _markDayClosed(date, closed);
    });
  }, [date, syncKey]);

  // Registrar callback para cuando save() intenta escribir en día cerrado
  useEffect(() => {
    _onSaveBlocked = () => {
      setDayClosedBlocked(true);
      setTimeout(() => setDayClosedBlocked(false), 3000);
    };
    return () => { _onSaveBlocked = null; };
  }, []);

  // C5: registrar callback para cuando save() detecta conflicto multi-dispositivo
  useEffect(() => {
    _onSaveConflict = ({ sec, date }) => setSaveConflict({ sec, date });
    return () => { _onSaveConflict = null; };
  }, []);

  // Sincronizar perfil con sesión de Supabase Auth.
  // El perfil "verdadero" se deriva exclusivamente de la sesión Supabase (email del usuario
  // autenticado, no de localStorage). Esto evita escalación de privilegios por modificación
  // de session-restore en devtools.
  useEffect(() => {
    let active = true;
    const resolvePerfilFromSession = (session) => {
      if (!session?.user) return null;
      // Primero intentar user_metadata.rol (forma canónica)
      const metaRol = session.user.user_metadata?.rol;
      if (metaRol && PERFILES[metaRol]) return metaRol;
      // Fallback: derivar del email autenticado en Supabase
      const email = session.user.email;
      if (!email) return null;
      return Object.keys(PERFILES).find(k => PERFILES[k].email === email) || null;
    };

    db.auth.getSession().then(session => {
      if (!active) return;
      const rol = resolvePerfilFromSession(session);
      setPerfil(rol);
      setPerfilLoading(false);
    }).catch(() => {
      if (!active) return;
      setPerfilLoading(false);
    });

    const unsubscribe = db.auth.onAuthStateChange((_event, session) => {
      const rol = resolvePerfilFromSession(session);
      setPerfil(rol);
      setPerfilLoading(false);
      if (!rol) {
        setSection(s => s === "supervisor" ? "ingresos" : s);
      }
    });

    return () => { active = false; unsubscribe(); };
  }, []);

  // Carry-over automático: al abrir la app reconstruye la cadena de días hasta ayer.
  // Si el saldo guardado es de hace más de 1 día, encadena todas las jornadas intermedias
  // para que cada día aplique sus operaciones sobre el cierre del día anterior.
  useEffect(() => {
    const today = getToday();
    const yesterday = getPreviousDate(today);
    loadSaldo().then(async saldo => {
      if (saldo && saldo.fromDate === yesterday) return; // ya está al día
      let totals, productosBase;
      if (saldo && saldo.fromDate && saldo.fromDate < yesterday) {
        // Hay un gap: encadenar desde la fecha del saldo hasta ayer
        ({ totals, productosBase } = await buildChainedSaldo(saldo, yesterday));
      } else {
        // No hay saldo previo o es futuro: calcular ayer directamente
        ({ totals, productosBase } = await calcAutoLitros(yesterday));
      }
      await saveSaldo(totals, yesterday, productosBase);
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
      setTurnoActual(getCurrentTurno()); // actualizar turno si cambió la hora
      // Detectar cambio de día (app abierta al cruzar la medianoche)
      const today = getToday();
      if (today !== lastDate) {
        const yesterday = getPreviousDate(today);
        loadSaldo().then(async saldo => {
          let totals, productosBase;
          if (saldo && saldo.fromDate && saldo.fromDate < yesterday) {
            ({ totals, productosBase } = await buildChainedSaldo(saldo, yesterday));
          } else {
            ({ totals, productosBase } = await calcAutoLitros(yesterday));
          }
          await saveSaldo(totals, yesterday, productosBase);
        });
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

  const handleCerrarDia = async () => {
    if (queueLen > 0) {
      await askConfirm({
        title: "Cambios pendientes de sincronizar",
        message: `Hay ${queueLen} cambio${queueLen > 1 ? "s" : ""} pendiente${queueLen > 1 ? "s" : ""} de guardar en el servidor.\n\nEsperá a que se sincronicen antes de cerrar el día para que el saldo quede correcto.\n\nCuando el ícono de conexión muestre "Sincronizado", intentá de nuevo.`,
        danger: false,
        confirmLabel: "Entendido",
      });
      return;
    }
    const ok = await askConfirm({
      title: "Cerrar día",
      message: `¿Cerrar el día ${fmtDate(date)}?\n\nNo se podrán agregar ni modificar registros. Solo el jefe puede reabrir.`,
      danger: true,
      confirmLabel: "Cerrar día",
    });
    if (!ok) return;
    // VALIDACIÓN INTERNA DE PERFIL — no confiar en que el botón esté oculto
    if (perfil !== "supervisor" && perfil !== "jefe") {
      console.warn("[handleCerrarDia] perfil sin permiso:", perfil);
      return;
    }
    const est = { closed: true, closedAt: new Date().toISOString(), closedBy: PERFILES[perfil]?.label || "Supervisor" };
    await saveEstado(date, est);
    // Snapshot del saldo en el resumen de auditoría
    const { totals: finalTotals, productosBase: finalProductos } = await calcAutoLitros(date);
    const totalLitros = Object.values(finalTotals).reduce((s, v) => s + (v > 0 ? v : 0), 0);
    await logAudit(date, "close_day", "dia", `Día ${date} cerrado · saldo total ${Math.round(totalLitros).toLocaleString("es-AR")} L`, est.closedBy);
    const today = getToday();
    if (date >= getPreviousDate(today)) {
      // Cerrando hoy o ayer — saldo del día cerrado se vuelve la base para mañana
      await saveSaldo(finalTotals, date, finalProductos);
    } else {
      // Cierre retroactivo — no pisar SALDO_KEY con la fecha antigua porque
      // rompería el saldo encadenado de hoy. Disparar reconstrucción completa.
      console.log(`[handleCerrarDia] cierre retroactivo de ${date} → encolando rebuildSaldoChain`);
      scheduleRebuildSaldoChain(date, `close_day_retro:${date}`);
    }
    setDayClosed(true);
    setDayClosedBy(est.closedBy);
    setBackupSuggestion(true);
  };
  const handleReabrirDia = async () => {
    // VALIDACIÓN INTERNA: sólo jefe puede reabrir
    if (perfil !== "jefe") {
      console.warn("[handleReabrirDia] perfil sin permiso:", perfil);
      return;
    }
    const ok = await askConfirm({
      title: "Reabrir día",
      message: `¿Reabrir el día ${fmtDate(date)}?\n\nLos operarios podrán volver a editar registros.`,
      confirmLabel: "Reabrir",
    });
    if (!ok) return;
    await saveEstado(date, { closed: false });
    await logAudit(date, "reopen_day", "dia", `Día ${date} reabierto por ${PERFILES[perfil]?.label || "Jefe"}`, PERFILES[perfil]?.label || "Jefe");
    setDayClosed(false);
    setDayClosedBy(null);
    // Reabrir un día puede llevar a edits retroactivos — pre-invalidar la cadena
    const today = getToday();
    if (date < getPreviousDate(today)) {
      scheduleRebuildSaldoChain(date, `reopen_day:${date}`);
    }
  };

  const handleLogin = async () => {
    const rolKey = Object.keys(PERFILES).find(k =>
      PERFILES[k].usuario.toLowerCase() === loginUser.trim().toLowerCase()
    );
    if (!rolKey) {
      setLoginError("Usuario incorrecto.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      await db.auth.signIn(PERFILES[rolKey].email, loginPass);
      setLoginUser(""); setLoginPass("");
      setPerfilModal(false);
      if (sessionExpired) { setSessionExpired(false); clearSessionExpired(); }
    } catch {
      setLoginError("Usuario o contraseña incorrectos.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setPerfilModal(false);
    if (section === "supervisor") setSection("ingresos");
    try { await db.auth.signOut(); } catch {}
  };

  const closePerfilModal = () => {
    setPerfilModal(false);
    setLoginUser(""); setLoginPass(""); setLoginError("");
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: FONT_SANS, paddingBottom: isDesktop ? 0 : 72, overflowX: "clip" }}>

      <style>{`
        @keyframes yatPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.82); }
        }
        @keyframes yatReservaGlow {
          0%, 100% { box-shadow: 0 0 0 0 ${C.accent}00; }
          50%      { box-shadow: 0 0 14px 2px ${C.accent}55; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="yatPulse"], [style*="yatReservaGlow"] { animation: none !important; }
        }
      `}</style>

      {/* Banner de actualización PWA */}
      {needRefresh && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: C.accent, color: "#000",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Nueva versión disponible
          </span>
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            style={{
              background: "#000", color: C.accent, border: "none", borderRadius: 6,
              padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Actualizar →
          </button>
        </div>
      )}

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

      {/* Banner día cerrado — intento de guardado bloqueado */}
      {dayClosedBlocked && (
        <div style={{
          background: `${C.danger}18`, borderBottom: `2px solid ${C.danger}`,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 301,
          marginLeft: isDesktop ? SIDEBAR_W : 0,
        }}>
          <IcoCerrado size={16} strokeWidth={SW} color={C.danger} />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.danger }}>
            Día cerrado — no se guardaron cambios
          </div>
        </div>
      )}

      {/* Banner conflicto multi-dispositivo (C5) */}
      {saveConflict && (() => {
        const SECC = { ingresos: "Ingresos", cip: "CIP", carga: "Carga", movimientos: "Movimientos", stock: "Stock", fortificados: "Fortificados" };
        const [, mm, dd] = (saveConflict.date || "").split("-");
        const fechaFmt = mm && dd ? `${dd}/${mm}` : saveConflict.date;
        return (
          <div style={{
            background: "#7c1d1d20", borderBottom: "2px solid #ef4444",
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
            position: "sticky", top: 0, zIndex: 302,
            marginLeft: isDesktop ? SIDEBAR_W : 0,
          }}>
            <AlertaWarn size={20} strokeWidth={SW} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                {`Los datos de ${SECC[saveConflict.sec] || saveConflict.sec} del ${fechaFmt} fueron modificados desde otro dispositivo.`}
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
                Recargá la sección antes de guardar nuevamente.
              </div>
            </div>
            <button type="button"
              onClick={() => { setSyncKey(k => k + 1); setSaveConflict(null); }}
              style={{ background: "#ef444420", border: "1px solid #ef444450", color: "#ef4444", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Recargar
            </button>
            <button type="button"
              onClick={() => setSaveConflict(null)}
              style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>
              ✕
            </button>
          </div>
        );
      })()}

      {/* Banner cola de escritura — cambios pendientes de sincronizar */}
      {queueLen > 0 && (
        <div style={{
          background: `${C.accent}15`, borderBottom: `2px solid ${C.accent}88`,
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 299,
          marginLeft: isDesktop ? SIDEBAR_W : 0,
        }}>
          {queueRetrying
            ? <IcoSyncing size={16} strokeWidth={SW} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
            : <IcoSyncError size={16} strokeWidth={SW} color={C.accent} />
          }
          <div style={{ flex: 1, fontSize: 12, color: C.accent, fontWeight: 600 }}>
            {queueRetrying
              ? `Sincronizando ${queueLen} cambio${queueLen > 1 ? "s" : ""}…`
              : `${queueLen} cambio${queueLen > 1 ? "s" : ""} pendiente${queueLen > 1 ? "s" : ""} — sin conexión`
            }
          </div>
        </div>
      )}

      {/* Banner sesión expirada */}
      {sessionExpired && (
        <div style={{
          background: "#7c2d1215", borderBottom: "2px solid #f97316",
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
          position: "sticky", top: 0, zIndex: 301,
          marginLeft: isDesktop ? SIDEBAR_W : 0,
        }}>
          <AlertaWarn size={20} strokeWidth={SW} color="#f97316" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>Sesión expirada — los cambios están en espera</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
              {queueLen > 0
                ? `${queueLen} cambio${queueLen > 1 ? "s" : ""} guardado${queueLen > 1 ? "s" : ""} localmente. Volvé a iniciar sesión para sincronizarlos.`
                : "Volvé a iniciar sesión para continuar guardando."}
            </div>
          </div>
          <button type="button"
            onClick={() => setPerfilModal(true)}
            style={{ background: "#f9731620", border: "1px solid #f9731650", color: "#f97316", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Iniciar sesión
          </button>
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
            db.set(HC, "1").then(() => db.get(HC)).then(r => setStorageOk(!!r)).catch(() => setStorageOk(false));
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
                <button type="button" style={btnSecondary} onClick={closePerfilModal} disabled={loginLoading}>Cancelar</button>
                <button type="button" style={{ ...btnPrimary, opacity: loginLoading ? 0.7 : 1 }} onClick={handleLogin} disabled={loginLoading}>
                  {loginLoading ? "Ingresando..." : "Ingresar"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal informe */}
      {informe && <InformeModal date={date} onClose={() => setInforme(false)} />}

      {/* Header — sticky; en mobile la fila interna es deslizable horizontalmente */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 40,
        boxShadow: _THEME === "light" ? "0 1px 8px rgba(0,0,0,0.07)" : "0 1px 8px rgba(0,0,0,0.4)",
        marginLeft: isDesktop ? SIDEBAR_W : 0,
      }}>
        <div style={{
          padding: "9px 14px",
          display: "flex",
          justifyContent: isDesktop ? "space-between" : "flex-start",
          alignItems: "center",
          gap: isDesktop ? 0 : 14,
          overflowX: isDesktop ? "visible" : "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}>
        {/* Left: Logo + section indicator (mobile only) */}
        {!isDesktop ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <YataLogo compact />
            <div style={{ width: 1, height: 26, background: C.border, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              {(() => { const n = navItems.find(item => item.id === section); return n ? <n.Icon size={14} strokeWidth={SW} /> : null; })()}
              <span>{navItems.find(n => n.id === section)?.label}</span>
            </div>
            {isToday && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentDim, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>
                {TURNO_LABELS[turnoActual]}
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
            {(() => { const n = navItems.find(item => item.id === section); return n ? <n.Icon size={15} strokeWidth={SW} color={C.accent} /> : null; })()}
            <span>{navItems.find(n => n.id === section)?.id === "supervisor" ? "Dashboard" : navItems.find(n => n.id === section)?.label}</span>
            {isToday && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentDim, borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                {TURNO_LABELS[turnoActual]}
              </span>
            )}
          </div>
        )}

        {/* Right: action buttons — flexShrink 0 para que no se compriman en mobile */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, ...(isDesktop ? { marginLeft: "auto" } : {}) }}>
          {/* Sync status */}
          <div title={!storageOk ? "Error de conexión" : queueLen > 0 ? `${queueLen} cambio${queueLen > 1 ? "s" : ""} pendiente${queueLen > 1 ? "s" : ""}` : "Sincronizado"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, flexShrink: 0 }}>
            {!storageOk
              ? <IcoOffline size={14} strokeWidth={SW} color={C.danger} />
              : queueLen > 0 && queueRetrying
              ? <IcoSyncing size={14} strokeWidth={SW} color={C.accent} />
              : queueLen > 0
              ? <IcoSyncError size={14} strokeWidth={SW} color="#f97316" />
              : <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, display: "inline-block" }} />
            }
          </div>
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

          {/* Botón cerrar/reabrir día — solo supervisor y jefe, no admin */}
          {perfil && perfil !== "admin" && (
            <button type="button"
              onClick={dayClosed ? (perfil === "jefe" ? handleReabrirDia : undefined) : handleCerrarDia}
              title={dayClosed ? (perfil === "jefe" ? "Reabrir día" : `Día cerrado por ${dayClosedBy}`) : "Cerrar día"}
              aria-label={dayClosed ? "Día cerrado" : "Cerrar día"}
              style={{
                background: dayClosed ? `${C.danger}20` : C.card,
                border: `1px solid ${dayClosed ? C.danger : C.border}`,
                borderRadius: 9, color: dayClosed ? C.danger : C.sub,
                width: 34, height: 34, cursor: dayClosed && perfil !== "jefe" ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {dayClosed ? <IcoCerrado size={16} strokeWidth={SW} /> : <IcoAbierto size={16} strokeWidth={SW} />}
            </button>
          )}

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
        </div>{/* /inner scrollable row */}
      </div>

      {/* Date picker */}
      {datePicker && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: isDesktop ? "14px 24px" : "12px 16px", display: "flex", gap: 8, marginLeft: isDesktop ? SIDEBAR_W : 0 }}>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setDatePicker(false); }}
            style={{ ...inp, flex: 1, fontSize: isDesktop ? 16 : 14, padding: isDesktop ? "11px 16px" : "9px 12px" }} />
          <button type="button" onClick={() => { setDate(getToday()); setDatePicker(false); }}
            style={{ ...btnPrimary, width: "auto", padding: isDesktop ? "11px 20px" : "10px 16px", fontSize: isDesktop ? 15 : 13, whiteSpace: "nowrap" }}>Hoy</button>
        </div>
      )}

      {/* Banner: fecha histórica */}
      {!isToday && (
        <div style={{
          background: `${C.accent}14`, borderBottom: `1px solid ${C.accentDark}`,
          padding: "7px 16px", display: "flex", alignItems: "center", gap: 8,
          marginLeft: isDesktop ? SIDEBAR_W : 0,
        }}>
          <IcoDate size={13} strokeWidth={SW} color={C.accent} />
          <span style={{ fontSize: 12, color: C.text, flex: 1 }}>
            Viendo registros del <strong style={{ fontFamily: FONT_MONO, color: C.accent }}>{fmtDate(date)}</strong>
          </span>
          <button type="button" onClick={() => setDate(getToday())} style={{
            background: C.accent, color: "#000", border: "none", borderRadius: 6,
            padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>Hoy →</button>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: isDesktop ? "16px 24px 24px" : "12px 12px 80px", marginLeft: isDesktop ? SIDEBAR_W : 0, position: "relative", overflowX: "hidden", minWidth: 0 }}>
        {/* Overlay día cerrado — bloquea edición sin ocultar contenido */}
        {dayClosed && section !== "supervisor" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 80,
            background: `${C.bg}CC`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
            paddingTop: 48,
          }}>
            <IcoCerrado size={40} strokeWidth={1.5} color={C.danger} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 14 }}>Día cerrado</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 6, textAlign: "center", maxWidth: 260 }}>
              {dayClosedBy ? `Cerrado por ${dayClosedBy}. ` : ""}
              {perfil === "jefe" ? "Usá el candado en el header para reabrir." : "Solo el jefe puede reabrir el día."}
            </div>
            {backupSuggestion && (
              <button
                type="button"
                style={{ ...btnPrimary, marginTop: 20, width: "auto", padding: "10px 22px", fontSize: 13 }}
                disabled={backupLoading}
                onClick={async () => {
                  setBackupLoading(true);
                  try { await generateBackup(); setBackupSuggestion(false); }
                  catch { setBackupSuggestion(false); }
                  finally { setBackupLoading(false); }
                }}
              >
                {backupLoading ? "Generando backup…" : "Descargar backup del día"}
              </button>
            )}
          </div>
        )}
        <div style={{ maxWidth: isDesktop ? 960 : "100%", margin: isDesktop ? "0 auto" : undefined }}>
        {section === "ingresos" && <SecIngresos date={date} syncKey={syncKey} dayClosed={dayClosed || perfil === "admin"} perfil={perfil} />}
        {section === "cip" && <SecCIP date={date} syncKey={syncKey} readOnly={perfil === "admin"} />}
        {section === "carga" && <SecCarga date={date} syncKey={syncKey} dayClosed={dayClosed || perfil === "admin"} />}
        {section === "movimientos" && <SecMovimientos date={date} syncKey={syncKey} dayClosed={dayClosed || perfil === "admin"} />}
        {section === "stock" && <SecStock date={date} syncKey={syncKey} readOnly={perfil === "admin"} perfil={perfil} />}
        {section === "fortificados" && <SecFortificados date={date} syncKey={syncKey} dayClosed={dayClosed || perfil === "admin"} />}
        {section === "produccion" && (perfil === "supervisor" || perfil === "jefe") && <SecProduccion date={date} syncKey={syncKey} dayClosed={dayClosed} perfil={perfil} />}
        {section === "supervisor" && perfil === "supervisor" && <SecDashboard date={date} perfil={perfil} perfilLabel={PERFILES[perfil]?.label || ""} syncKey={syncKey} />}
        {section === "supervisor" && perfil === "jefe" && <SecJefeHub date={date} perfil={perfil} perfilLabel={PERFILES[perfil]?.label || ""} syncKey={syncKey} />}
        {section === "supervisor" && perfil === "admin" && <SecAdmin date={date} syncKey={syncKey} perfil={perfil} />}
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
      {confirmUI}
    </div>
  );
}
