import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../components/Toast.jsx";

// Helper: monta un componente que expone el toast hook al test mediante un ref.
function setup() {
  let toastApi;
  function Probe() {
    toastApi = useToast();
    return null;
  }
  const utils = render(
    <ToastProvider>
      <Probe />
    </ToastProvider>
  );
  return { ...utils, getApi: () => toastApi };
}

describe("useToast — sin provider", () => {
  it("retorna no-op stubs cuando no hay ToastProvider", () => {
    let api;
    function Probe() {
      api = useToast();
      return null;
    }
    render(<Probe />);
    // No debería tirar: cualquier llamada es no-op
    expect(typeof api.ok).toBe("function");
    expect(typeof api.warn).toBe("function");
    expect(typeof api.error).toBe("function");
    expect(typeof api.remove).toBe("function");
    expect(() => api.ok("mensaje")).not.toThrow();
    expect(() => api.error("error")).not.toThrow();
  });
});

describe("ToastProvider — ok/warn/error", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("ok() renderiza el mensaje con role=status", () => {
    const { container, getApi } = setup();
    act(() => { getApi().ok("Guardado"); });
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain("Guardado");
  });

  it("warn() renderiza con role=status", () => {
    const { container, getApi } = setup();
    act(() => { getApi().warn("Cuidado"); });
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain("Cuidado");
  });

  it("error() renderiza con role=status", () => {
    const { container, getApi } = setup();
    act(() => { getApi().error("Falló"); });
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain("Falló");
  });

  it("auto-dismiss tras 5s por default", () => {
    const { container, getApi } = setup();
    act(() => { getApi().ok("Efímero"); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it("respeta timeout custom", () => {
    const { container, getApi } = setup();
    act(() => { getApi().ok("Largo", { timeout: 10000 }); });

    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    act(() => { vi.advanceTimersByTime(5001); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it("máximo 3 visibles — el cuarto desplaza al más viejo (FIFO)", () => {
    const { container, getApi } = setup();
    act(() => {
      getApi().ok("uno");
      getApi().ok("dos");
      getApi().ok("tres");
      getApi().ok("cuatro");
    });
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(3);
    const textos = Array.from(toasts).map((t) => t.textContent);
    // Los últimos 3 (FIFO)
    expect(textos.some((t) => t.includes("uno"))).toBe(false);
    expect(textos.some((t) => t.includes("dos"))).toBe(true);
    expect(textos.some((t) => t.includes("tres"))).toBe(true);
    expect(textos.some((t) => t.includes("cuatro"))).toBe(true);
  });

  it("timeout 0 mantiene el toast indefinidamente", () => {
    const { container, getApi } = setup();
    act(() => { getApi().error("Persistente", { timeout: 0 }); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    act(() => { vi.advanceTimersByTime(60000); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);
  });

  it("remove() saca un toast por id", () => {
    const { container, getApi } = setup();
    let id;
    act(() => { id = getApi().ok("Borrable"); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);
    act(() => { getApi().remove(id); });
    expect(container.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it("aria-live='polite' en el contenedor (no interrumpe screen readers)", () => {
    const { container, getApi } = setup();
    act(() => { getApi().ok("X"); });
    const region = container.querySelector('[aria-live]');
    expect(region).toBeTruthy();
    expect(region.getAttribute("aria-live")).toBe("polite");
  });
});
