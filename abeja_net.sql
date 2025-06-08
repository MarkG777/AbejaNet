-- Aquí creamos la base de datos
DROP DATABASE IF EXISTS abeja_net_esp_v5;
CREATE DATABASE abeja_net_esp_v5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE abeja_net_esp_v5;

-- Tabla para los roles de cada usuario
CREATE TABLE roles (
  id        TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre    VARCHAR(20) NOT NULL UNIQUE         -- 'administrador', 'usuario'
);

-- Tabla usuarios
CREATE TABLE usuarios (
  id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  correo_electronico  VARCHAR(120) NOT NULL UNIQUE,
  contrasena          VARCHAR(255) NOT NULL, 
  rol_id              TINYINT UNSIGNED NOT NULL,
  esta_activo         BOOLEAN DEFAULT TRUE,
  fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Tabla para las colmenas/nidos
CREATE TABLE colmenas (
  id                    INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre                VARCHAR(100) NOT NULL UNIQUE,
  descripcion_ubicacion TEXT,
  fecha_creacion        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creada_por_usuario_id INT UNSIGNED NULL,
  FOREIGN KEY (creada_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabla para los sensores
CREATE TABLE sensores (
  id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  colmena_id          INT UNSIGNED NULL, 
  tipo_sensor         VARCHAR(50) DEFAULT 'General', 
  estado              ENUM('activo', 'inactivo', 'mantenimiento', 'no_asignado') DEFAULT 'no_asignado',
  fecha_instalacion   DATETIME NULL,
  ultima_lectura_en   DATETIME NULL,
  FOREIGN KEY (colmena_id) REFERENCES colmenas(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabla para los datos ambientales
CREATE TABLE lecturas_ambientales (
  id                BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sensor_id         INT UNSIGNED NOT NULL,
  fecha_registro    DATETIME DEFAULT CURRENT_TIMESTAMP,
  humedad           DECIMAL(5,2) NULL, 
  temperatura       DECIMAL(5,2) NULL, 
  lluvia            BOOLEAN NULL,      
  calidad_aire      DECIMAL(6,2) NULL, 
  presion           DECIMAL(7,2) NULL,
  FOREIGN KEY (sensor_id) REFERENCES sensores(id) ON DELETE CASCADE
);
--peso, temperatura, humendad y lluevia y la humedad es entere, temperatura es decimal / el protocolo que pidio la maestra maribel es gsm
-- Datos de prueba

-- roles
INSERT INTO roles (nombre) VALUES
  ('administrador'),
  ('usuario');

-- usuarios de ejemplo
INSERT INTO usuarios (correo_electronico, contrasena, rol_id, esta_activo) VALUES
  ('admin@abejanet.com',  'admin123', (SELECT id FROM roles WHERE nombre = 'administrador'), TRUE),
  ('otro_admin@abejanet.com', 'otro_admin_pass', (SELECT id FROM roles WHERE nombre = 'administrador'), TRUE),
  ('usuario_inactivo@abejanet.com', 'inactivo123', (SELECT id FROM roles WHERE nombre = 'usuario'), FALSE),
  ('ana_cliente@abejanet.com', 'ana123', (SELECT id FROM roles WHERE nombre = 'usuario'), TRUE);

-- colmenas de ejemplo
INSERT INTO colmenas (nombre, descripcion_ubicacion, creada_por_usuario_id) VALUES
  ('Colmena Alfa', 'Patio trasero, sección A', (SELECT id FROM usuarios WHERE correo_electronico = 'admin@abejanet.com')),
  ('Colmena Beta', 'Laboratorio, sección B', (SELECT id FROM usuarios WHERE correo_electronico = 'otro_admin@abejanet.com'));

-- sensores de ejemplo
INSERT INTO sensores (colmena_id, tipo_sensor, estado, fecha_instalacion) VALUES
  ((SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa'), 'Temperatura/Humedad', 'activo', NOW()),
  ((SELECT id FROM colmenas WHERE nombre = 'Colmena Alfa'), 'Peso', 'activo', NOW()),
  ((SELECT id FROM colmenas WHERE nombre = 'Colmena Beta'), 'Temperatura/Humedad', 'activo', NOW()),
  (NULL, 'General', 'no_asignado', NULL);

-- lecturas ambientales de ejemplo
INSERT INTO lecturas_ambientales
  (sensor_id, humedad, temperatura, lluvia)
VALUES
  (1, 60.1, 29.5, FALSE), 
  (1, 60.5, 29.3, FALSE),
  (2, NULL, NULL, NULL), 
  (3, 55.5, 22.1, FALSE);