# OFICINA — fichas de escritorio

**"Oficina" no es un usuario propio.** Entrás con la clave de **supervisor o jefe** desde la PC. Para **backup completo, auditoría detallada o reabrir día → tenés que entrar como JEFE.** Vos **leés y exportás, no cargás.**

---

## 1. Primer día usando la app

**Qué pantallas usás:** **Dashboard/KPIs · Exportar (CSV/Excel) · Historial · visor de fecha**. Como jefe: el panel de **Administración** (backup completo, auditoría, técnico).

**Qué hacés normalmente:**
1. Revisás **días pasados** por fecha.
2. **Exportás** CSV/Excel por rango para informes y control de calidad.
3. **Verificás backups**: abrís el archivo y mirás `total_registros`.
4. Leés **historial / auditoría**.

**Qué NO tenés que tocar:**
- Si entraste **como jefe**: no reabras días, no toques el **Saldo Base**, no elimines. Solo **mirá y exportá**.
- Entrá **como supervisor** salvo que necesites lo que es exclusivo del jefe.

**Errores más comunes:** tomar la columna **"Responsable"** del Excel como si fuera auditoría (es un nombre que cargó el turno, puede estar vacío o mal); creer que el backup bajó **completo**; exportar un día de **turno noche** que quedó con la fecha del día siguiente.

**Cómo pensar la app:**
> *Yo leo y exporto, no cargo. Lo que veo puede estar mal cargado en planta y la app no me lo marca. El backup puede estar cortado. Antes de informar, verifico fecha y total.*

---

## 2. Checklist operativo diario

**Antes de empezar la sesión**
- [ ] Entrá con el **perfil mínimo**: supervisor para leer/exportar; jefe **solo** si necesitás backup completo / auditoría.
- [ ] Mirá qué **fecha** estás viendo (arriba).

**Durante la sesión**
- [ ] Si exportás **turno noche**, ojo: pudo quedar con la fecha del **día siguiente**.
- [ ] **Cruzá los KPIs** del Dashboard contra el **Stock real** por silo.

**Antes de confiar en un backup**
- [ ] Abrí el archivo y compará **`total_registros`** contra la cantidad real de datos.
- [ ] Si llega a **1.000**, está **cortado** — no sirve como respaldo.
- [ ] No te fíes de la fecha de **"último backup"** (se marca aunque esté cortado o cancelado).

**Antes de cerrar la sesión / informar**
- [ ] ¿La **fecha/rango** exportado es el correcto?
- [ ] ¿**"Responsable"** está cargado o vacío? No lo presentes como "auditoría de autor": es un nombre autodeclarado.
- [ ] Guardá el backup **fuera del equipo** de planta.

**Qué revisar si algo parece raro**
- [ ] Un silo en **negativo** o un día **sin datos** puede ser un error de planta o un backup cortado, **no un error tuyo**. Avisá al **jefe** para que corra inconsistencias.

---

## 3. Top 10 errores humanos reales

1. **Tomar "Responsable" del CSV como auditoría.** Es autodeclarado por turno, puede estar vacío/mal. → *Detectar:* nombres repetidos o vacíos. *Evitar:* trátalo como referencia, no como prueba de autor. *(trazabilidad)*
2. **Creer que el backup bajó completo.** Corta a 1.000 y se marca como hecho. → *Detectar:* `total_registros`. *Evitar:* verificá el número siempre. *(T3)*
3. **Confiar en la fecha de "último backup".** Se marca aunque esté cortado o cancelado. → *Detectar:* comparar con la realidad. *Evitar:* no te fíes de esa fecha. *(T3)*
4. **Exportar turno noche mal fechado.** Quedó en el día siguiente (UTC). → *Detectar:* litros de noche en otra fecha. *Evitar:* revisá la fecha de los registros de noche. *(T2)*
5. **Entrar como jefe "para mirar" y tocar algo.** Heredás reabrir / Saldo Base / eliminar. → *Detectar:* un día se reabrió, un saldo cambió. *Evitar:* entrá como supervisor salvo necesidad. *(T6)*
6. **Buscar "quién cargó este ingreso" y no encontrarlo.** No se audita (salvo Producción). → *Detectar:* el historial no lo tiene. *Evitar:* no prometas trazabilidad de autor que no existe. *(trazabilidad)*
7. **Informar un stock con un silo negativo sin avisar.** Es una inconsistencia, no un dato. → *Detectar:* número negativo. *Evitar:* marcá al jefe para revisar. *(consistencia)*
8. **Guardar el backup solo en la PC/tablet de planta.** Si se pierde el equipo, se pierde. → *Detectar:* no hay copia externa. *Evitar:* guardalo afuera. *(T3)*
9. **Tomar un KPI como verdad sin cruzar.** Sale de datos que pueden estar mal cargados. → *Detectar:* el KPI no cuadra con el silo. *Evitar:* cruzá contra Stock real. *(TH1/TH3)*
10. **Exportar a una fecha futura** por un toque en el calendario (el selector principal no tiene tope). → *Detectar:* la fecha es mañana o después. *Evitar:* revisá la fecha antes de exportar. *(TH7)*
