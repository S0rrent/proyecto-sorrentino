# JEFE — fichas de planta

Perfil real: `jefe`. Sos el **único que mueve las palancas que recalculan toda la historia** (reabrir, Saldo Base, borrar finalizados). App tal cual está hoy (sin Tanda A). **Varias de estas la app NO te las avisa: el control sos vos.**

---

## 1. Primer día usando la app

**Qué pantallas usás:** **todo** lo del supervisor + **Administración** (panel técnico, inconsistencias, backup completo) + **reabrir** desde el candado del header.

**Qué hacés normalmente (además de lo del supervisor):**
1. Corrés **inconsistencias** sobre el día (sos el único que puede).
2. **Reabrís** días cuando hace falta corregir.
3. Cambiás el **Saldo Base Oficial** (el ancla del stock).
4. Bajás el **backup completo** y leés **auditoría detallada**.
5. **Eliminás lotes finalizados** de Producción (devuelve litros al silo).

**Qué NO tenés que tocar (sin protocolo):**
- **Saldo Base** en plena operación → solo día tranquilo + conteo físico.
- **Reabrir** sin plan de **volver a cerrar**.
- Nada por la **consola del navegador** (saltás UI, confirmaciones y auditoría).

**Errores más comunes:** reabrir hoy, editar y **olvidar recerrar** (el saldo de mañana queda viejo y la app no te avisa); cambiar Saldo Base sin conteo; eliminar el lote finalizado equivocado.

**Cómo pensar la app:**
> *Yo muevo las palancas que recalculan toda la historia. Reabrir, Saldo Base y borrar finalizados no perdonan: un error mío se propaga a toda la cadena. La app no me avisa de varias de estas — el control soy yo.*

---

## 2. Checklist operativo diario

**Antes del día**
- [ ] Conexión en **"Sincronizado"**.
- [ ] Cada turno con **responsable** cargado.

**Durante el día**
- [ ] Corré **inconsistencias** sobre el día (sos el único que puede). Stock negativo, reservados > total, rendimiento > 105% → **resolvé antes de cerrar**.

**Si reabrís un día (regla de oro)**
- [ ] **Reabrir → editar → VOLVER A CERRAR.** Si no recerrás hoy/ayer, el saldo de mañana queda viejo y **nada te avisa**.

**Antes de tocar el Saldo Base**
- [ ] Solo con **conteo físico verificado** y en **día tranquilo**.
- [ ] Recordá: recalcula **toda la cadena** y **no queda auditado**.

**Antes de cerrar el día**
- [ ] Inconsistencias en **cero** (o resueltas).
- [ ] Conexión **"Sincronizado"** → cerrá.
- [ ] **Backup completo** → abrí el archivo y verificá **`total_registros`** (corta a 1.000 sin avisar). Guardalo **afuera** del equipo.

**Qué revisar si algo parece raro**
- [ ] Corré **inconsistencias primero**.
- [ ] Si reabriste algo, asegurate de **recerrar**.
- [ ] **No toques el Saldo Base para "emparchar".**

---

## 3. Top 10 errores humanos reales

1. **Reabrir hoy, editar y no recerrar.** El saldo de mañana no refleja el cambio y la app **no avisa**. → *Detectar:* el saldo de mañana arranca mal. *Evitar:* reabrir → editar → **recerrar**, siempre. *(T7)*
2. **Cambiar el Saldo Base en plena operación.** Recalcula toda la cadena, no auditado. → *Detectar:* el stock de días viejos cambió. *Evitar:* solo con conteo físico, día tranquilo. *(motor de saldo)*
3. **Eliminar el lote finalizado equivocado.** Devuelve litros al silo, irreversible. → *Detectar:* un silo subió litros de la nada. *Evitar:* leé qué borrás (el botón viene enfocado). *(H3)*
4. **Cerrar sin correr inconsistencias.** Sos el único que puede; si no lo hacés, nadie lo hace. → *Detectar:* stock negativo después. *Evitar:* corrélo antes de cerrar. *(consistencia)*
5. **Confiar en el backup completo truncado.** Corta a 1.000 y se marca como hecho. → *Detectar:* `total_registros`. *Evitar:* verificá el número. *(T3)*
6. **Cruce de medianoche a las 21:00.** El día rota antes por UTC. → *Detectar:* registros de noche en otra fecha. *Evitar:* tenelo presente en turno noche. *(T2)*
7. **Tocar algo por consola "porque puedo".** Saltás UI, confirmaciones y auditoría. → *Detectar:* cambios sin rastro. *Evitar:* operá siempre por la app. *(T6)*
8. **Resolver una inconsistencia borrando a ciegas.** Tapás el síntoma y movés el problema de silo. → *Detectar:* la inconsistencia reaparece en otro lado. *Evitar:* entendé la causa (doble descuento, saldo base) antes de tocar. *(consistencia)*
9. **Reabrir un día viejo y editar sin entender la reconstrucción.** Dispara el rebuild de la cadena. → *Detectar:* el log de rebuild marca "truncado". *Evitar:* hacelo en día tranquilo y verificá después. *(motor de saldo)*
10. **Dar por exhaustiva la auditoría.** Puede perder entradas si dos equipos escriben a la vez. → *Detectar:* falta una acción que sabés que pasó. *Evitar:* no asumas que el log tiene todo en jornadas de mucha actividad. *(T5)*
