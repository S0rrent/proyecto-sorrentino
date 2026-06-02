# Documentacion - ReciboApp (Yatasto)

Indice maestro de la documentacion operativa y de riesgo. Esta documentacion describe el
SISTEMA COMO ES HOY, sus invariantes y sus riesgos. El producto y el rediseno futuro estan en
otros archivos y no se duplican aca.

Formato: Markdown simple, ASCII, sin tablas ni caracteres decorativos (copy/paste seguro en
Windows).

---

## Que leer segun lo que necesites

- Entender el ciclo operativo diario real: operacion/runbook.md
- No romper el motor de saldo: arquitectura/invariantes-motor-saldo.md (ZONA PROTEGIDA)
- Saber donde se guarda cada cosa: arquitectura/modelo-datos.md
- Entender la persistencia con red intermitente: arquitectura/comportamiento-offline.md
  (ZONA PROTEGIDA)
- Saber que queda registrado y que no: auditabilidad/trazabilidad.md
- Ver todos los riesgos priorizados y clasificados: riesgos/registro-hazards.md
- Entender por que el operario se equivoca, por pantalla: riesgos/riesgos-operario.md
- Planificar mejoras conservadoras: riesgos/guardrails-roadmap.md
- Operar con cuidado (operario): operacion/guia-operario.md
- Tareas de control (supervisor / jefe): operacion/procedimientos-supervisor.md

---

## Taxonomia de riesgo (usada en todo el registro)

- T - Riesgo tecnico: el sistema falla o corrompe datos por si mismo.
- H - Riesgo humano-operativo: el sistema funciona, pero el diseno induce al operario a
  equivocarse.
- T+H - Zona gris: problemas tecnicos que se vuelven peligrosos por comportamiento humano.
  Aca viven los guardrails de mayor valor.

Cada riesgo tiene un ID estable (T#, H#, TH#) en riesgos/registro-hazards.md. El resto de los
documentos referencian los riesgos por ese ID.

---

## Zonas protegidas

No se tocan salvo bug critico confirmado y con pre-mortem mas test de regresion:
- Motor de calculo de saldo (ver arquitectura/invariantes-motor-saldo.md).
- Persistencia base y cola offline (ver arquitectura/comportamiento-offline.md).
- Service worker (vite.config.js) y esquema de Supabase (supabase-schema.sql).

---

## Estructura

- arquitectura/
  - invariantes-motor-saldo.md
  - modelo-datos.md
  - comportamiento-offline.md
- operacion/
  - runbook.md
  - guia-operario.md
  - procedimientos-supervisor.md
- auditabilidad/
  - trazabilidad.md
- riesgos/
  - registro-hazards.md
  - riesgos-operario.md
  - guardrails-roadmap.md
- council/ (decisiones, preexistente)

---

## Documentos que NO se duplican aca

- PRODUCT.md: usuarios, proposito, principios de diseno.
- UX-V2.md: rediseno de navegacion y perfiles, roadmap de fases.
- UI-PLAN.md: sistema de diseno (tokens, tipografia, iconografia).
- CLAUDE.md: guia para agentes y mapa de arquitectura del codigo.
- supabase-schema.sql: esquema fisico de la base.

---

## Estado y mantenimiento

- Esta documentacion refleja el codigo al 2026-06-02. Al cambiar comportamiento descrito
  aca, actualizar el documento correspondiente.
- Los riesgos se siguen por su ID en registro-hazards.md (estado por defecto: ABIERTO).
- Escenario de manos: PRODUCT.md indica operarios "sin guantes". Por decision del proyecto,
  esta evaluacion usa igual un escenario conservador (manos humedas, dedos poco precisos,
  guante ocasional) para no subestimar el riesgo. Criterio unificado con
  riesgos/registro-hazards.md.
