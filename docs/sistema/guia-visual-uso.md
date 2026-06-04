# ReciboApp / Yatasto — Guía visual de uso

**Lácteos Yatasto SA — Cómo usar la app, pantalla por pantalla**
Guía visual · Versión 1.0 (plantilla para completar con screenshots reales) · 2026-06-04

> Guía pensada para explicar la app **en persona o compartida** (operarios, supervisores, oficina, jefe). Lenguaje simple, paso a paso, con foco en **qué hace cada pantalla, qué NO tocar y los errores comunes**. Describe la app **tal cual está hoy**. Una primera tanda de guardrails ya valida algunas cosas (litros > 0, origen ≠ destino, foco en "Cancelar", Eliminar oculto al operario), pero **no todas**: por eso la guía sigue marcando los chequeos manuales.

---

## Cómo usar esta guía (y cómo completar las imágenes)

Esta guía es una **plantilla editable**. Cada pantalla tiene un **espacio de imagen** marcado con 📷 y una instrucción exacta de **qué capturar y qué anotar** (recuadros y flechas). Las screenshots reales deben sacarse del **dispositivo real en uso, con datos reales de planta** (la app necesita login y datos para verse representativa).

**Para completar cada imagen:**
1. Sacá la captura desde el celular/tablet o la PC, en la pantalla indicada.
2. Marcá sobre la imagen lo que dice el bloque 📷 (recuadro rojo = mirar esto; flecha = acá va tal cosa).
3. Reemplazá el bloque 📷 por la imagen ya anotada.

> Las marcas (recuadros/flechas) se pueden hacer con cualquier editor simple (la herramienta de recortes de Windows, o marcar sobre la foto en el celular). Mantené el mismo criterio de color: **rojo = atención / no equivocarse**, **verde = correcto**, **flecha = "acá va esto"**.

---

## La app de un vistazo

> 📷 **IMAGEN 1 — Pantalla de inicio / barra de navegación**
> *Capturar:* la app abierta con la barra inferior visible.
> *Recuadrar (rojo):* la **fecha** arriba y el **indicador de conexión** ("Sincronizado").
> *Flecha →* a la **barra inferior** con la nota: "Acá elegís la pantalla".
> *Nota:* "Siempre mirá la fecha y que diga Sincronizado."

La app se maneja desde la **barra inferior**, con 6 pantallas: **Ingresos · Movimientos · Carga · Fortificados · CIP · Stock**. Arriba están siempre visibles la **fecha** y el **estado de conexión**. El supervisor y el jefe tienen además acceso a Producción, Dashboard/Exportar y (el jefe) al panel de Administración.

**Tres cosas que valen para toda la app:**
- La **fecha de arriba** manda: si no dice HOY, estás cargando en otro día.
- **Sincronizado** = lo que cargaste llegó al servidor. Si hay señal mala, esperá.
- La app **guarda sola** apenas cargás; no hay un botón único de "guardar todo".

---

# PARTE 1 — OPERARIO (piso)

> Recorrido del operario: identificarse → Ingresos → Movimientos → Carga → Fortificados → CIP → Stock al cierre del turno.

## 1.1 Identificarse en el turno

> 📷 **IMAGEN 2 — Modal de identificación de responsable**
> *Capturar:* el aviso/modal donde se carga el responsable del turno.
> *Recuadrar (rojo):* el campo del nombre.
> *Nota:* "Poné tu nombre al empezar el turno. Es la única forma de saber quién cargó."

**Qué hace:** registra quién es el responsable del turno. **Paso a paso:** al abrir, si el turno no tiene responsable, aparece el aviso → escribí tu nombre → confirmá.
**Qué NO tocar:** no saltees este paso si podés evitarlo.
**Error común:** en una tablet compartida queda el nombre del turno anterior → cargás vos y figura otro.

## 1.2 Ingresos (la pantalla más usada)

> 📷 **IMAGEN 3 — Formulario de nuevo ingreso**
> *Capturar:* el formulario de alta de un ingreso abierto.
> *Recuadrar (rojo):* el campo **"Litros Fábrica"**.
> *Flecha →* a "Litros Fábrica" con la nota: "Acá va el número principal de litros (NO en Tambo)".
> *Recuadrar (amarillo):* los campos densidad y pH, con la nota: "Mirá el número que queda; la app lo cambia solo (28 → 1.028)".

**Qué hace:** registra el ingreso de un camión: litros y parámetros de calidad, y el silo destino.
**Paso a paso:** abrir Ingresos → "+" nuevo → elegir tambo → cargar **Litros Fábrica** → cargar calidad (pH, acidez, GB, etc.) → elegir silo destino → Guardar.
**Qué NO tocar / cuidar:** no cargues el número principal en "Litros Tambo" (el total queda en 0). Si salta el aviso de **aguado** y lo forzás, hoy **no queda registrado** quién lo autorizó: avisá en persona.
**Errores comunes:** un cero de más (1.200 vs 12.000) entra igual; densidad/pH reinterpretados sin que lo notes.
**Ejemplo real:** llegó el camión de "La Esperanza" (n.° 14) con 12.000 L → cargar 12000 en **Litros Fábrica**, calidad, silo 80, Guardar.

## 1.3 Movimientos (silo a silo)

> 📷 **IMAGEN 4 — Formulario de movimiento**
> *Capturar:* el formulario de movimiento con los dos desplegables.
> *Recuadrar (rojo):* los desplegables **DESDE** y **HASTA**.
> *Flecha:* sobre DESDE → "de dónde SALE"; sobre HASTA → "a dónde ENTRA".
> *Recuadrar (verde):* la tarjeta "Total descontado del origen", con la nota: "Revisá que descuente del silo correcto".

**Qué hace:** transfiere leche de un silo a otro (con pérdida opcional).
**Paso a paso:** Movimientos → "+" → **DESDE** (sale) → **HASTA** (entra) → litros → (pérdida si hay) → motivo → Guardar.
**Qué NO tocar / cuidar:** la app ahora te frena si ponés el **mismo silo** en Desde y Hasta, o si cargás **0 o menos**. Pero **NO** se da cuenta si invertís hacia **otro** silo: revisá la dirección.
**Errores comunes:** invertir Desde/Hasta hacia otro silo y descontar del que tenía que recibir (la app no lo detecta).
**Ejemplo real:** pasar 5.000 L del silo 80 al 60 → DESDE 80, HASTA 60, 5000, motivo "trasvase", Guardar.

## 1.4 Carga (despacho)

> 📷 **IMAGEN 5 — Formulario de carga / despacho**
> *Capturar:* el formulario de carga con el desplegable de silo proveniente.
> *Recuadrar (rojo):* la opción **BIN** en el desplegable.
> *Flecha →* a BIN con la nota: "NUNCA elijas BIN: el despacho no descuenta ningún silo".

**Qué hace:** registra una carga de salida (despacho).
**Paso a paso:** Carga → elegir CARGA 1/2/3 → **silo proveniente** (el real) → litros → destino → Guardar.
**Qué NO tocar / cuidar:** **no elijas BIN** como origen (se guarda pero no baja stock). Escribí el destino siempre igual para el mismo cliente.
**Errores comunes:** despachar desde BIN; escribir el mismo cliente de tres formas distintas.
**Ejemplo real:** despacho de 20.000 L desde el silo 100 N → elegir 100 N (no BIN), 20000, destino, Guardar.

## 1.5 Fortificados

> 📷 **IMAGEN 6 — Formulario de lote fortificado**
> *Capturar:* el formulario con la lista de adiciones y el selector de unidad.
> *Recuadrar (rojo):* el **selector de unidad** (kg / g / mL…).
> *Nota:* "Mirá bien la unidad: kg ≠ g. Una unidad mal infla el silo con litros que no existen."
> *Recuadrar (amarillo):* las 3 filas que vienen cargadas, con la nota: "Estas 3 no se pueden borrar; si no las usás, avisá (no inventes 0)".

**Qué hace:** registra un lote fortificado (silo origen/destino + adiciones).
**Paso a paso:** Fortificados → "+" → silo origen/destino → litros base → agregar adiciones (producto + cantidad + **unidad**) → Guardar.
**Qué NO tocar / cuidar:** la unidad de cada adición. Las tres filas precargadas no se pueden borrar.
**Error común:** cargar kilos donde iban gramos → el silo se infla miles de litros sin aviso.

## 1.6 CIP (limpieza)

> 📷 **IMAGEN 7 — Registro CIP de un silo**
> *Capturar:* una fila de CIP abierta con sus parámetros.
> *Recuadrar (rojo):* los campos alcalino / enjuague / ácido / temperatura.
> *Recuadrar (verde):* el **punto verde** de la fila, con la nota: "El punto verde NO garantiza que esté completo; tenés que cargar TODOS los parámetros".

**Qué hace:** registra la limpieza (CIP) de silos y camiones. Es **registro de inocuidad**.
**Paso a paso:** CIP → elegir silo/camión → cargar alcalino, enjuague, ácido, temperatura, hora y responsable → cerrar la fila.
**Qué NO tocar / cuidar:** no dejes la fila con solo el nombre: el punto verde se prende igual y queda como "limpio" sin estarlo. Con señal mala, verificá que el dato quedó (se puede revertir).
**Error común:** CIP en verde pero con campos vacíos → registro de inocuidad falso.

## 1.7 Stock (cierre del turno)

> 📷 **IMAGEN 8 — Pantalla de Stock por turno**
> *Capturar:* la vista de stock con el selector de turno y las tarjetas de silos.
> *Recuadrar (rojo):* el **selector de turno** (Mañana / Tarde / Noche).
> *Nota:* "Confirmá el turno ANTES de cargar; puede haber quedado de antes."

**Qué hace:** registra el stock de los silos por turno.
**Paso a paso:** Stock → confirmar el **turno correcto** → revisar/cargar los silos → revisar que ninguno esté lleno o raro.
**Qué NO tocar / cuidar:** no edites un día cerrado ni un día histórico. Si el auto-relleno te pisa el producto que pusiste a mano, volvé a ponerlo.
**Error común:** cargar en el turno equivocado porque el selector quedó en Mañana.

---

# PARTE 2 — SUPERVISOR

> El supervisor opera como el operario cuando hace falta, pero su trabajo es **controlar y cerrar el día**.

## 2.1 Producción (envasar / finalizar)

> 📷 **IMAGEN 9 — Pantalla de Producción (finalizar lote)**
> *Capturar:* el formulario de finalización de un lote.
> *Recuadrar (rojo):* el campo "litros usados".
> *Nota:* "La app no te deja poner usados mayores a enviados (te frena ahí). Revisá cajas y litros."

**Qué hace:** gestiona lotes de envasado (en proceso y finalizados). Reserva y descuenta litros del silo.
**Paso a paso:** Producción → envasar desde Stock o finalizar un lote → cargar litros usados, cajas y destino del sobrante → confirmar.
**Qué NO tocar / cuidar:** eliminar un lote **finalizado** devuelve litros al silo (irreversible). Leé qué borrás.

## 2.2 Cerrar el día

> 📷 **IMAGEN 10 — Cierre del día / indicador de conexión**
> *Capturar:* el botón/acción de cerrar el día y el indicador de conexión.
> *Recuadrar (rojo):* el indicador **"Sincronizado"**.
> *Flecha →* al cierre con la nota: "Cerrá SOLO con Sincronizado. Si hay cola, esperá."

**Qué hace:** congela el día y toma el saldo de cierre.
**Paso a paso:** revisar la jornada → esperar **"Sincronizado"** → cerrar → descargar el backup que sugiere.
**Qué NO tocar / cuidar:** no busques cerrar con cola pendiente (la app lo frena). Si algo cuadra raro, pedile al **jefe** que corra inconsistencias **antes** de cerrar (el supervisor no tiene ese panel).
**Errores comunes:** cerrar sin revisar; confiar en un CIP verde vacío o en un backup cortado.

## 2.3 Exportar (Dashboard)

> 📷 **IMAGEN 11 — Tab Exportar del Dashboard**
> *Capturar:* la pantalla de exportación con el selector de rango de fechas.
> *Recuadrar (rojo):* el selector de fechas.
> *Nota:* "Revisá la fecha/rango antes de exportar."

**Qué hace:** exporta los datos a CSV/Excel. **Paso a paso:** Dashboard → Exportar → elegir rango → Exportar CSV o Excel.
**Cuidar:** la columna "Responsable" del Excel es un nombre cargado a mano, **no** una auditoría de autor.

---

# PARTE 3 — OFICINA (escritorio)

> "Oficina" no es un usuario propio: se entra con clave de **supervisor o jefe** desde la PC. Se **lee y exporta**, no se carga.

## 3.1 Revisión y verificación de backup

> 📷 **IMAGEN 12 — Dashboard en escritorio + verificación de backup**
> *Capturar:* el Dashboard en pantalla grande (PC).
> *Recuadrar (rojo):* el dato de cantidad de registros del backup (al abrir el archivo) o el KPI principal.
> *Nota:* "Verificá total_registros del backup: si llega a 1.000, está cortado (no sirve)."

**Qué hace:** revisión histórica, KPIs, exportación y verificación de respaldos.
**Paso a paso:** entrar como supervisor (o jefe si se necesita backup completo/auditoría) → revisar por fecha → exportar → abrir el backup y verificar la cantidad de registros.
**Qué NO tocar / cuidar:** si entrás como **jefe** "para mirar", no reabras días, no toques Saldo Base, no elimines. Para backup completo/auditoría/reabrir hay que entrar como **JEFE**.
**Errores comunes:** creer que el backup bajó completo; exportar un día de turno noche mal fechado.

---

# PARTE 4 — JEFE

> El jefe mueve las palancas que **recalculan toda la historia**. Varias de estas acciones la app no las avisa: el control es la persona.

## 4.1 Panel técnico (inconsistencias y saldo)

> 📷 **IMAGEN 13 — Panel de Administración / inconsistencias**
> *Capturar:* el panel técnico con el detector de inconsistencias.
> *Recuadrar (rojo):* el resultado de inconsistencias (o el botón para correrlas).
> *Nota:* "Corré inconsistencias antes de cerrar. Sos el único que puede."

**Qué hace:** detecta inconsistencias (stock negativo, reservados que exceden el silo, rendimiento imposible) y permite reconstruir la cadena de saldo. **Solo jefe.**
**Paso a paso:** Administración → correr inconsistencias → resolver lo que aparezca antes de cerrar.

## 4.2 Reabrir un día (regla de oro)

> 📷 **IMAGEN 14 — Candado de reapertura en el header**
> *Capturar:* el candado/acción de reabrir día en el header.
> *Recuadrar (rojo):* el candado.
> *Nota grande:* "REGLA DE ORO: reabrir → editar → VOLVER A CERRAR. Si no recerrás, el saldo de mañana queda viejo (y la app no avisa)."

**Qué hace:** reabre un día cerrado para corregir.
**Paso a paso:** header → candado → reabrir → editar → **volver a cerrar**.
**Qué NO tocar / cuidar:** reabrir hoy/ayer **no recalcula** el saldo; por eso siempre hay que **recerrar**.

## 4.3 Saldo Base Oficial

> 📷 **IMAGEN 15 — Panel de Saldo Base**
> *Capturar:* el panel de carga del saldo base con su aviso.
> *Recuadrar (rojo):* el aviso de "recalcula toda la cadena".
> *Nota:* "Solo con conteo físico verificado y en día tranquilo. No queda auditado."

**Qué hace:** es el ancla del stock. Cambiarlo recalcula toda la cadena hasta hoy.
**Qué NO tocar / cuidar:** no lo cambies en plena operación ni para "emparchar".

---

## Resumen visual — qué NO tocar (por rol)

> 📷 **IMAGEN 16 — Tarjeta resumen "qué NO tocar"** *(opcional)*
> *Sugerencia:* armar una imagen simple con 4 columnas (Operario / Supervisor / Oficina / Jefe) y debajo lo que NO debe tocar cada uno (ver tabla).

| Rol | Qué NO debe tocar |
|---|---|
| **Operario** | Fecha del header · botón "Actualizar" mientras carga · forzar aguado sin avisar. (El botón "Eliminar" ya no aparece para el operario.) |
| **Supervisor** | Saldo Base (salvo conteo físico y día tranquilo) · cerrar con cola pendiente · forzar aguado sin autorización. |
| **Oficina** | Con clave de jefe: no reabrir, no Saldo Base, no eliminar (solo leer/exportar). |
| **Jefe** | Saldo Base en plena operación · reabrir sin recerrar · la consola del navegador (saltea la auditoría). |

---

*Plantilla de guía visual. Las imágenes (📷) se completan con screenshots reales del dispositivo en uso, anotadas según las instrucciones de cada bloque. El contenido describe el estado real de la app al 2026-06-04 y no introduce funcionalidades nuevas. Material de apoyo: tarjetas operativas en `docs/capacitacion/` y matriz de tareas en `docs/operacion/task-matrix-roles.md`.*
