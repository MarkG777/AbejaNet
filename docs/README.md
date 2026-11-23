# Informe: de dónde salen los umbrales de las alertas de AbejaNet

> Fecha del informe: 2026-11-22 · Rama: `feature/umbrales-cientificos`
> Este documento resume **qué artículos científicos respaldan cada decisión** y **qué decisiones son de diseño del
> proyecto y no de la literatura**. El detalle completo está en [`UMBRALES_ALERTAS.md`](UMBRALES_ALERTAS.md) y cada dato
> individual (con su fuente y nivel de verificación) en [`umbrales_evidencia.csv`](umbrales_evidencia.csv) (se abre en Excel).

**Estado: primera propuesta respaldada por literatura. Los valores son provisionales y se ajustarán con los datos reales
del prototipo** (todavía no está instalado en una colmena).

---

## 1. Criterio de diseño

El dueño del proyecto definió el criterio: **minimizar el daño a la colmena**. Por eso:

- Se avisa donde **empieza** el daño, no donde ya es letal.
- Se avisa también cuando ocurre algo "raro" aunque ningún artículo lo cuantifique (p. ej. un salto brusco de temperatura).
- Hay **un solo nivel de alerta: Crítico**. Todos los títulos empiezan con "Crítico:".
- Todas las alertas se envían como **notificación push a todos los usuarios con acceso al apiario**.

## 2. Resumen: cada regla, su valor y qué la respalda

La columna **Origen** es la más importante: distingue lo que viene de un artículo de lo que es una decisión nuestra.

| Regla | Valor | Origen | Respaldo |
|---|---|---|---|
| Calor crítico | > 37 °C, aviso inmediato | **Literatura** (límite del rango 29–37 °C) | Palmer-Young 2023 (B); Li 2016: > 36 °C prolongado es dañino (B) |
| Frío crítico (con cría) | < 29 °C durante más de 15 min | **Literatura** el límite 29 °C; **diseño** los 15 min | Palmer-Young 2023 (B). Ninguna fuente cuantifica "cuánto tiempo"; Stabentheiner 2021 y Li 2016 solo dicen "demasiado"/"prolongado" |
| Frío crítico (sin cría) | < 10 °C durante más de 15 min | **Diseño** | Una colonia sin cría ronda ~21 °C y puede llegar a ~5 °C en invierno (Ulgezen 2025, B; Palmer-Young 2023, B) |
| Modo cría automático | mediana de 72 h ≥ 33 °C → hay cría | **Literatura** (método) | Ulgezen 2025: criterio ≥ 33 °C durante ≥ 3 días (A); Nürnberger 2018 (A) |
| Bajadas repetidas | ≥ 60 min bajo 29 °C sumados en 24 h | **Diseño**, apoyado en literatura | Wang 2016: 60–90 min a 20 °C ya dejan secuelas (A, pero con frío mucho más profundo) |
| Temperatura extrema | ≥ 43 °C, aviso inmediato | **Diseño** (seguridad) | Muy por encima de lo que tolera la cría (> 37 °C) y por debajo del límite letal de adultas, ~50 °C (Kovac 2014, A) |
| Cambio brusco | ≥ 10 °C en ≤ 5 min (sube o baja) | **Diseño** (ingeniería) | La colonia mantiene la cría en 34.8–35.9 °C con ambiente de 13 a 41 °C (Stabentheiner 2021, A); una colonia ausente cambia temperatura y rango (Cook 2022, A) |
| Humedad baja crítica | < 40 % durante más de 5 min | **Literatura** (límite inferior observado) | Kutby 2024: las colmenas van de 40 a 95 % (B). No es un daño medido, es "fuera de lo que muestran colmenas sanas" |
| Humedad alta / extrema | apagadas | — | No se encontró un umbral de daño respaldado (el rango sano llega a 95 %) |
| Peso / enjambrazón | sin regla | — | Sin umbral validado; se definirá con datos reales |

**Nivel de verificación de cada dato** (así se anota en el CSV):

- **A** — está en el texto completo que se leyó y es una **medición o resultado del propio estudio**.
- **B** — está en el texto completo que se leyó, pero el artículo lo **cita de otro autor** (fuente secundaria).
- **C** — solo se vio en un **resumen o resultado de búsqueda**. Hay que abrir el artículo antes de citarlo en un trabajo académico.

## 3. Artículos consultados

Los DOI/PMCID se comprobaron contra Europe PMC o Crossref. "Texto completo" significa que se leyó completo vía Europe PMC.

### 3.1 Base de los umbrales (texto completo leído)

| # | Artículo | Qué se tomó de él | Enlace |
|---|---|---|---|
| 1 | **Palmer-Young et al. (2023)**, *Commun Biol* — Host-driven temperature dependence of Deformed wing virus infection in honey bee pupae | El desarrollo exitoso solo ocurre entre **29 y 37 °C** (base del rango crítico). Colonias sin cría en invierno pueden bajar a ~5 °C | [PMC10042853](https://pmc.ncbi.nlm.nih.gov/articles/PMC10042853) |
| 2 | **Wang et al. (2016)**, *PLoS ONE* — Low-temperature stress during capped brood stage… | Daño por frío según profundidad, duración y etapa: 60–90 min a 20 °C → ~10 % de desorientación; ≥ 48 h → 100 % de mortalidad en prepupa tardía | [doi:10.1371/journal.pone.0154547](https://doi.org/10.1371/journal.pone.0154547) |
| 3 | **Stabentheiner et al. (2021)**, *J Comp Physiol A* — Coping with the cold and fighting the heat | La cría operculada se mantuvo en 34.8–35.9 °C con ambiente de 13 a 41 °C. Con ambiente frío, el panal baja ~3.4 °C y el **aire junto a las abejas ~5.5 °C** | [doi:10.1007/s00359-021-01464-8](https://doi.org/10.1007/s00359-021-01464-8) |
| 4 | **Li et al. (2016)**, *PLoS ONE* — Drone and worker brood microclimates | Más de 36 °C prolongado es dañino. Nota de método: la humedad relativa sube cuando baja la temperatura aunque la humedad real no cambie | [doi:10.1371/journal.pone.0148740](https://doi.org/10.1371/journal.pone.0148740) |
| 5 | **Kutby et al. (2024)**, *Insects* — Effect of hive type on colony homeostasis | Humedad dentro de colmenas: 40–95 %. Mediana de temperatura de colmena 33.5 °C | [PMC11508670](https://pmc.ncbi.nlm.nih.gov/articles/PMC11508670) |
| 6 | **Zhu et al. (2025)**, *Insects* — Low temperature-driven oxidative stress in pupal *Apis mellifera* | Pupas a 20 °C durante 24 y 48 h con el desarrollo detenido | [PMC11942804](https://pmc.ncbi.nlm.nih.gov/articles/PMC11942804) |
| 7 | **Kovac et al. (2014)**, *Apidologie* — Upper thermal limits of *A. m. carnica* and *A. m. ligustica* | Límite letal de adultas (LT50 a 8 h ≈ 50.3–51.7 °C): referencia para el umbral "extremo" | [doi:10.1007/s13592-014-0284-3](https://doi.org/10.1007/s13592-014-0284-3) |
| 8 | **Cook et al. (2022)**, *J Econ Entomol* — Temperature sensing and honey bee colony strength | Una colmena sin abejas registró 5.5 °C menos y rangos mayores: apoya vigilar cambios bruscos | [doi:10.1093/jee/toac034](https://doi.org/10.1093/jee/toac034) |
| 9 | **Li et al. (2019)**, *PLoS ONE* — Tolerance of *A. cerana* and *A. mellifera* to high temperature and humidity | Con 50 % de HR la supervivencia de adultas cae a 40–45 °C; la humedad alta también perjudica, menos que la temperatura | [doi:10.1371/journal.pone.0217921](https://doi.org/10.1371/journal.pone.0217921) |
| 10 | **Ulgezen et al. (2025)**, *Ecol Evol* — Photoperiod and temperature as seasonal cues for brood rearing | Método del **modo cría**: colonia criando si la temperatura ≥ 33 °C durante ≥ 3 días; sin cría ronda ~21 °C | [doi:10.1002/ece3.72066](https://doi.org/10.1002/ece3.72066) |
| 11 | **Nürnberger et al. (2018)**, *PeerJ* — Temperature and photoperiod on brood onset in hibernating colonies | En invierno, una colonia con cría se reconoce por panal > 30 °C con amplitud diaria ≤ 1.5 °C; volver a 0 °C no redujo significativamente la cría | [doi:10.7717/peerj.4801](https://doi.org/10.7717/peerj.4801) |
| 12 | **Senger et al. (2024)**, *Data in Brief* — Weight, temperature and humidity sensor data of honey bee colonies in Germany | Conjunto abierto con sensor **BME280** (igual que el prototipo): sirve para calibrar con datos reales | [PMC10809063](https://pmc.ncbi.nlm.nih.gov/articles/PMC10809063) |

### 3.2 Citados de segunda mano (nivel B) o solo en resumen (nivel C)

| Artículo | Uso | Nivel |
|---|---|---|
| Tautz et al. (2003) *PNAS*; Groh et al. (2004) *PNAS* | Abejas criadas a 32 °C aprenden y bailan peor que a 34.5–36 °C. Leídos solo a través de Wang 2016 y Zhu 2025 | B |
| Doull (1976) *Apidologie*; Ellis et al. (2008) *J Insect Physiol* | Los huevos no eclosionan con menos de ~50 % de HR. **Por eso la regla "humedad < 50 %" no se activó**; hay que leer el original | C |
| Human et al. (2006) *Naturwissenschaften*; Meikle y Holst (2015) *Apidologie* | Regulación de humedad; monitoreo continuo (base futura de la regla de peso). Solo se verificó su identidad | C |
| Czekońska y Tofilski (2020) *Apidologie* | El momento del cambio de temperatura importa (drones). Solo abstract | C |
| Vojvodic et al. (2011); Himmer; Fahrenholz; Jones y Oldroyd; Seeley | Citados dentro de otros textos o solo identidad. No definen ningún umbral | C / B |

## 4. Cómo se decidieron los valores

1. No se promediaron valores de artículos distintos, porque miden cosas distintas (óptimo, daño, letalidad; en laboratorio
   o en colmena).
2. Se usó la **mediana de los límites que reportan las fuentes** y el **rango entre fuentes como incertidumbre**. Donde
   difieren, se eligió el límite más protector que no genere falsas alarmas constantes. Ejemplo: el límite inferior del
   nido de cría aparece como 32 °C (5 fuentes) y 34 °C (3 fuentes); la mediana es 32 °C. El superior es 36 °C en las 7.
3. La **varianza** (mediana y MAD por colmena) se usará **después, con datos reales del prototipo**, para afinar la línea base.

## 5. Decisiones que son del proyecto y no de un artículo

Hay que decirlo con claridad en cualquier presentación:

- **15 min** de frío sostenido antes de alertar (una inspección abre la colmena unos minutos y no es una emergencia).
- **60 min en 24 h** de frío acumulado (apoyado en Wang 2016, pero ese estudio usa frío mucho más profundo, 20 °C).
- **10 °C** como límite de frío en colonias sin cría.
- **43 °C** como "extremo" (posible incendio).
- **≥ 10 °C en ≤ 5 min** como cambio brusco.
- **40 % / 5 min** para humedad baja (el 40 % viene de Kutby, los 5 min son diseño).
- **Un solo nivel crítico** (se eliminó el nivel "aviso" a petición del dueño del proyecto).

## 6. Limitaciones conocidas

- **No existe un estudio que cuantifique bajadas pequeñas (1–3 °C) y breves (minutos).** Lo medido es que una hora o más de
  frío profundo ya deja secuelas. No se puede afirmar que una bajada breve sea inocua ni que sea dañina.
- Un sensor de **aire** entre cuadros lee más frío (hasta ~5.5 °C menos) que la cría operculada. **La posición del sensor
  cambia el significado de todos los valores** y todavía no está decidida.
- No hay estudios del clima subtropical de altura (Querétaro). Faltan datos locales.
- Una **hipertermia deliberada contra *Varroa*** (41–44 °C, solo vista en resúmenes) o abrir la colmena para inspeccionarla
  pueden disparar alertas esperables.
- No hay detección de **colonia perdida**: si la colonia muere, se alertaría cada hora hasta que la mediana de 72 h baje de
  33 °C y luego quedaría en silencio.
- Sin regla de **humedad alta** ni de **peso/enjambrazón**.
- Algunas fuentes son de **nivel C** y deben abrirse con acceso institucional antes de citarlas.

## 7. Corrección ya aplicada (por transparencia)

Una versión anterior atribuía a *Sarmad & Ryšánek 2025* (y a PMC384730) el dato "emergencia 89–100 % entre 31 y 36 °C".
**Era un error:** PMC384730 es Groh et al. 2004 y Sarmad & Ryšánek estudia supervivencia de adultas. El dato se descartó y
no se usa en ningún umbral.

## 8. Cómo cambiar un valor

Todos los umbrales se cambian en **Render → Environment** sin tocar código (un número, o `off` para desactivar):
`ALERT_TEMP_MIN`, `ALERT_TEMP_MAX`, `ALERT_FRIO_MINUTOS`, `ALERT_TEMP_MIN_SIN_CRIA`, `ALERT_CRIA_TEMP`, `ALERT_CRIA_HORAS`,
`ALERT_FRIO_ACUMULADO_MINUTOS`, `ALERT_FRIO_ACUMULADO_HORAS`, `ALERT_TEMP_EXTREMA_MAX`, `ALERT_TEMP_SALTO_GRADOS`,
`ALERT_TEMP_SALTO_MINUTOS`, `ALERT_HUM_MIN`, `ALERT_HUM_BAJA_MINUTOS`, `ALERT_COOLDOWN_MINUTES` y `ALERTAS_AUTOMATICAS=off`
(apaga todo). La tabla completa con valores por defecto y tiempos de repetición está en
[`UMBRALES_ALERTAS.md`](UMBRALES_ALERTAS.md#1-qué-hace-el-sistema).

## 9. Siguientes pasos

1. Instalar el prototipo en una colmena y **calibrar con las primeras semanas de datos** (mediana y MAD por colmena y época).
2. Decidir dónde se coloca el sensor.
3. Abrir las fuentes de nivel C (Doull, Ellis, Human, Meikle y Holst) con acceso institucional.
4. Definir las reglas de humedad alta y de peso con datos reales.
5. Una sola fuente de verdad para los umbrales (backend) que también lea la app.
