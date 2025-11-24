# 🔄 RESTAURAR BASE DE DATOS RENDER FREE

## ⚠️ ¿CUÁNDO USAR ESTA GUÍA?

**Cuando tu base de datos gratuita de Render expire (cada 90 días).**

Esta guía te permite migrar a una nueva BD en **15 minutos** sin tocar código ni la app móvil.

---

## 🎯 PROCESO RESUMIDO (3 PASOS)

1. **Crear nueva BD en Render** (5 min)
2. **Actualizar variable DATABASE_URL** (2 min)
3. **Ejecutar script automático** (5 min)

**Total: ~15 minutos** ⏱️

---

# 📋 GUÍA PASO A PASO

## 🚀 PASO 1: CREAR NUEVA BASE DE DATOS

### 1.1. Ir a Render Dashboard
```
https://dashboard.render.com
```

### 1.2. Crear Nueva PostgreSQL
1. Click en **"New +"** (esquina superior derecha)
2. Selecciona **"PostgreSQL"**

### 1.3. Configurar la Nueva BD
```
Name:            abejanet_db_[mes][año]
                 Ejemplo: abejanet_db_feb2025

Database:        Cualquier nombre (abeja_net_v3 recomendado)

User:            Cualquier usuario (abeja_user recomendado)

Region:          Oregon (US West)

PostgreSQL Ver:  15 o superior

Instance Type:   Free ✅
```

### 1.4. Crear y Esperar
1. Click **"Create Database"**
2. **Espera 2-3 minutos** hasta que aparezca:
   ```
   Status: Available ✅
   ```

---

## 📋 PASO 2: COPIAR CREDENCIALES

### 2.1. Ir a la Pestaña "Connections"
En la página de tu nueva BD, click en **"Connections"**

### 2.2. Copiar Internal Database URL
**⚠️ IMPORTANTE:** Copia la **"Internal Database URL"** (NO la External)

```
postgresql://usuario:password@host/database
```

Ejemplo:
```
postgresql://abeja_user:ABC123xyz@dpg-xxxxx-a/abeja_net_v3_xxxx
```

**Cópiala completa** → La necesitarás en el siguiente paso.

---

## 🔧 PASO 3: ACTUALIZAR BACKEND

### 3.1. Ir al Backend en Render
1. Dashboard → Busca tu servicio **"abejanet_backend"**
2. Click en él

### 3.2. Abrir Environment Variables
1. En el menú lateral izquierdo → **"Environment"**
2. Busca la variable **"DATABASE_URL"**

### 3.3. Actualizar DATABASE_URL
1. Click en el ícono de **lápiz (Edit)** junto a DATABASE_URL
2. **Borra** el valor viejo
3. **Pega** la nueva Internal Database URL (del Paso 2.2)
4. Click **"Save Changes"**

### 3.4. Esperar Redespliegue
- Render redesplegará automáticamente
- **Espera 2-3 minutos**
- Verifica que el status sea: **"Live"** ✅ (verde)

---

## 🚀 PASO 4: EJECUTAR SCRIPT AUTOMÁTICO

### 4.1. Abrir PowerShell
```
Windows + X → Windows PowerShell
```

### 4.2. Navegar a la Carpeta del Proyecto
```powershell
cd C:\Users\marco\AbejaNet
```

### 4.3. Ejecutar el Script
```powershell
.\MIGRACION_BD_RENDER.ps1
```

### 4.4. Seguir las Instrucciones del Script

**El script te pedirá:**

#### a) Internal Database URL
```
Pega la URL completa que copiaste en el Paso 2.2
```

#### b) Confirmación
```
El script te dirá:
"Actualiza DATABASE_URL en Render y presiona Enter cuando esté listo"

Si YA lo hiciste (Paso 3), presiona Enter.
```

#### c) Clave Secreta (SETUP_SECRET)
```
Escribe: AbejaNet2024_MigrationKey_Secure
```

**Nota:** Si usaste otra clave, escribe la que configuraste.

### 4.5. Esperar Resultado

El script mostrará:
```
🔍 Verificando conexión...
✅ Backend conectado a la BD correctamente

🚀 Configurando base de datos...

========================================
   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
========================================

📊 Tablas creadas:
   - alertas
   - apiarios
   - colmenas
   - lecturas_ambientales
   - roles
   - sensores
   - usuarios
   - usuarios_apiarios

📈 Datos insertados:
   - Usuarios: 4
   - Apiarios: 2
   - Colmenas: 3
   - Sensores: 4

✅ Todo listo. Tu aplicación está funcionando con la nueva BD.
```

---

## ✅ PASO 5: VERIFICAR QUE TODO FUNCIONA

### 5.1. Test de Conexión
```powershell
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/test-db"
```

**Respuesta esperada:**
```json
{"success":true,"message":"Conexión a la base de datos exitosa."}
```

### 5.2. Ver Datos
```powershell
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/data"
```

**Debe mostrar:** Totales de usuarios, apiarios, colmenas, sensores.

### 5.3. Probar Login en App Móvil
```
Usuario:    admin@abejanet.com
Contraseña: Admin2024!
```

**Si funciona:** ✅ ¡Migración completada exitosamente!

---

## 🗑️ PASO 6: ELIMINAR BD ANTIGUA (Opcional)

### 6.1. Ir a la BD Antigua
Dashboard → Selecciona la BD expirada/antigua

### 6.2. Eliminar
1. **Settings** (menú lateral)
2. Scroll abajo → **"Delete Database"**
3. Escribe el nombre para confirmar
4. Click **"Delete"**

---

# 🔐 CONFIGURACIÓN INICIAL (SOLO PRIMERA VEZ)

Si es tu primera vez usando este sistema, configura la clave secreta:

## Agregar SETUP_SECRET

### En Render (Backend)
1. Dashboard → Backend → **"Environment"**
2. Click **"Add Environment Variable"**
3. **Key:** `SETUP_SECRET`
4. **Value:** `AbejaNet2024_MigrationKey_Secure`
5. **Save Changes**

### En tu PC (Archivo .env)
1. Abre: `C:\Users\marco\AbejaNet\backend\.env`
2. Agrega al final:
   ```env
   SETUP_SECRET="AbejaNet2024_MigrationKey_Secure"
   ```
3. Guarda el archivo

**⚠️ IMPORTANTE:** Usa la MISMA clave en ambos lugares.

---

# ❓ SOLUCIÓN DE PROBLEMAS

## ❌ Error: "Cannot connect to database"

**Causa:** DATABASE_URL no está actualizada o incorrecta.

**Solución:**
1. Verifica que usaste la **Internal URL** (sin `.oregon-postgres.render.com` al final)
2. Verifica que la copiaste completa
3. Espera 2-3 minutos después de guardar en Render

---

## ❌ Error: "Acceso denegado. Clave secreta incorrecta"

**Causa:** SETUP_SECRET no coincide o no existe.

**Solución:**
1. Verifica que SETUP_SECRET esté en Render Environment
2. Verifica que el valor sea exactamente: `AbejaNet2024_MigrationKey_Secure`
3. Usa la misma clave cuando el script la pida

---

## ❌ Error: "Backend no responde"

**Causa:** Backend no terminó de redesplegar.

**Solución:**
1. Ve a Render Dashboard → Backend
2. Espera a que diga "Live" (verde)
3. Revisa los Logs si hay errores

---

## ❌ Script no encuentra archivo

**Causa:** No estás en la carpeta correcta.

**Solución:**
```powershell
cd C:\Users\marco\AbejaNet
# Luego ejecuta:
.\MIGRACION_BD_RENDER.ps1
```

---

# 📊 CHECKLIST RÁPIDO

Antes de empezar:
- [ ] Tienes acceso a Render Dashboard
- [ ] Sabes la clave SETUP_SECRET
- [ ] Tienes PowerShell instalado

Durante el proceso:
- [ ] Nueva BD creada (Status: Available)
- [ ] Internal Database URL copiada
- [ ] DATABASE_URL actualizada en backend
- [ ] Backend redesplegado (Status: Live)
- [ ] Script ejecutado sin errores

Después del proceso:
- [ ] `/test-db` responde OK
- [ ] `/debug/data` muestra datos
- [ ] Login en app móvil funciona
- [ ] BD antigua eliminada (opcional)

---

# 📝 INFORMACIÓN IMPORTANTE

## Frecuencia de Migraciones
```
Render Free BD expira cada: 90 días
Próxima migración estimada: [Fecha actual + 90 días]
```

## Datos Que Se Pierden
- ❌ Datos de la BD anterior (solo datos de prueba)
- ✅ Se recrean usuarios de prueba automáticamente

## Lo Que NO Necesitas Cambiar
- ✅ Código del backend
- ✅ Código de la app móvil
- ✅ Configuración de Google Auth
- ✅ Variables como JWT_SECRET, NEWS_API_KEY

---

# 🎯 VENTAJAS DE ESTE SISTEMA

✅ **Rápido:** 15 minutos vs 2+ horas manual
✅ **Automático:** El script hace todo el trabajo
✅ **Seguro:** Endpoint protegido con clave
✅ **Sin cambios:** No tocas código ni apps
✅ **Reutilizable:** Funciona cada 90 días

---

# 🔗 ARCHIVOS RELACIONADOS

```
📁 C:\Users\marco\AbejaNet\
├── MIGRACION_BD_RENDER.ps1      ← Script automático
├── RESTAURAR_BD_RENDER_FREE.md  ← Esta guía
├── abeja_net_v3_postgres.sql    ← Script SQL (no tocar)
└── backend/
    └── .env                      ← Configuración local
```

---

# 📞 INFORMACIÓN DE CONTACTO

**Backend URL:** https://abejanet-backend.onrender.com

**Render Dashboard:** https://dashboard.render.com

**Usuario admin:**
- Email: admin@abejanet.com
- Password: Admin2024!

---

# 🎓 NOTAS ADICIONALES

## Para Producción Futura
Si en el futuro tienes datos reales importantes:

1. **Exportar datos antes de migrar:**
   ```bash
   pg_dump [OLD_DATABASE_URL] > backup.sql
   ```

2. **Importar después de migrar:**
   ```bash
   psql [NEW_DATABASE_URL] < backup.sql
   ```

## Alternativas para Evitar Migraciones
- **Supabase:** BD gratuita sin expiración
- **Neon.tech:** BD PostgreSQL gratuita
- **Render Paid:** $7/mes sin expiraciones

---

**Última actualización:** Noviembre 2024

**Próxima migración:** Febrero 2025 (90 días)

**Tiempo estimado:** 15 minutos ⏱️

---

# ✅ ¡LISTO!

Guarda este archivo en un lugar seguro.

La próxima vez que expire tu BD, solo:
1. Abre este archivo
2. Sigue los pasos
3. Ejecuta el script
4. ¡Listo en 15 minutos! 🚀
