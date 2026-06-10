import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useShiftChange } from "../hooks.js";

function Probe({ onShiftChange, enabled = true }) {
  useShiftChange({ enabled, onShiftChange });
  return null;
}

describe("useShiftChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispara onShiftChange si arranca dentro de la ventana", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 6, 45)); // 06:45 → ventana 07:00
    const onShiftChange = vi.fn();
    render(<Probe onShiftChange={onShiftChange} />);

    expect(onShiftChange).toHaveBeenCalledWith("07:00");
    expect(onShiftChange).toHaveBeenCalledTimes(1);
  });

  it("NO dispara onShiftChange si arranca fuera de ventana", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 9, 0)); // 09:00 → no
    const onShiftChange = vi.fn();
    render(<Probe onShiftChange={onShiftChange} />);

    expect(onShiftChange).not.toHaveBeenCalled();
  });

  it("dispara una sola vez al entrar en la ventana", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 9, 0)); // empieza fuera
    const onShiftChange = vi.fn();
    render(<Probe onShiftChange={onShiftChange} />);

    expect(onShiftChange).not.toHaveBeenCalled();

    // Avanzar tiempo simulando que ahora son las 13:30 (ventana 14:00)
    vi.setSystemTime(new Date(2026, 5, 9, 13, 30));
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(onShiftChange).toHaveBeenCalledWith("14:00");
    expect(onShiftChange).toHaveBeenCalledTimes(1);

    // Otro tick dentro de la misma ventana → no re-dispara
    vi.setSystemTime(new Date(2026, 5, 9, 13, 45));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onShiftChange).toHaveBeenCalledTimes(1);
  });

  it("limpia el flag al salir de la ventana — re-dispara en la siguiente", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 6, 45)); // ventana 07:00
    const onShiftChange = vi.fn();
    render(<Probe onShiftChange={onShiftChange} />);
    expect(onShiftChange).toHaveBeenCalledTimes(1);

    // Salir de ventana 07:00
    vi.setSystemTime(new Date(2026, 5, 9, 9, 0));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onShiftChange).toHaveBeenCalledTimes(1);

    // Entrar en ventana 14:00 → re-dispara
    vi.setSystemTime(new Date(2026, 5, 9, 13, 35));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onShiftChange).toHaveBeenCalledTimes(2);
    expect(onShiftChange).toHaveBeenLastCalledWith("14:00");
  });

  it("enabled=false no observa", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 6, 45));
    const onShiftChange = vi.fn();
    render(<Probe enabled={false} onShiftChange={onShiftChange} />);

    act(() => { vi.advanceTimersByTime(120_000); });
    expect(onShiftChange).not.toHaveBeenCalled();
  });

  it("desmonte cancela el interval — no leaks de onShiftChange", () => {
    vi.setSystemTime(new Date(2026, 5, 9, 9, 0));
    const onShiftChange = vi.fn();
    const { unmount } = render(<Probe onShiftChange={onShiftChange} />);

    unmount();
    vi.setSystemTime(new Date(2026, 5, 9, 13, 35));
    act(() => { vi.advanceTimersByTime(60_000); });

    expect(onShiftChange).not.toHaveBeenCalled();
  });
});
