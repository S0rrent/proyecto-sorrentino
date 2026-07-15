# Pre-mortem — Tanda 2: lecturas confiables

> Zona protegida: persistencia (`load`/`save`) + Service Worker. Este pre-mortem
> se escribió ANTES de tocar código, según la regla de `guardrails-roadmap.md`.

## El bug que se corrige (P0-2 de la auditoría 2026-07)

`load()` (recibo_yatasto.jsx:267-274) convierte cualquier fallo de red en el
default (`[]`/`{}`): la UI muestra "día vacío" siendo mentira, el repoll de 10s
pisa la lista visible, y como `_loadedAt` queda sin setear, el chequeo C5 de
conflicto se saltea — el próximo "Guardar" escribe la lista de 1 elemento y
**borra el día completo en el servidor**. Agravante: el SW cachea GETs de
Supabase 24h (NetworkFirst) y puede servir datos viejos como actuales.

## Estados definidos (contrato nuevo, lib/lecturas.js)

| Estado | Comportamiento |
|---|---|
| OK | datos parseados; clave marcada **confiable** para esta sesión |
| Fila inexistente | default; clave confiable (día nuevo legítimo) |
| Error temporal de red | `throw ErrorDeLectura("red")`; el caller conserva el último estado bueno |
| Datos corruptos | `throw ErrorDeLectura("corrupto")`; JAMÁS devolver default |
| Pendientes de sync | sin cambios: los maneja la cola offline (`__yatasto_wq__`) + banner existente |

Regla de guardado: `save()` se niega (return false) si la clave **nunca tuvo una
lectura confiable en esta sesión** — el mismo contrato `=== false` que ya usan
los callers para el guard de día cerrado, así los rollbacks existentes
(`setData(prev)`) funcionan sin tocarlos.

## Qué puede salir mal y cómo se mitiga

1. **Falso positivo del guard → el operario no puede guardar trabajo legítimo.**
   Mitigación: la clave se marca confiable también cuando la fila no existe
   (día nuevo); el polling de 10s reintenta la lectura automáticamente y
   desbloquea; toast explícito al bloquear (`_onSaveNoLeido`) para que el
   operario sepa POR QUÉ; telemetría `save_blocked_unread` para detectar
   falsos positivos en planta. Enumeración completa de los 16 call sites de
   `save()`: todos van precedidos por un load de la misma clave en el flujo.
2. **Cambiar `load()` rompe el motor de saldos** (prohibido tocarlo).
   Mitigación: `load()` legacy conserva EXACTAMENTE su firma y semántica
   (default ante fallo) delegando en `loadSeguro()`; el motor (:544-548, :835)
   y las lecturas de solo-display (dashboard/informes) no se tocan. Solo las
   secciones y los flujos load-modify-write migran a `loadSeguro`.
3. **Load-modify-write con default = pérdida de datos** (existente, se agrava
   si no se cubre): `syncAutoMovSobrante` (:3449) con red caída computa sobre
   `{movs:[]}` y al guardar borra los movimientos del día. Igual :3844
   (envasar) y :8939 (resp de turno). Mitigación: esos 3 sitios pasan a
   `loadSeguro` y ante fallo SALTEAN la escritura (con aviso), nunca escriben
   derivado de un default.
4. **Al cambiar de fecha con red caída, quedaría la lista de OTRA fecha en
   pantalla** (peor que vacío: datos de ayer bajo el header de hoy).
   Mitigación: cada sección trackea `loadedDateRef`; si la lectura falla y la
   fecha en pantalla no es la última cargada, se limpia la lista y el banner
   dice "no se pudieron cargar los datos de esta fecha" (sin estado fantasma).
5. **El repoll de CIP revierte lo que el operario está tipeando** (inputs
   inline, sin modal que frene el efecto). Mitigación: guard de foco — si hay
   un input de la sección CIP con foco, el resultado del repoll se descarta.
6. **SW pegajoso**: pasar Supabase a NetworkOnly no borra el cache
   `supabase-cache` ya existente en los dispositivos (cleanupOutdatedCaches
   solo limpia precache). Mitigación: `caches.delete("supabase-cache")`
   one-shot desde main.jsx.
7. **Regresión invisible en 9.900 líneas**: los cambios de sección son
   repetitivos y a mano. Mitigación: tests de integración sobre `load`/`save`
   reales (export `__test`), suite completa 346 + build + lint, y revisión
   adversarial del diff antes del push.

## Rollback

Revert del merge: `load()` vuelve a tragar errores (vuelve el bug, sin
migración de datos — no cambia ningún formato persistido). El cache del SW
eliminado no se restaura (inofensivo). `lib/lecturas.js` queda huérfano pero
inerte.

## Verificación manual post-deploy (DevTools → Network → Offline)

1. Abrir Ingresos con datos → offline → esperar tick de 10s → la lista NO se
   vacía; aparece banner "Sin conexión — mostrando la última información disponible".
2. Recargar la página en offline → banner "no se pudieron cargar los datos";
   Guardar un ingreso → toast de bloqueo, la lista remota NO cambia.
3. Volver online → al siguiente tick el banner desaparece y Guardar funciona.
4. Fecha nueva (día siguiente, fila inexistente) → lista vacía legítima, sin banner.
