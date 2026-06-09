import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useInactivityLock } from "../hooks.js";

function Probe({ onWarn, onLogout, enabled = true, warnMs, logoutMs }) {
  useInactivityLock({ enabled, onWarn, onLogout, warnMs, logoutMs });
  return null;
}

describe("useInactivityLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispara onWarn al pasar warnMs sin actividad", () => {
    const onWarn = vi.fn();
    render(<Probe onWarn={onWarn} warnMs={5000} logoutMs={10000} />);

    expect(onWarn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4999); });
    expect(onWarn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it("dispara onLogout al pasar logoutMs sin actividad", () => {
    const onLogout = vi.fn();
    render(<Probe onLogout={onLogout} warnMs={5000} logoutMs={10000} />);

    act(() => { vi.advanceTimersByTime(9999); });
    expect(onLogout).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("dispara primero onWarn (5s) y después onLogout (10s)", () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();
    render(<Probe onWarn={onWarn} onLogout={onLogout} warnMs={5000} logoutMs={10000} />);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("actividad del usuario resetea el timer", () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();
    render(<Probe onWarn={onWarn} onLogout={onLogout} warnMs={5000} logoutMs={10000} />);

    act(() => { vi.advanceTimersByTime(4000); });
    // Simular un click → reset
    act(() => {
      window.dispatchEvent(new MouseEvent("mousedown"));
      vi.advanceTimersByTime(0); // process listeners
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onWarn).not.toHaveBeenCalled(); // total 8s pero reseteó a los 4s
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onWarn).toHaveBeenCalledTimes(1); // ahora sí, 5s desde el reset
  });

  it("keydown resetea el timer", () => {
    const onWarn = vi.fn();
    render(<Probe onWarn={onWarn} warnMs={5000} logoutMs={10000} />);
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      vi.advanceTimersByTime(0);
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onWarn).not.toHaveBeenCalled();
  });

  it("touchstart resetea el timer", () => {
    const onWarn = vi.fn();
    render(<Probe onWarn={onWarn} warnMs={5000} logoutMs={10000} />);
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => {
      window.dispatchEvent(new Event("touchstart"));
      vi.advanceTimersByTime(0);
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onWarn).not.toHaveBeenCalled();
  });

  it("enabled=false: no dispara nada", () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();
    render(<Probe enabled={false} onWarn={onWarn} onLogout={onLogout} warnMs={5000} logoutMs={10000} />);

    act(() => { vi.advanceTimersByTime(60000); });
    expect(onWarn).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("desmonte cancela timers pendientes", () => {
    const onWarn = vi.fn();
    const onLogout = vi.fn();
    const { unmount } = render(<Probe onWarn={onWarn} onLogout={onLogout} warnMs={5000} logoutMs={10000} />);

    act(() => { vi.advanceTimersByTime(3000); });
    unmount();
    act(() => { vi.advanceTimersByTime(20000); });

    expect(onWarn).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
