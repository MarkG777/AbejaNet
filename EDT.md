# Estructura de Descomposición del Trabajo (EDT / WBS)
## Proyecto AbejaNet — Prototipo v3

> **Materia:** Administración de Proyectos de TI  
> **Equipo:** IDGS 16

---

```mermaid
graph TD
    %% Nodo raíz
    A[AbejaNet Revival<br/>Prototipo v3]

    %% Nivel 1 - Fases principales
    A --> B[1.0 Gestión del Proyecto]
    A --> C[2.0 Análisis y Diseño]
    A --> D[3.0 Desarrollo App Móvil]
    A --> E[4.0 Desarrollo Web Administrador]
    A --> F[5.0 Desarrollo IoT]
    A --> G[6.0 Pruebas y Calidad]
    A --> H[7.0 Documentación]
    A --> I[8.0 Despliegue y Cierre]

    %% 1.0 Gestión del Proyecto
    B --> B1[1.1 Planificación<br/>(cronograma, alcance, EDT)]
    B --> B2[1.2 Seguimiento y Control<br/>(reuniones, informes de avance)]
    B --> B3[1.3 Gestión de Riesgos<br/>(identificación y mitigación)]
    B --> B4[1.4 Gestión de Cambios<br/>(control de versiones y alcance)]

    %% 2.0 Análisis y Diseño
    C --> C1[2.1 Levantamiento de Requisitos<br/>(RQF y RNF)]
    C --> C2[2.2 Diseño UX/UI App Móvil<br/>(wireframes, prototipos)]
    C --> C3[2.3 Diseño de Arquitectura<br/>(API, BD, servicios)]
    C --> C4[2.4 Diseño IoT<br/>(sensores, protocolos de comunicación)]

    %% 3.0 Desarrollo App Móvil
    D --> D1[3.1 Autenticación y Perfil de Usuario<br/>(RQF-05)]
    D --> D2[3.2 Gestión de Colmenas y Bitácora<br/>(RQF-03)]
    D --> D3[3.3 Modo Offline y Sincronización<br/>(RQF-04)]
    D --> D4[3.4 Internacionalización<br/>(RNF-01 — i18n)]
    D --> D5[3.5 Notificaciones Push<br/>(RNF-02)]
    D --> D6[3.6 Rendimiento y Usabilidad<br/>(RNF-03, RNF-05)]

    %% 4.0 Desarrollo Web Administrador
    E --> E1[4.1 Panel de Administración]
    E --> E2[4.2 Gestión de Usuarios y Roles]
    E --> E3[4.3 Dashboard de Métricas y Reportes]

    %% 5.0 Desarrollo IoT
    F --> F1[5.1 Integración de Sensores<br/>(temperatura, humedad, sonido)]
    F --> F2[5.2 Transmisión de Datos<br/>(MQTT / HTTP)]
    F --> F3[5.3 Alertas Automáticas<br/>(condiciones críticas de colmena)]

    %% 6.0 Pruebas y Calidad
    G --> G1[6.1 Pruebas Funcionales<br/>(validación de requerimientos)]
    G --> G2[6.2 Pruebas No Funcionales<br/>(rendimiento, seguridad, compatibilidad)]
    G --> G3[6.3 Pruebas de Usuario (UAT)]

    %% 7.0 Documentación
    H --> H1[7.1 Especificación de Requisitos<br/>(documento LaTeX)]
    H --> H2[7.2 Manuales de Usuario]
    H --> H3[7.3 Documentación Técnica<br/>(API, arquitectura, despliegue)]

    %% 8.0 Despliegue y Cierre
    I --> I1[8.1 Configuración de Servidores y BD]
    I --> I2[8.2 Publicación en App Stores]
    I --> I3[8.3 Capacitación y Entrega Final]

    %% Estilos
    classDef root fill:#FFC107,stroke:#1E1E1E,stroke-width:2px,color:#1E1E1E
    classDef phase fill:#F5F5F5,stroke:#9DBA46,stroke-width:2px,color:#1E1E1E
    classDef workpkg fill:#FFFFFF,stroke:#333333,stroke-width:1px,color:#333333

    class A root
    class B,C,D,E,F,G,H,I phase
    class B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,D3,D4,D5,D6,E1,E2,E3,F1,F2,F3,G1,G2,G3,H1,H2,H3,I1,I2,I3 workpkg
```

---

## Resumen de Paquetes de Trabajo vs Responsables

| Código | Paquete de Trabajo | Responsable |
|--------|--------------------|-------------|
| 1.0 | Gestión del Proyecto | Sandra Zoé Cabrera Velázquez |
| 2.0 | Análisis y Diseño | Todo el equipo |
| 3.0 | Desarrollo App Móvil | Marco Antonio Gómez Olvera |
| 4.0 | Desarrollo Web Administrador | Israel Gómez Bonilla |
| 5.0 | Desarrollo IoT | Orlando Cabrera Rubio |
| 6.0 | Pruebas y Calidad | Todo el equipo |
| 7.0 | Documentación | Sandra Zoé Cabrera Velázquez |
| 8.0 | Despliegue y Cierre | Todo el equipo |

---

## Notas
- La EDT está alineada con el alcance definido en la Especificación de Requerimientos (Prototipo v3).
- Los requerimientos funcionales (RQF-03, RQF-04, RQF-05) y no funcionales (RNF-01 a RNF-05) se asignan directamente al paquete **3.0 Desarrollo App Móvil**.
- Los paquetes **4.0** y **5.0** representan los subsistemas complementarios del proyecto AbejaNet Revival.
