import { useState, useCallback, useEffect, useRef } from "react";
import { ACCIONES, tienePermiso } from "../lib/permisos.js";
import { loadOperarios, iniciales } from "../lib/operarios.js";
import { verifyPin } from "../lib/pin.js";

// ─────────────────────────────────────────────────────────────────────────────
// components/StepUpPin.jsx — Autorización con PIN para acciones críticas
//
// Algunas acciones (UX-V2 §2.3) no pueden ejecutarse solo con el perfil del
// operario activo: requieren PIN en vivo de un usuario que pueda autorizar.
//
// Acciones cubiertas (recomendado, no exhaustivo):
//   - Eliminar lote fort finalizado (libera litros del silo)
//   - Reabrir día cerrado >7 días
//   - Cambiar saldo base con cadena viva
//   - Cargar ingreso con CIP pendiente del silo destino
//   - Eliminar ingreso de día ya cerrado
//
// Uso:
//   const [stepUpUI, askStepUp] = useStepUpPin();
//   ...
//   const auth = await askStepUp({
//     accion: "Eliminar lote 045",
//     descripcion: "Libera 12.000 L del silo 100N",
//   });
//   if (auth) {
//     // auth = { operarioId, operarioNombre, perfil }
//     // proceder + logAudit con ambos: el solicitante (operario activo) y
//     // quien autorizó (auth.operarioNombre).
//   }
//
// Mantiene la sesión y el operario activo intactos — el PIN del autorizante
// NO cambia quién está operando, sólo desbloquea la acción puntual.
// ─────────────────────────────────────────────────────────────────────────────

export function useStepUpPin() {
  const [state, setState] = useState(null); // { accion, descripcion, resolve, tokens, pinLength }

  const ask = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        accion: opts.accion || "Acción restringida",
        descripcion: opts.descripcion || "",
        pinLength: opts.pinLength || 4,
        tokens: opts.tokens,
        resolve,
      });
    });
  }, []);

  const handleResolve = useCallback((value) => {
    state?.resolve?.(value);
    setState(null);
  }, [state]);

  const ui = state ? (
    <StepUpModal
      accion={state.accion}
      descripcion={state.descripcion}
      pinLength={state.pinLength}
      tokens={state.tokens}
      onResolve={handleResolve}
    />
  ) : null;

  return [ui, ask];
}

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

function StepUpModal({ accion, descripcion, pinLength, tokens: tokenOverrides, onResolve }) {
  const T = { ...DEFAULT_TOKENS, ...(tokenOverrides || {}) };
  const [operarios, setOperarios] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState("loading"); // loading | selector | pin | verifying
  const [selectedId, setSelectedId] = useState(null);
  const [pinDigits, setPinDigits] = useState([]);
  const [error, setError] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const verifyingRef = useRef(false);

  // Carga operarios que pueden autorizar (rol con AUTORIZAR_STEP_UP).
  useEffect(() => {
    let cancelled = false;
    loadOperarios().then((lista) => {
      if (cancelled) return;
      // Filtra los activos cuyo rol tiene el permiso de autorización.
      const candidatos = lista.filter((o) =>
        o.activo !== false &&
        o.pinHash &&
        tienePermiso(o.rol, ACCIONES.AUTORIZAR_STEP_UP, o.permisosExtra)
      );
      setOperarios(candidatos);
      setLoaded(true);
      setPhase(candidatos.length === 0 ? "selector" : "selector");
    });
    return () => { cancelled = true; };
  }, []);

  const selected = operarios.find((o) => o.id === selectedId) || null;
  const dots = Array.from({ length: pinLength }, (_, i) => i < pinDigits.length);

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
      const ok = await verifyPin(pin, op.pinHash);
      if (!ok) {
        const next = intentos + 1;
        setIntentos(next);
        setError(`PIN incorrecto`);
        setPinDigits([]);
        if (next >= 3) {
          onResolve(null);
        } else {
          setPhase("pin");
        }
        return;
      }
      onResolve({
        operarioId: op.id,
        operarioNombre: op.nombre,
        perfil: op.rol,
      });
    } finally {
      verifyingRef.current = false;
    }
  }, [intentos, onResolve]);

  const handleDigit = useCallback((d) => {
    if (phase !== "pin") return;
    setError(null);
    setPinDigits((prev) => {
      if (prev.length >= pinLength) return prev;
      const next = [...prev, d];
      if (next.length === pinLength && selected) {
        setTimeout(() => verify(next.join(""), selected), 50);
      }
      return next;
    });
  }, [phase, pinLength, selected, verify]);

  const handleBackspace = useCallback(() => {
    setError(null);
    setPinDigits((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (phase !== "pin") return;
    const onKey = (e) => {
      if (e.key >= "0" && e.key <= "9") { handleDigit(e.key); e.preventDefault(); }
      else if (e.key === "Backspace") { handleBackspace(); e.preventDefault(); }
      else if (e.key === "Escape") { resetToSelector(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleDigit, handleBackspace, resetToSelector]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="stepup-title"
      style={{
        position: "fixed", inset: 0, zIndex: 11000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}>
      <div style={{
        background: T.surface, color: T.text,
        borderRadius: 16,
        maxWidth: 440, width: "100%",
        maxHeight: "90vh", overflow: "auto",
        padding: 24,
        border: `2px solid ${T.danger}55`,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 12,
            background: `${T.danger}25`, color: T.danger,
            fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Requiere autorización
          </div>
          <h3 id="stepup-title" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{accion}</h3>
          {descripcion && (
            <p style={{ fontSize: 13, color: T.sub, margin: "6px 0 0 0", lineHeight: 1.4 }}>{descripcion}</p>
          )}
        </div>

        {!loaded && (
          <div style={{ padding: "20px 0", textAlign: "center", color: T.sub, fontSize: 13 }}>
            Cargando autorizantes…
          </div>
        )}

        {loaded && operarios.length === 0 && (
          <>
            <div style={{ padding: "16px 0", color: T.sub, fontSize: 13, lineHeight: 1.4 }}>
              No hay supervisores ni jefes con PIN configurado en este dispositivo.
              Pedile al jefe que cree o asigne un autorizante.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => onResolve(null)}
                style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", minHeight: 44 }}>
                Cerrar
              </button>
            </div>
          </>
        )}

        {loaded && operarios.length > 0 && phase === "selector" && (
          <>
            <p style={{ fontSize: 12, color: T.sub, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>
              Quién autoriza
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              gap: 10,
              marginBottom: 20,
            }}>
              {operarios.map((op) => (
                <button key={op.id} type="button"
                  onClick={() => handleChipTap(op)}
                  style={{
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 6, width: "100%", aspectRatio: "1 / 1",
                    background: T.card, color: T.text,
                    border: `1px solid ${T.border}`, borderRadius: 12,
                    padding: 8, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 18,
                    background: op.color || T.accent, color: "#000",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 13,
                  }}>
                    {iniciales(op.nombre)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.1 }}>
                    {op.nombre}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => onResolve(null)}
                style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.sub, borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", minHeight: 44 }}>
                Cancelar
              </button>
            </div>
          </>
        )}

        {loaded && (phase === "pin" || phase === "verifying") && selected && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span style={{
                width: 44, height: 44, borderRadius: 22,
                background: selected.color || T.accent, color: "#000",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 16,
              }}>
                {iniciales(selected.nombre)}
              </span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{selected.nombre}</div>
              <div style={{ fontSize: 11, color: T.sub }}>PIN para autorizar</div>
            </div>

            <div role="status" aria-label="Dígitos ingresados" style={{
              display: "flex", gap: 14, marginBottom: 18, justifyContent: "center",
            }}>
              {dots.map((filled, i) => (
                <span key={i} style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: filled ? T.accent : "transparent",
                  border: `2px solid ${filled ? T.accent : T.border}`,
                }} />
              ))}
            </div>

            {error && (
              <div role="alert" style={{
                marginBottom: 12, padding: "6px 12px",
                background: `${T.danger}20`, border: `1px solid ${T.danger}50`,
                borderRadius: 6, color: T.danger, fontSize: 11, textAlign: "center",
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 16,
              maxWidth: 280,
              marginLeft: "auto", marginRight: "auto",
            }}>
              {[1,2,3,4,5,6,7,8,9].map((d) => (
                <KeyBtn key={d} label={d} onClick={() => handleDigit(String(d))} disabled={phase === "verifying"} T={T} />
              ))}
              <div aria-hidden="true" />
              <KeyBtn label={0} onClick={() => handleDigit("0")} disabled={phase === "verifying"} T={T} />
              <KeyBtn label="⌫" onClick={handleBackspace} disabled={phase === "verifying" || pinDigits.length === 0} T={T} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button type="button" onClick={resetToSelector}
                style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.sub, borderRadius: 10, padding: "10px 14px", fontSize: 12, cursor: "pointer", minHeight: 44 }}>
                ← Otro autorizante
              </button>
              <button type="button" onClick={() => onResolve(null)}
                style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.sub, borderRadius: 10, padding: "10px 14px", fontSize: 12, cursor: "pointer", minHeight: 44 }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KeyBtn({ label, onClick, disabled, T }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-label={typeof label === "number" ? `Tecla ${label}` : label === "⌫" ? "Borrar" : label}
      style={{
        height: 68, borderRadius: 12,
        background: T.card, color: T.text,
        border: `1px solid ${T.border}`,
        fontSize: 22, fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        userSelect: "none", touchAction: "manipulation",
      }}>
      {label}
    </button>
  );
}
