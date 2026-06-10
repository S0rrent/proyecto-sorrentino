import { Component } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// components/ErrorBoundary.jsx — Red de seguridad contra pantalla blanca
//
// Si cualquier componente revienta durante el render, React desmonta TODO el
// árbol — en planta eso es una pantalla blanca sin explicación. Este boundary
// lo intercepta y muestra una pantalla de recuperación con:
//   - Mensaje claro en castellano (sin stack trace en pantalla).
//   - Botón "Recargar la app" (window.location.reload).
//   - Detalle técnico colapsable para diagnóstico (error + componentStack).
//
// Además persiste el último error en localStorage (__yatasto_last_error__)
// para que el técnico pueda inspeccionarlo después del reload, incluso si el
// operario ya recargó. Cap: sólo el último error (no es un log).
//
// Tiene que ser class component: React no expone componentDidCatch en hooks.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_ERROR_LS = "__yatasto_last_error__";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary] error de render capturado:", error, info?.componentStack);
    try {
      localStorage.setItem(LAST_ERROR_LS, JSON.stringify({
        message: String(error?.message || error),
        stack: String(error?.stack || "").slice(0, 2000),
        componentStack: String(info?.componentStack || "").slice(0, 2000),
        ts: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "",
      }));
    } catch { /* storage lleno o bloqueado — el console.error ya quedó */ }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" style={{
        minHeight: "100vh",
        background: "oklch(0.12 0.020 250)",
        color: "oklch(0.96 0.005 250)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0" }}>
          Algo salió mal
        </h1>
        <p style={{ fontSize: 14, color: "oklch(0.72 0.018 250)", maxWidth: 420, lineHeight: 1.5, margin: "0 0 6px 0" }}>
          La app encontró un error inesperado. Tus datos guardados están a salvo
          — lo que estaba sin guardar en este formulario puede haberse perdido.
        </p>
        <p style={{ fontSize: 13, color: "oklch(0.72 0.018 250)", maxWidth: 420, lineHeight: 1.5, margin: "0 0 24px 0" }}>
          Tocá el botón para recargar. Si vuelve a pasar, avisale al jefe de planta.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "#f59e0b", color: "#000",
            border: "none", borderRadius: 12,
            padding: "14px 32px",
            fontSize: 16, fontWeight: 700,
            cursor: "pointer", minHeight: 52,
          }}
        >
          Recargar la app
        </button>
        <details style={{ marginTop: 28, maxWidth: 560, width: "100%", textAlign: "left" }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "oklch(0.55 0.015 250)" }}>
            Detalle técnico (para soporte)
          </summary>
          <pre style={{
            marginTop: 10, padding: 12,
            background: "oklch(0.18 0.018 250)",
            borderRadius: 8,
            fontSize: 11, lineHeight: 1.45,
            overflow: "auto", maxHeight: 240,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            color: "oklch(0.72 0.018 250)",
          }}>
            {String(this.state.error?.message || this.state.error)}
            {"\n\n"}
            {String(this.state.info?.componentStack || "").slice(0, 1500)}
          </pre>
        </details>
      </div>
    );
  }
}

// Helper de consola para soporte: window.__yatastoLastError()
if (typeof window !== "undefined") {
  window.__yatastoLastError = () => {
    try { return JSON.parse(localStorage.getItem(LAST_ERROR_LS) || "null"); }
    catch { return null; }
  };
}
