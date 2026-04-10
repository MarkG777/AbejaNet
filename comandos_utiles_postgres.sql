-- ====================================================================
-- Comandos Útiles para PostgreSQL - AbejaNet en Render
-- ====================================================================
-- Este archivo contiene una colección de scripts y comandos comunes
-- adaptados para la base de datos PostgreSQL.
-- ====================================================================
--
-- ===================== GUÍA RÁPIDA DE USO =====================
--
-- REQUISITO: psql (ya instalado en C:\Program Files\PostgreSQL\17\bin)
--            Ya está en el PATH del sistema, no necesitas instalarlo.
--
-- PASO 1: Abre PowerShell
--
-- PASO 2: Conéctate a la BD de Render con la EXTERNAL Database URL:
--
--   psql "postgresql://abeja_user:PASSWORD@HOST-a.oregon-postgres.render.com/DB_NAME"
--
--   Ejemplo real (copia tu External URL desde Render Dashboard > tu BD > Info):
--   psql "postgresql://abeja_user:kXsLJzHn9n0bCJWHMoLqkcBfUWYkCyXr@dpg-d6u5lls50q8c73frrr6g-a.oregon-postgres.render.com/abeja_net_v3_q3xx"
--
-- PASO 3: Ya estás dentro de psql. Copia y pega los comandos SQL de abajo.
--
-- TIPS:
--   - Para salir de psql:              \q
--   - Para ver tablas:                 \dt
--   - Para ver columnas de una tabla:  \d nombre_tabla
--   - Para ejecutar un archivo .sql:   \i ruta/archivo.sql
--   - O desde PowerShell directo:      psql "URL" -f archivo.sql
--
-- NOTA: Usa la EXTERNAL URL (no la Internal) desde tu PC.
--       La Internal solo funciona dentro de Render.
-- ===============================================================


-- ====================================================================
-- ASIGNAR UN APIARIO A UN USUARIO (TRANSACCIÓN SEGURA)
-- ====================================================================
-- Este bloque asigna un usuario a un apiario. Usa ON CONFLICT para evitar duplicados.
DO $$
DECLARE
    -- ¡SOLO NECESITAS MODIFICAR ESTAS TRES LÍNEAS!
    correo_usuario_a_asignar TEXT := 'marcogolvera777@gmail.com'; -- <-- Reemplaza con el correo del usuario
    nombre_apiario_a_asignar TEXT := 'Apiario Secundario del Laboratorio';   -- <-- Reemplaza con el nombre del apiario
    correo_admin_que_asigna  TEXT := 'admin@abejanet.com';     -- <-- Reemplaza con el correo del admin

    -- El script obtiene los IDs correspondientes.
    id_usuario_a_asignar   INTEGER;
    id_apiario_a_asignar   INTEGER;
    id_admin_que_asigna    INTEGER;
BEGIN
    -- Obtener IDs
    SELECT id INTO id_usuario_a_asignar FROM usuarios WHERE correo_electronico = correo_usuario_a_asignar;
    SELECT id INTO id_apiario_a_asignar FROM apiarios WHERE nombre = nombre_apiario_a_asignar;
    SELECT id INTO id_admin_que_asigna FROM usuarios WHERE correo_electronico = correo_admin_que_asigna;

    -- Verificar que todos los IDs fueron encontrados
    IF id_usuario_a_asignar IS NULL OR id_apiario_a_asignar IS NULL OR id_admin_que_asigna IS NULL THEN
        RAISE EXCEPTION 'No se pudo encontrar el usuario, apiario o admin especificado. Revisa los correos y nombres.';
    END IF;

    -- Insertar la nueva asignación, evitando duplicados
    INSERT INTO usuarios_apiarios (usuario_id, apiario_id, asignado_por_admin_id)
    VALUES (id_usuario_a_asignar, id_apiario_a_asignar, id_admin_que_asigna)
    ON CONFLICT (usuario_id, apiario_id) DO NOTHING;

    RAISE NOTICE 'Asignación procesada para el usuario % al apiario %.', correo_usuario_a_asignar, nombre_apiario_a_asignar;
END;
$$;


-- ====================================================================
-- SECCIÓN PARA REGISTRAR ALERTAS EN LA BD
-- ====================================================================
-- Estos comandos son compatibles con PostgreSQL sin cambios.

-- Alerta de Temperatura Alta
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_generada)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Beta Lab'),
  'TEMPERATURA_ALTA',
  '40.1 C',
  'La temperatura interna ha superado el umbral de seguridad de 35°C.',
  NOW()
);

-- Alerta de Posible Enjambrazón
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_generada)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa Ppal'),
  'POSIBLE_ENJAMBRAZON',
  '-5.2 Kg',
  'Se detectó una pérdida de peso drástica. Revisar posible enjambrazón.',
  NOW()
);

-- Alerta de Humedad Baja
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_generada)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Gamma Ppal'),
  'HUMEDAD_BAJA',
  '45%',
  'La humedad ha caído por debajo del 50%. Riesgo de deshidratación.',
  NOW()
);


-- ====================================================================
-- BUSCAR ID DE COLMENA POR NOMBRE
-- ====================================================================
SELECT id, nombre FROM colmenas WHERE nombre = 'Colmena Beta Lab';


-- ====================================================================
-- PROBAR ALERTA CON NOTIFICACIÓN PUSH (DESDE TU TERMINAL)
-- ====================================================================
-- IMPORTANTE: Reemplaza la URL si cambia tu servicio en Render.
-- 
-- OPCIÓN A) COMANDO PARA BASH (Linux / Mac):
-- curl -X POST https://abejanet-backend.onrender.com/api/alertas -H "Content-Type: application/json" -d '{"colmena_id": 3, "tipo_alerta": "HUMEDAD_BAJA", "valor_registrado": "45%", "mensaje": "¡Humedad crítica!"}'
--
-- OPCIÓN B) COMANDO PARA POWERSHELL (Windows):
-- Invoke-RestMethod -Uri "https://abejanet-backend.onrender.com/api/alertas" -Method POST -ContentType "application/json" -Body '{"colmena_id": 3, "tipo_alerta": "HUMEDAD_BAJA", "valor_registrado": "45%", "mensaje": "¡La humedad ha caído por debajo del 50%. Riesgo de deshidratación!"}'


-- ====================================================================
-- RESTAURAR LA BASE DE DATOS DESDE UN ARCHIVO .SQL
-- ====================================================================
-- Este comando borra la base de datos actual y la recrea desde tu archivo de esquema.
-- Úsalo con cuidado. Necesitas tener 'psql' instalado localmente.
-- Copia la "External Database URL" de Render para conectarte.
--
-- Formato del comando:
-- psql "<TU_EXTERNAL_DATABASE_URL>" -f abeja_net_v3_postgres.sql
--
-- Ejemplo:
-- psql "postgres://abeja_user:password@dpg-host.frankfurt-a.render.com/abeja_net_v2_s99y" -f abeja_net_v3_postgres.sql


-- ====================================================================
-- NOTA SOBRE EL ESP32
-- ====================================================================
-- Recuerda que el código de tu ESP32 que envía los datos de los sensores
-- también debe ser actualizado.
-- La URL a la que envía las peticiones POST debe cambiar de
-- 'http://<ip_local>:3000/api/lecturas' a la URL pública de tu backend en Render:
-- 'https://abejanet-backend.onrender.com/api/lecturas'
-- ====================================================================



-- ====================================================================
-- GENERAR DATOS SIMULADOS (MOCK DATA) PARA GRÁFICAS
-- ====================================================================
-- ⚠️ IMPORTANTE: No ejecutes 'node generate_mock_data.js' localmente.
-- Ese script requiere configuración local y variables de entorno específicas.
-- 
-- ✅ LA FORMA CORRECTA Y SEGURA es usar el endpoint de tu backend en Render:
-- Solo abre otra ventana de PowerShell y ejecuta este comando:

Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST

-- Esto generará 30 días de datos (1 lectura cada 15 min) para la "Colmena Beta Lab"
-- directamente en tu base de datos de producción.
-- ====================================================================

-- ====================================================================
-- PROBAR NOTIFICACIONES PUSH RÁPIDAS (SIN INSERTAR EN LA BD)
-- ====================================================================
-- Este endpoint simplemente hace "timbrar" tu celular para verificar
-- que los tokens Push que tiene guardados el backend funcionan, sin
-- ensuciar la tabla de Alertas.
-- 
-- EJECUTA ESTO EN POWERSHELL (Ojo: Es method GET, no POST):
-- (Para dirigirlo a una colmena, añade la variable al final de la URL)
--
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/api/test-notification?colmena=Colmena%20Beta%20Lab" -Method GET




cd C:\Users\marco\AbejaNet

# Reemplaza PASSWORD_COMPLETO con el password real
$env:PGPASSWORD="8oPtc2jkVBnE4gEL1ZBG3BasCbBjgPmA"
psql -h dpg-d4hqgl75r7bs73c1vk90-a.oregon-postgres.render.com -U abeja_user -d abeja_net_v3_jwlcx -f abeja_net_v3_postgres.sql

-- ====================================================================
-- GENERAR DATOS SIMULADOS - MODO DINÁMICO (ACTUALIZADO)
-- ====================================================================
-- El endpoint /debug/populate-data ahora acepta parámetros dinámicos.
-- Ya NO necesitas hacer commit + push para cambiar la colmena destino.
--
-- SINTAXIS GENERAL (PowerShell):
-- Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" `
--   -Method POST -UseBasicParsing -ContentType "application/json" `
--   -Body '{"colmena": "NOMBRE_COLMENA", "mac": "XX:XX:XX:XX:XX:XX", "dias": 30, "lecturasPorHora": 4}'
--
-- PARÁMETROS DISPONIBLES (todos son opcionales):
-- | Parámetro       | Default                | Descripción                          |
-- |-----------------|------------------------|--------------------------------------|
-- | colmena         | "Colmena Beta Lab"     | Nombre exacto de la colmena en BD    |
-- | mac             | "A2:04:2A:B9:C1:D9"   | MAC del sensor simulado              |
-- | dias            | 30                     | Cuántos días de datos generar        |
-- | lecturasPorHora | 4                      | Lecturas por hora (4 = cada 15 min)  |
--
-- IMPORTANTE: Agrega siempre -UseBasicParsing para evitar errores de seguridad en PowerShell.
--
-- === EJEMPLOS (copia y pega en PowerShell) ===

-- 1) Valores por defecto (Colmena Beta Lab, 30 días):
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing

-- 2) Llenar "Colmena Alfa Ppal" con 15 días de datos:
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -ContentType "application/json" -Body '{"colmena": "Colmena Alfa Ppal", "mac": "B1:B2:B3:B4:B5:B6", "dias": 15}'

-- 3) Llenar "Colmena Gamma Ppal" con 7 días, lecturas cada 30 min:
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -ContentType "application/json" -Body '{"colmena": "Colmena Gamma Ppal", "mac": "C1:C2:C3:C4:C5:C6", "dias": 7, "lecturasPorHora": 2}'

-- NOTA: Si la colmena no existe en la BD, el script dará error.
--       Verifica nombres exactos con:
SELECT id, nombre FROM colmenas;
-- ====================================================================


-- ====================================================================
-- CÓMO FUNCIONA LA APLICACIÓN ABEJANET - RESUMEN TÉCNICO
-- ====================================================================
--
-- === ARQUITECTURA GENERAL ===
--
-- [ESP32 Sensores] --HTTP POST--> [Backend Node.js en Render] <--HTTP--> [App Móvil Expo/React Native]
--                                        |
--                                 [PostgreSQL en Render]
--
-- === STACK TECNOLÓGICO ===
-- Frontend:  React Native + Expo SDK 51 + TypeScript + expo-router
-- Backend:   Node.js + Express (ESM modules) desplegado en Render
-- BD:        PostgreSQL hospedada en Render
-- IoT:      ESP32 (Arduino C++) con sensores de temperatura, humedad, peso, sonido, lluvia
--
-- === FLUJO DE DATOS DEL ESP32 ===
-- 1. ESP32 lee sensores cada 10 minutos
-- 2. Envía POST a /api/sensor-data con header X-API-Key
-- 3. Backend busca el sensor por MAC address
-- 4. Si no existe, lo auto-registra como 'no_asignado'
-- 5. Inserta lectura en tabla lecturas_ambientales
-- 6. Actualiza ultima_lectura_en del sensor
--
-- === SISTEMA DE AUTENTICACIÓN ===
-- - Login por email/contraseña (bcrypt) o Google Sign-In
-- - Access Token JWT: expira en 1 hora
-- - Refresh Token JWT: expira en 7 días, almacenado en BD y en SecureStore del dispositivo
-- - Interceptor Axios: refresco automático silencioso en errores 401
-- - Autenticación biométrica: se valida al regresar la app desde background
-- - Rotación de tokens: cada refresh genera un nuevo par
--
-- === PANTALLAS DE LA APP ===
-- (auth)/login.tsx          → Login (email + Google)
-- (auth)/register.tsx       → Registro de nuevos usuarios
-- (auth)/onboarding.tsx     → Bienvenida inicial (solo 1 vez)
-- (user)/dashboard.tsx      → Panel principal (resumen apiarios, colmenas, alertas)
-- (user)/ColmenasScreen.tsx  → Lista de colmenas del usuario
-- (user)/ColmenaDetailScreen.tsx → Detalle con gráficas de sensores (temp, humedad, peso, sonido)
-- (user)/AlertsScreen.tsx   → Alertas recibidas
-- (user)/profile.tsx        → Perfil del usuario
-- (admin)/adminDashboard.tsx → Dashboard de administrador
--
-- === ENDPOINTS PRINCIPALES DEL BACKEND ===
-- POST /api/login                          → Autenticación
-- POST /api/register                       → Registro
-- POST /api/auth/google                    → Login con Google
-- POST /api/refresh-token                  → Renovar tokens
-- GET  /api/dashboard-summary              → Resumen para el dashboard (requiere token)
-- GET  /api/apiarios                       → Listar apiarios del usuario (requiere token)
-- GET  /api/apiarios/:id/colmenas          → Colmenas de un apiario (requiere token)
-- GET  /api/colmenas/:id/lecturas?range=   → Lecturas con filtro: day/week/month (requiere token)
-- PUT  /api/profile                        → Actualizar perfil (requiere token)
-- POST /api/sensor-data                    → Recibir datos ESP32 (requiere X-API-Key)
-- POST /api/lecturas                       → Recibir datos ESP32 (endpoint alternativo)
-- GET  /api/alertas                        → Obtener alertas del usuario (requiere token)
-- POST /api/alertas                        → Registrar alerta + enviar push notification
-- POST /api/alertas/marcar-como-leidas     → Marcar todas las alertas como leídas
-- POST /api/save-push-token                → Guardar token de notificaciones push
--
-- === ENDPOINTS DE DEBUG (solo desarrollo) ===
-- GET  /debug/data                         → Ver totales de todas las tablas
-- POST /debug/populate-data                → Generar datos simulados (acepta JSON con parámetros)
-- POST /debug/assign-users                 → Asignar usuarios a apiarios
-- POST /debug/setup-database               → Recrear esquema BD (requiere SETUP_SECRET)
-- GET  /api/test-notification              → Probar push notification sin tocar BD
--
-- === SISTEMA DE NOTIFICACIONES PUSH ===
-- 1. Al hacer login, la app registra su push token (Expo Push) en la BD
-- 2. Cuando se crea una alerta (POST /api/alertas), el backend:
--    a) Inserta la alerta en la tabla alertas
--    b) Busca todos los usuarios asociados a esa colmena
--    c) Envía notificación push via Expo a cada usuario con token
--    d) El badge muestra el conteo de alertas no leídas
--
-- === VARIABLES DE ENTORNO REQUERIDAS (backend/.env) ===
-- DATABASE_URL                → Conexión PostgreSQL (External URL de Render)
-- JWT_SECRET                  → Secreto para firmar tokens JWT
-- SETUP_SECRET                → Clave para el endpoint de setup de BD
-- GOOGLE_WEB_CLIENT_ID        → OAuth Google (web)
-- GOOGLE_ANDROID_CLIENT_ID    → OAuth Google (Android release)
-- GOOGLE_ANDROID_CLIENT_ID_DEBUG → OAuth Google (Android debug)
-- ESP32_API_KEY               → Autenticación de dispositivos IoT
-- PORT                        → Puerto del servidor (default: 3000)
-- DB_SSL                      → "true" para SSL con PostgreSQL
--
-- === USUARIOS DE PRUEBA ===
-- Administrador: admin@abejanet.com / admin123
-- Usuario:       ana_cliente@abejanet.com / ana123
--
-- === CÓMO CORRER LA APP EN ANDROID ===
-- 1. Conectar celular por USB con Depuración USB activada
-- 2. Autorizar la PC en el diálogo del celular
-- 3. Verificar conexión: adb devices (debe aparecer como "device", no "unauthorized")
-- 4. Instalar dependencias: npm install
-- 5. Ejecutar: npx expo run:android
--
-- === DESPLIEGUE ===
-- Backend: Render (https://abejanet-backend.onrender.com) - autodeploy desde GitHub
-- App:     EAS Build (Expo Application Services) - paquete com.markg777.AbejaNet
-- ====================================================================
