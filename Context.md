# AbejaNet — Mejoras App Móvil (Integradora 3, IDGS 16)

> Reemplaza la versión anterior de este archivo (cuatrimestre pasado, otro set de tareas —
> recuperable con `git log -p -- Context.md` si hace falta consultarla).
> Fuente: documento **"Documento de Requerimientos de Software"** (LaTeX/PDF) elaborado por el
> equipo para el módulo de aplicación móvil.
> Última verificación contra el código real: **2026-09-11**. Las casillas `[x]` están confirmadas
> con evidencia de código (archivo:línea), no supuestas.

---

## Alcance

Cinco mejoras priorizadas para el módulo móvil (React Native / Expo), elegidas por bajo riesgo de
implementación: reutilizan endpoints y datos que ya existen en el backend, sin cambios
estructurales a la base de datos.

1. Asistente conversacional (bot) dentro de la app.
2. Loading skeletons en pantallas de carga.
3. Indicador de estado del sensor (en línea / desconectado).
4. Estados vacíos ilustrados.
5. Botón de compartir reportes y gráficas.

Quedan fuera del alcance de este archivo los requerimientos del firmware IoT (ESP32) y de la app
web administrativa — documentados aparte por los integrantes responsables de cada módulo.

**Actores:** Usuario (Apicultor autenticado) y Backend de AbejaNet (Node.js/Express + PostgreSQL).
Los 5 casos de uso (CU-01 a CU-05) incluyen `«include»` a CU-00 (Iniciar sesión, ya existente).
CU-04 (lista vacía) `«extend»` a CU-03, ya que CU-03 empieza abriendo una lista de colmenas.

**Normas aplicadas:** ISO 9241-110/11/125/143, WCAG 2.2 (AA), NIST SP 800-63B, Material Design 3.

---

## Orden sugerido (de lo más fácil a lo más grande)

1. ~~**Botón de compartir**~~ — ✅ ya estaba implementado.
2. ~~**Estados vacíos ilustrados**~~ — ✅ completado 2026-09-11.
3. ~~**Loading skeletons**~~ — ✅ completado 2026-09-11.
4. ~~**Indicador de estado del sensor**~~ — ✅ completado 2026-09-11.
5. ~~**Asistente conversacional (chatbot)**~~ — ✅ completado 2026-09-11. Las 5 mejoras están
   terminadas. Queda pendiente de prueba manual en dispositivo/emulador (ver checklist de cada
   mejora) y la limitación de historial del chatbot documentada arriba, por si se prioriza a futuro.

---

## Mejora 1 — Botón de compartir reportes y gráficas

**RF-12, RF-13 · CU-05 · RNF-09, RNF-10**

**Estado: ✅ Completo** (verificado 2026-09-11)

- [x] `shareCsv()` con `expo-sharing` → `Sharing.shareAsync()` (`utils/csvExport.ts:87-108`)
- [x] `saveCsvToDownloads()` con fallback a share en iOS (`utils/csvExport.ts:113-139`)
- [x] Botón de compartir (ícono share-outline) en `ColmenaDetailScreen.tsx:314-315,427-433`
- [x] Contenido limitado a la colmena consultada por el usuario autenticado (RF-13)
- [ ] Prueba funcional en dispositivo físico: el selector nativo abre con el contenido correcto
      (verificación sugerida por la matriz de trazabilidad, no automatizable)

---

## Mejora 2 — Estados vacíos ilustrados

**RF-10, RF-11 · CU-04 · RNF-08**

**Estado: ✅ Completo** (implementado 2026-09-11)

- [x] `AlertsScreen.tsx:154-159` — ícono + título + mensaje específico
- [x] `ColmenasScreen.tsx:125-129` — ícono + mensaje + submensaje
- [x] `BitacoraScreen.tsx:396-400,421-424` — ícono + mensaje, incluye variante por día (vista calendario)
- [x] `ApiarioDetailScreen.tsx` — agregado ícono `cube-outline` + mensaje + submensaje (antes solo texto plano)
- [x] Mensajes específicos al contexto por pantalla (RF-11)

*Nota: `dashboard.tsx` no tiene manejo de lista vacía, pero no es una de las 3 pantallas de listado
que cubre RF-10 (alertas/colmenas/apiarios), así que no cuenta como pendiente de esta mejora.*

---

## Mejora 3 — Loading skeletons en pantallas de carga

**RF-05, RF-06 · CU-02 · RNF-04, RNF-05**

**Estado: ✅ Completo** (implementado 2026-09-11)

- [x] Componente `components/SkeletonLoader.tsx` con animación de pulso (`Animated.Value`, opacidad)
- [x] Usado en `dashboard.tsx` (4x), `profile.tsx` (7x), `ApiarioDetailScreen.tsx` (2x), `ColmenasScreen.tsx` (2x), `AlertsScreen.tsx` (1x)
- [x] `ColmenaDetailScreen.tsx` — migrado de `ActivityIndicator` a un layout de skeletons que refleja la estructura real (título, resumen, filtros, gráfica, tiempo real)
- [ ] `BitacoraScreen.tsx` — sin skeleton (no está en la lista original de 5 pantallas del RF-05, se deja fuera de alcance a propósito)
- [ ] Verificar en dispositivo físico que la transición no tenga parpadeos/saltos visuales (RF-06) — no automatizable, pendiente de prueba manual

---

## Mejora 4 — Indicador de estado del sensor (en línea / desconectado)

**RF-07, RF-08, RF-09 · CU-03 · RNF-06, RNF-07**

**Estado: ✅ Completo** (implementado 2026-09-11)

- [x] Componente reutilizable `components/SensorStatusBadge.tsx` (verde "En línea" / rojo "Desconectado hace [tiempo]" / gris "Sin sensor asignado")
- [x] Umbral configurable en `constants/sensorConfig.ts` (`SENSOR_OFFLINE_THRESHOLD_MINUTES = 15`), sin tocar el backend (RNF-07)
- [x] Backend: `GET /api/apiarios/:id/colmenas` ahora regresa `ultima_lectura_en` por colmena (MAX entre todos sus sensores, `backend/index.js`)
- [x] Mostrado en la lista de colmenas dentro de `ApiarioDetailScreen.tsx` (RF-09), modo `compact`
- [x] Mostrado en `ColmenaDetailScreen.tsx` junto al nombre de la colmena (RF-09), reutilizando `ultimaLectura` ya obtenida cada 30s
- [x] Estado alterno "Sin sensor asignado" cuando `ultima_lectura_en` es `null` (flujo A1 del CU-03)
- [ ] Estado de excepción E1 (mostrar último estado en caché + aviso si falla la petición) — no implementado, pendiente si se prioriza

*Nota: no confundir con `SENSOR_THRESHOLDS` en `ColmenaDetailScreen.tsx:46,61` — eso son rangos de
color para las gráficas (temperatura/humedad óptima), no tiene relación con conectividad.*

---

## Mejora 5 — Asistente conversacional (bot) en la app

**RF-01, RF-02, RF-03, RF-04 · CU-01 · RNF-01, RNF-02, RNF-03**

**Estado: backend completo, frontend no iniciado** (verificado 2026-09-11)

### Backend (✅ completo)
- [x] `backend/chatbot.js` — Gemini (`gemini-2.5-flash`) con function-calling sobre datos reales del usuario
- [x] `POST /api/chatbot` protegido con JWT (`verificarToken`) — cumple RNF-01
- [x] Rate limiting `chatbotLimiter` (10 req/min) — apoya RNF-02/confiabilidad
- [x] 3 herramientas reales: `listar_colmenas`, `consultar_alertas_recientes`, `consultar_tendencia_sensor`
- [x] Acceso restringido a colmenas del usuario autenticado (RF-03)

### Frontend (✅ completo — 2026-09-11)
- [x] Mascota "Abeja Asistente" — `components/BeeMascot.tsx` (SVG ilustrado con `react-native-svg`, tamaño configurable vía prop `size`, ids únicos por instancia con `useId()` para evitar colisión de degradados cuando se repite en varios mensajes)
- [x] Pantalla de chat — `app/(user)/ChatbotScreen.tsx` (campo de texto + historial visual de la conversación + estado vacío con sugerencias)
- [x] Ícono de acceso al asistente en el encabezado del Dashboard (junto a notificaciones) y entrada en el drawer
- [x] Botón "Enviar" deshabilitado si el campo está vacío (flujo alternativo A1)
- [x] Envío de la pregunta al backend con `utils/api.js` (agrega el JWT automáticamente)
- [x] Renovación automática de token si expiró antes de enviar (E1) — **gratis**: `ChatbotScreen` usa el mismo cliente `api` que ya tiene el interceptor de refresh/logout en `utils/api.js`, no requirió lógica nueva
- [x] Mensaje de error controlado + botón "Reintentar" según la causa (429 / error del servicio / sin conexión) — `resolveErrorText()` en `ChatbotScreen.tsx` (E2, RF-04)
- [x] Mostrar la respuesta del asistente en el historial de la conversación, con indicador "escribiendo" mientras espera

**Limitación conocida (no es un bug, es el contrato actual del backend):** `backend/chatbot.js` no
recibe ni conserva historial entre peticiones — cada pregunta es una conversación nueva para
Gemini. El historial que se ve en `ChatbotScreen` es solo visual; una pregunta de seguimiento como
"¿y su temperatura?" no tendrá contexto de la pregunta anterior. Si se quiere memoria real,
`responderPregunta(pregunta, usuarioId)` tendría que aceptar y reenviar los `contents` previos —
cambio de backend, no de esta pantalla.

---

## Matriz de trazabilidad (resumen)

| Mejora | RF | CU | RNF | Estado |
|---|---|---|---|---|
| Asistente conversacional | RF-01 a RF-04 | CU-01 | RNF-01, RNF-02, RNF-03 | ✅ Completo (2026-09-11) — ver limitación de historial abajo |
| Loading skeletons | RF-05, RF-06 | CU-02 | RNF-04, RNF-05 | ✅ Completo (2026-09-11) |
| Indicador de estado del sensor | RF-07 a RF-09 | CU-03 | RNF-06, RNF-07 | ✅ Completo (2026-09-11) |
| Estados vacíos ilustrados | RF-10, RF-11 | CU-04 | RNF-08 | ✅ Completo (2026-09-11) |
| Botón de compartir | RF-12, RF-13 | CU-05 | RNF-09, RNF-10 | ✅ Completo |

13 de 13 RF cubiertos por un caso de uso · 10 de 10 RNF asignados a una mejora · 5 de 5 casos de
uso respaldados por al menos un RF (sin requerimientos huérfanos, según el documento fuente).

---

## Glosario breve

- **Alerta**: registro generado cuando una lectura cruza un umbral (tabla `alertas`).
- **Apiario**: conjunto de colmenas bajo una misma ubicación/propietario.
- **Bitácora**: eventos de manejo apícola capturados manualmente en la app.
- **Colmena**: unidad monitoreada dentro de un apiario, asociada a un sensor.
- **Lectura ambiental**: medición puntual de un sensor (tabla `lecturas_ambientales`).
- **Refresh token**: token de 7 días para renovar el JWT sin volver a iniciar sesión.
- **Skeleton**: silueta animada del contenido mientras carga, en vez de un spinner genérico.
- **Tool use / Function calling**: mecanismo con el que el modelo del asistente invoca funciones
  del backend (consultar alertas, tendencias) para fundamentar sus respuestas en datos reales.
