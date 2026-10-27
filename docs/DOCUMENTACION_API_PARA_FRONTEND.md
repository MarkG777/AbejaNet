# 📘 Documentación API AbejaNet - Para Equipo Frontend Web

## 🌐 URL Base del Backend
```
https://abejanet-backend.onrender.com
```

---

## 🔐 Autenticación

### Login
**POST** `/api/login`

**Body (JSON):**
```json
{
  "email": "admin@abejanet.com",
  "password": "admin123"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombre": "Admin",
    "apellido_paterno": "...",
    "apellido_materno": "...",
    "correo_electronico": "admin@abejanet.com",
    "rol": "administrador"
  }
}
```

**Headers para Peticiones Autenticadas:**
```
Authorization: Bearer <token>
```

- `token` expira en **1 hora**.
- `refreshToken` expira en **7 días** y sirve para pedir un `token` nuevo sin volver a loguearse (ver `/api/refresh-token` abajo).
- Rutas de login/registro/recuperación de contraseña tienen **rate limiting**: máximo 20 intentos cada 15 minutos por IP.

### Renovar token
**POST** `/api/refresh-token`

**Body:**
```json
{ "refreshToken": "..." }
```

**Respuesta:** mismo shape que login (`token` + `refreshToken` nuevos). Si el refresh token expiró o fue revocado, responde 401/403 y hay que loguear de nuevo.

### Login con Google
**POST** `/api/auth/google`

**Body:**
```json
{ "token": "<idToken de Google Sign-In>" }
```

Respuesta igual a `/api/login`. Crea el usuario automáticamente si no existe.

---

## 👥 Usuarios

### Obtener Todos los Usuarios
**GET** `/api/usuarios`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "correo_electronico": "admin@abejanet.com",
    "nombre": "Admin",
    "rol_id": 1,
    "esta_activo": true
  },
  ...
]
```

### Crear Usuario
**POST** `/api/register`

**Body:**
```json
{
  "correo_electronico": "nuevo@ejemplo.com",
  "contrasena": "password123"
}
```

---

## 🏠 Apiarios

### Obtener Todos los Apiarios
**GET** `/api/apiarios`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Apiario Principal",
    "descripcion_general": "Apiario de prueba...",
    "direccion_o_coordenadas": "19.4326° N, 99.1332° W",
    "fecha_creacion": "2025-01-15T10:30:00Z"
  },
  ...
]
```

### Crear Apiario
**POST** `/api/apiarios`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Nuevo Apiario",
  "descripcion_general": "Descripción...",
  "direccion_o_coordenadas": "20.123° N, 99.456° W"
}
```

---

## 🐝 Colmenas

### Obtener Colmenas de un Apiario
**GET** `/api/apiarios/:apiarioId/colmenas`

**Ejemplo:** `/api/apiarios/1/colmenas`

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "apiario_id": 1,
    "nombre": "Colmena Alfa Ppal",
    "descripcion_especifica": "Junto al árbol de limón.",
    "fecha_instalacion": "2025-01-10T08:00:00Z"
  },
  ...
]
```

---

## 📔 Bitácora Apícola

Todas requieren `Authorization: Bearer <token>`.

### Listar eventos
**GET** `/api/bitacora?apiario_id=1&limit=50&offset=0`

### Crear evento
**POST** `/api/bitacora`
```json
{
  "apiario_id": 1,
  "colmena_id": 2,
  "tipo_evento": "revision",
  "descripcion": "Todo bien, sin plagas."
}
```
`colmena_id` es opcional (evento a nivel apiario). `fecha` es opcional (default: hoy).

### Actualizar evento
**PUT** `/api/bitacora/:id` — solo el autor del evento puede editarlo.

### Eliminar evento
**DELETE** `/api/bitacora/:id` — solo el autor del evento puede eliminarlo.

---

## 🚨 Alertas

**GET** `/api/alertas` — requiere `Authorization: Bearer <token>`. Devuelve las alertas de los apiarios del usuario.

**POST** `/api/alertas/marcar-como-leidas` — requiere `Authorization: Bearer <token>`. Marca todas las alertas del usuario como leídas.

**POST** `/api/alertas` — **requiere `X-API-Key`** (no token de usuario). Pensado para que el pipeline de sensores/dispositivos registre una alerta y dispare push notifications a los usuarios del apiario afectado. Ver sección de Sensores.

---

## 📡 Ingesta de Sensores (ESP32)

Estos endpoints los usa el firmware, no el frontend, pero se documentan porque comparten backend.

**POST** `/api/lecturas` y **POST** `/api/sensor-data` — ambos requieren el header:
```
X-API-Key: <ESP32_API_KEY del backend>
```
Sin esa clave responden `401`. El sensor se auto-registra en la tabla `sensores` si la MAC no existe todavía.

---

## 📊 Lecturas de Sensores

### Obtener Lecturas de una Colmena
**GET** `/api/colmenas/:colmenaId/lecturas`

**Ejemplo:** `/api/colmenas/1/lecturas?limit=100`

**Query Parameters (opcionales):**
- `limit`: Número máximo de lecturas (default: 100)
- `dias`: Filtrar últimos N días

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "sensor_id": 1,
    "temperatura": 27.5,
    "humedad": 68.9,
    "peso": 42.1,
    "sonido": 58.3,
    "lluvia": false,
    "fecha_registro": "2025-01-20T14:30:00Z"
  },
  ...
]
```

---

## 🔧 Endpoints de Debug (Solo para Desarrollo)

### Ver Datos de la Base de Datos
**GET** `/debug/data`

**Requiere** el header `x-setup-secret: <SETUP_SECRET del backend>` (o `{ "secret": "..." }` en el body). Sin esto responde `403`. Ya no está abierto públicamente.

Los demás endpoints bajo `/debug/*` (`populate-data`, `assign-users`, `setup-database`) también requieren esta misma clave.

---

## 📝 Notas Importantes

1. **Todas las respuestas exitosas** incluyen `success: true`
2. **Los errores** tienen formato:
   ```json
   {
     "success": false,
     "message": "Descripción del error"
   }
   ```
3. **El token JWT (`token`) expira en 1 hora**; usar `refreshToken` (7 días) contra `/api/refresh-token` para renovarlo sin re-loguear.
4. **CORS está restringido** a un allowlist de orígenes conocidos (no cualquier origen de navegador). La app móvil no se ve afectada porque no envía cabecera `Origin`. Si necesitan agregar un origen nuevo (por ejemplo un build web), pídanlo para agregarlo a `ALLOWED_ORIGINS` en el backend.

---

## 🧪 Probar la API

Pueden probar con **Postman**, **Thunder Client** (extensión VS Code) o desde su código React con `fetch` o `axios`.

**Ejemplo con fetch:**
```javascript
// Login
const response = await fetch('https://abejanet-backend.onrender.com/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@abejanet.com',
    password: 'admin123'
  })
});

const data = await response.json();
console.log(data.token); // Guardar este token

// Usar token para obtener apiarios
const apiarios = await fetch('https://abejanet-backend.onrender.com/api/apiarios', {
  headers: {
    'Authorization': `Bearer ${data.token}`
  }
});

const apiariosData = await apiarios.json();
console.log(apiariosData);
```

---

## ✅ Usuarios de Prueba

**Administrador:**
- Email: `admin@abejanet.com`
- Password: `admin123`

**Usuario Normal:**
- Email: `ana_cliente@abejanet.com`
- Password: `ana123`

---

## 🆘 Contacto

Si tienen dudas sobre algún endpoint o necesitan uno nuevo, avísenme.
