import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";

function Bomb({ explode }) {
  if (explode) throw new Error("kaboom de prueba");
  return <div>contenido sano</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    localStorage.clear();
    // React loggea el error a console.error — lo silenciamos para no ensuciar la salida.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renderiza children cuando no hay error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>
    );
    expect(getByText("contenido sano")).toBeTruthy();
  });

  it("muestra pantalla de recuperación cuando un hijo revienta", () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    expect(queryByText("contenido sano")).toBeNull();
    expect(getByText("Algo salió mal")).toBeTruthy();
    expect(getByText("Recargar la app")).toBeTruthy();
  });

  it("la pantalla de error tiene role=alert", () => {
    const { container } = render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("incluye el detalle técnico colapsable con el mensaje del error", () => {
    const { container } = render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details.textContent).toContain("kaboom de prueba");
  });

  it("persiste el último error en localStorage para diagnóstico post-reload", () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    const stored = JSON.parse(localStorage.getItem("__yatasto_last_error__"));
    expect(stored).toBeTruthy();
    expect(stored.message).toContain("kaboom de prueba");
    expect(stored.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("botón Recargar llama window.location.reload", () => {
    const reloadSpy = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, reload: reloadSpy },
    });

    const { getByText } = render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    fireEvent.click(getByText("Recargar la app"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("window.__yatastoLastError() recupera el error persistido", () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    );
    const last = window.__yatastoLastError();
    expect(last).toBeTruthy();
    expect(last.message).toContain("kaboom de prueba");
  });
});
