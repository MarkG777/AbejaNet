# Auditoría de seguridad y experiencia de usuario — 2026-11-21

**Alcance:** solo las partes más importantes: (1) seguridad del backend (`backend/index.js`, `backend/middleware/auth.js`,
`backend/chatbot.js`), (2) UX de la pantalla de detalle de colmena y de la Bitácora, (3) comportamiento del chatbot.
Registro, cambio de contraseña y Google Sign-In los probó el dueño del proyecto a mano antes de esta auditoría.

**Referencias usadas como lista de comprobación** (no es una certificación): OWASP API Security Top 10 (2023),
OWASP MASVS (almacenamiento y autenticación), WCAG 2.2 AA y las 10 heurísticas de Nielsen.

**Rama:** `feature/auditoria-ux-seguridad`. Cada corrección es un commit aparte. El arreglo del chatbot ya está en `main`.

## Seguridad (backend)

| # | Hallazgo | Riesgo | Estado |
|---|---|---|---|
| 1 | `GET /api/test-notification` no pedía autenticación: cualquiera podía enviar notificaciones push a los apicultores | Alto (API2/API5) | Corregido: exige `x-setup-secret` |
| 2 | `POST /debug/setup-database` comparaba `secret !== SETUP_SECRET`: si la variable no estaba definida, un cuerpo vacío pasaba y se ejecutaba un script que hace `DROP TABLE` de todo | Crítico si falta la variable (en Render sí está definida) | Corregido: usa `verificarSetupSecret`; ahora carga el SQL v6 |
| 3 | Sin `trust proxy`: tras el proxy de Render, `req.ip` era el del proxy y los límites de intentos (login, registro, recuperar contraseña) los compartían todos los usuarios | Medio (API4) | Corregido: `trust proxy = 1`; verificado con IPs distintas |
| 4 | Código de recuperación con `Math.random()` (predecible) y sin límite de intentos por código | Alto (toma de cuenta) | Corregido: `crypto.randomInt`, máximo 5 intentos por código |
| 5 | Al restablecer la contraseña no se revocaba el refresh token (seguía válido hasta 7 días) | Medio | Corregido: `refresh_token = NULL` al restablecer |
| 6 | Google Sign-In dejaba entrar a cuentas desactivadas y no comprobaba `email_verified` | Medio (API2/API5) | Corregido |
| 7 | Comparación de secretos con `===` (no en tiempo constante) | Bajo | Corregido: `crypto.timingSafeEqual` + pruebas |
| 8 | Registro y login sin validar tipos, formato de correo ni longitud de contraseña en el servidor (el login devolvía 500 con tipos incorrectos) | Medio | Corregido: contraseña de 8 a 128 caracteres (la app ya exigía ≥ 8) |
| 9 | Bitácora: la colmena no se validaba contra el apiario (se podía ligar a la colmena de otro usuario y leer su nombre); sin validar fecha, longitudes, `limit`, `id` | Medio (API1) | Corregido |
| 10 | Errores internos de la BD devueltos al cliente (`/test-db`, `/api/lecturas`); correos completos en los logs | Bajo | Corregido |
| 11 | La cola sin conexión de la app se bloqueaba para siempre si el servidor rechazaba un evento (400/404/409/413/422) | Bajo (disponibilidad) | Corregido (+ pruebas) |

**Verificación:** `npm test` (11 pruebas del middleware, 3 de ellas nuevas: secreto de otra longitud y variables sin definir), `jest` de la app (6 pruebas de la cola, 2 nuevas) y 27 comprobaciones contra
el backend local (rutas protegidas, límites por cliente, registro, login, bitácora completa, límite de intentos del código).

**No se corrigió / pendiente:**
- El código de recuperación vive en memoria: se pierde si Render reinicia o duerme el servicio (el plan gratuito duerme tras 15 min).
  Solución: guardarlo (hasheado) en una tabla. Requiere un cambio de esquema; no se hizo sin tu visto bueno.
- Contraseñas: la app exige mayúscula, número y símbolo, el servidor solo longitud. Cambiar y restablecer aceptan ≥ 6; conviene igualar.
- `POST /api/auth/google` y `/api/refresh-token` no tienen límite de intentos propio (un límite estricto rompería renovaciones legítimas).
- El cambio de contraseña no revoca el refresh token (haría cerrar sesión en el propio dispositivo tras 1 h).
- Refresh tokens guardados en texto plano en la BD (recomendado: hash).
- Cuentas semilla (`ana_cliente`, contraseña en `database/abeja_net_v3.sql`) en un repo público: cambiarlas antes de usar datos reales.
- Firmware: validación del certificado HTTPS y tiempo de espera ante Render dormido (sin probar en hardware).
- Release firmado con `debug.keystore` (suficiente para uso propio, no para Play Store).

## Experiencia de usuario

| # | Hallazgo | Estado |
|---|---|---|
| 1 | El título "Detalle de la Colmena"/"Bitácora" aparecía dos veces (encabezado y pantalla) | Corregido |
| 2 | La variación de presión se mostraba en % (+0.6 %), poco útil y coloreada como "buena/mala" | Corregido: en hPa y en color neutro |
| 3 | Rango "Mes": cada punto es un promedio semanal pero se mostraba como un día | Corregido: "Semana del dd/MM" |
| 4 | Error de carga sin salida (solo texto, fondo negro) | Corregido: botón Reintentar y fondo de la app |
| 5 | La pantalla de detalle conservaba rango, punto y lectura en tiempo real de la colmena anterior | Corregido |
| 6 | Accesibilidad: botones solo con ícono sin etiqueta, sin roles/estados, gráficas sin texto alternativo, chips pequeños | Corregido (WCAG 1.1.1, 4.1.2, 2.5.8) |
| 7 | Bitácora: un evento nuevo siempre se creaba con la fecha de hoy aunque hubiera otro día seleccionado | Corregido |
| 8 | Noticias con farándula/finanzas (títulos con "hive" o "beekeeper") | Corregido: filtro de relevancia en el servidor |
| 9 | Chatbot: respondía "no hay problemas" a quien no tenía colmenas | Corregido (ya en `main`) |

**Pendiente / ideas:** formulario de Bitácora sin selector de colmena visible; comprobar contraste de color en modo claro;
revisar textos mezclados español/inglés en los datos de ejemplo; que el selector de rango recuerde la elección por colmena.
