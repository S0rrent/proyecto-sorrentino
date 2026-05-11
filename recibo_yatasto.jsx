import { useState, useEffect, Fragment } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { DARK, LIGHT, FONT_SANS, FONT_MONO, EASE_OUT, DUR } from "./tokens.js";
import { useViewport } from "./hooks.js";
import { db, onWriteQueueChange } from "./db-adapter.js";
import {
  Ingresos as IcoIngresos, Movimientos as IcoMovimientos, Carga as IcoCarga,
  Fortificados as IcoFortificados, CIP as IcoCIP, Stock as IcoStock,
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