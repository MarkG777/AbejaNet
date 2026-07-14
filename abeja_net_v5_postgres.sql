-- ======================================================
-- BASE DE DATOS: AbejaNet v5 (Versión para PostgreSQL)
-- Basada en v4 + tabla bitacora apícola (RQF-05)
-- Compatible con servidor Render (PostgreSQL)
-- ======================================================

-- Limpiamos las tablas si existen para poder re-ejecutar el script
-- Orden: dependencias primero (hijas antes que padres)
DROP TABLE IF EXISTS bitacora;
DROP TABLE IF EXISTS lecturas_ambientales;
DROP TABLE IF EXISTS alertas;
DROP TABLE IF EXISTS sensores;
DROP TABLE IF EXISTS usuarios_apiarios;
DROP TABLE IF EXISTS colmenas;
DROP TABLE IF EXISTS apiarios;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;
DROP TYPE IF EXISTS sensor_estado;

-- ------------------------------------------------------
-- TABLAS ESTRUCTURALES (Usuarios y Permisos)
-- ------------------------------------------------------

CREATE TABLE roles (
  id        SMALLSERIAL PRIMARY KEY,
  nombre    VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
  id                  SERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NULL DEFAULT NULL,
  apellido_paterno    VARCHAR(100) NULL DEFAULT NULL,
  apellido_materno    VARCHAR(100) NULL DEFAULT NULL,
  correo_electronico  VARCHAR(120) NOT NULL UNIQUE,
  contrasena          VARCHAR(255) NULL DEFAULT NULL, -- Permite NULL para usuarios de Google
  push_token          VARCHAR(255) NULL DEFAULT NULL,
  refresh_token       TEXT NULL,                      -- Fase 2.4: Sesiones persistentes Móvil
  proveedor_auth      VARCHAR(20) DEFAULT 'local',     -- 'local' o 'google'
  secreto_2fa         VARCHAR(255) NULL DEFAULT NULL,  -- 2FA TOTP (web admin). NULL = no requiere 2FA
  rol_id              SMALLINT NOT NULL,
  esta_activo         BOOLEAN DEFAULT TRUE,
  fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- ------------------------------------------------------
-- TABLAS DE GESTIÓN (Apiarios y Colmenas)
-- ------------------------------------------------------

CREATE TABLE apiarios (
  id                          SERIAL PRIMARY KEY,
  nombre                      VARCHAR(150) NOT NULL UNIQUE,
  descripcion_general         TEXT NULL,
  direccion_o_coordenadas     VARCHAR(255) NULL,
  fecha_creacion              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por_usuario_id       INTEGER NULL,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE colmenas (
  id                        SERIAL PRIMARY KEY,
  apiario_id                INTEGER NOT NULL,
  nombre                    VARCHAR(100) NOT NULL UNIQUE,
  descripcion_especifica    TEXT NULL,
  fecha_creacion            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apiario_id) REFERENCES apiarios(id) ON DELETE CASCADE
);

CREATE TABLE usuarios_apiarios (
  usuario_id            INTEGER NOT NULL,
  apiario_id            INTEGER NOT NULL,
  fecha_asignacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  asignado_por_admin_id INTEGER NULL,
  PRIMARY KEY (usuario_id, apiario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (apiario_id) REFERENCES apiarios(id) ON DELETE CASCADE,
  FOREIGN KEY (asignado_por_admin_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ------------------------------------------------------
-- TABLAS DE SENSORES Y LECTURAS
-- ------------------------------------------------------

-- Creamos un tipo ENUM para el estado del sensor
CREATE TYPE sensor_estado AS ENUM ('activo', 'inactivo', 'mantenimiento', 'no_asignado');

CREATE TABLE sensores (
  id                  SERIAL PRIMARY KEY,
  mac_address         VARCHAR(17) UNIQUE NULL,
  colmena_id          INTEGER NULL, 
  tipo_sensor         VARCHAR(50) DEFAULT 'General', 
  estado              sensor_estado DEFAULT 'no_asignado',
  fecha_instalacion   TIMESTAMP NULL,
  ultima_lectura_en   TIMESTAMP NULL,
  FOREIGN KEY (colmena_id) REFERENCES colmenas(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE lecturas_ambientales (
  id                BIGSERIAL PRIMARY KEY,
  sensor_id         INTEGER NOT NULL,
  humedad           DECIMAL(5, 2) NULL,
  temperatura       DECIMAL(5, 2) NULL,
  peso              DECIMAL(6, 2) NULL,
  sonido            DECIMAL(5, 2) NULL,
  lluvia            BOOLEAN NULL,
  fecha_registro    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensores(id) ON DELETE CASCADE
);

-- ------------------------------------------------------
-- TABLA DE ALERTAS
-- ------------------------------------------------------

CREATE TABLE alertas (
  id                SERIAL PRIMARY KEY,
  colmena_id        INTEGER NOT NULL,
  tipo_alerta       VARCHAR(50) NOT NULL, -- Ej: 'TEMPERATURA_ALTA', 'PESO_BAJO'
  valor_registrado  VARCHAR(20) NULL,     -- Ej: '45.5 C', '10.2 Kg'
  mensaje           VARCHAR(255) NOT NULL,
  leida             BOOLEAN DEFAULT FALSE,
  fecha_alerta      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (colmena_id) REFERENCES colmenas(id) ON DELETE CASCADE
);

-- ------------------------------------------------------
-- TABLA DE BITÁCORA APÍCOLA (NUEVA v5 — RQF-05)
-- ------------------------------------------------------
-- Registra eventos del apicultor: revisiones, cosechas,
-- alimentación, tratamientos, divisiones, observaciones.
-- Relaciona usuario y apiario para control de acceso.

CREATE TABLE bitacora (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL,
  apiario_id      INTEGER NOT NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_evento     VARCHAR(50) NOT NULL,   -- 'revision', 'cosecha', 'alimentacion', 'tratamiento', 'division', 'observacion', 'otro'
  descripcion     TEXT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (apiario_id) REFERENCES apiarios(id) ON DELETE CASCADE
);

-- Índice para optimizar consultas por usuario + fecha
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora(usuario_id, fecha DESC);
-- Índice para filtrar por apiario
CREATE INDEX idx_bitacora_apiario ON bitacora(apiario_id);

-- ======================================================
-- DATOS DE PRUEBA (Versión robusta)
-- ======================================================

-- NOTA: Las contraseñas están hasheadas con bcrypt (10 rounds).
-- Contraseñas originales: admin123, otro_admin_pass, ana123, inactivo123

INSERT INTO roles (nombre) VALUES ('administrador'), ('usuario');

INSERT INTO usuarios (nombre, apellido_paterno, correo_electronico, contrasena, rol_id) VALUES
('Admin', 'Principal', 'admin@abejanet.com', '$2b$10$qSab3b1mfy2j.Kwo4aOecuJ9c0vCIf7U4ALbWuArx2g.iq7.kiarW', (SELECT id FROM roles WHERE nombre = 'administrador')),
('Admin', 'Secundario', 'otro_admin@abejanet.com', '$2b$10$umbEO7ZifM9THuLlmgEmdeu2Ezmbc/RymxnEQfaMAnAFhGFYd/VIu', (SELECT id FROM roles WHERE nombre = 'administrador')),
('Ana', 'Cliente', 'ana_cliente@abejanet.com', '$2b$10$c26mygaY7Pm18Z6pBuHLT.lO2Hum3ECOx263UX7WIGffylur/iUAu', (SELECT id FROM roles WHERE nombre = 'usuario'));

-- Usuario inactivo
INSERT INTO usuarios (correo_electronico, contrasena, rol_id, esta_activo) VALUES
('usuario_inactivo@abejanet.com', '$2b$10$rFV2psn699BWdezZgq/a9ebS82k8gjifYE.v0.F7bkGKcgIVsPcZu', (SELECT id FROM roles WHERE nombre = 'usuario'), FALSE);

INSERT INTO apiarios (nombre, descripcion_general, direccion_o_coordenadas, creado_por_usuario_id) VALUES
('Apiario Principal', 'Apiario de prueba ubicado en el patio trasero.', '19.4326° N, 99.1332° W', (SELECT id FROM usuarios WHERE correo_electronico = 'admin@abejanet.com')),
('Apiario Secundario del Laboratorio', 'Apiario para experimentación.', '20.6597° N, 103.3496° W', (SELECT id FROM usuarios WHERE correo_electronico = 'otro_admin@abejanet.com'));

INSERT INTO colmenas (apiario_id, nombre, descripcion_especifica) VALUES
((SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), 'Colmena Alfa Ppal', 'Junto al árbol de limón.'),
((SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), 'Colmena Gamma Ppal', 'En la esquina noreste.'),
((SELECT id FROM apiarios WHERE nombre = 'Apiario Secundario del Laboratorio'), 'Colmena Beta Lab', 'Plataforma de pruebas 2B.');

INSERT INTO usuarios_apiarios (usuario_id, apiario_id, asignado_por_admin_id) VALUES
((SELECT id FROM usuarios WHERE correo_electronico = 'ana_cliente@abejanet.com'), (SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), (SELECT id FROM usuarios WHERE correo_electronico = 'admin@abejanet.com'));

INSERT INTO sensores (mac_address, colmena_id, tipo_sensor, estado, fecha_instalacion) VALUES
('AA:BB:CC:11:22:33', (SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa Ppal'), 'Temperatura/Humedad', 'activo', NOW()),
('AA:BB:CC:11:22:44', (SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa Ppal'), 'Peso', 'activo', NOW()),
('AA:BB:CC:11:22:55', (SELECT id FROM colmenas WHERE nombre = 'Colmena Beta Lab'), 'Temperatura/Humedad', 'activo', NOW()),
(NULL, NULL, 'General', 'no_asignado', NULL);

INSERT INTO lecturas_ambientales (sensor_id, humedad, temperatura, peso, sonido, lluvia) VALUES
((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:33' LIMIT 1), 65.5, 28.2, NULL, 55.4, false),
((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:44' LIMIT 1), NULL, NULL, 15.5, NULL, false),
((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:55' LIMIT 1), 70.1, 26.8, NULL, 62.1, false);

-- Datos de prueba para bitácora
INSERT INTO bitacora (usuario_id, apiario_id, fecha, tipo_evento, descripcion) VALUES
((SELECT id FROM usuarios WHERE correo_electronico = 'ana_cliente@abejanet.com'), (SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), CURRENT_DATE - 5, 'revision', 'Revisión general. Colmenas en buen estado, actividad normal.'),
((SELECT id FROM usuarios WHERE correo_electronico = 'ana_cliente@abejanet.com'), (SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), CURRENT_DATE - 2, 'cosecha', 'Cosecha de miel de la Colmena Alfa. Aproximadamente 8kg extraídos.'),
((SELECT id FROM usuarios WHERE correo_electronico = 'ana_cliente@abejanet.com'), (SELECT id FROM apiarios WHERE nombre = 'Apiario Principal'), CURRENT_DATE, 'alimentacion', 'Alimentación suplementaria con jarabe de azúcar 1:1.');
