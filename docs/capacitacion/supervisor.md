# SUPERVISOR — fichas de planta

Perfil real: `supervisor`. Sos el **último que mira antes de congelar el día**. App tal cual está hoy (sin Tanda A). Ojo: **el panel de inconsistencias es del jefe, no tuyo.**

---

## 1. Primer día usando la app

**Qué pantallas usás:** las mismas 6 del operario + **Producción** + **Dashboard** (tab "Superv.", con Exportar). El **cierre del día** se hace desde el header.

**Qué hacés normalmente:**
1. Revisás lo que cargó el turno.
2. Corregís o **eliminás** lo que está mal.
3. Autorizás desvíos: **forzar CIP pendiente** (queda registrado) o **forzar aguado** (NO queda registrado solo — anotalo vos).
4. Manejás **Producción**: envasar desde Stock, finalizar lotes.
5. **Exportás** y mirás KPIs.
6. Al final del turno/jornada, **cerrás el día** esperando que la conexión diga **"Sincronizado"**, y descargás el backup.

**Qué NO tenés que tocar:**
- El **Saldo Base**, salvo con conteo físico verificado y en día tranquilo.
- No fuerces **aguado** sin autorización real.
- No busques cerrar con **cola pendiente** (la app te frena por algo).

**Errores más comunes:** cerrar sin revisar; eliminar el registro equivocado (el botón rojo viene enfocado); confiar en un CIP verde vacío; confiar en un backup que puede estar cortado.

**Cómo pensar la app:**
> *Soy el último que mira antes de congelar el día. La app no chequea las inconsistencias por mí — ese panel es del jefe. Si cierro algo mal, queda. El backup puede mentir: lo verifico.*

---

## 2. Checklist operativo diario

**Antes del turno**
- [ ] Cada turno tiene **responsable** cargado.
- [ ] La conexión dice **"Sincronizado"**.

**Durante el turno**
- [ ] Revisá ingresos / movimientos / cargas **grandes o raros**.
- [ ] Si autorizás un forzado: el de **CIP queda registrado**; el de **aguado NO** queda registrado solo → **anotá vos quién autorizó y por qué**.

**Antes de guardar (eliminar / finalizar)**
- [ ] Al **eliminar**, leé el resumen de **qué estás borrando** (el botón rojo viene enfocado, no aprietes de reflejo).
- [ ] Al **finalizar un lote**, los litros usados no pueden superar los enviados (la app te frena ahí, hacele caso).

**Antes de cerrar el día**
- [ ] Conexión en **"Sincronizado"** (si hay cola, la app no te deja cerrar — **esperá**).
- [ ] Mirá ingresos / movimientos / cargas del día.
- [ ] Si algo **cuadra raro**, pedile al **jefe que corra inconsistencias ANTES** de cerrar (vos no tenés ese panel).
- [ ] Cerrá → **descargá el backup** que sugiere.

**Qué revisar si algo parece raro**
- [ ] **No cierres.** Pedí inconsistencias al jefe.
- [ ] **No "arregles" borrando a ciegas** — podés mover el problema de silo.

---

## 3. Top 10 errores humanos reales

1. **Cerrar el día sin que nadie haya mirado inconsistencias.** Vos no tenés el panel (es del jefe). → *Detectar:* stock negativo o silos raros aparecen después. *Evitar:* pedile al jefe que lo corra antes de cerrar. *(T6 + procedimiento)*
2. **Eliminar el registro equivocado.** El botón rojo viene enfocado; un Enter o doble toque borra sin leer. → *Detectar:* falta un registro. *Evitar:* leé el resumen del modal. *(H3)*
3. **Dar por limpia una CIP en verde que está vacía.** El punto se prende con solo el nombre. → *Detectar:* abrí la fila, faltan parámetros. *Evitar:* no des por hecha una limpieza sin alcalino/ácido/temp. *(H1)*
4. **Forzar un aguado y que no quede registro.** El de aguado **no se audita** (el de CIP sí). → *Detectar:* no hay rastro de quién autorizó. *Evitar:* anotá por fuera quién y por qué. *(TH10)*
5. **Confiar en un backup truncado.** Corta a 1.000 registros y se marca como completo. → *Detectar:* abrí el archivo, mirá `total_registros`. *Evitar:* si llega a 1.000, está incompleto. *(T3)*
6. **Cambiar el Saldo Base en plena operación.** Recalcula toda la historia y no queda auditado. → *Detectar:* el stock de días viejos cambió. *Evitar:* solo con conteo físico, día tranquilo. *(motor de saldo)*
7. **Cerrar con señal mala / cola pendiente.** La app lo frena; si insistís, esperás mal. → *Detectar:* el ícono no dice "Sincronizado". *Evitar:* esperá a que sincronice. *(T1)*
8. **Finalizar un lote con rendimiento imposible (>105%).** La app no te lo muestra (vive en el panel del jefe). → *Detectar:* cajas vs litros no cierran. *Evitar:* revisá cajas y litros usados. *(consistencia)*
9. **Dar por bueno lo que cargó el operario sin mirar.** Sus errores son silenciosos. → *Detectar:* un silo no cuadra. *Evitar:* revisá los movimientos/cargas grandes del turno. *(TH1/TH2/TH3)*
10. **Atribuir mal en tablet compartida.** El responsable quedó del turno anterior. → *Detectar:* el nombre del turno no es quien operó. *Evitar:* re-cargá responsable al cambiar de turno. *(H6)*
