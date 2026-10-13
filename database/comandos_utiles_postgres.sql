-- ====================================================================
-- Comandos Útiles para PostgreSQL - AbejaNet en Render
-- ====================================================================
-- Colección de scripts y comandos verificados contra la BD real
-- (abeja_net_v5, servicio Render "abejanet_agosto_26").
-- Última verificación: 2026-08-20.
-- ====================================================================
--
-- ===================== GUÍA RÁPIDA DE USO =====================
--
-- REQUISITO: psql (ya instalado en C:\Program Files\PostgreSQL\17\bin)
--            Ya está en el PATH del sistema, no necesitas instalarlo.
--
-- PASO 1: Abre PowerShell
--
-- PASO 2: Conéctate a la BD de Render con la EXTERNAL Database URL
--         (verificada funcionando):
psql "postgresql://<usuario>:<password>@<host>.oregon-postgres.render.com/abeja_net_v5"
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
-- NOTA: Usa la EXTERNAL URL (no la Internal) desde tu PC o la laptop de
--       cualquier compañero. La Internal solo funciona entre servicios
--       dentro de la red privada de Render (ej. tu backend hablándole a
--       esta misma BD), nunca desde una laptop externa.
-- ===============================================================


-- ====================================================================
-- ASIGNAR UN APIARIO A UN USUARIO (TRANSACCIÓN SEGURA)
-- ====================================================================
-- Verificado funcionando (usado para asignar zoevelaz@outlook.com el 2026-08-19).
-- Usa ON CONFLICT para evitar duplicados si ya estaba asignado.
DO $$
DECLARE
    -- ¡SOLO NECESITAS MODIFICAR ESTAS TRES LÍNEAS!
    correo_usuario_a_asignar TEXT := 'correo_del_usuario@ejemplo.com'; -- <-- Reemplaza (siempre en minúsculas)
    nombre_apiario_a_asignar TEXT := 'Apiario Principal';              -- <-- Reemplaza con el nombre del apiario
    correo_admin_que_asigna  TEXT := 'admin@abejanet.com';             -- <-- Reemplaza con el correo del admin

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
-- REGISTRAR ALERTAS DIRECTO EN LA BD (SQL puro, sin pasar por la API)
-- ====================================================================
-- OJO: la columna correcta es "fecha_alerta" (verificado con \d alertas).
-- Antes decía "fecha_generada" y eso hacía fallar el INSERT con
-- "column fecha_generada does not exist" — ya corregido.
-- Estas 3 colmenas existen en la BD (verificado 2026-08-20):
--   Colmena Alfa Ppal, Colmena Gamma Ppal, Colmena Beta Lab

-- Alerta de Temperatura Alta
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_alerta)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Beta Lab'),
  'TEMPERATURA_ALTA',
  '40.1 C',
  'La temperatura interna ha superado el umbral de seguridad de 35°C.',
  NOW()
);

-- Alerta de Posible Enjambrazón
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_alerta)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa Ppal'),
  'POSIBLE_ENJAMBRAZON',
  '-5.2 Kg',
  'Se detectó una pérdida de peso drástica. Revisar posible enjambrazón.',
  NOW()
);

-- Alerta de Humedad Baja
INSERT INTO alertas (colmena_id, tipo_alerta, valor_registrado, mensaje, fecha_alerta)
VALUES (
  (SELECT id FROM colmenas WHERE nombre = 'Colmena Gamma Ppal'),
  'HUMEDAD_BAJA',
  '45%',
  'La humedad ha caído por debajo del 50%. Riesgo de deshidratación.',
  NOW()
);
-- NOTA: esto NO envía notificación push (es un INSERT directo a la BD).
-- Para probar el push de verdad, usa la sección de abajo ("PROBAR ALERTA
-- CON NOTIFICACIÓN PUSH"), que sí pasa por el backend y sí notifica.


-- ====================================================================
-- PROBAR ALERTA CON NOTIFICACIÓN PUSH (DESDE TU TERMINAL, vía API)
-- ====================================================================
-- IMPORTANTE: este endpoint requiere el header x-api-key (el mismo valor
-- que ESP32_API_KEY en las variables de entorno de Render). Sin el header
-- responde 401 Unauthorized (verificado 2026-08-20 con curl).
--
-- OPCIÓN A) COMANDO PARA BASH (Linux / Mac):
-- curl -X POST https://abejanet-backend.onrender.com/api/alertas -H "Content-Type: application/json" -H "x-api-key: TU_ESP32_API_KEY" -d '{"colmena_id": 3, "tipo_alerta": "HUMEDAD_BAJA", "valor_registrado": "45%", "mensaje": "¡Humedad crítica!"}'
--
-- OPCIÓN B) COMANDO PARA POWERSHELL (Windows):
Invoke-RestMethod -Uri "https://abejanet-backend.onrender.com/api/alertas" -Method POST -ContentType "application/json" -Headers @{"x-api-key" = "TU_ESP32_API_KEY"} -Body '{"colmena_id": 2, "tipo_alerta": "HUMEDAD_BAJA", "valor_registrado": "45%", "mensaje": "¡La humedad ha caído por debajo del 50%. Riesgo de deshidratación!"}'
--
-- Esto SÍ inserta en la tabla alertas Y manda push a los usuarios con
-- push_token asignados a la colmena indicada.


-- ====================================================================
-- PROBAR NOTIFICACIONES PUSH RÁPIDAS (SIN INSERTAR EN LA BD)
-- ====================================================================
-- Este endpoint es público (sin autenticación) y solo hace "timbrar" el
-- celular para verificar que los tokens Push guardados funcionan, sin
-- ensuciar la tabla de alertas. Sirve para dispararlo desde cualquier
-- navegador (celular o laptop) sin necesitar PowerShell.
-- Es GET, no POST. Para dirigirlo a otra colmena, cambia el parámetro:
--
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/api/test-notification?colmena=Colmena%20Alfa%20Ppal" -Method GET
--
-- La notificación llega al celular que tenga sesión iniciada y esté
-- asignado a esa colmena (con permiso de notificaciones concedido) —
-- no al dispositivo que dispara el link.


-- ====================================================================
-- GENERAR DATOS SIMULADOS (MOCK DATA) PARA GRÁFICAS
-- ====================================================================
-- Verificado: los parámetros (colmena, mac, dias, lecturasPorHora)
-- coinciden exactamente con backend/generate_mock_data.js.
-- ⚠️ No ejecutes 'node generate_mock_data.js' localmente — requiere
-- variables de entorno que solo existen en Render.
-- ✅ Usa el endpoint del backend en Render en su lugar:
--
-- IMPORTANTE: este endpoint requiere el header x-setup-secret (mismo
-- SETUP_SECRET que usan /debug/setup-database y /debug/data). Sin él
-- responde 403 Forbidden "Clave secreta incorrecta o no proporcionada"
-- (verificado 2026-08-20). El SETUP_SECRET real de Render es:
--   <SETUP_SECRET_real_de_Render>
-- (el de tu backend/.env local es solo un placeholder, no sirve aquí)
--
-- SINTAXIS GENERAL (PowerShell), ya probada y funcionando:
Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -ContentType "application/json" -Headers @{"x-setup-secret" = "<SETUP_SECRET_real_de_Render>"} -Body '{"colmena": "Colmena Alfa Ppal", "mac": "A2:04:2A:B9:C1:D9", "dias": 30, "lecturasPorHora": 4}'
--
-- PARÁMETROS DISPONIBLES (todos son opcionales):
-- | Parámetro       | Default                | Descripción                          |
-- |-----------------|------------------------|--------------------------------------|
-- | colmena         | "Colmena Beta Lab"     | Nombre exacto de la colmena en BD    |
-- | mac             | "A2:04:2A:B9:C1:D9"    | MAC del sensor simulado              |
-- | dias            | 30                     | Cuántos días de datos generar        |
-- | lecturasPorHora | 4                      | Lecturas por hora (4 = cada 15 min)  |
--
-- IMPORTANTE: Agrega siempre -UseBasicParsing para evitar errores de seguridad en PowerShell.
-- OJO: si usas una MAC que ya existe en otra colmena, el sensor SE REASIGNA
-- a la colmena nueva (es un ON CONFLICT ... DO UPDATE en el backend).
--
-- === EJEMPLOS ===
--
-- 1) Valores por defecto (Colmena Beta Lab, 30 días):
-- Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -Headers @{"x-setup-secret" = "<SETUP_SECRET_real_de_Render>"}
--
-- 2) Llenar "Colmena Alfa Ppal" con 15 días de datos (verificado 2026-08-20, funcionó):
-- Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -ContentType "application/json" -Headers @{"x-setup-secret" = "<SETUP_SECRET_real_de_Render>"} -Body '{"colmena": "Colmena Alfa Ppal", "mac": "B1:B2:B3:B4:B5:B6", "dias": 15}'
--
-- 3) Llenar "Colmena Gamma Ppal" con 7 días, lecturas cada 30 min:
-- Invoke-WebRequest -Uri "https://abejanet-backend.onrender.com/debug/populate-data" -Method POST -UseBasicParsing -ContentType "application/json" -Headers @{"x-setup-secret" = "<SETUP_SECRET_real_de_Render>"} -Body '{"colmena": "Colmena Gamma Ppal", "mac": "C1:C2:C3:C4:C5:C6", "dias": 7, "lecturasPorHora": 2}'
--
-- NOTA: Si la colmena no existe en la BD, el script dará error.
--       Verifica nombres exactos con la consulta de "Ver colmenas" de abajo.


-- ====================================================================
-- RESTAURAR / RECREAR LA BASE DE DATOS DESDE CERO
-- ====================================================================
-- Este comando BORRA toda la base de datos actual y la recrea desde el
-- esquema. Úsalo con mucho cuidado — es destructivo e irreversible.
-- El esquema vigente es abeja_net_v5_postgres.sql (es el mismo que usa
-- el endpoint /debug/setup-database del backend, verificado en
-- backend/index.js). Los archivos v3/v4 son versiones viejas, no los uses.
--
-- ✅ VERIFICADO 2026-08-20: se comparó abeja_net_v5_postgres.sql contra la
-- BD real de Render, tabla por tabla (9 tablas) — coinciden exactamente
-- (tipos, NOT NULL, defaults, FKs, índices, y el enum sensor_estado). Única
-- diferencia cosmética: bitacora.colmena_id quedó al final en la BD real
-- en vez de la 4ª posición (se agregó después vía ALTER TABLE), sin
-- impacto funcional. El archivo sí es una foto fiel de la BD actual.
--
-- Opción A) Desde tu PC con psql -f:
-- psql "postgresql://<usuario>:<password>@<host>.oregon-postgres.render.com/abeja_net_v5" -f abeja_net_v5_postgres.sql
--
-- Opción B) Sin salir de tu PC, vía el endpoint protegido del backend
-- (SETUP_SECRET real de Render, no el placeholder de tu backend/.env local):
-- Invoke-RestMethod -Uri "https://abejanet-backend.onrender.com/debug/setup-database" -Method POST -ContentType "application/json" -Body '{"secret":"<SETUP_SECRET_real_de_Render>"}'


-- ====================================================================
-- NOTA SOBRE EL ESP32
-- ====================================================================
-- El ESP32 manda sus lecturas a la URL pública de producción:
-- 'https://abejanet-backend.onrender.com/api/lecturas'
-- Las credenciales (WiFi + x-api-key) viven en secrets.h (gitignoreado),
-- no en el .ino directamente — ver secrets.h.example para la plantilla.
-- ====================================================================


-- ====================================================================
-- BÚSQUEDAS Y CONSULTAS DE REFERENCIA (todas de solo lectura, seguras)
-- ====================================================================

-- Ver todas las colmenas y a qué apiario pertenecen
SELECT c.id, c.nombre, a.nombre AS apiario FROM colmenas c JOIN apiarios a ON c.apiario_id = a.id;

-- Ver todos los sensores registrados (incluyendo los auto-registrados por el ESP32)
SELECT id, mac_address, colmena_id, estado, fecha_instalacion, ultima_lectura_en
FROM sensores ORDER BY id DESC;

-- Ver sensores sin asignar (recién auto-registrados, esperando que los asignes a una colmena)
SELECT id, mac_address, estado, ultima_lectura_en
FROM sensores WHERE estado = 'no_asignado';

-- Asignar un sensor existente a una colmena (cambia el MAC y el colmena_id)
UPDATE sensores SET colmena_id = 3, estado = 'activo' WHERE mac_address = 'AA:BB:CC:11:22:33';

-- Ver las últimas 20 lecturas de sensores recibidas
SELECT la.id, s.mac_address, la.temperatura, la.humedad, la.peso, la.sonido, la.lluvia, la.fecha_registro
FROM lecturas_ambientales la
JOIN sensores s ON la.sensor_id = s.id
ORDER BY la.fecha_registro DESC LIMIT 20;

-- Ver las últimas 20 alertas generadas (con el nombre de la colmena)
SELECT al.id, c.nombre AS colmena, al.tipo_alerta, al.valor_registrado, al.mensaje, al.leida, al.fecha_alerta
FROM alertas al
JOIN colmenas c ON al.colmena_id = c.id
ORDER BY al.fecha_alerta DESC LIMIT 20;

-- Ver usuarios y a qué apiarios están asignados
SELECT u.id, u.correo_electronico, u.rol_id, a.nombre AS apiario
FROM usuarios u
JOIN usuarios_apiarios ua ON u.id = ua.usuario_id
JOIN apiarios a ON ua.apiario_id = a.id
ORDER BY u.id;

-- Ver usuarios SIN ningún apiario asignado (no verían nada en la app)
SELECT id, correo_electronico, rol_id FROM usuarios u
WHERE NOT EXISTS (SELECT 1 FROM usuarios_apiarios ua WHERE ua.usuario_id = u.id);

-- Buscar un usuario por correo (case-insensitive, útil porque el login ya normaliza a minúsculas)
SELECT id, correo_electronico, rol_id, esta_activo, proveedor_auth, push_token IS NOT NULL AS tiene_push_token
FROM usuarios WHERE LOWER(correo_electronico) = LOWER('correo@ejemplo.com');

-- Ver quién tiene token de notificaciones push registrado (para saber a quién le va a llegar una alerta)
SELECT id, correo_electronico FROM usuarios WHERE push_token IS NOT NULL;

-- Ver la bitácora apícola más reciente (revisiones, cosechas, tratamientos, etc.)
SELECT b.id, u.correo_electronico AS usuario, a.nombre AS apiario, b.fecha, b.tipo_evento, b.descripcion
FROM bitacora b
JOIN usuarios u ON b.usuario_id = u.id
JOIN apiarios a ON b.apiario_id = a.id
ORDER BY b.fecha DESC, b.created_at DESC LIMIT 20;

-- Contar registros de todas las tablas de un vistazo (equivalente en SQL al endpoint /debug/data)
SELECT
  (SELECT COUNT(*) FROM roles) AS roles,
  (SELECT COUNT(*) FROM usuarios) AS usuarios,
  (SELECT COUNT(*) FROM apiarios) AS apiarios,
  (SELECT COUNT(*) FROM colmenas) AS colmenas,
  (SELECT COUNT(*) FROM sensores) AS sensores,
  (SELECT COUNT(*) FROM lecturas_ambientales) AS lecturas,
  (SELECT COUNT(*) FROM alertas) AS alertas,
  (SELECT COUNT(*) FROM usuarios_apiarios) AS usuarios_apiarios,
  (SELECT COUNT(*) FROM bitacora) AS bitacora;

-- Borrar una cuenta de prueba/diagnóstico por correo (ajusta el correo antes de correrlo)
-- DELETE FROM usuarios WHERE correo_electronico = 'correo_de_prueba@ejemplo.com';


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
-- IoT:       ESP32 (Arduino C++) con sensores de temperatura, humedad, peso, sonido, lluvia
--
-- === FLUJO DE DATOS DEL ESP32 ===
-- 1. ESP32 lee sensores cada minuto (ver sendInterval en el .ino)
-- 2. Envía POST a /api/lecturas con header X-API-Key
-- 3. Backend busca el sensor por MAC address
-- 4. Si no existe, lo auto-registra como 'no_asignado'
-- 5. Inserta lectura en tabla lecturas_ambientales
-- 6. Actualiza ultima_lectura_en del sensor
--
-- === SISTEMA DE AUTENTICACIÓN ===
-- - Login por email/contraseña (bcrypt) o Google Sign-In
-- - Correo se normaliza a minúsculas en registro/login/reset (fix 2026-08-19,
--   evita cuentas duplicadas tipo Nombre@x.com vs nombre@x.com)
-- - Access Token JWT: expira en 1 hora
-- - Refresh Token JWT: expira en 7 días, almacenado en BD y en SecureStore del dispositivo
-- - Interceptor Axios: refresco automático silencioso en errores 401
-- - Autenticación biométrica: se valida al regresar la app desde background
--   (si el dispositivo no tiene sensor de huella/Face ID, se salta sin bloquear)
-- - Rotación de tokens: cada refresh genera un nuevo par
--
-- === PANTALLAS DE LA APP ===
-- (auth)/login.tsx               → Login (email + Google)
-- (auth)/register.tsx            → Registro de nuevos usuarios
-- (auth)/onboarding.tsx          → Bienvenida inicial (solo 1 vez)
-- (user)/dashboard.tsx           → Panel principal (resumen apiarios, colmenas, alertas)
-- (user)/ColmenasScreen.tsx      → Lista de colmenas del usuario
-- (user)/ColmenaDetailScreen.tsx → Detalle con gráficas de sensores (temp, humedad, peso, sonido)
-- (user)/AlertsScreen.tsx        → Alertas recibidas
-- (user)/profile.tsx             → Perfil del usuario
-- (admin)/adminDashboard.tsx     → Dashboard de administrador
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
-- POST /api/alertas                        → Registrar alerta + enviar push notification (requiere X-API-Key)
-- POST /api/alertas/marcar-como-leidas     → Marcar todas las alertas como leídas
-- POST /api/save-push-token                → Guardar token de notificaciones push
-- GET  /api/test-notification              → Probar push notification sin tocar BD (sin auth)
--
-- === ENDPOINTS DE DEBUG (solo desarrollo, protegidos con SETUP_SECRET) ===
-- GET  /debug/data                         → Ver totales de todas las tablas
-- POST /debug/populate-data                → Generar datos simulados (acepta JSON con parámetros)
-- POST /debug/assign-users                 → Asignar usuarios a apiarios
-- POST /debug/setup-database               → Recrear esquema BD (requiere SETUP_SECRET)
--
-- === SISTEMA DE NOTIFICACIONES PUSH ===
-- 1. Al hacer login, la app pide permiso y registra su push token (Expo Push) en la BD
-- 2. Requiere el permiso POST_NOTIFICATIONS en AndroidManifest.xml (Android 13+/API 33+)
-- 3. Cuando se crea una alerta (POST /api/alertas), el backend:
--    a) Inserta la alerta en la tabla alertas
--    b) Busca todos los usuarios asociados a esa colmena
--    c) Envía notificación push vía Expo a cada usuario con token
--    d) El badge muestra el conteo de alertas no leídas
--
-- === VARIABLES DE ENTORNO REQUERIDAS (Render, no tu .env local) ===
-- DATABASE_URL                → Conexión PostgreSQL (Internal URL, backend y BD están en Render)
-- JWT_SECRET                  → Secreto para firmar tokens JWT
-- SETUP_SECRET                → Clave para el endpoint de setup de BD
-- GOOGLE_WEB_CLIENT_ID        → OAuth Google (web)
-- GOOGLE_ANDROID_CLIENT_ID    → OAuth Google (Android release)
-- GOOGLE_ANDROID_CLIENT_ID_DEBUG → OAuth Google (Android debug)
-- ESP32_API_KEY               → Autenticación de dispositivos IoT y del endpoint /api/alertas
-- PORT                        → Puerto del servidor (default: 3000)
-- DB_SSL                      → "true" para SSL con PostgreSQL
-- NOTA: backend/.env local trae placeholders, no los valores reales — los
-- valores reales solo están en Render Dashboard > abejanet_backend > Environment.
--
-- === USUARIOS DE PRUEBA (seed original de abeja_net_v5_postgres.sql) ===
-- Administrador: admin@abejanet.com / admin123
-- Usuario:       ana_cliente@abejanet.com / ana123
--
-- === CÓMO CORRER LA APP EN ANDROID ===
-- 1. Conectar celular por USB con Depuración USB activada
-- 2. Autorizar la PC en el diálogo del celular
-- 3. Verificar conexión: adb devices (debe aparecer como "device", no "unauthorized" ni una IP:puerto)
-- 4. Instalar dependencias: npm install
-- 5. Debug + Metro juntos (compila e instala):  npx expo run:android
-- 6. APK standalone para repartir (sin depender de tu PC): npx expo run:android --variant release
--    El APK queda en android/app/build/outputs/apk/release/app-release.apk
--
-- === DESPLIEGUE ===
-- Backend: Render (https://abejanet-backend.onrender.com) - autodeploy desde GitHub (rama main)
-- App:     build local (expo run:android) o EAS Build - paquete com.markg777.AbejaNet
-- ====================================================================
