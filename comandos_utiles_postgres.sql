-- ====================================================================
-- Comandos Útiles para PostgreSQL - AbejaNet en Render
-- ====================================================================
-- Este archivo contiene una colección de scripts y comandos comunes
-- adaptados para la base de datos PostgreSQL.
-- ====================================================================


-- ====================================================================
-- ASIGNAR UN APIARIO A UN USUARIO (TRANSACCIÓN SEGURA)
-- ====================================================================
-- Este bloque asigna un usuario a un apiario. Usa ON CONFLICT para evitar duplicados.
DO $$
DECLARE
    -- ¡SOLO NECESITAS MODIFICAR ESTAS TRES LÍNEAS!
    correo_usuario_a_asignar TEXT := 'alejandrapadilla@gmail.com'; -- <-- Reemplaza con el correo del usuario
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
-- IMPORTANTE: Reemplaza 'https://abejanet-backend.onrender.com' con la URL real de tu servicio en Render.
curl -X POST https://abejanet-backend.onrender.com/api/alertas \
-H "Content-Type: application/json" \
-d '{
  "colmena_id": 3,
  "tipo_alerta": "HUMEDAD_BAJA",
  "valor_registrado": "45%",
  "mensaje": "¡La humedad ha caído por debajo del 50%. Riesgo de deshidratación!"
}'


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
