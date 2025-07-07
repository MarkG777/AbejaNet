-- ======================================================
-- BASE DE DATOS: AbejaNet v3 (con Perfil de Usuario)
-- ======================================================

-- NOTA: Este script está diseñado para operar sobre la base de datos 'abeja_net_v2' 
-- en el servidor, para mantener los permisos de usuario existentes.

DROP DATABASE IF EXISTS abeja_net_v2;
CREATE DATABASE abeja_net_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE abeja_net_v2;

-- ------------------------------------------------------
-- TABLAS ESTRUCTURALES (Usuarios y Permisos)
-- ------------------------------------------------------

CREATE TABLE roles (
  id        TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre    VARCHAR(20) NOT NULL UNIQUE
);

-- MODIFICADA: Se añaden campos para el perfil del usuario
CREATE TABLE usuarios (
  id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre              VARCHAR(100) NULL DEFAULT NULL,
  apellido_paterno    VARCHAR(100) NULL DEFAULT NULL,
  apellido_materno    VARCHAR(100) NULL DEFAULT NULL,
  correo_electronico  VARCHAR(120) NOT NULL UNIQUE,
  contrasena          VARCHAR(255) NOT NULL, 
  rol_id              TINYINT UNSIGNED NOT NULL,
  esta_activo         BOOLEAN DEFAULT TRUE,
  fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- ------------------------------------------------------
-- TABLAS DE GESTIÓN (Apiarios y Colmenas)
-- ------------------------------------------------------

CREATE TABLE apiarios (
  id                          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre                      VARCHAR(150) NOT NULL UNIQUE,
  descripcion_general         TEXT NULL,
  direccion_o_coordenadas     VARCHAR(255) NULL,
  fecha_creacion              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_por_usuario_id       INT UNSIGNED NULL,
  FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE colmenas (
  id                        INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  apiario_id                INT UNSIGNED NOT NULL,
  nombre                    VARCHAR(100) NOT NULL UNIQUE,
  descripcion_especifica    TEXT NULL,
  fecha_creacion            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apiario_id) REFERENCES apiarios(id) ON DELETE CASCADE
);

CREATE TABLE usuarios_apiarios (
  usuario_id            INT UNSIGNED NOT NULL,
  apiario_id            INT UNSIGNED NOT NULL,
  fecha_asignacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  asignado_por_admin_id INT UNSIGNED NULL,
  PRIMARY KEY (usuario_id, apiario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (apiario_id) REFERENCES apiarios(id) ON DELETE CASCADE,
  FOREIGN KEY (asignado_por_admin_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ------------------------------------------------------
-- TABLAS DE SENSORES Y LECTURAS
-- ------------------------------------------------------

CREATE TABLE sensores (
  id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mac_address         VARCHAR(17) UNIQUE NULL,
  colmena_id          INT UNSIGNED NULL, 
  tipo_sensor         VARCHAR(50) DEFAULT 'General', 
  estado              ENUM('activo', 'inactivo', 'mantenimiento', 'no_asignado') DEFAULT 'no_asignado',
  fecha_instalacion   DATETIME NULL,
  ultima_lectura_en   DATETIME NULL,
  FOREIGN KEY (colmena_id) REFERENCES colmenas(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE lecturas_ambientales (
  id                BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sensor_id         INT UNSIGNED NOT NULL,
  humedad           DECIMAL(5, 2) NULL,
  temperatura       DECIMAL(5, 2) NULL,
  peso              DECIMAL(6, 2) NULL,
  sonido            DECIMAL(5, 2) NULL,
  lluvia            BOOLEAN NULL,
  fecha_registro    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensores(id) ON DELETE CASCADE
);

-- ======================================================
-- DATOS DE PRUEBA
-- ======================================================

INSERT INTO roles (nombre) VALUES ('administrador'), ('usuario');

-- MODIFICADO: Se añaden nombres a algunos usuarios y se dejan otros como NULL
INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, correo_electronico, contrasena, rol_id, esta_activo) VALUES
  ('Admin', 'Principal', NULL, 'admin@abejanet.com',  'admin123', (SELECT id FROM roles WHERE nombre = 'administrador'), TRUE),
  ('Admin', 'Secundario', NULL, 'otro_admin@abejanet.com', 'otro_admin_pass', (SELECT id FROM roles WHERE nombre = 'administrador'), TRUE),
  (NULL, NULL, NULL, 'usuario_inactivo@abejanet.com', 'inactivo123', (SELECT id FROM roles WHERE nombre = 'usuario'), FALSE),
  ('Ana', 'Cliente', 'Feliz', 'ana_cliente@abejanet.com', 'ana123', (SELECT id FROM roles WHERE nombre = 'usuario'), TRUE);

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
  ((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:33'), 65.5, 28.2, NULL, 55.4, false),
  ((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:44'), NULL, NULL, 15.5, NULL, false),
  ((SELECT id FROM sensores WHERE mac_address = 'AA:BB:CC:11:22:55'), 70.1, 26.8, NULL, 62.1, false);

-- ------------------------------------------------------
-- TABLA DE ALERTAS
-- ------------------------------------------------------

CREATE TABLE alertas (
  id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  colmena_id        INT UNSIGNED NOT NULL,
  tipo_alerta       VARCHAR(50) NOT NULL, -- Ej: 'TEMPERATURA_ALTA', 'PESO_BAJO'
  valor_registrado  VARCHAR(20) NULL,     -- Ej: '45.5 C', '10.2 Kg'
  mensaje           VARCHAR(255) NOT NULL,
  leida             BOOLEAN DEFAULT FALSE,
  fecha_alerta      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (colmena_id) REFERENCES colmenas(id) ON DELETE CASCADE
);
