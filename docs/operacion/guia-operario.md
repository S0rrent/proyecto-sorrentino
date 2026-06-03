# Guia del operario - operar sin errores

Estado: guia practica
Fecha: 2026-06-02
Para: operarios de planta. Lenguaje simple, directo.

Esta guia dice que revisar antes de guardar en cada pantalla, para no cargar datos mal. No
explica el sistema por dentro (eso esta en los otros documentos). Mientras no esten los
guardrails de ../riesgos/guardrails-roadmap.md, estos chequeos los hace la persona.

---

## Antes de empezar (siempre)

- Mira la fecha arriba: tiene que decir HOY. Si dice otra fecha, estas en modo historico y lo
  que cargues va a otro dia. (Ojo: de noche, despues de las 21, la app puede mostrar la fecha
  de manana por un problema conocido. Verifica.)
- Asegurate de estar identificado: tu nombre tiene que figurar como responsable del turno. Si
  no, cargalo.

---

## Ingresos

- Carga primero los LITROS y revisalos: que no sobre un cero (1200 no es 120) y que no sea 0.
- El campo obligatorio es Litros Fabrica. No cargues el numero principal en el de Tambo.
- Densidad y pH: la app los reinterpreta sola al salir del campo (28 puede quedar 1.028).
  Mira el valor final antes de seguir.
- Si salta aviso de aguado y lo forzas: avisale al supervisor en persona. Hoy ese forzado no
  queda registrado solo.

## Movimientos (de silo a silo)

- DESDE es de donde sale la leche. HASTA es a donde entra. No los inviertas.
- No pongas el mismo silo en Desde y en Hasta.
- Revisa que los litros sean mayores a 0. Un signo menos o un 0 corrompe el stock.
- Si avisa saldo insuficiente, fijate: el descuento real puede incluir la perdida, asi que es
  mas de lo que dice el numero principal.

## Carga (despacho)

- Elegi el silo real de donde sale la leche. No elijas BIN: ese silo no descuenta stock (el
  sistema cree que la leche sigue en planta).
- Revisa los litros.
- El destino se escribe a mano: usa siempre el mismo nombre para el mismo cliente.

## Fortificados

- Revisa la UNIDAD (kg, g, mL...). Una unidad equivocada infla el silo con miles de litros
  que no existen.
- Las tres filas que vienen cargadas (Lactosa, Variolac, Agua) que no uses: por ahora no se
  pueden borrar. No las completes con datos inventados; avisa al supervisor.

## CIP (limpieza)

- Carga TODOS los parametros (alcalino, enjuague, acido, temperatura, hora), no solo tu
  nombre. El punto verde NO garantiza que el registro este completo.
- Con senal mala, despues de cargar fijate que el dato quedo (puede revertirse sin avisar).
- CIP es registro de inocuidad: no lo dejes a medias.

## Stock

- Confirma que turno estas editando (Manana, Tarde o Noche) antes de cargar.
- No edites un dia cerrado ni un dia historico.
- Si un silo aparece lleno o raro, avisa: puede estar sobrellenado.

---

## Cosas que pasan y que conviene saber

- Si la app se actualiza o cambias el tema, se recarga y perdes lo que estabas cargando sin
  guardar. Guarda seguido y no toques el aviso de "Actualizar" en medio de una carga.
- Los botones son chicos: toca con cuidado, sobre todo con la mano humeda o con guante.
- Si tocas "Eliminar" y no pasa nada, es porque tu perfil no tiene permiso. No insistas;
  pedile al supervisor.

---

## Si algo salio mal

- No borres ni cargues "para arreglar" sin avisar. Decile al supervisor que revise
  inconsistencias (el tiene una herramienta para eso) antes de cerrar el dia.
