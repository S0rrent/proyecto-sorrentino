// ─────────────────────────────────────────────────────────────────────────────
// lib/export-helpers.js — Sanitización para exportación
//
// escapeHtml: para inyectar valores de usuario en plantillas HTML de reporte
//   sin riesgo de XSS o markup roto.
//
// escapeCsv: prevenir CSV injection (también conocido como "formula injection").
//   Excel y Calc interpretan campos que arrancan con = + - @ como fórmulas.
//   Encerramos en comillas dobles cualquier campo con caracteres especiales.
// ─────────────────────────────────────────────────────────────────────────────

export const escapeHtml = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const escapeCsv = (s) => {
  const str = String(s == null ? "" : s);
  return /[,"\n\r=+\-@|]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};
