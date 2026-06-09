import { useState, useEffect, useCallback, useRef } from "react";
import { iniciales, recordLogin, saveOperarios, verifyOperarioPin } from "../lib/operarios.js";

// ─────────────────────────────────────────────────────────────────────────────
// components/OperarioLogin.jsx — Selector de operario + teclado PIN
//
// Flujo:
//   1. selector  → grid de chips (uno por operario activo). Tap → fase pin.
//   2. pin       → teclado numérico 80×80, 4 dígitos por defecto. ENTER al
//                  completar dispara verificación; si OK, activa operario.
//   3. verifying → spinner breve mientras valida (hash es rápido pero el
//                  feedback evita doble-tap).
//
// Seguridad de UX:
//   - 3 PIN fallidos seguidos por chip → lock 60s. Mensaje "Pedile al
//     supervisor que revise el PIN o reactivá el operario".
//   - Volver al selector descarta los dígitos ingresados.
//
// Props:
//   - operarios:        array de operarios (todos, no sólo activos)
//   - onLogin(op):      callback con { id, nombre, rol } cuando autentica OK
//   - onCancel?:        callback opcional si el modal se cierra sin login
//                       (sólo disponible si allowSkip)
//   - allowSkip?:       boolean — permite cerrar sin loguear (modo supervisor
//                       que prefiere trabajar sin operario)
//   - pinLength?:       4 (default) o 6
//   - tokens?:          { accent, bg, surface, text, sub, border, danger }
//                       fallback a defaults oscuros si no se pasa
// ─────────────────────────────────────────────────────────────────────────────

const FAILED_LIMIT = 3;
const LOCK_MS = 60_000;

const DEFAULT_TOKENS = {
  accent: "#f59e0b",
  bg: "oklch(0.12 0.020 250)",
  surface: "oklch(0.18 0.018 250)",
  card: "oklch(0.22 0.016 250)",
  text: "oklch(0.96 0.005 250)",
  sub: "oklch(0.72 0.018 250)",
  border: "oklch(0.30 0.012 250)",
  danger: "#ef4444",
};

export function OperarioLogin({ operarios, onLogin, onCancel, allowSkip = false, pinLength = 4, tokens: tokenOverrides }) {
  const T = { ...DEFAULT_TOKENS, ...(tokenOverrides || {}) };
  const activos = (operarios || []).filter((o) => o.activo !== false);

  const [phase, setPhase] = useState("selector");
  const [selectedId, setSelectedId] = useState(null);
  const [pinDigits, setPinDigits] = useState([]);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState({}); // { [id]: { count, lockedUntil } }
  const [, setTick] = useState(0); // forzar re-render para el contador del lock
  const verifyingRef = useRef(false);

  // Refresca el "tiempo restante" del lock cada segundo cuando hay alguno activo.
  useEffect(() => {
    const hasLock = Object.values(failed).some((f) => f.lockedUntil > Date.now());
    if (!hasLock) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [failed]);

  const selected = activos.find((o) => o.id === selectedId) || null;
  const lockInfo = selected ? failed[selected.id] : null;
  const locked = lockInfo && lockInfo.lockedUntil > Date.now();
  const lockSecondsLeft = locked ? Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000) : 0;

  const resetToSelector = useCallback(() => {
    setPhase("selector");
    setSelectedId(null);
    setPinDigits([]);
    setError(null);
  }, []);

  const handleChipTap = useCallback((op) => {
    setSelectedId(op.id);
    setPinDigits([]);
    setError(null);
    setPhase("pin");
  }, []);

  const verify = useCallback(async (pin, op) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setPhase("verifying");
    try {
      const ok = await verifyOperarioPin(operarios, op.id, pin);
      if (!ok) {
        const cur = failed[op.id] || { count: 0, lockedUntil: 0 };
        const nextCount = cur.count + 1;
        const lockedUntil = nextCount >= FAILED_LIMIT ? Date.now() + LOCK_MS : 0;
        setFailed({ ...failed, [op.id]: { count: nextCount, lockedUntil } });
        if (lockedUntil) {
          setError(`Demasiados intentos fallidos. Esperá un minuto o pedile al supervisor.`);
          setPinDigits([]);
          setPhase("selector");
        } else {
          setError(`PIN incorrecto (${FAILED_LIMIT - nextCount} ${FAILED_LIMIT - nextCount === 1 ? "intento restante" : "intentos restantes"})`);
          setPinDigits([]);
          setPhase("pin");
        }
        return;
      }
      // OK: limpiar lock, persistir ultimo login, notificar.
      setFailed((f) => {
        const { [op.id]: _, ...rest } = f;
        return rest;
      });
      const updatedLista = recordLogin(operarios, op.id);
      // No-bloqueamos al usuario por la persistencia del ultimo login.
      saveOperarios(updatedLista).catch(() => {});
      onLogin?.({ id: op.id, nombre: op.nombre, rol: op.rol || "operador" });
    } finally {
      verifyingRef.current = false;
    }
  }, [operarios, failed, onLogin]);

  const handleDigit = useCallback((d) => {
    if (phase !== "pin" || locked) return;
    setError(null);
    setPinDigits((prev) => {
      if (prev.length >= pinLength) return prev;
      const next = [...prev, d];
      if (next.length === pinLength && selected) {
        // Trigger verify outside of state setter
        setTimeout(() => verify(next.join(""), selected), 50);
      }
      return next;
    });
  }, [phase, locked, pinLength, selected, verify]);

  const handleBackspace = useCallback(() => {
    setError(null);
    setPinDigits((prev) => prev.slice(0, -1));
  }, []);

  // Soporte teclado físico
  useEffect(() => {
    if (phase !== "pin" || locked) return;
    const onKey = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
        e.preventDefault();
      } else if (e.key === "Backspace") {
        handleBackspace();
        e.preventDefault();
      } else if (e.key === "Escape") {
        resetToSelector();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, locked, handleDigit, handleBackspace, resetToSelector]);

  // Auto-cierre / focus management cuando se abre
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) containerRef.current.focus();
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="op-login-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: T.bg,
        color: T.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        paddingLeft: 16,
        paddingRight: 16,
        overflow: "auto",
      }}
    >
      {phase === "selector" && (
        <SelectorView
          activos={activos}
          T={T}
          allowSkip={allowSkip}
          onCancel={onCancel}
          onChipTap={handleChipTap}
          error={error}
          failed={failed}
        />
      )}
      {(phase === "pin" || phase === "verifying") && selected && (
        <PinView
          op={selected}
          T={T}
          pinDigits={pinDigits}
          pinLength={pinLength}
          locked={locked}
          lockSecondsLeft={lockSecondsLeft}
          error={error}
          verifying={phase === "verifying"}
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          onBack={resetToSelector}
        />
      )}
    </div>
  );
}

function SelectorView({ activos, T, allowSkip, onCancel, onChipTap, error }) {
  return (
    <>
      <h1 id="op-login-title" style={{
        fontSize: 14, fontWeight: 600, letterSpacing: 1.2, margin: 0,
        color: T.sub, textTransform: "uppercase",
      }}>
        Lácteos Yatasto
      </h1>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 28px 0" }}>
        Quién está operando
      </h2>

      {activos.length === 0 ? (
        <div style={{
          padding: "32px 20px", textAlign: "center", maxWidth: 360,
          background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Sin operarios cargados</div>
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
            El jefe todavía no creó ningún operario. Mientras tanto, podés seguir
            usando la app con tu perfil habitual.
          </div>
          {allowSkip && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                marginTop: 20,
                background: T.accent, color: "#000", border: "none",
                borderRadius: 10, padding: "12px 22px",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                minHeight: 44,
              }}
            >
              Continuar sin operario
            </button>
          )}
        </div>
      ) : (
        <>
          <div role="list" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
            gap: 12,
            width: "100%",
            maxWidth: 480,
          }}>
            {activos.map((op) => (
              <button
                role="listitem"
                key={op.id}
                type="button"
                onClick={() => onChipTap(op)}
                aria-label={`Seleccionar operario ${op.nombre}`}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 6,
                  width: "100%", aspectRatio: "1 / 1",
                  background: T.card, color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: op.color || T.accent, color: "#000",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 16,
                }}>
                  {iniciales(op.nombre)}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  textAlign: "center", lineHeight: 1.2,
                  wordBreak: "break-word",
                }}>
                  {op.nombre}
                </span>
              </button>
            ))}
          </div>

          {allowSkip && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                marginTop: 24,
                background: "transparent", color: T.sub,
                border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "10px 18px",
                fontSize: 13, cursor: "pointer", minHeight: 44,
              }}
            >
              Seguir sin operario
            </button>
          )}
        </>
      )}

      {error && (
        <div role="alert" style={{
          marginTop: 20, padding: "10px 14px",
          background: `${T.danger}20`, border: `1px solid ${T.danger}50`,
          borderRadius: 8, color: T.danger, fontSize: 13, maxWidth: 480, textAlign: "center",
        }}>
          {error}
        </div>
      )}
    </>
  );
}

function PinView({ op, T, pinDigits, pinLength, locked, lockSecondsLeft, error, verifying, onDigit, onBackspace, onBack }) {
  const dots = Array.from({ length: pinLength }, (_, i) => i < pinDigits.length);

  return (
    <>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        marginBottom: 24,
      }}>
        <span style={{
          width: 56, height: 56, borderRadius: 28,
          background: op.color || T.accent, color: "#000",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 20,
        }}>
          {iniciales(op.nombre)}
        </span>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{op.nombre}</div>
        <div style={{ fontSize: 12, color: T.sub, letterSpacing: 0.5 }}>
          Ingresá tu PIN
        </div>
      </div>

      <div role="status" aria-label="Dígitos ingresados" style={{
        display: "flex", gap: 16, marginBottom: 28,
      }}>
        {dots.map((filled, i) => (
          <span key={i} style={{
            width: 16, height: 16, borderRadius: 8,
            background: filled ? T.accent : "transparent",
            border: `2px solid ${filled ? T.accent : T.border}`,
            transition: "background 120ms ease",
          }} />
        ))}
      </div>

      {(error || locked) && (
        <div role="alert" style={{
          marginBottom: 16, padding: "8px 14px",
          background: `${T.danger}20`, border: `1px solid ${T.danger}50`,
          borderRadius: 8, color: T.danger, fontSize: 12, textAlign: "center",
          maxWidth: 320,
        }}>
          {locked ? `Bloqueado — esperá ${lockSecondsLeft}s` : error}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 80px)",
        gap: 12,
        marginBottom: 24,
      }}>
        {[1,2,3,4,5,6,7,8,9].map((d) => (
          <KeypadBtn key={d} label={d} onClick={() => onDigit(String(d))} disabled={locked || verifying} T={T} />
        ))}
        <KeypadBtn label="" onClick={() => {}} disabled T={T} invisible />
        <KeypadBtn label={0} onClick={() => onDigit("0")} disabled={locked || verifying} T={T} />
        <KeypadBtn label="⌫" onClick={onBackspace} disabled={locked || verifying || pinDigits.length === 0} T={T} />
      </div>

      <button
        type="button"
        onClick={onBack}
        style={{
          background: "transparent", color: T.sub,
          border: `1px solid ${T.border}`, borderRadius: 10,
          padding: "10px 18px",
          fontSize: 13, cursor: "pointer", minHeight: 44,
        }}
      >
        ← Cambiar operario
      </button>
    </>
  );
}

function KeypadBtn({ label, onClick, disabled, T, invisible }) {
  if (invisible) return <div aria-hidden="true" style={{ width: 80, height: 80 }} />;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={typeof label === "number" ? `Tecla ${label}` : label === "⌫" ? "Borrar" : label}
      style={{
        width: 80, height: 80, borderRadius: 12,
        background: T.card, color: T.text,
        border: `1px solid ${T.border}`,
        fontSize: 26, fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {label}
    </button>
  );
}
