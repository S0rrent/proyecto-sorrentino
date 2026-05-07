// tokens.js — Sistema de diseño Yatasto
// Primitivas de color (OKLCH), tipografía, espaciado, motion y breakpoints.
// Requiere Chrome 111+ / Safari 15.4+ / Firefox 113+ para OKLCH.

// ─── COLOR ────────────────────────────────────────────────────────────────────
// OKLCH(L C H): L=luminosidad 0-1, C=croma, H=hue en grados.
// Dark mode: ámbar (~70°) — legible sobre fondos oscuros.
// Light mode: rojo brand (~22°) tenue — texto negro sobre él da ≥7:1 de contraste.

export const DARK = {
  bg:          "oklch(0.09 0.030 258)",
  surface:     "oklch(0.14 0.028 257)",
  card:        "oklch(0.22 0.028 252)",
  border:      "oklch(0.34 0.020 255)",
  accent:      "oklch(0.75 0.16 70)",   // ámbar legible sobre oscuro
  accentDim:   "oklch(0.26 0.06 68)",   // fondo de chips / badges activos
  accentDark:  "oklch(0.52 0.14 66)",   // hover / pressed
  text:        "oklch(0.96 0.005 250)", // ~14:1 sobre bg
  sub:         "oklch(0.72 0.018 250)",
  muted:       "oklch(0.34 0.035 255)",
  success:     "oklch(0.72 0.16 145)",
  danger:      "oklch(0.65 0.22 25)",
};

export const LIGHT = {
  bg:          "oklch(0.97 0.005 250)",
  surface:     "oklch(0.995 0.002 22)",  // tinte rojo brand, imperceptible
  card:        "oklch(0.99 0.003 22)",
  border:      "oklch(0.88 0.010 250)",
  accent:      "oklch(0.60 0.14 22)",   // rojo brand tenue — negro sobre él: 7.4:1
  accentDim:   "oklch(0.96 0.028 22)",  // fondo chips — rosado muy suave
  accentDark:  "oklch(0.48 0.17 22)",   // hover / pressed
  text:        "oklch(0.18 0.012 250)",
  sub:         "oklch(0.50 0.025 250)",
  muted:       "oklch(0.78 0.010 250)",
  success:     "oklch(0.56 0.17 149)",
  danger:      "oklch(0.55 0.22 25)",   // más saturado que accent → diferenciable
};

// ─── TIPOGRAFÍA ───────────────────────────────────────────────────────────────
export const FONT_SANS = "'Inter', -apple-system, 'Segoe UI', sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

// Escala de tamaños (ratio 1.25, 7 pasos)
export const TYPE_SCALE = {
  xs:   12,  // labels, captions
  sm:   14,  // texto secundario
  md:   16,  // body, inputs (base)
  lg:   20,  // títulos de card
  xl:   25,  // títulos de sección
  "2xl": 32, // stats de dashboard
  "3xl": 40, // números hero (silos)
};

// ─── ESPACIADO (base 4px) ─────────────────────────────────────────────────────
export const SPACE = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48, 16: 64,
};

// ─── MOTION ───────────────────────────────────────────────────────────────────
// Duraciones en milisegundos.
// SiloSVG usa ease-out-quart (sin bounce) a 600ms.
// prefers-reduced-motion: reduce → usar "none" en transitions.
export const EASE_OUT   = "cubic-bezier(0.16, 1, 0.3, 1)";  // ease-out-quart
export const EASE_INOUT = "cubic-bezier(0.65, 0, 0.35, 1)"; // para reverso

export const DUR = {
  fast:   "120ms", // hover, focus ring
  normal: "200ms", // press, tab change
  slow:   "320ms", // modal open, slide-in
  silo:   "600ms", // SiloSVG fill animation
};

// ─── BREAKPOINTS (px) ─────────────────────────────────────────────────────────
export const BP = {
  sm:  640,  // sidebar angosta posible
  md:  768,  // tablet
  lg:  1024, // desktop — sidebar + master-detail
  xl:  1280, // desktop ancho
};
