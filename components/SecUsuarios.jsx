import { useState, useEffect, useCallback } from "react";
import {
  loadOperarios,
  saveOperarios,
  createOperario,
  updateOperario,
  setPin,
  desactivarOperario,
  reactivarOperario,
  iniciales,
} from "../lib/operarios.js";

// ─────────────────────────────────────────────────────────────────────────────
// components/SecUsuarios.jsx — Gestión de operarios (solo jefe)
//
// Funcionalidad:
//   - Lista operarios con estado (activo/inactivo) y último login
//   - Crear operario (nombre + color + rol + PIN opcional)
//   - Editar (nombre, color, rol)
//   - Cambiar PIN
//   - Activar/desactivar (soft-delete)
//
// Pendiente para iteraciones siguientes (UX-V2 §5.5):
//   - Permisos extra por usuario
//   - Buscador + filtro activo/inactivo (cuando haya >20)
//   - Historial de actividad
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TOKENS = {
  accent: "#f59e0b",
  bg: "oklch(0.12 0.020 250)",
  surface: "oklch(0.18 0.018 250)",
  card: "oklch(0.22 0.016 250)",
  text: "oklch(0.96 0.005 250)",
  sub: "oklch(0.72 0.018 250)",
  border: "oklch(0.30 0.012 250)",
  success: "#16a34a",
  danger: "#ef4444",
};

const ROLES = [
  { id: "operador", label: "Operador" },
  { id: "supervisor", label: "Supervisor" },
];

const COLORES_PRESET = [
  "#3b82f6", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
];

export function SecUsuarios({ tokens: tokenOverrides, jefeId = null, onToast, syncKey = 0 }) {
  const T = { ...DEFAULT_TOKENS, ...(tokenOverrides || {}) };
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: "create" | "edit", op: Operario | null }
  const [pinModal, setPinModal] = useState(null); // null | Operario

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadOperarios().then((l) => {
      if (cancelled) return;
      setLista(l);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [syncKey]);

  const persist = useCallback(async (nueva) => {
    const ok = await saveOperarios(nueva);
    if (ok) {
      setLista(nueva);
      return true;
    }
    onToast?.("error", "No se pudo guardar — quedó en cola.");
    return false;
  }, [onToast]);

  const handleCrear = useCallback(async ({ nombre, color, rol, pin }) => {
    try {
      const nueva = await createOperario(lista, { nombre, color, rol, pin, creadoPor: jefeId });
      const ok = await persist(nueva);
      if (ok) {
        onToast?.("ok", `Operario "${nombre}" creado`);
        setModal(null);
      }
    } catch (e) {
      onToast?.("error", e.message || "Error al crear operario");
    }
  }, [lista, jefeId, persist, onToast]);

  const handleEditar = useCallback(async (id, patch) => {
    const nueva = updateOperario(lista, id, patch);
    const ok = await persist(nueva);
    if (ok) {
      onToast?.("ok", "Cambios guardados");
      setModal(null);
    }
  }, [lista, persist, onToast]);

  const handleToggleActivo = useCallback(async (op) => {
    const nueva = op.activo === false
      ? reactivarOperario(lista, op.id)
      : desactivarOperario(lista, op.id);
    const ok = await persist(nueva);
    if (ok) onToast?.("ok", op.activo === false ? `${op.nombre} reactivado` : `${op.nombre} desactivado`);
  }, [lista, persist, onToast]);

  const handleSetPin = useCallback(async (id, pin) => {
    try {
      const nueva = await setPin(lista, id, pin);
      const ok = await persist(nueva);
      if (ok) {
        onToast?.("ok", "PIN actualizado");
        setPinModal(null);
      }
    } catch (e) {
      onToast?.("error", e.message || "Error al cambiar PIN");
    }
  }, [lista, persist, onToast]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: T.sub }}>
        Cargando operarios…
      </div>
    );
  }

  const activos = lista.filter((o) => o.activo !== false);
  const inactivos = lista.filter((o) => o.activo === false);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16,
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Operarios</h2>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
            {activos.length} activo{activos.length === 1 ? "" : "s"}
            {inactivos.length > 0 ? ` · ${inactivos.length} inactivo${inactivos.length === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <button type="button"
          onClick={() => setModal({ mode: "create", op: null })}
          style={{
            background: T.accent, color: "#000", border: "none",
            borderRadius: 10, padding: "10px 16px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            minHeight: 44,
          }}>
          + Nuevo operario
        </button>
      </div>

      {lista.length === 0 && (
        <div style={{
          padding: 32, textAlign: "center", color: T.sub,
          background: T.card, border: `1px dashed ${T.border}`, borderRadius: 12,
        }}>
          Aún no hay operarios. Tocá <strong style={{ color: T.text }}>+ Nuevo operario</strong> para crear el primero.
        </div>
      )}

      {activos.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.sub, margin: "12px 0 8px", textTransform: "uppercase" }}>
            Activos
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activos.map((op) => (
              <OperarioRow
                key={op.id}
                op={op}
                T={T}
                onEdit={() => setModal({ mode: "edit", op })}
                onPin={() => setPinModal(op)}
                onToggleActivo={() => handleToggleActivo(op)}
              />
            ))}
          </div>
        </section>
      )}

      {inactivos.length > 0 && (
        <section>
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.sub, margin: "12px 0 8px", textTransform: "uppercase" }}>
            Inactivos
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inactivos.map((op) => (
              <OperarioRow
                key={op.id}
                op={op}
                T={T}
                dimmed
                onEdit={() => setModal({ mode: "edit", op })}
                onPin={() => setPinModal(op)}
                onToggleActivo={() => handleToggleActivo(op)}
              />
            ))}
          </div>
        </section>
      )}

      {modal && (
        <OperarioForm
          mode={modal.mode}
          initial={modal.op}
          T={T}
          onClose={() => setModal(null)}
          onSubmit={(data) => {
            if (modal.mode === "create") handleCrear(data);
            else handleEditar(modal.op.id, data);
          }}
        />
      )}

      {pinModal && (
        <PinForm
          op={pinModal}
          T={T}
          onClose={() => setPinModal(null)}
          onSubmit={(pin) => handleSetPin(pinModal.id, pin)}
        />
      )}
    </div>
  );
}

function OperarioRow({ op, T, dimmed, onEdit, onPin, onToggleActivo }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: 12, background: T.card,
      border: `1px solid ${T.border}`, borderRadius: 10,
      opacity: dimmed ? 0.55 : 1,
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 20,
        background: op.color || T.accent, color: "#000",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 14, flexShrink: 0,
      }}>
        {iniciales(op.nombre)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{op.nombre}</div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
          {op.rol === "supervisor" ? "Supervisor" : "Operador"}
          {op.pinHash ? " · PIN configurado" : <span style={{ color: T.danger }}> · sin PIN</span>}
          {op.ultimoLogin && <span> · login {new Date(op.ultimoLogin).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button type="button" onClick={onEdit} aria-label="Editar"
          style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", minHeight: 36 }}>
          Editar
        </button>
        <button type="button" onClick={onPin} aria-label="Cambiar PIN"
          style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", minHeight: 36 }}>
          PIN
        </button>
        <button type="button" onClick={onToggleActivo} aria-label={dimmed ? "Reactivar" : "Desactivar"}
          style={{ background: "transparent", border: `1px solid ${dimmed ? T.success : T.danger}55`, color: dimmed ? T.success : T.danger, borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", minHeight: 36 }}>
          {dimmed ? "Activar" : "Pausar"}
        </button>
      </div>
    </div>
  );
}

function OperarioForm({ mode, initial, T, onClose, onSubmit }) {
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [color, setColor] = useState(initial?.color || COLORES_PRESET[0]);
  const [rol, setRol] = useState(initial?.rol || "operador");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const isCreate = mode === "create";

  const handleSubmit = () => {
    const trimmed = nombre.trim();
    if (trimmed.length === 0) {
      setError("El nombre es requerido.");
      return;
    }
    if (isCreate && pin.length > 0 && pin.length < 4) {
      setError("El PIN debe tener al menos 4 dígitos.");
      return;
    }
    if (isCreate) {
      onSubmit({ nombre: trimmed, color, rol, pin: pin.length > 0 ? pin : null });
    } else {
      onSubmit({ nombre: trimmed, color, rol });
    }
  };

  return (
    <FormModal title={isCreate ? "Nuevo operario" : "Editar operario"} T={T} onClose={onClose}>
      <Field label="Nombre" T={T}>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Carlos R."
          autoFocus
          style={inputStyle(T)}
        />
      </Field>

      <Field label="Color del chip" T={T}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COLORES_PRESET.map((c) => (
            <button key={c} type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: c,
                border: color === c ? `3px solid ${T.text}` : `1px solid ${T.border}`,
                cursor: "pointer", padding: 0,
              }}
            />
          ))}
        </div>
      </Field>

      <Field label="Rol" T={T}>
        <select value={rol} onChange={(e) => setRol(e.target.value)} style={inputStyle(T)}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </Field>

      {isCreate && (
        <Field label="PIN (opcional, podés setearlo después)" T={T}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="4 dígitos"
            style={inputStyle(T)}
          />
        </Field>
      )}

      {error && (
        <div role="alert" style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose}
          style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.sub, borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", minHeight: 44 }}>
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit}
          style={{ background: T.accent, color: "#000", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>
          {isCreate ? "Crear" : "Guardar"}
        </button>
      </div>
    </FormModal>
  );
}

function PinForm({ op, T, onClose, onSubmit }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError("El PIN debe tener al menos 4 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Los PINs no coinciden.");
      return;
    }
    onSubmit(pin);
  };

  return (
    <FormModal title={`Cambiar PIN — ${op.nombre}`} T={T} onClose={onClose}>
      <Field label="Nuevo PIN" T={T}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoFocus
          placeholder="4-6 dígitos"
          style={inputStyle(T)}
        />
      </Field>
      <Field label="Repetir PIN" T={T}>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          style={inputStyle(T)}
        />
      </Field>
      {error && (
        <div role="alert" style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose}
          style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.sub, borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer", minHeight: 44 }}>
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit}
          style={{ background: T.accent, color: "#000", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44 }}>
          Guardar PIN
        </button>
      </div>
    </FormModal>
  );
}

function FormModal({ title, T, onClose, children }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9500,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 0,
      }}>
      <div style={{
        background: T.surface, color: T.text,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        width: "100%", maxWidth: 520, maxHeight: "92vh",
        padding: 20, overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 id="modal-title" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            style={{ background: "transparent", border: "none", color: T.sub, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "4px 8px" }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, T, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(T) {
  return {
    width: "100%",
    background: T.card,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    minHeight: 44,
    boxSizing: "border-box",
  };
}
