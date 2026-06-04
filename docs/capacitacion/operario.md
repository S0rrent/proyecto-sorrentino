# OPERARIO — fichas de planta

Perfil real: `operador`. App tal cual está hoy (sin los guardrails de Tanda A). **La app NO te corrige: lo que cargás, queda.**

---

## 1. Primer día usando la app

**Qué pantallas usás** (la barra de abajo): **Ingresos · Movimientos · Carga · Fortificados · CIP · Stock**. Nada más.

**Qué hacés normalmente, en orden:**
1. Entrás y ponés **tu nombre** como responsable del turno.
2. Llega un camión → lo cargás en **Ingresos** (litros + calidad).
3. Pasás leche de un silo a otro → **Movimientos**.
4. Sale un camión → **Carga**.
5. Armás un lote → **Fortificados**.
6. Limpiaste algo → **CIP** (cargá TODO, no solo tu nombre).
7. Al terminar tu turno → cargás el **Stock** de tus silos.

**Qué NO tenés que tocar:**
- La **fecha de arriba** (si no sabés, no la cambies).
- El botón **"Actualizar"** mientras estás cargando algo (recarga y borra lo que ibas a guardar).
- **"Eliminar"**: a vos no te funciona. No insistas, pedile al supervisor.
- **Aguado**: si salta el aviso, no lo fuerces solo. Avisá.

**Errores más comunes (mirá el Top 10 abajo):** un cero de más en los litros, invertir Desde/Hasta, elegir BIN, kilos por gramos, CIP en verde pero vacío, cargar en el turno equivocado.

**Cómo pensar la app:**
> *Es mi planilla, pero no me corrige. Lo que cargo queda. Si me equivoco, el silo queda mal y nadie se entera hasta el conteo físico. Por eso reviso ANTES de guardar.*

---

## 2. Checklist operativo diario

**Antes del turno**
- [ ] La fecha de arriba dice **HOY**. (De noche, después de las 21, puede saltar a mañana sola — **verificá**.)
- [ ] Cargá **tu nombre** como responsable del turno.

**Durante el turno**
- [ ] Cargá apenas pasa la cosa. No juntes para después.
- [ ] Con señal mala: después de guardar, **fijate que el dato quedó** (puede revertirse solo).
- [ ] En CIP cargá **alcalino, enjuague, ácido, temperatura, hora** — no solo tu nombre.

**Antes de guardar (cada carga)**
- [ ] **Litros**: revisá que no sobre un cero (1.200 ≠ 12.000) y que vaya en **"Litros Fábrica"**.
- [ ] **Movimientos**: Desde = de dónde **sale**, Hasta = a dónde **entra**. No el mismo silo.
- [ ] **Carga**: el silo **real**. **Nunca BIN.**
- [ ] **Fortificados**: mirá la **unidad** (kg / g / mL).
- [ ] **Densidad / pH**: mirá el número que **quedó** (la app lo cambia solo: 28 → 1.028).

**Antes de cerrar tu turno**
- [ ] Cargá el Stock en el **turno que estás cerrando** (mirá el selector de turno).
- [ ] Si un silo aparece **lleno o raro**, avisá.

**Qué revisar si algo parece raro**
- [ ] **NO borres ni cargues "para arreglar".** Avisá al supervisor y que revise antes de cerrar el día.

---

## 3. Top 10 errores humanos reales

1. **Un cero de más en los litros** (1.200 vs 12.000). La app lo acepta y entra al stock. → *Detectar:* revisá el total del día. *Evitar:* leé el número antes de guardar.
2. **Litros en "Tambo" en vez de "Fábrica".** El total queda en 0 y el silo no suma. → *Detectar:* el silo no creció. *Evitar:* el número principal va en **Fábrica**.
3. **Desde/Hasta invertido.** Descontás del silo que tenía que recibir. → *Detectar:* mirá la card **"Total descontado del origen"**. *Evitar:* Desde sale, Hasta entra.
4. **BIN como origen en Carga.** Despachás y **ningún silo baja** (la planta cree que la leche sigue). → *Detectar:* el stock no cambió. *Evitar:* nunca elijas BIN.
5. **Kilos en vez de gramos en Fortificados.** Inflás el silo miles de litros. → *Detectar:* el silo creció raro. *Evitar:* confirmá la unidad con luz buena.
6. **CIP en verde pero vacío.** El punto verde se prende con solo tu nombre; queda como limpio sin estarlo. → *Detectar:* abrí la fila, fijate si hay alcalino/ácido/temperatura. *Evitar:* cargá todos los parámetros.
7. **Stock en el turno equivocado.** El selector quedó en Mañana de antes. → *Detectar:* mirá el turno arriba. *Evitar:* confirmá el turno antes de cargar.
8. **Carga de noche en la fecha de mañana** (a las 21:10 la fecha rota sola). → *Detectar:* la fecha de arriba. *Evitar:* verificá la fecha después de las 21.
9. **Densidad/pH cambiados solos** (28 → 1.028) sin que lo notes. → *Detectar:* mirá el valor final. *Evitar:* revisalo al salir del campo.
10. **Perdés la carga al tocar "Actualizar"** (recarga y borra el borrador). → *Detectar:* el formulario se vació. *Evitar:* no toques ese banner mientras cargás.
