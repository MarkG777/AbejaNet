# 🔄 Guía de Migración de Base de Datos en Render

## 📋 Cuándo Usar Esta Guía

Cuando tu base de datos gratuita en Render expire (después de 90 días), sigue estos pasos para migrar a una nueva BD sin interrumpir tu aplicación.

---

## 🎯 Resumen del Proceso (15 minutos)

1. ✅ Crear nueva BD gratuita en Render
2. ✅ Actualizar `DATABASE_URL` en el backend
3. ✅ Ejecutar script de migración automático
4. ✅ Verificar funcionamiento

**NO REQUIERE:** Cambios en el código, cambios en la app móvil, resubir a Play Store.

---

## 📝 Paso a Paso Detallado

### **Paso 1: Crear Nueva Base de Datos en Render**

1. Ve a tu Dashboard de Render: https://dashboard.render.com
2. Click en **"New +"** → **"PostgreSQL"**
3. Configura:
   - **Name:** `abejanet_db_[mes][año]` (ejemplo: `abejanet_db_nov2025`)
   - **Database:** `abeja_net_v3` (el script funciona con cualquier nombre)
   - **User:** `abeja_user` (el script funciona con cualquier usuario)
   - **Region:** Oregon (US West)
   - **PostgreSQL Version:** 15 o superior
   - **Instance Type:** Free
4. Click **"Create Database"**
5. Espera 2-3 minutos a que esté **"Available"**

---

### **Paso 2: Copiar Credenciales de la Nueva BD**

1. En la página de la nueva BD → **"Connections"**
2. **Copia** la **"Internal Database URL"**:
   ```
   postgresql://abeja_user:PASSWORD@HOST/DATABASE
   ```
   
   **⚠️ IMPORTANTE:** Usa la **Internal** (sin `.oregon-postgres.render.com`)

3. También copia (opcional, para respaldo):
   - Hostname
   - Port (5432)
   - Database name
   - Username
   - Password

---

### **Paso 3: Actualizar DATABASE_URL en el Backend**

1. Ve a tu **backend** en Render (no la BD)
2. Click en **"Environment"** (menú lateral izquierdo)
3. Busca la variable **`DATABASE_URL`**
4. Click en **"Edit"** (ícono de lápiz)
5. **Reemplaza** el valor completo con la nueva **Internal Database URL**
6. Click **"Save Changes"**
7. **Espera 2-3 minutos** a que redespliegue
8. Verifica que el estado sea **"Live"** (verde)

---

### **Paso 4: Ejecutar Script de Migración Automático**

#### **Método A: Usando PowerShell (Recomendado)** ⭐

1. Abre PowerShell
2. Navega a la carpeta del proyecto:
   ```powershell
   cd C:\Users\marco\AbejaNet
   ```

3. Ejecuta el script:
   ```powershell
   .\MIGRACION_BD_RENDER.ps1
   ```

4. El script te pedirá:
   - **Internal Database URL:** Pégala (del Paso 2)
   - **Confirmación:** Presiona Enter después de actualizar DATABASE_URL
   - **Clave secreta:** Copia `SETUP_SECRET` de Environment en Render

5. Espera 1-2 minutos

6. Verás:
   ```
   ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE
   📊 Tablas creadas: [lista]
   📈 Datos insertados: [contadores]
   ```

#### **Método B: Usando Postman o PowerShell Manual**

1. Copia `SETUP_SECRET` de Environment en Render
2. Ejecuta:

   ```powershell
   $body = @{
       secret = "TU_SETUP_SECRET_AQUI"
   } | ConvertTo-Json

   Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/setup-database" -Method POST -Body $body -ContentType "application/json"
   ```

---

### **Paso 5: Verificar que Todo Funciona**

1. **Test de conexión:**
   ```powershell
   Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/test-db"
   ```
   
   **Debe responder:** `{"success":true,"message":"Conexión a la base de datos exitosa."}`

2. **Ver datos:**
   ```powershell
   Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/data"
   ```
   
   **Debe mostrar:** Totales de usuarios, apiarios, colmenas, sensores

3. **Probar login en la app móvil:**
   - Usuario: `admin@abejanet.com`
   - Contraseña: `Admin2024!`

---

### **Paso 6: (Opcional) Eliminar Base de Datos Antigua**

1. Ve a la BD antigua (la expirada) en Render
2. **Settings** → **Delete Database**
3. Escribe el nombre para confirmar
4. Click **"Delete"**

---

## 🔐 Configuración de Seguridad (Primera Vez)

Si es tu primera migración después de configurar el endpoint protegido:

### **Agregar Variable SETUP_SECRET**

1. Ve al **backend** en Render → **"Environment"**
2. Click **"Add Environment Variable"**
3. **Key:** `SETUP_SECRET`
4. **Value:** Genera una clave segura (ejemplo: `AbejaNet_Setup_2024!_SecretKey`)
5. **Save Changes**
6. Espera redespliegue

**⚠️ GUARDA ESTA CLAVE** en un lugar seguro (LastPass, 1Password, etc.)

---

## 📊 Checklist Rápido

- [ ] Nueva BD creada en Render (estado: Available)
- [ ] Internal Database URL copiada
- [ ] `DATABASE_URL` actualizada en backend Environment
- [ ] Backend redesplegado (estado: Live)
- [ ] Script de migración ejecutado exitosamente
- [ ] `/test-db` responde correctamente
- [ ] `/debug/data` muestra datos correctos
- [ ] Login en app móvil funciona
- [ ] BD antigua eliminada (opcional)

---

## ❓ Solución de Problemas

### **Error: "Acceso denegado. Clave secreta incorrecta."**
- Verifica que `SETUP_SECRET` esté configurada en Environment
- Verifica que estés usando el valor correcto

### **Error: "Cannot connect to database"**
- Verifica que `DATABASE_URL` esté actualizada con la nueva URL
- Verifica que usaste la **Internal URL** (no External)
- Espera 2-3 minutos después de actualizar Environment

### **Error: "Backend no responde"**
- Verifica que el backend esté en estado "Live"
- Revisa los logs del backend en Render
- Espera a que termine el redespliegue

### **Error: "Tablas ya existen"**
- Esto es normal si ejecutas el script múltiples veces
- El script sobrescribe las tablas (DROP/CREATE)
- Los datos de prueba se reinsertan

---

## 🎯 Ventajas de Este Sistema

✅ **Migración rápida:** 15 minutos total
✅ **Sin cambios de código:** No requiere modificar archivos
✅ **Sin resubir app:** La app móvil sigue funcionando
✅ **Automatizado:** Script hace todo el trabajo
✅ **Seguro:** Endpoint protegido con clave secreta
✅ **Reutilizable:** Funciona para todas las migraciones futuras

---

## 📌 Notas Importantes

- **Frecuencia:** Render Free BD expira cada 90 días
- **Datos:** Se pierden los datos de la BD anterior (solo datos de prueba)
- **Usuarios:** Se recrean los usuarios de prueba del script
- **Producción:** Para datos reales, considera exportar/importar antes de migrar
- **Automatización futura:** Considera usar Supabase o Neon.tech para evitar expiraciones

---

## 🔗 Links Útiles

- **Dashboard Render:** https://dashboard.render.com
- **Documentación PostgreSQL Render:** https://render.com/docs/databases
- **Script SQL:** `abeja_net_v3_postgres.sql`
- **Script PowerShell:** `MIGRACION_BD_RENDER.ps1`

---

## 📞 Soporte

Si algo falla:
1. Revisa los logs del backend en Render
2. Verifica que todas las variables de entorno estén correctas
3. Intenta el proceso de nuevo desde el Paso 3

---

**Última actualización:** Noviembre 2024
**Próxima migración estimada:** Febrero 2025 (90 días)
