# Riesgos para el operario real (narrativa por pantalla)

Estado: evaluacion read-only
Fecha: 2026-06-02
Alcance: donde un operario real (cansado, apurado, poca experiencia digital) se confunde o
corrompe datos sin darse cuenta. Vista por pantalla.

Este documento complementa ../riesgos/registro-hazards.md: el registro lista cada riesgo con
su ID; aca se cuenta, por pantalla, como se llega al error en la operacion real. Los IDs
entre parentesis remiten al registro.

Escenario de operario asumido (conservador):
- manos humedas, cansancio, iluminacion variable, presion operativa, uso rapido y uso
  ocasional con guantes o dedos poco precisos.

Las pantallas estan ordenadas de mayor a menor riesgo de inducir error humano.

---

## CIP (limpieza) - riesgo ALTO

Peor caso: el operario abre un silo, escribe solo su apellido en Responsable y cierra la
fila. Queda con punto verde igual a una CIP verificada, sin alcalino, enjuague, acido ni
temperatura. El supervisor ve la lista mayormente en verde y da la limpieza por hecha. Queda
un registro de inocuidad falso-positivo; y si era un dia cerrado, se reescribio sobre una
jornada ya auditada sin senal.

Patrones que inducen error:
- Punto verde atado a hora O responsable, no a la completitud real (H1).
- Guardado por tecla mas refresco cada 10s que pisa lo que se escribe; reversion silenciosa
  si el guardado falla (TH5).
- Bloqueo de dia cerrado / solo-lectura desconectado en CIP (TH4).
- Alta de camion sin deteccion de duplicados, parte la CIP en dos filas (H11).

---

## Movimientos (silo a silo) - riesgo ALTO

Peor caso: el operario quiere mover de un silo a otro, pero apurado y con luz pobre invierte
los desplegables Desde y Hasta. El sistema descuenta del silo que debia recibir. Trasvase
invertido, dos silos corruptos, que nadie nota hasta el conteo fisico.

Patrones que inducen error:
- Desde y Hasta son desplegables identicos, misma lista, sin asimetria visual (TH2).
- No se valida origen distinto de destino (TH2).
- Litros y perdida aceptan 0 y negativos; el chequeo de saldo se evade con litros menores o
  iguales a cero (TH1).
- El aviso de saldo insuficiente muestra una cifra menor al descuento real (litros sin la
  perdida) (TH9).
- Confirmacion destructiva con el foco puesto en el boton de accion (H3).

---

## Carga (despacho) - riesgo ALTO

Peor caso: el operario elige BIN como silo proveniente (esta mezclado en la lista con los
silos reales). BIN no esta contabilizado en stock: el despacho se guarda, no salta saldo
insuficiente y el stock de ningun silo baja. La planta cree que sigue teniendo leche que ya
salio.

Patrones que inducen error:
- El desplegable ofrece BIN como origen, que el motor no contabiliza, sin distinguirlo (TH3).
- A diferencia de Movimientos, Carga no muestra el disponible del silo origen.
- Editar una carga y cambiar el silo produce un falso OK y descuadra dos silos (TH3).
- Litros sin validacion numerica (TH1).
- Destino de texto libre: el mismo cliente queda escrito de varias formas (H11).

---

## Ingresos (la pantalla mas usada) - riesgo ALTO

Peor caso: el operario apurado tipea litros con un cero de mas, o en el campo gemelo
equivocado. Guardar lo acepta porque el campo no esta vacio; el numero erroneo entra al stock
y al saldo. Si ademas habia aguado y forzo el guardado, no queda registro de quien lo
autorizo.

Patrones que inducen error:
- Validacion que solo chequea no-vacio, nunca rango ni tipo (TH1).
- Dos campos de litros (Fabrica y Tambo) identicos, solo uno obligatorio.
- El campo Litros queda sepultado entre 20+ campos de calidad (H2).
- Densidad y pH se reinterpretan solos al salir del campo, sin confirmar (H5).
- Forzar un ingreso con aguado no queda auditado (TH10).
- Boton Eliminar visible para perfiles sin permiso (no-op silencioso) (H8).

---

## Fortificados - riesgo ALTO

Peor caso: con luz pobre el operario quiere cargar gramos pero el dedo cae en kilos: la
cantidad se suma como litros 1 a 1 al silo destino. El silo aparece con litros de mas que
nadie sabe de donde salieron. Y como no puede borrar las adiciones que no usa, las completa
con 0 dejando datos basura.

Patrones que inducen error:
- Tres adiciones precargadas que no se pueden borrar y exigen cantidad (H13).
- Selector de unidad chico y ambiguo (kg, g, mg, L, mL, cc); conversion masa a volumen 1 a 1
  oculta (TH8).
- Litros y cantidades aceptan negativos, 0 y notacion exponencial (TH1).
- Confirmacion de saldo negativo con el foco en el boton de aceptar (H3).

---

## Stock - riesgo ALTO

Peor caso: el selector de turno quedo en Manana por una sesion previa. El operario baja
varias pantallas y carga la grasa del turno Noche. Queda escrito en el turno equivocado, y a
los pocos segundos el sync le pisa el producto que habia puesto a mano, sin que la tarjeta
dijera que turno se estaba editando.

Patrones que inducen error:
- El auto-relleno pisa el producto cargado a mano cuando el saldo calcula cero (TH6).
- Se escribe contra el turno del estado, lejos del selector de turno, sin recordatorio (TH6).
- Silo sobrellenado se muestra al 100 por ciento sin alerta (H9).
- Targets chicos en una grilla densa de silos con nombres parecidos (H4).

---

## Shell y navegacion - riesgo ALTO

Peor caso: a las 21:10 el operario abre la app para cargar el ingreso del camion. La fecha ya
roto a "manana" por UTC; el unico aviso es una linea tenue. Apurado no la lee, carga los
litros y se va. Quedan en el dia equivocado y atribuidos al responsable del turno anterior.

Patrones que inducen error:
- Fecha en UTC: el dia rota a las 21:00 hora Argentina (T2).
- Modo historico poco evidente, aviso de bajo contraste (H7).
- Selector de fecha sin tope: se puede registrar en el futuro (TH7).
- Identidad ambigua en dispositivo compartido (H6).
- Banner de actualizacion llamativo que recarga y borra el borrador (H12).
- Bottom bar con muchos tabs chicos y labels abreviados (H4; ver UX-V2.md para el rediseno).

---

## UI transversal (atomos) - riesgo MEDIO

Peor caso: el operario toca Eliminar; el modal aparece con el boton rojo ya enfocado.
Presiona Enter (venia avanzando campos) o repite el toque por nervios, y el registro se borra
sin haber leido. Como es transversal, la misma mecanica borra en todas las pantallas.

Patrones que inducen error:
- Confirmacion peligrosa con foco por defecto en el boton de accion (H3).
- Banner de error fuera de la vista y sin foco; el operario no ve por que no guarda (H10).
- Reformateo decimal automatico y silencioso al perder foco (H5).
- Desplegables sin flecha, indistinguibles de un campo de texto (H10).
- Targets tactiles por debajo de 44 px en el build por defecto (H4).

---

## Como usar este documento

- Para planificar mejoras: ../riesgos/guardrails-roadmap.md (guardrails conservadores por
  riesgo).
- Para operar con cuidado mientras tanto: ../operacion/guia-operario.md.
- Para el detalle por riesgo con frecuencia, severidad e impacto: ../riesgos/registro-hazards.md.
