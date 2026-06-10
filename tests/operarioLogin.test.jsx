import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { OperarioLogin } from "../components/OperarioLogin.jsx";
import { createOperario } from "../lib/operarios.js";

// Mock supabase para que loadOperarios/saveOperarios funcionen sin red.
const _store = new Map();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: (row) => {
        _store.set(row.key, row.value);
        return Promise.resolve({ error: null });
      },
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      like: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: {
      refreshSession: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

describe("OperarioLogin — selector", () => {
  beforeEach(() => { _store.clear(); });

  it("muestra el título 'Quién está operando'", async () => {
    let operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    const { getByText } = render(
      <OperarioLogin operarios={operarios} onLogin={() => {}} />
    );
    expect(getByText("Quién está operando")).toBeTruthy();
  });

  it("renderiza un chip por cada operario activo", async () => {
    let operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    operarios = await createOperario(operarios, { nombre: "Lucía G.", pin: "5678" });
    const { getByText } = render(
      <OperarioLogin operarios={operarios} onLogin={() => {}} />
    );
    expect(getByText("Carlos R.")).toBeTruthy();
    expect(getByText("Lucía G.")).toBeTruthy();
  });

  it("muestra mensaje 'sin operarios' si la lista está vacía", async () => {
    const { getByText } = render(
      <OperarioLogin operarios={[]} onLogin={() => {}} allowSkip onCancel={() => {}} />
    );
    expect(getByText(/Sin operarios cargados/i)).toBeTruthy();
  });

  it("oculta operarios inactivos", async () => {
    let operarios = await createOperario([], { nombre: "Activo", pin: "1234" });
    operarios = await createOperario(operarios, { nombre: "Pausado", pin: "5678" });
    operarios[1] = { ...operarios[1], activo: false };

    const { getByText, queryByText } = render(
      <OperarioLogin operarios={operarios} onLogin={() => {}} />
    );
    expect(getByText("Activo")).toBeTruthy();
    expect(queryByText("Pausado")).toBeNull();
  });

  it("renderiza botón 'Continuar sin operario' con allowSkip", async () => {
    const { getByText } = render(
      <OperarioLogin operarios={[]} onLogin={() => {}} allowSkip onCancel={() => {}} />
    );
    expect(getByText("Continuar sin operario")).toBeTruthy();
  });

  it("onCancel se llama al tocar 'Continuar sin operario'", async () => {
    const onCancel = vi.fn();
    const { getByText } = render(
      <OperarioLogin operarios={[]} onLogin={() => {}} allowSkip onCancel={onCancel} />
    );
    fireEvent.click(getByText("Continuar sin operario"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("OperarioLogin — fase PIN", () => {
  beforeEach(() => { _store.clear(); });

  it("al tap chip, se muestra la fase PIN con el nombre del operario", async () => {
    const operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    const { getByText, container } = render(
      <OperarioLogin operarios={operarios} onLogin={() => {}} />
    );
    fireEvent.click(getByText("Carlos R."));

    expect(getByText("Ingresá tu PIN")).toBeTruthy();
    // Teclado numérico
    expect(container.querySelector('button[aria-label="Tecla 1"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Tecla 0"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Borrar"]')).toBeTruthy();
  });

  it("PIN correcto dispara onLogin con { id, nombre, rol }", async () => {
    const operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234", rol: "operador" });
    const onLogin = vi.fn();
    const { getByText, container } = render(
      <OperarioLogin operarios={operarios} onLogin={onLogin} />
    );
    fireEvent.click(getByText("Carlos R."));

    // Tipear el PIN: 1, 2, 3, 4
    fireEvent.click(container.querySelector('button[aria-label="Tecla 1"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 2"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 3"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 4"]'));

    // El verify dispara con setTimeout 50ms y verifyPin es async (crypto.subtle).
    // Polleamos hasta que onLogin se llame o time out.
    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(onLogin).toHaveBeenCalledWith({
      id: operarios[0].id,
      nombre: "Carlos R.",
      rol: "operador",
    });
  });

  it("PIN incorrecto muestra error y NO dispara onLogin", async () => {
    const operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    const onLogin = vi.fn();
    const { getByText, container } = render(
      <OperarioLogin operarios={operarios} onLogin={onLogin} />
    );
    fireEvent.click(getByText("Carlos R."));

    fireEvent.click(container.querySelector('button[aria-label="Tecla 9"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 9"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 9"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 9"]'));

    await waitFor(() => expect(container.textContent).toMatch(/PIN incorrecto/i), { timeout: 2000 });
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("backspace borra el último dígito", async () => {
    const operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    const onLogin = vi.fn();
    const { getByText, container } = render(
      <OperarioLogin operarios={operarios} onLogin={onLogin} />
    );
    fireEvent.click(getByText("Carlos R."));

    fireEvent.click(container.querySelector('button[aria-label="Tecla 1"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 2"]'));
    fireEvent.click(container.querySelector('button[aria-label="Borrar"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 2"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 3"]'));
    fireEvent.click(container.querySelector('button[aria-label="Tecla 4"]'));

    // PIN ingresado: 1, 2, ⌫, 2, 3, 4 = "1234"
    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it("botón 'Cambiar operario' vuelve al selector", async () => {
    const operarios = await createOperario([], { nombre: "Carlos R.", pin: "1234" });
    const { getByText, queryByText } = render(
      <OperarioLogin operarios={operarios} onLogin={() => {}} />
    );
    fireEvent.click(getByText("Carlos R."));
    expect(queryByText("Ingresá tu PIN")).toBeTruthy();

    fireEvent.click(getByText(/Cambiar operario/i));
    expect(queryByText("Quién está operando")).toBeTruthy();
    expect(queryByText("Ingresá tu PIN")).toBeNull();
  });
});
