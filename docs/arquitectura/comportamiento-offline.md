# Comportamiento offline (ZONA PROTEGIDA)

Estado: documentacion del comportamiento actual
Fecha: 2026-06-02
Alcance: como funciona la persistencia con red intermitente (la planta tiene senal debil).

La cola offline (db-adapter.js) es zona protegida: no se toca salvo bug critico confirmado y
con pre-mortem. Riesgos relacionados: T1, T4, TH5 (ver ../riesgos/registro-hazards.md).

---

## Modelo general

- Toda la persistencia va a Supabase (tabla yatasto_storage) via db.get / db.set / db.list /
  db.remove.
- Cuando una escritura falla, se encola localmente y se reintenta. La cola sobrevive
  recargas (se guarda en localStorage, clave __yatasto_wq__).

---

## Escritura (db.set)

1. Si la sesion esta marcada como expirada, encola directo sin tocar la red.
2. Intenta el upsert. Si sale bien, devuelve el timestamp escrito.
3. Si falla con 401 (JWT expirado), intenta refrescar la sesion una sola vez y reintenta.
   Si el refresh falla, marca la sesion como expirada y avisa.
4. Si falla por otra causa (red), encola { key, value } y agenda el drenado.

Importante: db.set devuelve null tanto cuando encola como cuando falla. El llamador (save)
no distingue "encolado" de "fallo definitivo"; por eso borra la marca de ultima lectura y
desactiva la guarda de conflicto C5 (riesgo T4).

---

## Cola de reintentos (_flushQueue)

- Drena en orden FIFO.
- Backoff por item: esperas de 2s, 4s, 8s entre 4 intentos (3 esperas; el 4to intento no
  espera). El delay interno llega a 16s pero nunca se usa como espera.
- Errores 4xx permanentes (validacion, constraint, payload invalido): se descartan con log y
  se sigue, para no bloquear la cola indefinidamente. Excluye 401, 408 y 429, que si se
  reintentan.
- Si un item falla con 401, intenta refresh una vez y reintenta; si no, pausa la cola y marca
  sesion expirada.
- Si quedan items y no hay sesion expirada, reintenta el drenado cada 30 segundos.
- Suscripcion reactiva: onWriteQueueChange notifica la cantidad pendiente y si esta
  reintentando (alimenta el indicador de conexion en la UI).

---

## Sesion expirada

- _sessionExpired pausa todas las escrituras directas; se encolan.
- clearSessionExpired (tras relogin) reanuda el drenado.
- onSessionExpired permite a la UI mostrar el pedido de re-login.

---

## Guarda de concurrencia C5 (en recibo_yatasto.jsx, save)

- Antes de escribir, save() compara el timestamp de ultima lectura (_loadedAt) contra el
  remoto (db.getTimestamp). Si difieren, hay modificacion concurrente: aborta y avisa.
- Si hubo error de red al consultar el timestamp, continua con el save (no bloquea por red).

---

## Service worker (vite.config.js)

- registerType autoUpdate, skipWaiting, clientsClaim.
- Runtime caching de Supabase: NetworkFirst, timeout de red 10s, cache 24h.
- Fuentes de Google: CacheFirst, 1 ano.
- Navegacion: NetworkFirst con fallback a index.html.
- El service worker solo corre en el sitio compilado, no en npm run dev.

---

## Riesgos abiertos de esta capa

- T1 (critico): el camino de exito de db.set no elimina una entrada encolada previa de la
  misma clave. Si una clave tiene una escritura pendiente y el operario la reedita con red
  recuperada, el flush resucita el valor viejo y borra la ultima carga. Critico en claves
  compartidas (saldo-silos, stock del turno).
- T4: encolar borra la marca de ultima lectura y desactiva la guarda C5 para esa clave,
  habilitando sobreescritura cruzada entre dispositivos sin deteccion de conflicto.
- TH5: en CIP, el guardado por tecla mas el refresco de 10s pueden pisar o revertir lo que el
  operario esta escribiendo, sin aviso. Critico porque CIP es registro de inocuidad.

Mitigacion operativa hoy: el cierre del dia se bloquea si hay cola pendiente, para que el
saldo del cierre quede correcto. Esperar "Sincronizado" antes de cerrar.

---

## Antes de tocar esta zona

1. Leer este documento y los riesgos T1, T4, TH5.
2. Pre-mortem: que se pierde si el cambio falla (escrituras encoladas, conflictos no
   detectados).
3. Probar: red caida durante una carga, recuperacion de red con item en cola, edicion de la
   misma clave desde dos dispositivos, sesion expirada y relogin.
4. Verificar que la guarda C5 siga activa despues de cualquier cambio en la cola.
