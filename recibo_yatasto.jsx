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