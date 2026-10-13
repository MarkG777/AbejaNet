# AbejaNet v4 — Diagrama de Base de Datos (PostgreSQL)

Diagrama completo generado a partir de [`abeja_net_v4_postgres.sql`](../abeja_net_v4_postgres.sql).

## Vista general del modelo

```mermaid
classDiagram
    direction TB

    class roles {
        +SMALLSERIAL id PK
        +VARCHAR(20) nombre UK
    }

    class usuarios {
        +SERIAL id PK
        +VARCHAR(100) nombre
        +VARCHAR(100) apellido_paterno
        +VARCHAR(100) apellido_materno
        +VARCHAR(120) correo_electronico UK
        +VARCHAR(255) contrasena
        +VARCHAR(255) push_token
        +TEXT refresh_token
        +VARCHAR(20) proveedor_auth
        +SMALLINT rol_id FK
        +BOOLEAN esta_activo
        +TIMESTAMP fecha_creacion
    }

    class apiarios {
        +SERIAL id PK
        +VARCHAR(150) nombre UK
        +TEXT descripcion_general
        +VARCHAR(255) direccion_o_coordenadas
        +TIMESTAMP fecha_creacion
        +INTEGER creado_por_usuario_id FK
    }

    class colmenas {
        +SERIAL id PK
        +INTEGER apiario_id FK
        +VARCHAR(100) nombre UK
        +TEXT descripcion_especifica
        +TIMESTAMP fecha_creacion
    }

    class usuarios_apiarios {
        +INTEGER usuario_id PK,FK
        +INTEGER apiario_id PK,FK
        +TIMESTAMP fecha_asignacion
        +INTEGER asignado_por_admin_id FK
    }

    class sensores {
        +SERIAL id PK
        +VARCHAR(17) mac_address UK
        +INTEGER colmena_id FK
        +VARCHAR(50) tipo_sensor
        +sensor_estado estado
        +TIMESTAMP fecha_instalacion
        +TIMESTAMP ultima_lectura_en
    }

    class lecturas_ambientales {
        +BIGSERIAL id PK
        +INTEGER sensor_id FK
        +DECIMAL(5,2) humedad
        +DECIMAL(5,2) temperatura
        +DECIMAL(6,2) peso
        +DECIMAL(5,2) sonido
        +BOOLEAN lluvia
        +TIMESTAMP fecha_registro
    }

    class alertas {
        +SERIAL id PK
        +INTEGER colmena_id FK
        +VARCHAR(50) tipo_alerta
        +VARCHAR(20) valor_registrado
        +VARCHAR(255) mensaje
        +BOOLEAN leida
        +TIMESTAMP fecha_alerta
    }

    roles "1" --> "0..*" usuarios : asigna
    usuarios "1" --> "0..*" apiarios : creado_por
    apiarios "1" --> "0..*" colmenas : contiene
    usuarios "1" --> "0..*" usuarios_apiarios : asignado_a
    apiarios "1" --> "0..*" usuarios_apiarios : asignado_a
    usuarios "1" --> "0..*" usuarios_apiarios : asignado_por_admin
    colmenas "1" --> "0..*" sensores : tiene
    sensores "1" --> "0..*" lecturas_ambientales : genera
    colmenas "1" --> "0..*" alertas : emite
```

## Descripción de tablas

### 1. Autenticación y permisos

| Tabla | Descripción |
|-------|-------------|
| `roles` | Catálogo de roles: administrador y usuario. |
| `usuarios` | Cuentas de usuario, credenciales hasheadas con bcrypt, tokens JWT/push, proveedor de auth (local/google) y rol. |

### 2. Gestión de apiarios y colmenas

| Tabla | Descripción |
|-------|-------------|
| `apiarios` | Ubicaciones físicas donde se instalan las colmenas. Registra creador y coordenadas. |
| `colmenas` | Colmenas individuales pertenecientes a un apiario. |
| `usuarios_apiarios` | Relación muchos-a-muchos entre usuarios y apiarios. Incluye auditoría de quién asignó el acceso. |

### 3. IoT, lecturas y alertas

| Tabla | Descripción |
|-------|-------------|
| `sensores` | Dispositivos ESP32 identificados por MAC. Pueden estar activos, inactivos, en mantenimiento o sin asignar. |
| `lecturas_ambientales` | Datos históricos de humedad, temperatura, peso, sonido y lluvia generados por cada sensor. |
| `alertas` | Notificaciones generadas por colmena (temperatura alta, peso bajo, etc.). |

## Archivo HTML interactivo

También existe una versión navegable en [`docs/diagrama_bd.html`](./diagrama_bd.html).

---

AbejaNet Revival · UTEQ · IDGS 16
