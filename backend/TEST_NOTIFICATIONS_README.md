# Probar notificaciones push

Hay dos formas de mandar una notificación de prueba. Las dos usan el mismo archivo, `test_notification.js` (el backend lo importa:
no lo borres) y avisan **solo a los usuarios con acceso al apiario de esa colmena que tengan token de notificaciones**
(se guarda cuando abren la app y aceptan los permisos).

> Cuidado: el nombre debe ser el de una **colmena**, no el de un apiario. Para ver las que hay:
> `SELECT nombre FROM colmenas;`

## Forma 1 — Desde tu computadora (la más simple)

Usa la base de datos del `.env` (la de Render). No necesita la clave `SETUP_SECRET`.

```powershell
cd C:\Users\OMEN\Documents\ESCUELA\AbejaNet_Revival\backend

# Colmena de prueba del BME280 (solo le llega a marcogolvera777@gmail.com) con mensaje por defecto
node --env-file=.env test_notification.js

# Con colmena y mensaje propios
node --env-file=.env test_notification.js "Colmena BME280 Prueba" "Texto de mi prueba"

# Solo la notificación push, sin guardar una alerta de prueba en la base de datos
node --env-file=.env test_notification.js "Colmena BME280 Prueba" "Solo push" --sin-alerta
```

Al terminar imprime un resumen con `"status": "ok"` por cada dispositivo alcanzado.

## Forma 2 — Con el servidor desplegado en Render (endpoint protegido)

El endpoint `GET /api/test-notification` **ya no es público**: exige la cabecera `x-setup-secret` con el valor de
`SETUP_SECRET` de Render (Environment). Sin ella responde 403.

```powershell
# Te pide la clave sin dejarla escrita en el historial de PowerShell
$h = @{ "x-setup-secret" = (Read-Host "SETUP_SECRET de Render") }

# Mensaje y colmena por defecto
Invoke-RestMethod -Uri "https://abejanet-backend.onrender.com/api/test-notification" -Headers $h

# Con colmena y mensaje propios
Invoke-RestMethod -Headers $h -Uri "https://abejanet-backend.onrender.com/api/test-notification?colmena=Colmena%20BME280%20Prueba&mensaje=Hola%20desde%20Render"
```

La primera petición puede tardar hasta ~50 s si Render tiene el servicio dormido.

## Qué hace cada prueba
- Crea (salvo con `--sin-alerta`) una alerta `PRUEBA_NOTIFICACION` en la colmena: aparece en el historial de alertas
  de la app y cuenta en el globo rojo. Se marca como leída desde la app.
- Manda la notificación push con el contador de alertas no leídas.

## Si no llega
- `No hay usuarios con tokens`: abre la app en el celular con ese usuario y acepta los permisos de notificaciones.
- `No se encontró la colmena`: el nombre debe coincidir exactamente (mayúsculas y acentos).
- `403` en la Forma 2: falta la cabecera `x-setup-secret` o no coincide con la de Render.
- La app necesita internet y notificaciones permitidas; en Android también revisa el modo "No molestar".
