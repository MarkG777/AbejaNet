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
  "correo_electronico": "admin@abejanet.com",
  "contrasena": "admin123"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "correo_electronico": "admin@abejanet.com",
    "nombre": "Admin",
    "rol": "administrador"
  }
}
```

**Headers para Peticiones Autenticadas:**
```
Authorization: Bearer <token>
```

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

No requiere autenticación. Muestra totales de todas las tablas.

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
3. **El token JWT expira** después de 24 horas
4. **CORS está habilitado** - Pueden hacer peticiones desde localhost

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
    correo_electronico: 'admin@abejanet.com',
    contrasena: 'admin123'
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
