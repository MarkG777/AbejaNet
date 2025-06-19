DROP DATABASE classaccess;
CREATE DATABASE classaccess;
use classaccess;

CREATE TABLE usuarios(
id_usu int AUTO_INCREMENT,
nombre_usu VARCHAR(50),
ap_usu VARCHAR(50),
am_usu VARCHAR(50),
correo_usu VARCHAR(50),
password VARCHAR(20), 
priv_usu int(10),
estatus_usu TINYINT(1),
PRIMARY KEY (id_usu),
UNIQUE KEY (correo_usu)
);

INSERT INTO usuarios (nombre_usu, ap_usu, am_usu, correo_usu, password, priv_usu) VALUES ('Ruben', 'Mendoza', 'Dorantes', 'ruben@gmail.com', '12345678', 1);
INSERT INTO usuarios (nombre_usu, ap_usu, am_usu, correo_usu, password, priv_usu) VALUES ('Diego', 'Andres', 'Messi', 'diego@gmail.com', '12345678', 2);
INSERT INTO usuarios (nombre_usu, ap_usu, am_usu, correo_usu, password, priv_usu) VALUES ('Guillermo', 'Cubarsi', 'Lopez', 'memo@gmail.com', '12345678', 3);

CREATE TABLE alumnos(
id_alumno int AUTO_INCREMENT,
id_usu int,
matricula VARCHAR(50),
cod_rfid VARCHAR(255),
PRIMARY KEY (id_alumno),
FOREIGN KEY (id_usu ) REFERENCES usuarios(id_usu)
);

CREATE table profesor(
id_prof int AUTO_INCREMENT,
id_usu int,
no_empleado VARCHAR(20),
PRIMARY KEY (id_prof),
FOREIGN KEY (id_usu) REFERENCES usuarios(id_usu)
);


CREATE table dispositivo(
id_dispositivo int AUTO_INCREMENT PRIMARY KEY,
nombre_dis VARCHAR(100)
);

CREATE TABLE aula(
id_aula int AUTO_INCREMENT,
nombre_aula VARCHAR(100),
edificio VARCHAR(100),
id_dispositivo int,
FOREIGN KEY(id_dispositivo) REFERENCES dispositivo(id_dispositivo),
PRIMARY KEY (id_aula)
);

CREATE table registros(
id_registro int AUTO_INCREMENT,
fecha DATE,
id_usu int,
id_aula int,
hora_entrada TIME,
hora_salida TIME,
FOREIGN KEY (id_usu ) REFERENCES usuarios(id_usu),
FOREIGN KEY (id_aula) REFERENCES aula(id_aula),
PRIMARY KEY(id_registro)
);



CREATE table notificaciones(
id_notificacion int AUTO_INCREMENT PRIMARY KEY,
id_usu int,
mensaje VARCHAR(500),
fecha datetime,
FOREIGN KEY(id_usu) REFERENCES usuarios(id_usu)
);










