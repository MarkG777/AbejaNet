# Umbrales de las alertas — evidencia, decisiones y fuentes

**Criterio de diseño (definido por el dueño del proyecto): minimizar el daño a la colmena.** Se avisa donde
*empieza* el daño, no donde ya es letal, y se avisa también cuando algo "raro" ocurre (p. ej. un salto brusco de
temperatura). **Estado: primera propuesta respaldada por literatura; se afinará con datos reales del prototipo.**

Hoja de cálculo con cada dato, su fuente y su nivel de verificación: [`umbrales_evidencia.csv`](umbrales_evidencia.csv)
(se abre en Excel).

## 1. Qué hace el sistema

Con cada lectura del ESP32, `backend/alertas.js` evalúa niveles y manda **push a todos los usuarios con acceso al
apiario de la colmena**. Todo se cambia en Render → Environment sin tocar código (un número, o `off` para desactivar).

| Nivel | Regla | Variables | Se repite cada |
|---|---|---|---|
| **Aviso** (temperatura) | fuera de **32–36 °C** durante **≥ 30 min** seguidos | `ALERT_TEMP_AVISO_MIN/MAX`, `ALERT_AVISO_MINUTOS` | 4 h |
| **Crítico** (temperatura) | fuera de **29–37 °C** (confirmado con la lectura anterior) | `ALERT_TEMP_MIN/MAX` | 2 h |
| **Extremo** (temperatura) | **≥ 43 °C**, inmediato | `ALERT_TEMP_EXTREMA_MAX/MIN` | 30 min |
| **Cambio brusco** (temperatura) | cambio **≥ 10 °C en ≤ 5 min**, sube o baja (p. ej. 30 → 50 °C en 2 min) | `ALERT_TEMP_SALTO_GRADOS/MINUTOS` | 30 min |
| **Crítica baja** (humedad) | **< 40 %** (confirmado con la lectura anterior) | `ALERT_HUM_MIN/MAX`, `ALERT_HUM_AVISO_MIN/MAX` | 2 h |
| Apagadas por defecto | humedad alta, humedad de aviso, temperatura extrema baja | las mismas variables | — |

`ALERTAS_AUTOMATICAS=off` apaga todo. `ALERT_COOLDOWN_MINUTES` cambia el tiempo base de repetición (2 h).
Las bandas de las gráficas de la app (`SENSOR_THRESHOLDS`) usan los mismos valores.

## 2. Cómo se leyó la literatura (y qué tan verificado está cada dato)

Se usaron artículos de acceso abierto leídos **en texto completo** a través de la API de Europe PMC, y se contrastó
cada afirmación. Cada dato lleva un **nivel de verificación**:

- **A** — está en el texto completo que leí y es una **medición o resultado del propio estudio**.
- **B** — está en el texto completo que leí, pero el artículo lo **cita de otro autor** (fuente secundaria).
- **C** — solo lo vi en un **resumen/abstract o resultado de búsqueda**; no pude leer el texto completo (de pago o
  bloqueado). **Hay que abrirlo antes de citarlo en un trabajo académico.**

**Método:** no se promedian valores de artículos distintos (miden cosas distintas: óptimo, daño, letalidad; en
laboratorio o en colmena). Se usó la **mediana de los límites que reportan las fuentes**, el **rango entre fuentes como
incertidumbre**, y donde las fuentes difieren se eligió el límite más protector sin generar falsas alarmas constantes.
La varianza se usará **después, con datos reales** de cada colmena (línea base con mediana y MAD, y saltos).

### 2.1 Temperatura del nido de cría

| Límite del rango | Valores reportados por las fuentes | Mediana | Elegido |
|---|---|---|---|
| Inferior | 32 (Wang 2016, Stabentheiner 2021, Zhu 2025, Cook 2022, Kutby 2024); 34 (Li 2016, Palmer-Young 2023, Stabentheiner 2021 "constancia 34–36") | 32 | **32** |
| Superior | 36 (las 7 fuentes) | 36 | **36** |

| Hallazgo | Fuente | Nivel |
|---|---|---|
| Brood nest regulado en 32–36 °C; óptimo 35 °C | Wang 2016; Stabentheiner 2021; Zhu 2025; Cook 2022; Kutby 2024 | B (rango citado) |
| La temperatura de la cría operculada se mantuvo en **34.8–35.9 °C** con ambiente de 13 a 41 °C | Stabentheiner 2021 | **A** |
| Con ambiente de 40 °C la colonia mantuvo gran parte del panal por debajo de 35 °C (enfría con gotas de agua) | Stabentheiner 2021 | **A** |
| Pupas expuestas a 20 °C durante 24 y 48 h quedaron con el desarrollo detenido | Zhu 2025 | **A** |
| Pupas operculadas expuestas a 20 °C 12–96 h (diseño del estudio); a 20 °C 96 h aparecen aguijones partidos y alas deformes | Wang 2016 | A (diseño) / B (resultado citado) |
| Pupas por debajo de 32 °C "demasiado tiempo" presentan malformaciones de alas, patas y abdomen (Himmer) | Stabentheiner 2021 | B |
| Eclosión sin diferencias entre 31–37 °C, pero con deformidades (alas, probóscide, tergo) en ambos extremos | Wang 2016 | B |
| **El desarrollo exitoso solo ocurre entre 29 y 37 °C**; mortalidad y defectos fuera de 32–36 °C; desarrollo cerebral óptimo solo a 33.5–35 °C | Palmer-Young 2023 | B |
| Por encima de **36 °C durante tiempos prolongados** es dañino (anomalías o muerte) | Li 2016 | B |
| Obreras criadas > 36 °C o < 32 °C pueden tener cerebro, alas, aguijón, probóscide o patas deformes; huevos y pupas < 20 °C sufren estrés por frío | Kutby 2024 | B |
| Abejas criadas a 32 °C bailan peor y aprenden peor que a 34.5–36 °C; microglomérulos cerebrales máximos a 34.5 °C | Tautz 2003; Groh 2004 (vía Wang 2016 y Zhu 2025) | B |
| Abejas adultas: **LT50 a 8 h ≈ 50.3 °C (carnica) y 51.7 °C (ligustica)**; temperatura crítica máxima de actividad/respiración ≈ 49–52 °C | Kovac 2014 | **A** |
| Adultos no pueden volar con temperatura corporal < 30 °C; colonias sin cría en invierno pueden bajar a ~5 °C (rango típico 20–37 °C) | Palmer-Young 2023 | B |
| Una colmena **sin abejas** registró **5.5 °C menos** de temperatura media y rangos mayores que una con abejas vivas | Cook 2022 | **A** |
| Mediana de la temperatura de colmena en su experimento: **33.5 °C** (IC 95 % 33.0–33.5) | Kutby 2024 | **A** |

**Decisiones y su respaldo**
- **Aviso 32–36 °C sostenido 30 min:** rango del nido de cría (varias fuentes, B). *La duración de 30 min es una decisión
  de diseño*: ninguna fuente cuantifica cuánto es "demasiado tiempo".
- **Crítico 29–37 °C:** límites fuera de los cuales el desarrollo de la cría falla (Palmer-Young 2023, B).
- **Extremo ≥ 43 °C:** decisión de seguridad del proyecto. Está muy por encima de lo que tolera la cría (> 37 °C) y por
  debajo del límite letal de adultos (~50 °C, Kovac 2014, A), de modo que avisa antes de la muerte de los adultos.
  *Aviso:* una hipertermia deliberada contra *Varroa* (reportada en 41–44 °C en resúmenes, nivel C) podría disparar esta alerta.
- **Cambio brusco ≥ 10 °C en ≤ 5 min:** decisión de ingeniería. Se apoya en que la colonia mantiene la cría en
  34.8–35.9 °C aun con 13–41 °C de ambiente (Stabentheiner 2021, A) y en que una colonia ausente cambia la temperatura
  media y el rango (Cook 2022, A). Una inspección con la colmena abierta puede dispararla (es esperable).
- **Frío extremo (20 °C) apagado por defecto:** hay respaldo para la cría (Zhu 2025, A), pero una colonia sin cría
  en invierno puede estar a ~5 °C (Palmer-Young 2023, B), así que sin saber si hay cría daría falsas alarmas.

### 2.2 Humedad

| Hallazgo | Fuente | Nivel |
|---|---|---|
| La humedad dentro de colmenas va de **40 a 95 %**; sube cuando las abejas enfrían por evaporación o maduran néctar | Kutby 2024 | B |
| Humedad elevada reduce infestación de *Varroa* pero aumenta el riesgo de fermentación del néctar | Kutby 2024 | B |
| ~**75 % HR** es lo más adecuado para la eclosión de larvas; las incubadoras de cría operculada usan 34–35 °C y 75 % HR | Li 2019; Zhu 2025 | B / A (protocolo) |
| Adultos: a 50 % HR la supervivencia de *A. mellifera* fue menor a 40 y 45 °C que a 35 °C; la humedad alta también perjudica a adultos, aunque menos que la temperatura | Li 2019 | **A** |
| La HR sube cuando baja la temperatura aunque no cambie la humedad real: conviene **estandarizar la HR a una temperatura fija** (35 °C) al comparar | Li 2016 | **A** (método) |
| Los huevos no eclosionan por debajo de ~50 % HR; óptimo reportado 85–95 % | Doull 1976 | **C** |
| Los huevos necesitan > 55 % HR; mejor supervivencia con 90–95 % | Ellis 2008 (cita a Doull) | **C** |
| Las obreras solo regulan la humedad dentro de límites subóptimos | Human 2006 | **C** (solo título verificado) |

**Decisiones y su respaldo**
- **Crítica baja < 40 %:** es el límite inferior del rango observado en colmenas sanas (Kutby 2024, B). No es un valor de
  daño medido directamente, pero un valor por debajo de lo que muestran colmenas sanas es "algo raro".
- **Candidato a aviso < 50 %** (apagado): los huevos no eclosionan por debajo de ~50 % (Doull, nivel C). Hay que leer
  el texto original y ver el comportamiento real del sensor antes de activarlo (puede dar falsas alarmas en clima seco).
- **Humedad alta apagada:** no encontré un umbral de daño respaldado (el rango sano llega a 95 %).

### 2.3 Peso (pendiente) y presión (no se usa)
No encontré un umbral validado para alertar por peso (enjambrazón). Meikle & Holst 2015 es la lectura recomendada
(identidad verificada, contenido sin leer, nivel C). Se definirá con datos reales de peso del prototipo.

## 3. Correcciones a la versión anterior de este documento
- Atribuí a **Sarmad & Ryšánek 2025** o a **PMC384730** el dato "emergencia 89–100 % entre 31–36 °C y cero a 28 y 38 °C".
  **Era un error:** PMC384730 es Groh et al. 2004 (organización sináptica) y Sarmad & Ryšánek 2025 estudia la supervivencia de
  abejas *adultas*. **No logré identificar el estudio de emergencia de pupas; ese dato se descartó y no se usa.**
- Pasé de usar 29–38 °C (rango de la app) a **29–37 °C**, que es lo que respalda Palmer-Young 2023.
- La humedad pasó de "apagada" a **crítica baja < 40 %** con el respaldo de Kutby 2024.

## 4. Pendiente / decisiones del proyecto
1. **Dónde está colocado el sensor** (entre cuadros del nido de cría, tapa, exterior) cambia el significado de todos los valores.
2. **Afinar con datos reales** (mediana y MAD por colmena, estación, época de cría) cuando el prototipo esté en una colmena.
   El conjunto de datos abierto de Senger 2024 (6 sensores de temperatura + **BME280**, igual que el prototipo, y peso)
   sirve para calibrar.
3. **Regla de peso/enjambrazón** y **humedad alta**: definir con datos.
4. **Verificar nivel C** abriendo los artículos con acceso institucional (Doull 1976, Ellis 2008, Human 2006, Meikle & Holst 2015).
5. **Una sola fuente de verdad** para umbrales (backend) que lea la app, para no duplicar valores.

## 5. Bibliografía

Los DOI/PMCID se comprobaron contra Europe PMC o Crossref. "Texto completo" = lo leí en Europe PMC.

1. Wang Q, Xu X, Zhu X, Chen L, Zhou S, Huang ZY, Zhou B. (2016). Low-temperature stress during capped brood stage increases pupal mortality, misorientation and adult mortality in honey bees. *PLoS ONE* 11(5): e0154547. https://doi.org/10.1371/journal.pone.0154547 — PMC4858150. Texto completo.
2. Stabentheiner A, Kovac H, Mandl M, Käfer H. (2021). Coping with the cold and fighting the heat: thermal homeostasis of a superorganism, the honeybee colony. *J Comp Physiol A*. https://doi.org/10.1007/s00359-021-01464-8 — PMC8079341. Texto completo.
3. Zhu X, et al. (2025). Biochemical and transcriptomic analysis reveals low temperature-driven oxidative stress in pupal *Apis mellifera*. *Insects*. PMC11942804 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11942804). Texto completo. *(DOI no recuperado.)*
4. Palmer-Young EC, et al. (2023). Host-driven temperature dependence of Deformed wing virus infection in honey bee pupae. *Commun Biol*. PMC10042853 (https://pmc.ncbi.nlm.nih.gov/articles/PMC10042853). Texto completo. *(DOI no recuperado.)*
5. Li Z, et al. (2016). Drone and worker brood microclimates are regulated differentially in honey bees, *Apis mellifera*. *PLoS ONE* 11(2): e0148740. https://doi.org/10.1371/journal.pone.0148740 — PMC4755576. Texto completo.
6. Kutby R, et al. (2024). The effect of hive type on colony homeostasis and performance in the honey bee (*Apis mellifera*). *Insects*. PMC11508670 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11508670). Texto completo. *(DOI no recuperado.)*
7. Kovac H, Käfer H, Stabentheiner A, Costa C. (2014). Metabolism and upper thermal limits of *Apis mellifera carnica* and *A. m. ligustica*. *Apidologie*. https://doi.org/10.1007/s13592-014-0284-3 — PMC4218932. Texto completo.
8. Cook D, Tarlinton B, McGree JM, Blackler A, Hauxwell C. (2022). Temperature sensing and honey bee colony strength. *J Econ Entomol*. https://doi.org/10.1093/jee/toac034 — PMC9175291. Texto completo.
9. Li X, Ma W, Shen J, Long D, Feng Y, Su W, Xu K, Du Y, Jiang Y. (2019). Tolerance and response of two honeybee species *Apis cerana* and *Apis mellifera* to high temperature and relative humidity. *PLoS ONE* 14(6): e0217921. https://doi.org/10.1371/journal.pone.0217921 — PMC6553758. Texto completo.
10. Senger D, et al. (2024). Weight, temperature and humidity sensor data of honey bee colonies in Germany, 2019–2022. *Data in Brief*. PMC10809063 (https://pmc.ncbi.nlm.nih.gov/articles/PMC10809063); datos en Zenodo. Texto completo (descripción). *(DOI no recuperado.)*
11. Tautz J, Maier S, Groh C, Rössler W, Brockmann A. (2003). Behavioral performance in adult honey bees is influenced by the temperature experienced during their pupal development. *PNAS* 100. https://doi.org/10.1073/pnas.1232346100 — PMC165877. **No abierto: solo vía otros textos (B) y resúmenes (C).**
12. Groh C, Tautz J, Rössler W. (2004). Synaptic organization in the adult honey bee brain is influenced by brood-temperature control during pupal development. *PNAS* 101. https://doi.org/10.1073/pnas.0400773101 — PMC384730. **No abierto: solo vía otros textos (B).**
13. Doull KM. (1976). *Apidologie* 7(1) (artículo 4). https://www.apidologie.org/articles/apido/pdf/1976/01/Apidologie_0044-8435_1976_7_1_ART0004.pdf — **Nivel C** (extracto fragmentario; título exacto no verificado en esta revisión).
14. Ellis MB, et al. (2008). Hygropreference and brood care in the honeybee (*Apis mellifera*). *J Insect Physiol*. https://repository.up.ac.za/bitstream/2263/8453/1/Ellis_Hygropreference(2008).pdf — **Nivel C** (solo resúmenes de búsqueda).
15. Human H, Nicolson SW, Dietemann V. (2006). Do honeybees, *Apis mellifera scutellata*, regulate humidity in their nest? *Naturwissenschaften* 93: 397–401. https://doi.org/10.1007/s00114-006-0117-y — **Nivel C** (identidad verificada en Crossref; contenido no leído).
16. Meikle WG, Holst N. (2015). Application of continuous monitoring of honeybee colonies. *Apidologie* 46: 10–22 (publicado en línea 2014). https://doi.org/10.1007/s13592-014-0298-x — **Nivel C** (identidad verificada en Crossref; contenido no leído).
17. Himmer A. — citado en Stabentheiner 2021 por las malformaciones por debajo de 32 °C (no consultado directamente).

**Revisados y no usados:** Sarmad & Ryšánek (2025), *Apidologie*, https://doi.org/10.1007/s13592-025-01191-y (supervivencia de adultas a temperaturas constantes; solo abstract de Crossref).
Kablau, Berg & Rutschmann (2020), *Apidologie*, https://doi.org/10.1007/s13592-020-00743-8 (hipertermia larval; solo identidad).
