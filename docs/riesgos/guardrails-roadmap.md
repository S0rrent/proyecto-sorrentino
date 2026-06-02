# Roadmap de guardrails y simplificaciones (conservador)

Estado: propuesta priorizada (read-only, no modifica codigo)
Fecha: 2026-06-02
Alcance: medidas de bajo riesgo para prevenir error humano y mejorar auditabilidad, sin
refactors grandes ni tocar el motor de calculo, la persistencia ni la cola offline.

Cada guardrail referencia el riesgo que cierra (IDs en ../riesgos/registro-hazards.md). Los
guardrails marcados "libre" no tocan zonas protegidas. Los que tocan zona protegida se listan
aparte y requieren pre-mortem.

Donde aplique, se enlaza con UX-V2.md (seccion 7, Quick wins, y fases) para no crear un
roadmap paralelo. No se reescribe nada de UX-V2.md aca.

---

## Tanda A - guardrails libres, alto valor, bajo riesgo

Prevencion directa de corrupcion y error humano. Son condiciones y textos, no refactors.

- A1. Validar numero mayor a 0 antes de guardar en Ingresos, Movimientos, Carga y
  Fortificados (cierra TH1). Un if extra en el chequeo de cada formulario, reusando el banner
  de error existente. Cierra de raiz el bypass del chequeo de saldo con litros menores o
  iguales a cero. Esfuerzo: chico.
- A2. Validar origen distinto de destino en Movimientos y mostrar "Silo X -> Silo Y" en vivo
  (cierra TH2). Esfuerzo: chico.
- A3. Conectar el bloqueo de dia cerrado / solo-lectura a CIP y a los formularios de
  Movimientos (cierra TH4). Es propagar una prop ya soportada, no un refactor. Esfuerzo: chico.
- A4. Punto verde de CIP solo si hay hora y responsable y al menos un parametro de lavado
  (cierra H1). Cambio de condicion booleana y color. Esfuerzo: chico.
- A5. Enfocar "Cancelar" por defecto en las confirmaciones destructivas (cierra H3). Una
  linea, beneficia Movimientos, Carga y Fortificados. Esfuerzo: chico.
- A6. Auditar el override de aguado igual que el forzado por CIP (cierra TH10). Agrega una
  llamada de auditoria. Mejora trazabilidad. Esfuerzo: chico.
- A7. Ocultar o deshabilitar por perfil el boton Eliminar (cierra H8). Elimina el no-op
  silencioso. Esfuerzo: chico.
- A8. Tope de fecha igual a hoy en el selector de fecha (cierra TH7). Esfuerzo: chico.
  Nota: depende tambien del arreglo de fecha local (riesgo T2, zona protegida).

Relacion con UX-V2.md: los targets tactiles (B10, riesgo H4) se alinean con el Quick win QW3
(header 44px) y la seccion 10.2 de UX-V2.md; el reuso del banner de error inline (A1, B5, B7)
con el Quick win QW4 (reemplazar alert por banner). A3 y A5 son guardrails independientes, sin
contraparte directa en la seccion 7 de UX-V2.md.

---

## Tanda B - guardrails libres, esfuerzo medio

Reducen reversiones silenciosas y ambiguedad; algo mas de trabajo pero sin tocar zonas
protegidas.

- B1. CIP: pausar el refresco del campo en foco (marca de edicion en curso) y avisar cuando
  un guardado falla (mitiga TH5 del lado UI; no toca la cola). Esfuerzo: medio.
- B2. Stock: no pisar el producto cargado a mano y mostrar en cada tarjeta el turno que se
  esta editando (cierra TH6 del lado UI). Esfuerzo: medio.
- B3. Mostrar el valor normalizado de densidad y pH como confirmacion bajo el campo
  ("Se guardara: X") (cierra H5; aplica a Ingresos: densidad, pH, acidez). Aparte, aceptar
  coma decimal en cantidades de Fortificados es una mejora sin ID en el registro (el truncado
  de "12,5" a 12 no tiene hazard propio todavia). Esfuerzo: chico a medio.
- B4. Restringir o marcar BIN en el desplegable de Carga (el unico silo que el motor no
  contabiliza) (cierra TH3 del lado UI; no cambia el mapa de silos del motor). Esfuerzo: chico.
- B5. Corregir la cifra del aviso de saldo insuficiente para mostrar el descuento total
  (litros mas perdida) (cierra TH9). Solo texto del mensaje. Esfuerzo: chico.
- B6. Confirmar antes de recargar por nueva version cuando hay un formulario abierto, y
  dejar el aviso de dia cerrado permanente (cierra H12). Esfuerzo: chico.
- B7. Banner de error a la vista (llevarlo al foco) y flecha visible en los desplegables
  (cierra H10). Cambios acotados a los atomos. Esfuerzo: chico.
- B8. Marcar el silo sobrellenado (mas de 100 por ciento) en color de peligro (cierra H9).
  Esfuerzo: chico.
- B9. Permitir borrar cualquier adicion en Fortificados, o ignorar filas vacias al validar
  (cierra H13). Esfuerzo: medio.
- B10. Altura tactil minima 48 px en inputs, botones y tabs, y agrandar los botones de borrar
  y el selector de unidad (cierra H4). Esfuerzo: chico. Se alinea con el Quick win QW3 y la
  seccion 10.2 (tactiles) de UX-V2.md; la Fase 1 de UX-V2.md cubre especificamente la bottom
  bar (64px).

---

## Simplificaciones de flujo (bajan carga cognitiva)

Conservadoras, reusan patrones que ya existen en la app.

- S1. Diferenciar visualmente Litros Fabrica y Tambo y marcar cual es obligatorio (Ingresos).
  Tradeoff: ocupa un poco mas de alto. Reduce la carga cruzada.
- S2. Repetir el turno que se esta editando en cada tarjeta de Stock. Tradeoff: un elemento
  repetido; reduce escrituras en el turno equivocado.
- S3. Convertir Destino de Carga en desplegable con opcion "Nuevo" (reusa el patron de
  Transportista). Tradeoff: un toque extra la primera vez; un cliente queda con un solo
  valor consistente.
- S4. Agrupar las unidades de Fortificados en Masa y Volumen y ensanchar el control.
  Tradeoff: la columna ocupa mas ancho; reduce errores de unidad.
- S5. Mostrar el disponible del silo origen en Carga (reusa el componente de Movimientos).
  Tradeoff: una linea mas; evita despachos que dejan el silo negativo.
- S6. Mostrar rol y responsable activo en el header y re-pedir responsable al cambiar de
  turno (cierra parte de H6). Tradeoff: un dato de identidad por turno; mejora la atribucion.
- S7. Reforzar el contraste del aviso de modo historico (cierra H7). Tradeoff: estado mas
  visible, menos sutil; evita registros en el dia equivocado.

Las simplificaciones de navegacion mas grandes (bottom bar, home del operario, perfil
operario, login por PIN) ya estan planificadas en UX-V2.md y no se duplican aca.

---

## Guardrails que tocan ZONA PROTEGIDA (requieren pre-mortem)

No son de aplicacion directa; van con pre-mortem y test de regresion del saldo
(ver ../arquitectura/invariantes-motor-saldo.md).

- P1. Cola offline: en el camino de exito de db.set, eliminar la entrada pendiente de la
  misma clave (cierra T1).
- P2. Cola offline: no desactivar la guarda de conflicto C5 al encolar (cierra T4).
- P3. Fecha local en getToday (cierra T2). Es el habilitador de A8.
- P4. Backup: paginar db.list o avisar truncamiento antes de marcar el backup como hecho
  (cierra T3).
- P5. Reabrir un dia de hoy o ayer: recalcular o invalidar el saldo (cierra T7).
- P6. Auditoria: append atomico server-side (cierra T5).
- P7. Autorizacion por rol en el servidor, no solo en el cliente (cierra T6). Es tambien una
  mejora de seguridad y de auditabilidad.

---

## Orden sugerido

1. Tanda A completa (libre, alto valor, bajo riesgo).
2. Seguridad operativa: rotar credenciales (security-1) y planificar P7 (T6).
3. Tanda B segun prioridad operativa.
4. Zona protegida (P1 a P7) de a uno, cada uno con su pre-mortem y test de regresion.

Este roadmap es una propuesta. No implica compromiso de implementacion; este documento no
modifica codigo.
