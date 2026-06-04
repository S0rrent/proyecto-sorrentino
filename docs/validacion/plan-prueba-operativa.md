# Plan de prueba operativa real — ReciboApp / Yatasto

**Qué es:** un plan para probar la app **3 a 7 días en uso real de planta** y ver qué pasa cuando la usa gente cansada, apurada y con poca experiencia digital. No es QA técnico ni testing de oficina: es **mirar a la persona trabajando**, no solo al dato.

**Qué buscamos:** fricciones · errores humanos · pasos confusos · cosas que nadie entiende · cosas que nadie usa · y **riesgos operativos que todavía no vimos**.

**Estado de la app:** `main`, sin los guardrails de Tanda A. **La app no atrapa la mayoría de los errores** → por eso miramos a la persona y preguntamos, no nos confiamos de que "no saltó ningún error".

> Regla madre: si algo **anda** pero la persona **duda, transpira, pregunta o inventa un truco** → es un hallazgo. El objetivo no es que la app no falle; es ver dónde la persona se traba o se equivoca sin darse cuenta.

---

## 1. Protocolo simple de prueba en planta

- **Duración:** 3 a 7 días corridos. Tienen que entrar los **3 turnos** (mañana / tarde / **noche**) y algún día pico.
- **Quiénes:** los operarios y supervisores **reales**, no "testers". Que trabajen como cualquier día.
- **Observador:** un referente por turno que **no opera** — mira y anota. Solo frena si está por corromperse un dato productivo de verdad (y ahí lo anota como incidente).
- **Reglas del observador:**
  - Dejar trabajar normal. El primer día, como mucho, se entrega la **tarjeta operativa** del rol (nada de tutorial largo).
  - **No corregir en el momento** (salvo daño real). Anotar y seguir.
  - Cubrir a propósito el **turno noche** (por el bug de fecha que rota a las 21:00) y los ratos de **mala señal**.
  - Anotar el incidente **apenas pasa** (papel o el formato de §4). No confiar en la memoria al final del turno.
  - **5 minutos al cierre de cada turno** con quien operó: *"¿Qué te trabó hoy? ¿Qué no entendiste? ¿Qué no usaste nunca?"*
- **Mínimo si no hay observador dedicado:** el supervisor del turno anota incidentes en la planilla corta y le saca foto al grupo de WhatsApp.
- **Cosas a capturar transversales (no por persona):**
  - Tiempo aprox. de un ingreso de camión (¿se acerca a los 30 seg o tarda mucho más?).
  - Cuántas veces alguien preguntó lo mismo.
  - Cuántas veces la app **dejó pasar un error sin avisar**.
  - Qué **pantallas no abrió nadie** en todos los días.

---

## 2. Checklist de observación (qué mirar mientras trabajan)

**Al abrir / identificarse**
- [ ] ¿Se identifica como responsable o saltea el aviso?
- [ ] ¿El nombre que figura es el de quien realmente está operando?
- [ ] ¿Mira la **fecha de arriba**? (sobre todo de noche)

**Ingresos**
- [ ] ¿Encuentra **Litros** rápido o scrollea perdido entre los campos de calidad?
- [ ] ¿Carga el número en **Fábrica** o lo mete en Tambo?
- [ ] Densidad/pH: ¿mira el número que quedó (28 → 1.028) o ni se entera?
- [ ] Si salta **aguado**: ¿qué hace? ¿sabe que al forzar no queda registrado?

**Movimientos**
- [ ] ¿Duda en **Desde / Hasta**? ¿invierte y se da cuenta o no?
- [ ] ¿Mira la card "Total descontado del origen"?

**Carga**
- [ ] ¿Elige **BIN** alguna vez? ¿se da cuenta de que no descontó nada?
- [ ] ¿Escribe el **destino** distinto cada vez para el mismo cliente?

**Fortificados**
- [ ] ¿Duda con la **unidad** (kg/g)?
- [ ] ¿Qué hace con las **3 filas** que no puede borrar? (¿pone 0? ¿inventa?)

**CIP**
- [ ] ¿Deja el **punto verde** con campos de lavado vacíos?
- [ ] Con señal mala: ¿pierde lo que tipeó y no lo nota?

**Stock**
- [ ] ¿Confirma el **turno** antes de cargar?
- [ ] ¿El auto-relleno le pisa el producto y lo nota?

**Supervisor / Jefe**
- [ ] ¿Espera **"Sincronizado"** antes de cerrar?
- [ ] ¿Se **corren inconsistencias** antes de cerrar? (solo lo puede el jefe)
- [ ] ¿Se **verifica el backup** (total_registros) o se confía de una?

**Transversal (al final de los días)**
- [ ] ¿Qué pantalla **no abrió nadie**? (¿sobra?)
- [ ] ¿Qué función **nadie usó**?
- [ ] ¿Dónde se **repiten las preguntas**? (eso no es la persona, es la app)

---

## 3. Red flags (parar y anotar)

- 🚩 Toca un botón **2–3 veces "porque no pasa nada"** (no-op silencioso o banner que no vio).
- 🚩 Pregunta **"¿se guardó?"** o no sabe si quedó.
- 🚩 Carga algo y **al rato el dato volvió o desapareció** (cola / sync).
- 🚩 **Dos personas distintas** se confunden con lo mismo → es la app, no la persona.
- 🚩 Un silo queda **en negativo, al 100% raro, o con litros que nadie explica**.
- 🚩 Alguien **fuerza un aguado o un CIP** y nadie sabe que quedó sin registro.
- 🚩 **Cierran el día** sin esperar "Sincronizado" o sin mirar nada.
- 🚩 De **noche**, registros que aparecen en la **fecha de mañana**.
- 🚩 Alguien arma su **propio truco** o anota en un **papel paralelo** → la app no le sirve ahí.
- 🚩 Una pantalla **no la abre nadie** en todos los días → sobra o está escondida.

---

## 4. Formato corto de registro de incidentes

**1 incidente = 1 línea.** Para papel, planilla o WhatsApp. Lo importante: anotarlo **en el momento**.

```
Fecha/hora · Turno · Quién (iniciales/rol) · Pantalla
Qué pasó (1 frase):
¿La app avisó?  Sí / No
¿Se corrompió un dato?  Sí / No / No sé
¿Pudo seguir?  Solo / Con ayuda / No pudo
Gravedad:  🔴 corrompe datos o inocuidad   🟡 traba o confunde   🟢 molestia menor
```

**Versión WhatsApp (una línea):**
> 🔴 23/06 14:10 · Tarde · CR/operario · Movimientos · invirtió Desde/Hasta, la app NO avisó, descontó del silo equivocado · siguió solo.

> 🟡 23/06 21:15 · Noche · LG/superv · Shell · cargó el ingreso y quedó en la fecha de mañana, no vio el aviso · con ayuda.

Cada incidente, si se puede, anotá el **ID de riesgo** que le corresponde (TH2, T2, H1…) mirando `docs/riesgos/registro-hazards.md`. **Si NO está en el registro → es un riesgo nuevo, márcalo aparte: eso es lo más valioso del test.**

---

## 5. Cómo priorizar qué corregir primero

Ordená cada hallazgo por **dos preguntas**, nada más:

1. **¿Se corrompe algo sin que nadie se entere?** (silencioso)
2. **¿Pasa seguido?** (frecuente)

| | Pasa seguido | Pasa poco |
|---|---|---|
| **🔴 Corrompe datos / inocuidad (silencioso)** | **ARREGLAR PRIMERO** | Tener en el radar |
| **🟡 Traba o confunde** | Arreglar después | Más adelante |
| **🟢 Molestia menor** | Pulir si sobra tiempo | Ignorar por ahora |

- **Regla de oro:** un error **silencioso** (la app no avisa y se corrompe un dato) es **más urgente** que uno ruidoso, aunque parezca chico. Lo ruidoso al menos se ve.
- **Conectar con lo que ya sabemos:** la mayoría de los hallazgos van a caer en los IDs del registro de riesgos y en los **gaps P0 de `docs/operacion/task-matrix-roles.md`**. Eso confirma qué guardrail conviene mergear primero.
- **Lo nuevo es oro:** si un hallazgo **no** está en el registro de riesgos, es un riesgo que no habíamos visto → va arriba de la lista para analizar.
- **Salida del test:** una **lista corta ordenada (top 5–10)** de "qué corregir antes de los manuales": qué guardrail mergear, qué pantalla rediseñar, qué paso simplificar.

---

## Qué hacemos después

1. Juntar todos los incidentes y agruparlos por pantalla y por ID de riesgo.
2. Sacar la lista top 5–10 con la matriz de arriba.
3. Recién ahí: decidir qué guardrails de Tanda A/B mergear y qué simplificar, y **después** escribir el manual formal / SOP / onboarding sobre una app ya ajustada.

**Material de apoyo durante el test:**
- Tarjetas por rol para tener a mano: `docs/capacitacion/tarjeta-*.{md,html,pdf}`
- Escenarios guionados (si se quiere probar algo puntual a propósito): `docs/validacion/checklist-validacion-operativa.md`
- Roles, permisos y guardrails reales: `docs/operacion/task-matrix-roles.md`
