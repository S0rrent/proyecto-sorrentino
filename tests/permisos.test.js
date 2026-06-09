import { describe, it, expect } from "vitest";
import {
  ACCIONES,
  PERMISOS_POR_PERFIL,
  tienePermiso,
  tieneAlguno,
} from "../lib/permisos.js";

describe("matriz de permisos", () => {
  describe("perfil jefe", () => {
    it("puede hacer todo", () => {
      const all = Object.values(ACCIONES);
      for (const accion of all) {
        expect(tienePermiso("jefe", accion)).toBe(true);
      }
    });
  });

  describe("perfil supervisor", () => {
    it("puede crear/editar y eliminar la mayoría de secciones", () => {
      expect(tienePermiso("supervisor", ACCIONES.INGRESOS_ESCRIBIR)).toBe(true);
      expect(tienePermiso("supervisor", ACCIONES.INGRESOS_ELIMINAR)).toBe(true);
      expect(tienePermiso("supervisor", ACCIONES.MOVIMIENTOS_ELIMINAR)).toBe(true);
      expect(tienePermiso("supervisor", ACCIONES.STOCK_ELIMINAR)).toBe(true);
    });

    it("puede cerrar día pero NO reabrirlo", () => {
      expect(tienePermiso("supervisor", ACCIONES.DIA_CERRAR)).toBe(true);
      expect(tienePermiso("supervisor", ACCIONES.DIA_REABRIR)).toBe(false);
    });

    it("puede forzar CIP y autorizar step-up", () => {
      expect(tienePermiso("supervisor", ACCIONES.CIP_FORZAR)).toBe(true);
      expect(tienePermiso("supervisor", ACCIONES.AUTORIZAR_STEP_UP)).toBe(true);
    });

    it("NO puede gestionar usuarios, ver panel técnico, ni eliminar producción finalizada", () => {
      expect(tienePermiso("supervisor", ACCIONES.USUARIOS_GESTIONAR)).toBe(false);
      expect(tienePermiso("supervisor", ACCIONES.PANEL_TECNICO_VER)).toBe(false);
      expect(tienePermiso("supervisor", ACCIONES.PRODUCCION_ELIMINAR)).toBe(false);
    });

    it("NO puede editar saldo base", () => {
      expect(tienePermiso("supervisor", ACCIONES.SALDO_BASE_EDITAR)).toBe(false);
    });
  });

  describe("perfil operador", () => {
    it("puede crear/editar ingresos, movimientos, carga, fortificados y CIP", () => {
      expect(tienePermiso("operador", ACCIONES.INGRESOS_ESCRIBIR)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.MOVIMIENTOS_ESCRIBIR)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.CARGA_ESCRIBIR)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.FORTIFICADOS_ESCRIBIR)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.CIP_ESCRIBIR)).toBe(true);
    });

    it("NO puede eliminar nada", () => {
      expect(tienePermiso("operador", ACCIONES.INGRESOS_ELIMINAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.MOVIMIENTOS_ELIMINAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.CARGA_ELIMINAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.FORTIFICADOS_ELIMINAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.STOCK_ELIMINAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.PRODUCCION_ELIMINAR)).toBe(false);
    });

    it("NO puede cerrar día, forzar CIP, ver dashboard, ni autorizar", () => {
      expect(tienePermiso("operador", ACCIONES.DIA_CERRAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.CIP_FORZAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.DASHBOARD_VER)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.AUTORIZAR_STEP_UP)).toBe(false);
    });

    it("NO puede ediar stock manualmente, ni envasar/finalizar producción", () => {
      expect(tienePermiso("operador", ACCIONES.STOCK_ESCRIBIR_MANUAL)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.PRODUCCION_ENVASAR)).toBe(false);
      expect(tienePermiso("operador", ACCIONES.PRODUCCION_FINALIZAR)).toBe(false);
    });
  });

  describe("perfil oficina", () => {
    it("puede ver dashboard y exportar", () => {
      expect(tienePermiso("oficina", ACCIONES.DASHBOARD_VER)).toBe(true);
      expect(tienePermiso("oficina", ACCIONES.EXPORTAR)).toBe(true);
      expect(tienePermiso("oficina", ACCIONES.AUDITORIA_VER)).toBe(true);
    });

    it("NO puede escribir nada operativo", () => {
      expect(tienePermiso("oficina", ACCIONES.INGRESOS_ESCRIBIR)).toBe(false);
      expect(tienePermiso("oficina", ACCIONES.CIP_ESCRIBIR)).toBe(false);
      expect(tienePermiso("oficina", ACCIONES.DIA_CERRAR)).toBe(false);
    });
  });

  describe("perfil nulo / inválido", () => {
    it("devuelve false para perfil null", () => {
      expect(tienePermiso(null, ACCIONES.INGRESOS_ESCRIBIR)).toBe(false);
    });

    it("devuelve false para perfil undefined", () => {
      expect(tienePermiso(undefined, ACCIONES.INGRESOS_ESCRIBIR)).toBe(false);
    });

    it("devuelve false para perfil desconocido", () => {
      expect(tienePermiso("hacker", ACCIONES.INGRESOS_ESCRIBIR)).toBe(false);
    });

    it("devuelve false para acción nula", () => {
      expect(tienePermiso("jefe", null)).toBe(false);
      expect(tienePermiso("jefe", undefined)).toBe(false);
      expect(tienePermiso("jefe", "")).toBe(false);
    });
  });

  describe("permisos extra (por usuario)", () => {
    it("acepta Set como permisos extra", () => {
      const extra = new Set([ACCIONES.STOCK_ELIMINAR]);
      expect(tienePermiso("operador", ACCIONES.STOCK_ELIMINAR, extra)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.INGRESOS_ELIMINAR, extra)).toBe(false);
    });

    it("acepta Array como permisos extra", () => {
      const extra = [ACCIONES.STOCK_ELIMINAR, ACCIONES.EXPORTAR];
      expect(tienePermiso("operador", ACCIONES.STOCK_ELIMINAR, extra)).toBe(true);
      expect(tienePermiso("operador", ACCIONES.EXPORTAR, extra)).toBe(true);
    });

    it("permisos extra no quitan permisos base", () => {
      const extra = new Set();
      expect(tienePermiso("jefe", ACCIONES.INGRESOS_ELIMINAR, extra)).toBe(true);
    });
  });

  describe("tieneAlguno", () => {
    it("retorna true si tiene al menos uno", () => {
      expect(
        tieneAlguno("operador", [ACCIONES.INGRESOS_ELIMINAR, ACCIONES.INGRESOS_ESCRIBIR])
      ).toBe(true);
    });

    it("retorna false si no tiene ninguno", () => {
      expect(
        tieneAlguno("operador", [ACCIONES.INGRESOS_ELIMINAR, ACCIONES.DASHBOARD_VER])
      ).toBe(false);
    });

    it("retorna false con array vacío", () => {
      expect(tieneAlguno("jefe", [])).toBe(false);
    });
  });
});

describe("integridad de la matriz", () => {
  it("todos los perfiles definidos son Sets", () => {
    for (const [perfil, permisos] of Object.entries(PERMISOS_POR_PERFIL)) {
      expect(permisos).toBeInstanceOf(Set);
    }
  });

  it("ninguna acción declarada es duplicada", () => {
    const valores = Object.values(ACCIONES);
    const uniq = new Set(valores);
    expect(uniq.size).toBe(valores.length);
  });

  it("supervisor es subset estricto de jefe en escritura+eliminación", () => {
    const supervisor = PERMISOS_POR_PERFIL.supervisor;
    const jefe = PERMISOS_POR_PERFIL.jefe;
    for (const accion of supervisor) {
      expect(jefe.has(accion)).toBe(true);
    }
    expect(supervisor.size).toBeLessThan(jefe.size);
  });

  it("operador es subset de supervisor (no puede más que su superior)", () => {
    const operador = PERMISOS_POR_PERFIL.operador;
    const supervisor = PERMISOS_POR_PERFIL.supervisor;
    for (const accion of operador) {
      expect(supervisor.has(accion)).toBe(true);
    }
  });
});
