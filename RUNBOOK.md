# Runbook operativo — Lácteos Yatasto · Recibo

Este documento es para el **jefe de planta** y supervisores que necesitan
operar la app día a día sin tener que pedirle al desarrollador. Está
escrito en castellano operativo, no técnico.

## 1. Quién puede hacer qué

| Acción | Operario | Supervisor | Jefe |
|---|:---:|:---:|:---:|
| Cargar ingresos / movimientos / carga / fortificados | ✓ | ✓ | ✓ |
| Registrar limpiezas CIP | ✓ | ✓ | ✓ |
| Editar registros del día | ✓ | ✓ | ✓ |
| Eliminar registros del día | ✗ | ✓ | ✓ |
| Editar stock manualmente | ✗ | ✓ | ✓ |
| Envasar / finalizar lote de producción | ✗ | ✓ | ✓ |
| Eliminar lote **finalizado** | ✗ | ✓ con PIN jefe | ✓ |
| Cerrar el día | ✗ | ✓ | ✓ |
| Reabrir día cerrado del mismo día o ayer | ✗ | ✗ | ✓ |
| Reabrir día cerrado de **más de 7 días** | ✗ | ✗ | ✓ con PIN extra |
| Eliminar ingreso de día **ya cerrado** | ✗ | ✓ con PIN jefe | ✓ con PIN |
| Modificar saldo base inicial | ✗ | ✓ | ✓ |
| Ver dashboard / KPIs | ✗ | ✓ | ✓ |
| Gestionar operarios (crear/editar/PIN) | ✗ | ✗ | ✓ |
| Exportar datos | ✗ | ✓ | ✓ |

> Cuando una celda dice "con PIN", la acción se ejecuta pero un supervisor
> o jefe debe ingresar su PIN para autorizar en vivo. La autoría queda
> registrada con ambos nombres: *quien la pidió* + *quien la autorizó*.

## 2. Crear y administrar operarios (solo jefe)

1. Iniciá sesión como **jefe** con tu usuario y contraseña.
2. Tocá el icono de perfil arriba a la derecha (la vaca).
3. En el modal, tocá **Gestionar operarios**.
4. En la pantalla de operarios:
   - **+ Nuevo operario**: nombre, color del chip, rol, PIN (4 dígitos).
   - **Editar**: cambiar nombre, color o rol. No cambia el PIN.
   - **PIN**: cambiar PIN (pide repetirlo para confirmar).
   - **Pausar**: desactiva el operario sin borrarlo. Sus registros
     históricos quedan intactos.
   - **Activar**: lo vuelve a habilitar.

**Tips:**
- Los nombres se muestran como chips con las iniciales. Carlos R. → CR.
- Usá colores distintos para que cada operario distinga su chip de un
  vistazo (a contraluz con poca luz). Reservá rojos para roles con
  más responsabilidad si querés un mnemónico visual.
- Si un operario olvidó su PIN, abrí su ficha → tocá PIN → poné uno
  nuevo. No se puede "ver" el PIN viejo — solo reemplazarlo.

## 3. Cómo se loguea un operario en planta

Cuando un dispositivo ya tiene una sesión base de supervisor/jefe activa:

1. El operario abre la app.
2. Aparece automáticamente la pantalla con los chips de operarios activos.
3. El operario tap su chip → ingresa su PIN de 4 dígitos.
4. Si el PIN es correcto, la app muestra su nombre arriba a la derecha.
5. Todos los registros que cree quedan estampados con su identidad.

### Si falla 3 veces seguidas
El chip se bloquea **60 segundos**. Mensaje: "Pedile al supervisor". El
contador es por chip, no global — otros operarios pueden seguir logueando.

### Inactividad
- A los **5 minutos** sin tocar: avisa "Sesión por inactividad — tocá para
  continuar". El operario sigue logueado.
- A los **10 minutos**: vuelve automáticamente al selector de chips. La
  sesión base (supervisor/jefe) sigue activa. El operario tiene que
  re-ingresar su PIN para volver a operar.

### Cambio de turno
En las ventanas **06:30–07:30**, **13:30–14:30** y **20:30–21:30** aparece
un banner naranja: "¿Cambio de turno?". El operario saliente puede
cerrar su sesión y el entrante elegir su chip.

## 4. Cerrar y reabrir el día

### Cerrar (supervisor o jefe)
- Botón "candado" arriba a la derecha junto al perfil.
- Confirma — la app marca el día como cerrado y bloquea nuevas ediciones.
- Si hay cambios pendientes en la cola offline, la app pide confirmación
  antes de cerrar.

### Reabrir (solo jefe)
- Mismo botón "candado", ahora rojo.
- Si el día tiene **más de 7 días**, la app pide **PIN extra** de otro
  supervisor o jefe. Esto evita reaperturas accidentales sobre saldos
  viejos.

### Eliminar un ingreso de día cerrado (excepción)
- Sólo supervisor o jefe.
- Después de confirmar, se pide PIN de un supervisor/jefe distinto.
- El audit registra al ejecutor + al autorizante.

## 5. Cuando la app dice algo raro

### Banner amarillo: "X cambios pendientes — sin conexión"
La app no puede llegar a Supabase pero igual está guardando todo en una
cola. Cuando vuelva la red, se sincroniza solo. No cierres la app si
podés evitarlo: la cola sobrevive al refresh pero se pierde si limpias
caché del navegador.

### Banner naranja: "Sesión expirada — los cambios están en espera"
La sesión de Supabase se venció. Tocá "Iniciar sesión" e ingresá tu
contraseña de nuevo. Los cambios pendientes se sincronizan después del
login.

### Banner rojo: "X registros rechazados por el servidor"
Algo en los datos guardados no pasó la validación del servidor (campo
inválido, número fuera de rango, etc.). Tocá **Ver detalle** para ver:
- La key del registro (qué sección y qué día).
- El mensaje de error del servidor.
- El payload que se intentó guardar.

Lo común es algún número raro (NaN, valor fuera de rango). Borrá el
registro problemático manualmente y rehacelo. Después tocá **Marcar
como visto** para limpiar el banner.

### Banner rojo: "Otro dispositivo editó esta sección"
Dos personas trabajaron sobre el mismo registro a la vez. La que guardó
después gana. La que ve este banner perdió su edición. Tocá **Recargar**
para ver los datos actualizados y reaplicar lo necesario.

### Toast amarillo: "Sin conexión — el cambio quedó en cola"
La operación se encoló. Va a sincronizar cuando vuelva la red. No
necesitás hacer nada.

### Toast rojo: "X registros fueron rechazados por el servidor"
Igual que el banner rojo de arriba. Tocá el banner persistente para
investigar el detalle.

## 6. Cosas que NO se deben hacer

- **No abrir DevTools / consola del navegador** y manipular localStorage.
  Podés corromper la cola de escritura o la lista de operarios.
- **No limpiar caché del navegador** mientras hay cambios pendientes —
  perdés las escrituras encoladas.
- **No reusar PINs** entre operarios. Si bien la app no lo impide, el
  audit pierde sentido.
- **No compartir contraseñas de supervisor/jefe** — el operario debe
  tener su propio PIN, no la contraseña global.
- **No reabrir días viejos sin necesidad** — cada reapertura puede
  requerir reconstruir la cadena de saldos hacia atrás.

## 7. Antes de poner la app en producción

- [ ] Crear todos los operarios reales en la pantalla de gestión.
- [ ] Asignar PIN a cada uno (decirles en persona, no por chat).
- [ ] Probar el login con un dispositivo real en planta.
- [ ] Verificar que el chip y el nombre aparecen al loguear.
- [ ] Hacer un ingreso de prueba y confirmar que dice el nombre correcto
      en la card.
- [ ] Probar la inactividad de 10 min para confirmar que el chip vuelve
      al selector.
- [ ] Probar la red caída: desconectá Wi-Fi, hacé un ingreso, reconectá
      y verificá que se sincroniza.
- [ ] Asegurarse de que el respaldo automático de Supabase (PITR) está
      activado.
- [ ] **Supabase → Authentication → Sign In / Up: deshabilitar el registro
      público (self-signup)**. Si queda habilitado, cualquiera con la anon
      key (que es pública, viaja en el bundle) puede crearse una cuenta y
      obtener acceso total a los datos.
- [ ] **Rol de cada usuario en `app_metadata`** (no en `user_metadata`):
      la app lee `app_metadata.rol` porque `user_metadata` puede editarla
      el propio usuario desde el cliente. Se setea desde el dashboard
      (Authentication → Users → editar usuario → `app_metadata`:
      `{"rol": "supervisor"}`) o por SQL con service role:
      `UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"rol":"jefe"}'::jsonb WHERE email = 'jefe@yatasto.internal';`
      Mientras no esté seteado, la app cae al fallback por email interno
      (funciona igual para las 3 cuentas actuales).

## 8. Dónde mirar si algo no calza

| Síntoma | Dónde investigar |
|---|---|
| Operario no aparece en el selector | Pantalla *Gestionar operarios* — ¿está activo? ¿tiene PIN? |
| El nombre del operario no aparece en la card | Probablemente el registro se creó antes de la integración. Los nuevos vienen estampados. |
| El saldo de silos parece roto | Verificá la fecha del saldo base en *Saldo Inicial* y reconstruí la cadena si es necesario. |
| La cola no se vacía | Mirá el ícono de conexión arriba — si está rojo, no hay red. Si está verde, mirá descartes (banner rojo). |
| Descartes 4xx repetitivos | Probablemente un payload corrupto. Borrá la entrada problemática del banner *Ver detalle*. |
| Conflicto entre dispositivos seguido | Coordiná turnos: no dos personas editando la misma sección al mismo tiempo. |

## 9. Telemetría

La app registra eventos de uso para decidir mejoras de UX (taps por
sección, saves ok/encolados/fallidos, errores de JS). Desde la Tanda 1
(julio 2026) **está activada por defecto**: los datos alimentan la
decisión de la nav nueva (council 2026-05-23 pidió 1 semana de datos
reales) y las métricas de éxito de UX-V2. No hay IDs de usuario ni de
dispositivo; los eventos se guardan bajo `yatasto:telemetry:FECHA` con
retención de 14 días y tope de 500 eventos/día.

Para desactivarla en un dispositivo (opt-out):
1. Abrí DevTools (F12).
2. En la consola, escribí:
   `localStorage.setItem("yatasto:telemetry", "false")`
3. Recargá la página.

Para descargar los eventos del día:
1. En la consola, escribí:
   `await window.__yatastoTelemetry.dump()`
2. Se muestra un array con todos los eventos.

Útil para decidir si una nueva nav (4 tabs vs 6) tiene sentido, o si los
operarios están abandonando formularios a mitad.
