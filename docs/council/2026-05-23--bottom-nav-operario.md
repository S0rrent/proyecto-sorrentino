# Council — Arquitectura de navegación operario (bottom nav mobile)

**Fecha**: 2026-05-23
**Contexto**: UX-V2 Fase 1, post-PR1 (touch hardening)
**Pregunta**: ¿Cuál es la mejor arquitectura de bottom nav mobile para el operario de planta de Lácteos Yatasto, con 4 slots fijos, STOCK ≤1 tap, y prioridad operario futuro real sobre supervisor/jefe?
**Candidato favorito (entrada)**: B-mod = HOME / OPER / STOCK / MÁS
**Decisión humana**: aplazar la decisión de arquitectura. Priorizar PR2 (banners inline) y PR3 (IngresoForm colapsable), agregar telemetría ~1 semana, y recién después decidir entre `INGRESOS / STOCK / MOVIMIENTOS / MENÚ` o una variante con datos reales. El feature flag `uxV2` se mantiene como kill switch.
**PR de implementación**: ninguno todavía (decisión aplazada)
**Vinculado con**: `UX-V2.md` §3.1, PR1 commit `e97cda5`

---

## Framing pasado a los advisors

(ver mensaje del usuario que invocó el council — framing consolidado con contexto operativo, prioridad operario futuro, restricción STOCK ≤1 tap, PRODUCCIÓN puede salir del bottom bar)

---

## Respuestas de advisors

### Contrarian (mapeado a Response C en peer review)

El defecto fatal no está en si HOME va antes que STOCK. Está en la premisa misma del candidato B-mod: **OPER como hub-card mata el offline-first y duplica el tap cost justo donde más duele**.

Mirá el momento real: 21:47, fin de turno noche, operario con guante mojado, pantalla con condensación, va a registrar un ingreso urgente de tambo. Hoy con 6 tabs planos: 1 tap. Con B-mod: tap OPER → esperar render del hub → leer 5 cards bajo luz amarilla → tap Ingresos. Eso son 2 taps físicos pero **3 puntos de fricción cognitiva** (decidir, escanear, decidir otra vez). En turno noche con fatiga, "escanear 5 cards" no es gratis — es donde aparecen los errores de tap equivocado que después contaminan stock.

Segundo agujero que nadie está mirando: **¿qué pasa cuando el hub OPER carga sin red?** Si OPER es una pantalla intermedia que necesita pintar estado (último ingreso por card, alerta por card), tenés un punto de falla offline nuevo que antes no existía. Si no pinta estado, OPER es literalmente un menú de texto — peor que un bottom sheet.

Tercero, la "intuición del jefe" sobre frecuencias es exactamente el tipo de dato que el council debería rechazar como base de decisión arquitectónica. Ingresos 5–15/turno **con picos concentrados en ventanas de 20 minutos** no es lo mismo que 15 distribuidos. En el pico de recepción, Ingresos es la pantalla más golpeada de la app y la estás escondiendo detrás de un hub.

Cuarto, sospechoso: B-mod fue diseñado optimizando para el operario que **no existe todavía en código**. Estás rediseñando navegación para un usuario hipotético mientras degradás la experiencia del usuario real que está usando la app mañana a las 7am. Eso es product theatre, no operación.

Pregunta incómoda: ¿por qué exactamente 4 slots? ¿Quién lo decidió y con qué evidencia de planta?

### First Principles (mapeado a Response E)

El operario con guantes mojados en planta no está "navegando una app". Está respondiendo tres preguntas, en este orden, durante todo el turno:

1. ¿Qué tengo que hacer ahora? (acción siguiente)
2. ¿Cuánto hay en los silos? (estado físico)
3. ¿Esto que acabo de hacer quedó registrado? (confirmación)

Ninguna de las 4 opciones — B-mod, C1, C2, C3 — sirve a esa secuencia. Las 4 asumen que el operario tiene un *mapa mental de secciones* (Ingresos, Movimientos, CIP, Fortificados, Stock). No lo tiene. Tiene un mapa mental de *eventos físicos*: "llegó camión", "voy a cargar tanque", "termino turno y limpio". La sección es una traducción cognitiva que vos le imponés.

La pregunta correcta no es "¿4 tabs o hub?" sino: **¿por qué el operario tiene que elegir sección si el turno, la hora y la última acción ya determinan qué va a hacer?**

A las 07:15 de un turno mañana, el 90% de probabilidad es Ingresos. A las 13:50, fin de turno = CIP + cierre stock. El sistema ya sabe esto. Una pantalla única tipo "siguiente acción + estado silos arriba" elimina el problema de los 4 slots completamente.

Bottom nav con 4 tabs es el primitivo de Instagram, no de planta. En guantes mojados con pantalla húmeda, un tap erróneo en una tira de 4 íconos a 90px es más costoso que un scroll vertical en una lista de acciones grandes.

**Si la restricción de "4 slots" es política (ya decidida arriba), B-mod gana** porque STOCK queda fijo y MÁS absorbe la cola larga. Pero estás optimizando el local óptimo de una arquitectura equivocada. El operario no necesita navegación. Necesita que la app le diga qué hacer ahora.

### Expansionist (mapeado a Response B)

B-mod no es solo "una opción de nav razonable" — es la única que deja espacio arquitectónico para que la app deje de ser un formulario y se convierta en un copiloto de turno.

Concreto: HOME bien diseñado para operario muestra "Turno 14h — silo 80 al 92% (peligro), última carga hace 47min, CIP línea 1 pendiente, próximo camión estimado 15:20". Eso no existe en C1/C3 porque no hay lugar donde vivir. C2 lo tiene pero sin el hub OPER que descarga la cognición del operario.

OPER como panel inteligente: a las 07h muestra Ingresos arriba (pico de recepción), a las 21h muestra Cierre/Carga, durante CIP ritual reordena chips. No es un cajón — es un contexto. Eso solo es posible si hay un slot dedicado a "lo que estás haciendo ahora".

STOCK como disparador: tap en silo lleno → acción rápida "mover a TQ7" o "marcar carga". STOCK ≤1 tap deja de ser solo consulta y se vuelve el punto de entrada a movimientos correctivos. En C3 (flat) cada acción es una pantalla aparte y se pierde el contexto del silo.

Upside específico de B-mod que ninguna otra abre:
- **HOME** es donde meten alertas push, turno activo, lote vivo, KPIs de jefe sin pelear por slots.
- **OPER** absorbe features futuras (trazabilidad, fortificación express, nuevos productos) sin tocar nav.
- **STOCK** queda como atajo crítico siempre visible — innegociable en planta.
- **MÁS** se vuelve verdadero cajón de cola larga (config, históricos, dashboard) sin contaminar el día a día.

C1 mata HOME y pierde el copiloto. C2 mantiene HOME pero sin STOCK directo (inaceptable). C3 es plano, sin jerarquía mental, no escala.

B-mod es la única arquitectura que permite que en 12 meses la app sea más inteligente sin rehacer la nav. Es inversión en techo, no en piso.

### Outsider (mapeado a Response D)

Abro la app por primera vez. Veo cuatro botones: HOME / OPER / STOCK / MÁS.

**HOME** no me dice nada. ¿Home de qué? ¿Mi perfil? ¿La pantalla de bienvenida? En una app de trabajo, "Home" es ruido — yo no vengo a estar "en casa", vengo a hacer tareas. Si te aprieto HOME, ¿qué espero ver? No tengo idea. Probablemente lo aprieto una vez, veo que no sirve para nada operativo, y nunca más lo toco.

**OPER** es lo peor. Es una abreviatura de algo que el diseñador entiende y yo no. ¿Operaciones? ¿Operario? ¿Operativa? Si soy nuevo, OPER me suena a "configuración del operador" o "panel admin". Nunca adivinaría que adentro hay un hub con cinco tareas distintas. Y "hub con cards" es lenguaje de diseñador, no de operario con guantes mojados.

**STOCK** sí lo entiendo. Inventario, cuánto queda. Bien.

**MÁS** es el problema serio. "Más" en toda app del mundo significa "cosas secundarias, configuración, ayuda". Si me decís que ahí adentro hay **Producción** y **Supervisor**, dos cosas que suenan centrales al negocio, está mal etiquetado. La gente no va a buscar Producción en "Más". Van a abrir OPER primero, no encontrar, y trabarse.

**Test de tarea concreta:**
- "Anotá que llegó un camión de leche" → yo voy a HOME. Error. ¿OPER? Tal vez. Pero el nombre no me lo dice.
- "Cuánta leche queda en silo 80" → STOCK. Fácil. Único tab que funciona.

**Recomendación de outsider:** Usen verbos o sustantivos concretos del trabajo real. "REGISTRAR", "STOCK", "LIMPIEZA", "MENÚ". Si OPER agrupa cinco tareas, llamenlo por lo que la gente hace ahí, no por una abreviatura interna. Y sacá HOME — no aporta nada en una app de tareas. C3 con nombres planos es honesto; B-mod esconde funciones detrás de etiquetas que solo el equipo entiende.

### Executor (mapeado a Response A)

Lunes a la mañana, una sola acción: abrir `recibo_yatasto.jsx`, duplicar el array `NAV` en `NAV_V2 = [Ingresos, Stock, Movimientos, Más]` y meter detrás del flag `uxV2`. Eso es C3 puro. 30 líneas. Sale hoy.

**Velocidad real bajo flag:**
- C3: 1 PR, ~80 líneas. Solo reordena tabs existentes + un sheet "Más" trivial.
- C2/C1: requiere componente HOME o PROD nuevo. +200 líneas mínimo.
- B-mod: 3 componentes que no existen (HOME, HUB OPER, SHEET MÁS) + lógica de navegación de dos niveles. ~500 líneas, mínimo 3 PRs.

**La trampa que nadie va a ver:** el switch grande en App renderiza por `tab` string plano. Un HUB (B-mod OPER) implica navegación anidada: tab=`oper` + subtab=`ingresos`. Eso es estado nuevo, historial de back nuevo, y el botón físico "atrás" de Android va a romper si no lo manejás. Nadie en el council mencionó back-button. En planta con guantes, perder el contexto al tocar atrás es un bug grave.

**¿El council se equivoca de pregunta?** Sí. Las 8 secciones ya son accesibles hoy con 6 tabs. Rediseñar antes de tener operario real usando la app es especular. C3 mantiene paridad funcional con lo que ya funciona y agrega "Más" como escape valve para las 4 secciones desplazadas.

**B-mod en 3 PRs progresivos:**
1. Sheet "Más" + tabs C3 bajo flag (paridad funcional).
2. Pantalla HOME reemplaza primer tab.
3. HUB OPER agrupa las 5 operativas.

Cada PR es reversible apagando flag. Hacelo así o no lo hagas.

**Acción del lunes:** implementar C3 bajo flag. Es el PR1 del path a B-mod igual.

---

## Peer reviews (anonimizados)

**Mapping**: A=Executor, B=Expansionist, C=Contrarian, D=Outsider, E=First Principles

### Reviewer 1
1. **C is strongest.** It anchors in a concrete plant moment (21:47, wet glove, condensation), exposes a real architectural defect (OPER hub as offline-fragile intermediate screen), and challenges the unexamined premise (why exactly 4 slots? on what evidence?). It's the only response that defends the *current* operator using the app tomorrow at 7am instead of a hypothetical future one.
2. **B has the biggest blind spot.** It sells B-mod as a "copiloto" platform — HOME with alerts, OPER reordering by hour — but never asks if the contextual data exists, syncs offline, or how it degrades when Supabase times out (10s per `vite.config.js`). It's selling a product vision (smart assistant) as a navigation decision. With wet gloves at 21:47, "smart OPER" is theater if the network isn't there.
3. **All five missed the back-button / navigation history problem at the OS level.** A only mentions it tangentially. None addressed: B-mod's two-level nav requires `history.pushState` handling for Android hardware back, PWA standalone mode, and accidental swipe-back. In a PWA worn on gloved hands, losing context on a misfire back-gesture corrupts the very "confirmation" loop E identifies. This is implementation-blocking and absent from every response.

### Reviewer 2
1. Strongest: **D**. It is the only response that tests the design against a real human reading the labels for the first time. "OPER" and "HOME" failing the recognition test is a falsifiable finding that kills B-mod regardless of architecture. A, B, C, E all argue structure while ignoring that the labels themselves are opaque to the target user. D's recommendation (verbs from the job: REGISTRAR/STOCK/LIMPIEZA/MENÚ) is actionable Monday.
2. Biggest blind spot: **B**. It sells "copiloto de turno" as if HOME-with-alerts is free. Ignores offline-first (C nails this), label opacity (D nails this), and the back-button/nested-navigation cost (A nails this). B is designing for a demo, not 21:47 with wet gloves.
3. What ALL missed: nobody asked for **plant-floor evidence before the redesign**. No tap counts from real shifts, no observation of which 6 current tabs are actually used, no error logs, no operario interview. C gestures at it ("¿con qué evidencia?") but doesn't demand instrumentation first. Also missed: thumb-reach zones on a 51px-wide tab with gloves, and accessibility of "MÁS" as a destination for anything safety-critical (CIP). Decide labels and instrument current usage before picking 4 vs hub.

### Reviewer 3
1. **Strongest: C.** It attacks B-mod with concrete operational cost (21:47 fin de turno, 2 taps + cognitive load), exposes the "intuition" fallacy on frequencies (picos de ingresos no distribuidos), and names the failure mode honestly: product theatre for an operario that doesn't exist in code yet. It also questions the unexamined premise (¿por qué 4 slots?). A is tactically excellent but defensive; C is the only one combining real operational scenario + epistemic challenge.
2. **Biggest blind spot: B.** Sells a "copilot de turno" with rich contextual HOME ("silo 80 al 92%, próximo camión 15:20") without addressing how that data exists offline, how it syncs with intermittent signal, or what happens when the predictions are wrong at 3am on a stressed operator. It's a SaaS dashboard fantasy retrofitted into an industrial PWA. Zero mention of offline-first, which is non-negotiable per CLAUDE.md.
3. **All five missed: wet gloves + touch target geometry.** Nobody quantified the physical reality — 4 tabs at ~95px each vs 6 at ~63px on a 380px viewport. With wet gloves and ruido, mistaps are the actual failure mode, not architecture elegance. Also missed: nobody asked to A/B test with one real operario for 1 week before deciding. The whole debate is theoretical.

### Reviewer 4
1. **Response C is strongest.** It's the only one that quantifies the cost (1 tap today → 2 taps + offline failure mode in B-mod) and grounds the critique in a real moment (21:47 fin de turno) instead of architectural aesthetics. It also names the meta-problem: optimizing for a hypothetical operario degrades the supervisor/jefe using the app tomorrow morning. C challenges the unexamined premise ("4 slots, why?") that A, B, D accept.
2. **Response B has the biggest blind spot.** It designs for a "copiloto de turno" with smart context-aware HOME and OPER hub — but never addresses offline-first, which CLAUDE.md flags as critical. A context-aware HOME that needs fresh data fails silently with weak signal in the plant. B is selling a SaaS dashboard vision to an industrial PWA.
3. **All five missed: wet gloves + 51px tab width.** The current 6-tab bar is already a touch-target problem; none measured whether 4 tabs at ~90px actually solves mis-taps with guantes mojados. They also skipped the migration cost on the live `yatasto:` storage keys and what happens to existing supervisor/jefe muscle memory during rollout. Decision is being made on architecture, not on hand+glove ergonomics — which is the actual operational risk.

### Reviewer 5
1. **Response C is strongest.** It's the only one with quantified user-flow comparison (21:47 scenario, 1 tap vs 2 taps + cognitive friction), challenges the unstated premises (why 4 slots? what evidence?), and exposes the offline-first contradiction in B-mod's "smart HOME" that A, B, D ignore. It defends the *actual* current user against speculation about a future one.
2. **Response B has the biggest blind spot.** It designs for an imagined "copilot" operario with stable connectivity and rich context — wet gloves and 21:00 fatigue never appear. The "silo 80 al 92%, próximo camión 15:20" HOME assumes real-time aggregation that conflicts with offline-first and depends on data quality from the very registration flow B is making slower. It's SaaS dashboard thinking dressed up as industrial design.
3. **All five missed glove/wet-finger tap target geometry and error recovery.** None mention minimum touch target size, mis-tap cost, or what happens when the operario taps the wrong tab mid-registration and loses partial input. Also missed: who installs and updates the PWA on plant phones, and whether the bottom nav even survives Android's gesture bar on the actual devices in use. Architecture debate without device/hand reality.

---

## Chairman synthesis

### Where the Council Agrees

1. **STOCK al primer nivel a ≤1 tap es no-negociable.** Universal entre los 5.
2. **B-mod tal como está propuesto NO es la respuesta correcta.** 4 de 5 advisors la atacan por razones distintas (offline-first, labels opacas, costo de implementación, premisa equivocada). Solo el Expansionist la defiende — y los 5 reviewers identifican a esa defensa como el blind spot más grande del council.
3. **Las etiquetas HOME / OPER / MÁS fallan el test de recognition.** El Outsider las desmonta con un test concreto: "anotá que llegó un camión" no apunta a ningún tab visible. El Expansionist no responde a esto. Nadie defiende los nombres.
4. **La intuición de frecuencia del jefe no es base suficiente para fijar arquitectura.** Contrarian y First Principles lo señalan; reviewers lo refuerzan. Se necesita evidencia de planta antes de decidir slots.
5. **Cualquier cosa que se haga, va bajo el feature flag `uxV2`.** Executor lo concreta; Expansionist y Contrarian implícitamente lo aceptan.

### Where the Council Clashes

- **¿Hay que hacer este rediseño ahora?**
  - *Expansionist*: sí, B-mod es inversión en techo.
  - *Executor*: sí, pero como C3 puro primero (paridad funcional), B-mod después en 3 PRs.
  - *Contrarian*: no — el operario futuro no existe; estamos degradando al usuario real por especulación.
  - *First Principles*: no, la pregunta misma está mal; el operario no necesita navegación sino una pantalla event-driven.
  - *Outsider*: sí pero con verbos planos, sin HOME, sin OPER.
- **¿HOME tiene lugar en la arquitectura?**
  - *Expansionist*: sí, es el slot para copilot, alertas, KPIs.
  - *Contrarian, Outsider, First Principles*: no, es ceremonia / ruido / SaaS-thinking.
  - *Executor*: solo como destino futuro de un staged rollout, no como prioridad.
  - **4 de 5 contra HOME tal como B-mod lo plantea.**
- **¿Hub OPER vs tabs planos?**
  - *Expansionist*: hub como contexto inteligente.
  - *Executor*: hub agrega ~500 líneas, navegación anidada, riesgo de back-button.
  - *Contrarian*: hub duplica costo cognitivo + falla offline.
  - *Outsider*: "hub con cards" es jerga de diseñador, no operativa.
  - *First Principles*: ambas modalidades son la respuesta equivocada.
  - **4 de 5 contra el hub OPER.**

### Blind Spots the Council Caught (Emergidos en Peer Review)

Los peer reviewers identificaron consistentemente cinco huecos que ningún advisor individual cubrió completo:

1. **Back-button Android + navegación anidada.** B-mod (con hub OPER) requiere `history.pushState` y manejo de back hardware/gesture. El Executor lo menciona tangencialmente; el resto lo ignora. En PWA con guantes, un back accidental rompe el contexto justo cuando el operario está confirmando un registro — el "loop de confirmación" que el First Principles identificó.
2. **No hay telemetría de planta antes de decidir.** Ningún advisor pidió instrumentar la app actual durante 1 semana para ver qué tabs se usan, cuándo, cuánto tarda cada flujo. El Contrarian rechazó la intuición del jefe pero no exigió evidencia; la pidieron los reviewers.
3. **Geometría de tap con guante mojado no cuantificada.** 4 tabs a ~95px ¿efectivamente reduce mis-taps vs 6 a ~63px? Nadie midió. PR1 endureció a 64px pero sigue habiendo gap.
4. **Mis-tap mid-registration.** Si el operario está en medio de cargar un ingreso (form con 13+ campos) y toca tab equivocada por error o por reflejo, ¿qué pasa con los datos parciales? Ningún advisor pensó en este caso de error, y es el único punto donde B-mod, C1, C2, C3 fallan de la misma manera.
5. **Migración de muscle memory del supervisor/jefe actual.** Los usuarios que hoy tienen el modelo "6 tabs planos" interiorizado van a sufrir el cambio. Nadie consideró el costo del *transition period* aunque sea el más concreto e inmediato.

### The Recommendation

**El council NO valida B-mod. Lo rechaza, y el reemplazo que emerge por consenso es una variante distinta:**

> **`INGRESOS / STOCK / MOVIMIENTOS / MENÚ`** (4 tabs planos, verbos concretos, sin HOME, sin hub OPER)
> - `MENÚ` (no "MÁS") contiene: CIP, Carga, Fortificados, Producción, Supervisor/Control, Cambiar día, Cerrar sesión.
> - Para supervisor/jefe: `MENÚ` se reemplaza por `CONTROL` con sus atajos, manteniendo el mismo slot.

**Justificación:**
- Cumple el único punto universal del council: STOCK a ≤1 tap, primer nivel.
- Resuelve el problema de labels que el Outsider expuso: 4 verbos del trabajo real.
- Elimina los dos puntos atacados por 4/5 advisors: HOME ceremonia + hub OPER frágil.
- Implementable en ~80 líneas bajo flag (Executor lo dimensionó), reversible, sin navegación anidada → sin riesgo de back-button.
- Mantiene paridad funcional con el estado actual de 6 tabs — ninguna sección se pierde.
- No depende del operario futuro hipotético: funciona para el supervisor/jefe que la usa mañana a las 7am (lo que el Contrarian defendió).

**Lo que esta recomendación NO resuelve y queda como deuda explícita:**
- La crítica del First Principles (event-driven > nav-driven) queda viva. La respuesta del council a esa crítica es: "si en 12 meses la app evoluciona a event-driven, esta nav plana es más fácil de reemplazar que un hub con dos niveles". No es respuesta definitiva, es punto de salida.
- La pregunta "¿por qué exactamente 4 slots?" del Contrarian sigue sin evidencia. La defensa actual es ergonomía táctil (4 × 95px en 380px de ancho). Hay que medir.

### The One Thing to Do First

**Antes de tocar la nav: instrumentar la app actual durante 1 semana de operación real** y registrar, por dispositivo + perfil:

- Cuántos taps por turno recibe cada tab actual (Ingresos, CIP, Carga, Fortificados, Movimientos, Stock, Producción, Supervisor).
- Cuándo (qué hora del turno).
- Cuántas veces el operario abre una sección, retrocede sin hacer nada, y abre otra (proxy de "tab equivocado").
- Cuántas veces ocurre un error de validación seguido de salida de la sección (proxy de "form abandonado por confusión").

Una tabla en Supabase tipo `yatasto:telemetry:YYYY-MM-DD` con `{ tab, ts, perfil, accion }` agregada vía `db.set`. Sin tocar nav, sin tocar lógica. ~50 líneas.

Después de esa semana, decidir entre `INGRESOS / STOCK / MOVIMIENTOS / MENÚ` y cualquier otra variante con datos reales, no intuición. Si los datos validan la jerarquía, se implementa bajo flag. Si los datos contradicen la jerarquía (ej. CIP es más frecuente que Movimientos), se ajusta.

**No empezar el rediseño sin esos datos. El council es claro: estamos optimizando sin evidencia.**
