# Manual del Operario — App de Planta (Yatasto)

Guía paso a paso para usar la app durante tu turno.
Lenguaje simple. Pensada para leer en el celular, imprimir o pasar por WhatsApp.

> **Regla de oro:** la app es tu planilla. Frena **algunos** errores graves
> (litros en cero, mover un silo a sí mismo, cargar a un silo sucio sin CIP),
> **pero NO corrige los errores de todos los días**: un cero de más, el silo
> equivocado, la unidad equivocada o el campo equivocado se guardan tal cual.
> Si se te pasa uno, el silo queda mal y nadie se entera hasta el conteo físico.
> **Por eso revisás ANTES de guardar.**

---

## 1. ¿Para qué sirve la app?

Reemplaza la planilla de papel. Sirve para anotar **todo lo que le pasa a la
leche en tu turno**:

- Camiones que **llegan** (Ingresos)
- Leche que pasás **de un silo a otro** (Movimientos)
- Camiones que **salen** (Carga)
- **Lotes** que armás (Fortificados)
- **Limpiezas** (CIP)
- El **stock** de tus silos al cerrar el turno

Lo que cargás se guarda solo, al instante. **No hay botón de "enviar todo" al
final.** Cada cosa que anotás ya queda guardada.

---

## 2. Las 6 pantallas que usás

En la **barra de abajo** vas a ver estas pantallas. Son las únicas que usás:

**Ingresos · Movimientos · Carga · Fortificados · CIP · Stock**

Si ves algo más (Dashboard, Supervisor, etc.), **no es para tu perfil**. No te
preocupes por eso.

---

## 3. Antes de empezar el turno

**Paso 1 — Mirá la fecha de arriba.**
Tiene que decir **HOY**. Si dice otra fecha, estás en "modo histórico" y lo que
cargues se va a otro día.

> ⚠️ **De noche, después de las 21:00**, la fecha puede saltar sola a la de
> mañana. **Verificá siempre la fecha de noche** antes de cargar.

**Paso 2 — Entrá con tu chip y tu PIN.**
Al abrir la app aparece una pantalla con los **chips** de los operarios (tu
nombre, tus iniciales y tu color). Tocá **tu** chip y poné tu **PIN** en el
teclado. Así todo lo que anotás queda a tu nombre.

> El chip lo crea el **jefe**. Si no ves el tuyo, avisale al jefe o al
> supervisor. Si te equivocás **3 veces** de PIN, tu chip se bloquea **1 minuto**:
> esperá y probá de nuevo.

> Si la tablet la usó alguien antes y arriba figura **otro** nombre, tocá el chip
> del header (arriba) y entrá con el **tuyo**. No dejes el turno a nombre del
> compañero anterior.

> ⏱️ **Si te alejás:** a los **5 minutos** sin tocar la app te avisa, y a los
> **10 minutos** te saca al selector de chips. Lo que ya guardaste queda; solo
> tenés que volver a poner tu PIN.

---

## 4. Tu turno, en orden

Este es el orden normal de un turno. No tenés que hacer todo siempre: hacés cada
cosa **cuando pasa**.

1. Entrás → tocás **tu chip** y ponés tu **PIN**.
2. Llega un camión → lo cargás en **Ingresos**.
3. Pasás leche de un silo a otro → **Movimientos**.
4. Sale un camión → **Carga**.
5. Armás un lote → **Fortificados**.
6. Limpiaste algo → **CIP** (cargá TODO, no solo tu nombre).
7. Al terminar tu turno → cargás el **Stock** de tus silos.

> **Cargá apenas pasa la cosa. No juntes para después.** Con la planta en
> movimiento, lo que no anotás en el momento se pierde.

> 🔁 **Cambio de turno:** cerca de las **07:00, 14:00 y 21:00** la app muestra un
> cartel **"¿Cambio de turno?"**. Si el que entra sos vos, tocá **Cambiar** y
> entrá con tu chip y PIN. Si seguís vos, ignoralo.

---

## 5. Cómo cargar cada pantalla

### 5.1 Ingresos (llega un camión)

Acá anotás la leche que entra: litros y datos de calidad (pH, acidez, GB, etc.).

1. Abrí **Ingresos** y tocá el botón **+** para un camión nuevo.
2. Cargá los **LITROS** en el campo **"Litros Fábrica"**.
3. Cargá los datos de calidad que correspondan (pH, acidez, densidad…).
4. Elegí el **silo de destino** (a dónde va esa leche).
5. **Revisá los litros** (mirá el punto 7) y guardá.

**Ejemplo:** llegan 1.200 litros. Escribís `1200` en **Litros Fábrica** (no en
Tambo) y elegís el silo donde descargás.

> ⚠️ **Densidad y pH:** la app cambia el número solo al salir del campo. Si
> escribís `28` de densidad, puede quedar `1.028`. Si escribís `68` de pH, queda
> `6,8`. **Mirá el número que quedó.** Si quedó raro, corregilo.

> ⚠️ **Aguado:** si el dato da aguado, la app **frena** y muestra un cartel con
> dos botones: **"Corregir valores"** y **"Guardar de todas formas"**. **No
> toques "Guardar de todas formas" solo.** Avisá al supervisor en persona antes
> de seguir.

> 🔒 **Silo pendiente de CIP:** si el silo de destino está vacío y **sin
> limpiar**, la app **no te deja guardar sola**: te pide el **PIN de un
> supervisor** en tu pantalla. **No podés forzarlo vos.** Primero que se haga el
> CIP, o que el supervisor autorice con su PIN.

> 💡 **Litros en cero o vacío:** la app no guarda y te avisa *"Litros debe ser
> mayor a 0"*. Cargá el número real.

### 5.2 Movimientos (de un silo a otro)

Acá pasás leche entre silos.

1. Abrí **Movimientos**.
2. Elegí **DESDE** = el silo de donde **SALE** la leche.
3. Elegí **HASTA** = el silo a donde **ENTRA** la leche.
4. Cargá los **litros** que movés.
5. Mirá la card **"Total descontado del origen"** para confirmar que descontás
   del silo correcto, y guardá.

**Ejemplo:** pasás 5.000 litros del Silo 100 N al Silo 80.
DESDE = `100 N`, HASTA = `80`, litros = `5000`.

> ⚠️ **No inviertas DESDE y HASTA.** Si los das vuelta, le sacás leche al silo
> que tenía que recibir. **Esto la app NO lo detecta** — el control sos vos.
> ✅ **Mismo silo en DESDE y HASTA:** esto **sí** lo frena la app (*"El silo
> origen y destino no pueden ser iguales"*). Igual, no lo intentes.
> 💡 **Litros en cero o vacío:** la app no guarda y te avisa *"Litros debe ser
> mayor a 0"*.

### 5.3 Carga (sale un camión / despacho)

Acá anotás la leche que sale de la planta (CARGA 1, 2 o 3).

1. Abrí **Carga**.
2. Elegí el **silo real** de donde sale la leche.
3. Cargá los **litros**.
4. Completá el **destino** (a quién va).
5. Revisá y guardá.

> ⚠️ **Nunca elijas "BIN" como silo.** Si elegís BIN, el despacho se anota pero
> **ningún silo baja**: la planta cree que la leche sigue adentro. Elegí siempre
> el silo de verdad.
> 💡 **Destino:** escribí siempre el **mismo nombre** para el mismo cliente (no
> "La Sereníssima" una vez y "Serenisima" otra). Si no, después no se entiende.

### 5.4 Fortificados (armás un lote)

Acá cargás el lote con sus agregados (producto + cantidad + unidad).

1. Abrí **Fortificados**.
2. Cargá cada agregado: **producto**, **cantidad** y **unidad**.
3. **Mirá bien la UNIDAD** (kg, g, mL…).
4. Guardá.

> ⚠️ **La unidad es lo más importante acá.** Si ponés **kg** donde iban **g**,
> inflás el silo con miles de litros que no existen. Confirmá la unidad con luz
> buena.
> 💡 Vienen tres filas precargadas (Lactosa, Variolac, Agua). Si **no** usás
> alguna, **no le inventes un número.** Avisá al supervisor.

### 5.5 CIP (limpieza)

Acá registrás las limpiezas de silos y de camiones. **Es un registro de
inocuidad: no lo dejes a medias.**

1. Abrí **CIP** (elegí la pestaña de silos o de camiones).
2. Cargá **TODOS** los parámetros: **alcalino, enjuague, ácido, temperatura,
   hora**.
3. Cargá tu nombre.
4. Guardá.

> ⚠️ **El punto verde NO significa "completo".** Se prende con solo poner la hora
> o tu nombre. Aunque esté verde, si faltan los parámetros, el registro es falso.
> **Cargá todo.**
> 💡 Con señal mala: después de guardar, **fijate que el dato quedó** (puede
> revertirse solo). Si se borró, cargalo de nuevo.

### 5.6 Stock (al cerrar tu turno)

Al final de tu turno cargás el nivel de tus silos.

1. Abrí **Stock**.
2. **Confirmá el turno** que estás cerrando arriba (Mañana / Tarde / Noche).
3. Revisá los litros de cada silo y completá lo que falte.
4. Guardá.

> ⚠️ **Cargá en el turno correcto.** El selector puede haber quedado en el turno
> anterior. Mirá arriba antes de cargar.
> ⚠️ Si un silo aparece **lleno o raro** (más de lo que debería), **avisá.**

---

## 6. Antes de guardar — chequeo rápido (cada carga)

Antes de tocar **Guardar**, mirá:

- [ ] **Fecha de arriba:** ¿dice **HOY**? (de noche puede saltar a mañana)
- [ ] **Litros:** ¿está bien? ¿No sobra un cero? ¿Va en **"Litros Fábrica"**?
- [ ] **Movimientos:** ¿DESDE es de donde sale y HASTA a donde entra? ¿No es el
      mismo silo?
- [ ] **Carga:** ¿el silo real? **¿No es BIN?**
- [ ] **Fortificados:** ¿la **unidad** correcta (kg ≠ g)?
- [ ] **Densidad / pH:** ¿el número que **quedó** es el correcto?
- [ ] **Stock:** ¿estás en el **turno** correcto?

---

## 7. Errores más comunes y cómo resolverlos

| Error | Qué pasa | Cómo te das cuenta | Cómo lo evitás |
|---|---|---|---|
| **Un cero de más en litros** (12.000 en vez de 1.200) | Entra mal al stock | El total del día queda muy alto | Leé el número antes de guardar |
| **Litros en "Tambo" en vez de "Fábrica"** | El silo no suma | El silo no creció | Poné el número principal en **Fábrica** |
| **DESDE / HASTA invertido** | Descontás del silo equivocado | Mirá "Total descontado del origen" | DESDE sale, HASTA entra |
| **Elegir BIN en Carga** | Ningún silo baja | El stock no cambió tras despachar | Nunca elijas BIN |
| **kg en vez de g en Fortificados** | Inflás el silo | El silo creció raro | Confirmá la unidad con luz buena |
| **CIP en verde pero vacío** | Queda "limpio" sin estarlo | Abrí la fila: ¿hay alcalino/ácido/temp? | Cargá todos los parámetros |
| **Stock en el turno equivocado** | Datos en otro turno | Mirá el turno arriba | Confirmá el turno antes de cargar |
| **Carga de noche en fecha de mañana** | Datos en el día siguiente | La fecha de arriba | Verificá la fecha después de las 21 |
| **Densidad/pH cambiados solos** (28 → 1.028) | Calidad mal cargada | Mirá el valor final | Revisalo al salir del campo |
| **Perdés la carga al tocar "Actualizar"** | El formulario se vacía | El form quedó en blanco | No toques ese banner mientras cargás |

> ✅ **Lo que la app SÍ frena ahora:** litros en 0, mover un silo a sí mismo, y
> cargar a un silo sin CIP (te pide PIN de supervisor). **Todo lo demás de esta
> tabla NO lo frena** — depende de que vos lo revises antes de guardar.

---

## 8. Qué hacer si…

**…cargué un dato mal.**
**No borres ni cargues "para arreglar".** Avisá al supervisor y que lo revise
antes de cerrar el día. (Vos **no tenés** botón Eliminar — lo borra el
supervisor.)

**…no veo el botón "Eliminar".**
Es normal: en tu perfil **no aparece**. Los borrados los hace el supervisor o el
jefe. No uses la sesión de otro para borrar.

**…elegí un silo y la app me pide un PIN para guardar.**
Ese silo está **pendiente de CIP** (vacío y sin limpiar). No lo fuerces vos: que
se haga la limpieza, o que el supervisor lo autorice con su PIN en tu pantalla.

**…la app muestra "Algo salió mal" con un botón "Recargar la app".**
Tocá **"Recargar la app"**. Lo que **ya guardaste está a salvo**; solo se pudo
perder lo que estabas cargando sin guardar. Si vuelve a pasar seguido, avisale
al jefe.

**…aparece un aviso de aguado.**
No lo fuerces solo. **Avisá al supervisor en persona** antes de guardar.

**…la app me pide actualizar mientras estoy cargando.**
**No toques el banner "Actualizar"** hasta terminar y guardar. Si lo tocás,
recarga y se borra lo que estabas cargando.

**…guardé pero la señal está mala.**
Después de guardar, **fijate que el dato quedó.** Con señal débil puede
revertirse solo. Si desapareció, cargalo de nuevo.

**…la fecha de arriba no dice HOY (de noche).**
Es un problema conocido de las noches después de las 21. **No cargues** hasta
verificar. Si dudás, avisá al supervisor.

**…un silo aparece lleno o con un número raro.**
No lo "arregles" vos. **Avisá.**

---

## 9. Lo que NO tenés que tocar

- ❌ La **fecha de arriba** (si no sabés qué hace, no la cambies).
- ❌ El banner **"Actualizar"** mientras estás cargando algo.
- ❌ El botón **"Eliminar"** — **no aparece en tu perfil.** Los borrados los hace
  el supervisor.
- ❌ **No fuerces un aguado** sin avisar al supervisor.

---

## 10. Para imprimir / mandar por WhatsApp (resumen)

**LA APP NO CORRIGE LOS ERRORES DE TODOS LOS DÍAS. LO QUE CARGÁS, QUEDA.**

**Pantallas:** Ingresos · Movimientos · Carga · Fortificados · CIP · Stock

**Las 5 que no podés equivocar:**
1. **Litros** bien y en **"Litros Fábrica"** (un cero de más cambia todo).
2. **Movimientos:** DESDE sale · HASTA entra. Nunca el mismo silo.
3. **Carga:** el silo real. **Nunca BIN.**
4. **Fortificados:** mirá la **unidad** (kg ≠ g).
5. **CIP:** cargá **TODO** (el punto verde no garantiza nada).

**Antes de guardar:** ¿fecha HOY? ¿litros bien y en Fábrica? ¿DESDE/HASTA bien?
¿silo correcto (no BIN)? ¿unidad correcta? ¿turno correcto en Stock?

**Si algo salió mal:** no borres ni "arregles". **Avisá al supervisor.**
