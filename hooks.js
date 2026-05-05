// hooks.js — Hooks utilitarios del sistema de diseño Yatasto
import { useState, useEffect } from "react";
import { BP } from "./tokens.js";

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
