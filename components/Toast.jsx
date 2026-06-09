import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// components/Toast.jsx — Notificaciones efímeras no bloqueantes
//
// Patrón: complementario a Banner (que es persistente y dentro del flujo).
// Toast es overlay flotante para feedback de operaciones (save ok/falló).
//
// Uso:
//   const toast = useToast();
//   toast.error("No se pudo guardar — se encoló para reintentar");
//   toast.ok("Guardado");
//   toast.warn("Sin conexión — quedó en cola");
//
// Setup (una vez en el shell):
//   <ToastProvider><App /></ToastProvider>
//
// Auto-dismiss 5s. Máx 3 visibles (FIFO si excede). Stack derecha-abajo.
// aria-live="polite", role="status" — no roba foco al operario.
// ─────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

const MAX_VISIBLE = 3;
const DEFAULT_TIMEOUT = 5000;

let _nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (variant, message, opts = {}) => {
      const id = _nextId++;
      const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
      setToasts((prev) => {
        const next = [...prev, { id, variant, message }];
        // Si excede el máximo, drop más viejos (FIFO).
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });
      if (timeout > 0) {
        const timer = setTimeout(() => remove(id), timeout);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [remove]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const api = {
    ok: (msg, opts) => add("ok", msg, opts),
    warn: (msg, opts) => add("warn", msg, opts),
    error: (msg, opts) => add("error", msg, opts),
    remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op si no está envuelto — evita romper si se usa antes del provider.
    return {
      ok: () => 0,
      warn: () => 0,
      error: () => 0,
      remove: () => {},
    };
  }
  return ctx;
}

const VARIANT_STYLE = {
  ok: {
    bg: "oklch(0.30 0.10 145)",
    border: "oklch(0.55 0.18 145)",
    text: "oklch(0.96 0.020 145)",
    icon: "✓",
  },
  warn: {
    bg: "oklch(0.32 0.10 75)",
    border: "oklch(0.65 0.18 75)",
    text: "oklch(0.97 0.020 75)",
    icon: "!",
  },
  error: {
    bg: "oklch(0.28 0.12 25)",
    border: "oklch(0.60 0.22 25)",
    text: "oklch(0.97 0.020 25)",
    icon: "✕",
  },
};

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 80px)`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        maxWidth: "calc(100vw - 32px)",
        width: 360,
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const style = VARIANT_STYLE[toast.variant] || VARIANT_STYLE.ok;
  return (
    <div
      role="status"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
        fontSize: 14,
        lineHeight: 1.35,
        animation: "yatasto-toast-in 200ms ease-out",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 24px",
          height: 24,
          borderRadius: 12,
          background: style.border,
          color: "#000",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {style.icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, wordWrap: "break-word" }}>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        style={{
          flex: "0 0 24px",
          height: 24,
          width: 24,
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: style.text,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}
