// hooks.js — Hooks utilitarios del sistema de diseño Yatasto
import { useState, useEffect, useCallback, useContext } from "react";
import { BP } from "./tokens.js";
import { tienePermiso as _tienePermiso } from "./lib/permisos.js";
import { PerfilContext } from "./components/PerfilProvider.jsx";

/**
 * useViewport()
 * Devuelve { isMobile, isTablet, isDesktop, width }.
 *   isMobile:  width < lg  (< 1024px)
 *   isTablet:  width >= md && width < lg  (768-1023px)
 *   isDesktop: width >= lg  (>= 1024px)
 *
 * Usa window.matchMedia con listener para evitar polling.
 * SSR-safe: asume mobile si window no está disponible.
 */
export function useViewport() {
  const getState = () => {
    if (typeof window === "undefined") {
      return { isMobile: true, isTablet: false, isDesktop: false, width: 0 };
    }
    const w = window.innerWidth;
    return {
      width:     w,
      isMobile:  w < BP.lg,
      isTablet:  w >= BP.md && w < BP.lg,
      isDesktop: w >= BP.lg,
    };
  };

  const [vp, setVp] = useState(getState);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BP.lg}px)`);
    const handler = () => setVp(getState());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return vp;
}

// ─── Identidad: perfil base + operario activo ───────────────────────────────
//
// Modelo:
// - perfil base: viene de la sesión Supabase (supervisor/jefe/operador/oficina).
//   Persiste mientras la sesión esté viva; lo controla App vía db.auth.
// - operario: identidad de turno cuando el dispositivo está compartido. Persiste
//   en sessionStorage (no localStorage — se va al cerrar tab). Permite saber
//   "quién hizo qué" sin requerir login/logout completo en cada cambio de turno.
//
// Provider unidireccional: App setea perfil/operario; cualquier hijo consume con
// usePerfil(). Mantenemos compatibilidad si no hay provider (devuelve null).
//
// El operario activo se hidrata desde sessionStorage al montar.

const OPERARIO_SS_KEY = "yatasto:operario_activo";

export function loadOperarioActivo() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OPERARIO_SS_KEY);
    if (!raw) return null;
    const op = JSON.parse(raw);
    if (op && op.id && op.nombre) return op;
    return null;
  } catch {
    return null;
  }
}

export function saveOperarioActivo(op) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (op == null) sessionStorage.removeItem(OPERARIO_SS_KEY);
    else sessionStorage.setItem(OPERARIO_SS_KEY, JSON.stringify(op));
  } catch {}
}

export function useOperarioActivo() {
  const [op, setOp] = useState(() => loadOperarioActivo());

  const setOperario = useCallback((next) => {
    saveOperarioActivo(next);
    setOp(next);
  }, []);

  // Si otro tab del mismo origen cambió el operario (poco probable porque es
  // sessionStorage por-tab, pero por seguridad), nos mantenemos sincronizados.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === OPERARIO_SS_KEY) setOp(loadOperarioActivo());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [op, setOperario];
}

// Hook canónico para consumir identidad + chequear permisos.
// Devuelve { perfil, operario, permisosExtra, tienePermiso(accion) }.
// Si no hay provider, devuelve nulls y tienePermiso() siempre false.
export function usePerfil() {
  const ctx = useContext(PerfilContext);
  const tiene = useCallback(
    (accion) => _tienePermiso(ctx.perfil, accion, ctx.permisosExtra),
    [ctx.perfil, ctx.permisosExtra]
  );
  return { ...ctx, tienePermiso: tiene };
}
