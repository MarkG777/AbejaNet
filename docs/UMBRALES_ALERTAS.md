# Umbrales de las alertas automáticas — estado y fundamento

**Estado: PROVISIONALES. No están validados científicamente.** Este documento dice qué hace el sistema hoy, qué
encontró una primera revisión de literatura (2026-11-21), qué tan verificado está cada dato, y qué falta decidir.

## 1. Qué hace el sistema

Con cada lectura que manda el ESP32 (`POST /api/lecturas` y `/api/sensor-data`), `backend/alertas.js` la compara con los
umbrales críticos. Si corresponde, crea una alerta en la tabla `alertas` y manda **push a todos los usuarios con acceso
al apiario de esa colmena** (los asignados en `usuarios_apiarios` con notificaciones activas).

Para no mandar falsas alarmas ni un push por minuto:
- **Confirmación:** la lectura anterior del mismo sensor también debe ser crítica del mismo tipo (un pico aislado del sensor no alerta).
- **Enfriamiento:** la misma alerta de la misma colmena no se repite antes de 120 min (`ALERT_COOLDOWN_MINUTES`).

### Valores y cómo cambiarlos (Render → Environment, sin tocar código)

| Variable | Por defecto | Efecto |
|---|---|---|
| `ALERT_TEMP_MIN` | `29` | Alerta `TEMPERATURA_BAJA` si la temperatura es menor |
| `ALERT_TEMP_MAX` | `38` | Alerta `TEMPERATURA_ALTA` si es mayor |
| `ALERT_HUM_MIN` | apagado | Alerta `HUMEDAD_BAJA` si la humedad es menor |
| `ALERT_HUM_MAX` | apagado | Alerta `HUMEDAD_ALTA` si es mayor |
| `ALERT_COOLDOWN_MINUTES` | `120` | Minutos antes de repetir la misma alerta |
| `ALERTAS_AUTOMATICAS` | encendido | `off` apaga toda la generación automática |

Cada límite acepta un número o `off`. Los de temperatura vienen de las zonas de "peligro" que ya usa la app en las
gráficas (`SENSOR_THRESHOLDS`, `ColmenaDetailScreen.tsx`: peligro ≤ 28 °C y ≥ 39 °C). **La humedad está apagada por
defecto** (ver §3).

## 2. Qué encontró la revisión de literatura

> **Límite importante de esta revisión.** Los resultados salen de búsquedas web que devuelven resúmenes. Intenté
> abrir los artículos completos para confirmarlos y **no pude** (verificación anti-robots de PMC y un acceso de pago de
> Springer). Por eso la columna "Verificación" nunca dice "confirmado en el texto completo". Antes de citar cualquiera
> en un documento académico hay que abrirlo y comprobar el dato.

### Temperatura del nido de cría

| Dato (según los resúmenes) | Fuente | Verificación |
|---|---|---|
| El nido de cría se mantiene en 32–36 °C (algunas revisiones dicen 33–36 °C) | Revisiones del grupo de Stabentheiner, [J Comp Physiol A 2021](https://link.springer.com/doi/10.1007/s00359-021-01464-8) y [PMC8079341](https://pmc.ncbi.nlm.nih.gov/articles/PMC8079341) | Resumen de búsqueda |
| Abejas criadas a 32 °C vs 34.5–36 °C rinden peor en tareas de comportamiento (danza, aprendizaje) | Tautz et al. 2003, PNAS ([PMC165877](https://pmc.ncbi.nlm.nih.gov/articles/PMC165877)) | Resumen de búsqueda |
| Menos microglomérulos cerebrales al criar ±1 °C respecto de 34.5 °C | Groh et al. 2004, PNAS | Resumen de búsqueda; el enlace exacto no quedó claro |
| Un tiempo prolongado por debajo de 32 °C produce malformaciones (alas, patas, abdomen) | Revisiones citadas en los resultados | Resumen de búsqueda |
| En pupas de *A. m. carnica* criadas a temperatura constante, la emergencia fue 89–100 % entre 31 y 36 °C y **cero a 28 y a 38 °C** | Un estudio de emergencia (28–38 °C). Los resultados apuntan a [PMC384730](https://pmc.ncbi.nlm.nih.gov/articles/PMC384730) o a un artículo de Apidologie 2025 ([Springer](https://link.springer.com/article/10.1007/s13592-025-01191-y)); **no pude identificar con certeza cuál** | Resumen de búsqueda; fuente por confirmar |
| Las pupas (celdas operculadas) son muy sensibles al enfriamiento; huevos y larvas toleran algo más | Grupo de Stabentheiner | Resumen de búsqueda |
| Fuera de la época de cría el racimo de invierno no mantiene 32–36 °C: el centro ronda 27–35 °C, la superficie 18–29 °C, y debe mantenerse por encima de ~10 °C (coma por frío) | Estudio de campo 2025 y [PeerJ 2018](https://peerj.com/articles/4801) | Resumen de búsqueda; fuente exacta del dato por confirmar |

**Lectura para nuestros umbrales de temperatura (29 / 38 °C):**
- Son coherentes con los *extremos letales* para la cría (emergencia cero a 28 y 38 °C), pero **avisan tarde**: el daño
  empieza antes (fuera de 32–36 °C, hay efectos en ±1 °C y malformaciones bajo 32 °C sostenido). Una opción sería dos
  niveles: aviso (fuera de 32–36 °C) y crítico (fuera de 29–38 °C).
- **Solo valen donde está la cría y mientras hay cría.** Un sensor en el nido de cría en época de cría: sí. Un sensor
  fuera del nido, en la periferia, en la tapa, o una colmena sin cría (invierno): 29 °C como mínimo daría falsas
  alarmas. **Dónde está colocado el sensor cambia por completo el significado del valor.**
- La precisión del sensor importa (el DHT11 tiene una tolerancia de unos ±2 °C según su hoja de datos; no lo
  verifiqué en esta revisión).

### Humedad

| Dato (según los resúmenes) | Fuente | Verificación |
|---|---|---|
| Los huevos no eclosionan por debajo de ~50 % HR; el óptimo de eclosión se reporta en 85–95 % | Doull 1976, [Apidologie](https://www.apidologie.org/articles/apido/pdf/1976/01/Apidologie_0044-8435_1976_7_1_ART0004.pdf) | Resumen de búsqueda; el texto extraído era fragmentario |
| Los huevos necesitan > 55 % HR, con la mejor supervivencia en 90–95 % | Ellis et al. 2008, [repositorio U. Pretoria](https://repository.up.ac.za/bitstream/2263/8453/1/Ellis_Hygropreference(2008).pdf), que cita a Doull | Resumen de búsqueda |
| La humedad dentro de colmenas varía entre 40 y 95 %, y es mayor en colonias grandes y con más cuadros de cría | Una revisión citada en los resultados | Resumen de búsqueda; revisión no identificada |
| Las obreras solo regulan la humedad dentro de límites subóptimos | Human et al. 2006, [Naturwissenschaften 93:397](https://link.springer.com/doi/10.1007/s00114-006-0117-y) | Solo el título; el hallazgo viene de un resumen posterior |
| No encontré una fuente que confirme "40–60 % HR en el área de cría" | — | **No confirmado** |

**Lectura para humedad:**
- Los rangos de la app ("óptima" 50–60 %, peligro > 70 %) **no tienen respaldo en lo que encontré**. Que una colmena
  sana llegue a 70–95 % es normal según los resúmenes, y los huevos incluso necesitan humedad alta. Con ese umbral
  habría falsas alarmas, por eso la humedad quedó **apagada por defecto**.
- Lo que sí parece razonable alertar (a validar): humedad muy baja sostenida (< ~50 %) donde hay huevos. Depende otra vez
  de dónde está el sensor.

### Peso (enjambrazón / pérdida de reservas)
- Los resultados indican que un enjambre sale como una caída brusca y significativa del peso, y que la **tasa** de cambio
  distingue una caída brusca del consumo gradual de reservas; el peso diario normal tiene oscilaciones grandes
  (salida de pecoreadoras, respiración). Referencia útil a leer completa: Meikle & Holst 2015, [Apidologie](https://link.springer.com/article/10.1007/s13592-014-0298-x) (apareció en los resultados; no la leí).
- **No encontré un umbral validado** (kg o kg/min) para alertar. Por eso no hay alerta de peso todavía.

### Presión atmosférica (BME280)
No se usa para alertas. Es contexto (cambios de tiempo); no se buscó literatura.

## 3. Decisiones que te tocan

1. **¿Dónde está colocado el sensor?** (nido de cría, entre cuadros, tapa, entrada, exterior). Define si 29/38 °C tienen
   sentido y si hay que apagar la alerta de temperatura baja en invierno o en colmenas sin cría.
2. **¿Dos niveles de temperatura?** Aviso (fuera de 32–36 °C) y crítico (fuera de 29–38 °C).
3. **Humedad:** dejarla apagada hasta tener valores validados, o activar solo el límite inferior.
4. **Peso:** definir una regla (caída ≥ X % o X kg en un periodo) a partir de datos reales de tus colmenas.
5. **Fuentes:** abrir los artículos de §2 con acceso institucional y confirmar los datos antes de citarlos.

## 4. Cómo probar el flujo completo
Ver `backend/TEST_NOTIFICATIONS_README.md` (push de prueba) y `backend/alertas.test.js` (lógica de umbrales,
confirmación, enfriamiento y envío a varios usuarios).
