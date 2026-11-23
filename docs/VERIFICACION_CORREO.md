# Verificación del correo al registrarse

> Fecha: 2026-11-23 · Rama: `feature/verificacion-correo` · Código: [`backend/verificacion.js`](../backend/verificacion.js),
> pantalla [`app/(auth)/verify-email.tsx`](../app/(auth)/verify-email.tsx) · Base de datos: [`abeja_net_v7_postgres.sql`](../abeja_net_v7_postgres.sql)

## El fallo que se corrigió

Antes, `/api/register` creaba la cuenta con cualquier correo y contraseña **sin comprobar que el correo fuera de quien lo
escribía**. Eso permitía un ataque de "cuenta plantada" (*pre-account takeover*):

1. Un atacante registra el correo de la víctima (`victima@gmail.com`) con **su** contraseña.
2. La víctima, sin saberlo, entra más tarde con el botón **Continuar con Google**. El servidor busca el correo, encuentra la
   cuenta del atacante y la mete en ella.
3. El atacante sigue conociendo la contraseña: puede entrar a la cuenta, ver sus apiarios y recibir sus alertas push.

Había una segunda variante: si la víctima se registraba por su cuenta antes de verificar, el atacante podía volver a
registrar el mismo correo y cambiar la contraseña que quedaba guardada.

## Cómo funciona ahora

| Paso | Qué pasa |
|---|---|
| **Registro** (`POST /api/register`) | Crea una cuenta **pendiente** (`correo_verificado = false`) **sin contraseña** y manda un código de 6 dígitos al correo. La contraseña que llega se valida (formato y largo) pero **no se guarda**. |
| **Confirmar** (`POST /api/verify-email`) | Recibe correo + código + contraseña. Si el código es correcto, **en ese momento** se guarda la contraseña y la cuenta queda verificada. Quien confirma es quien tiene el buzón. La app inicia sesión sola después. |
| **Reenviar** (`POST /api/resend-verification`) | Manda un código nuevo (máximo uno por minuto). La respuesta es igual exista o no la cuenta, para no revelar qué correos hay. |
| **Login** (`POST /api/login`) | Una cuenta pendiente recibe `403` con `requiereVerificacion: true`; la app lleva a la pantalla del código y pide uno nuevo. |
| **Google** (`POST /api/auth/google`) | Google ya probó que el correo es de quien entra, así que **confirma** una cuenta pendiente. Como no tiene contraseña, nadie más queda con acceso. |
| **Olvidé mi contraseña** | El código llega al correo, así que también **confirma** la cuenta. Ahora funciona además para cuentas creadas con Google (sin contraseña) para que puedan agregar una. |

### Qué se garantiza

- Una cuenta pendiente **no tiene contraseña**: no hay nada que un atacante pueda dejar plantado ni que sirva para entrar.
- El código **no se guarda**, solo su HMAC-SHA256 (con `JWT_SECRET`); vence a los **15 minutos**; **5 intentos fallidos**
  lo invalidan; uno nuevo reemplaza al anterior. Vive en la tabla `usuarios`, así que **no se pierde si Render reinicia**.
- Una cuenta ya verificada **no se puede "re-verificar"** para cambiarle la contraseña.
- Si el correo no se puede enviar, la cuenta recién creada se borra (no quedan cuentas huérfanas).
- Los mensajes de error no revelan si un correo existe, salvo el `409` del registro, que ya existía.

## Los casos que hay que cuidar (y cómo quedan)

| Situación | Resultado |
|---|---|
| Me registro con correo y confirmo el código | Cuenta verificada con mi contraseña; la app entra sola y registra el token de notificaciones. |
| Me registro y **no** confirmo, luego intento entrar con correo | La app me lleva a la pantalla del código y manda uno nuevo. |
| Me registro y **no** confirmo, luego entro con **Google** (mismo correo) | Google confirma la cuenta (misma cuenta, una sola). No tiene contraseña: si quiero una, "Olvidé mi contraseña". |
| Entro primero con **Google** y luego intento registrarme con ese correo | `409`: el mensaje explica que use Google u "Olvidé mi contraseña". El registro **no** le pone contraseña a la cuenta. |
| Entro con Google y luego quiero usar correo y contraseña | "Olvidé mi contraseña" → código al correo → crea contraseña. Es la misma cuenta. |
| Un atacante registra mi correo | Queda una cuenta pendiente **sin contraseña**. No puede entrar ni confirmar sin mi buzón. Yo la confirmo con Google, registrándome o con "Olvidé mi contraseña". |
| Un atacante adivina el código | 5 intentos y se bloquea; hay que pedir uno nuevo (1 por minuto); además hay límite de 20 peticiones por 15 min por IP. |
| Cuentas anteriores a este cambio | Quedan **verificadas** (`DEFAULT TRUE`). No cambia nada para ellas. |

## Token de notificaciones push

El token se registra en `login()` (que usan **tanto el inicio de sesión con correo como el de Google y la confirmación del
correo**), así que todas las vías guardan el token. Además, desde esta versión la app **reintenta guardarlo cada vez que
vuelve a primer plano** (sin pedir permisos ni mostrar nada, máximo una vez por minuto, y vuelve a confirmarlo cada 30
minutos), porque un registro que fallaba una vez no se reintentaba hasta el siguiente inicio de sesión. Al cerrar sesión el
token de ese teléfono se libera.

## Configuración

- Necesita `BREVO_API_KEY` (y opcionalmente `BREVO_SENDER_EMAIL`) en Render, igual que "Olvidé mi contraseña".
- `BREVO_API_URL` (opcional) permite apuntar a un servidor de correo de pruebas; **no** se pone en producción.
- Las columnas se crean solas al iniciar el servidor (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). Una base v6 se actualiza sola.

## Cómo se probó

- **Pruebas automáticas** (`backend/verificacion.test.js`): código de 6 dígitos, hash que no contiene el código, reintento
  de envío, bloqueo a los 5 intentos, código expirado, cuenta ya verificada, correo inexistente.
- **Escenarios contra el servidor** con la base real y un servidor de correo falso (no se mandó ningún correo): registro normal,
  ataque de cuenta plantada, Google primero y luego correo, reenvío y validaciones, fuerza bruta sobre el código. **Todos pasaron.**
- **Emulador Android**: registro → pantalla del código → confirmar → entra sola → **token push guardado en la base** →
  cerrar sesión **libera el token** → iniciar sesión con una cuenta pendiente lleva a la pantalla del código.
- **No se pudo probar en el emulador** el botón de Google (requiere una cuenta de Google real). La lógica de la cuenta
  pendiente + Google está cubierta por la prueba de `marcarCorreoVerificado` y por revisión del código; **hay que probarla en
  el teléfono** con una cuenta de Google real.

## Límites conocidos

- La contraseña viaja junto con el código al confirmar. La app la guarda **solo en memoria** entre el registro y la
  confirmación; si se cierra la app a la mitad, la pantalla del código la vuelve a pedir.
- Las cuentas **anteriores** a este cambio se consideran verificadas. Si alguien hubiera plantado una cuenta antes, este
  cambio no la detecta (hoy la base tiene 5 usuarios, todos conocidos).
- Una cuenta pendiente que nadie confirma se queda en la tabla. No estorba (no tiene contraseña), pero se puede limpiar
  con `DELETE FROM usuarios WHERE correo_verificado = FALSE AND fecha_creacion < now() - interval '7 days'`.
