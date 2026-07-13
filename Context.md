# AbejaNet — Tareas a Completar (App Móvil v3)

> Análisis del código fuente realizado el 09/07/2026.
> Las tareas marcadas con ✅ ya están implementadas y no requieren acción.
> Validación basada en normas ISO 9241, WCAG 2.2, NIST SP 800-63B y mejores prácticas de UX 2025.

---

## Normas y estándares aplicados

| Norma | Aplicación en AbejaNet |
|---|---|
| **ISO 9241-210** | Diseño centrado en el usuario: iterar con feedback real |
| **ISO 9241-110** | 7 principios de diálogo: auto-descriptividad, conformidad con expectativas, tolerancia a errores, controlabilidad |
| **ISO 9241-11** | Usabilidad medible: efectividad, eficiencia, satisfacción en contexto |
| **ISO 9241-125/143** | Presentación visual: contraste, legibilidad, agrupación de información |
| **WCAG 2.2 (AA)** | Accesibilidad: contraste 4.5:1, touch target mínimo 24x24 CSS px, foco visible |
| **NIST SP 800-63B** | Autenticación: timeout de inactividad, reautenticación biométrica |
| **Material Design 3** | Patrones UX: toasts/snackbars, banners, formularios progresivos |

---

## RQF-03 — Anti-spam y validación de email

**Normas aplicadas:** ISO 9241-110 (tolerancia a errores, auto-descriptividad), WCAG 2.2 SC 3.3.1 (identificación de errores), NN/g Form Validation Guidelines

**Estado actual:** No existe validación de email en ninguna pantalla. Los botones ya se deshabilitan durante loading (`disabled={isLoading}`) pero no validan formato antes de enviar.

**Mejores prácticas de UX (NN/g 2024):**
- Validación inline **después** de que el usuario abandone el campo (onBlur), no mientras escribe
- Para passwords complejas: validación en tiempo real SÍ es recomendada (feedback inmediato)
- Mensajes de error específicos, no genéricos ("El email no tiene formato válido" > "Error")
- El botón de envío debe deshabilitarse visualmente pero no ocultarse
- El borde rojo + texto de error debajo del input es el patrón estándar de Material Design 3

- [ ] Crear función `validateEmail(email)` con regex RFC 5322 simplificada
- [ ] Integrar validación onBlur en **login** (`app/(auth)/login.tsx`) — mostrar borde rojo + mensaje inline
- [ ] Integrar validación onBlur en **register** (`app/(auth)/register.tsx`) — mostrar borde rojo + mensaje inline
- [ ] Integrar validación onBlur en **forgot-password** (`app/(auth)/forgot-password.tsx`) — mostrar borde rojo + mensaje inline
- [ ] Deshabilitar botón de envío cuando el email sea inválido (estado visual deshabilitado, no oculto)
- [ ] Asegurar contraste 4.5:1 en texto de error (WCAG 2.2 SC 1.4.3)
- [ ] Asegurar touch target mínimo 48x48dp en botones de envío (WCAG 2.2 SC 2.5.8)
- [ ] ✅ Deshabilitar botón y mostrar loading durante la petición HTTP (ya implementado con `isLoading`)
- [ ] ✅ Reactivar botón al recibir respuesta (ya implementado en `finally { setIsLoading(false) }`)

---

## RQF-04 — Indicador de conexión y caché offline del dashboard

**Normas aplicadas:** ISO 9241-110 (auto-descriptividad, conformidad con expectativas), Material Design 3 (banners), patrón stale-while-revalidate (Google web.dev, Android offline-first)

**Estado actual:** No hay `@react-native-community/netinfo` instalado. El dashboard (`app/(user)/dashboard.tsx`) llama directamente `api.get('/api/dashboard-summary')` sin caché ni manejo offline.

**Mejores prácticas de caché offline (Android Developers, web.dev 2024):**
- Patrón **stale-while-revalidate**: mostrar datos cacheados inmediatamente, refrescar en background
- Comunicar frescura al usuario: "Actualizado hace X min" (ISO 9241-110: auto-descriptividad)
- Banner de conexión no intrusivo: amarillo para offline, desaparece al reconectar
- TTL de 5 min para datos del dashboard (frecuencia de actualización del ESP32 = 10 min)
- Metadata de caché: `{ data, timestamp, ttl }` en AsyncStorage
- Al reconectar: refrescar automáticamente sin intervención del usuario

- [ ] Instalar `@react-native-community/netinfo` (compatible con Expo SDK 51 / RN 0.74.5)
- [ ] Crear hook `useNetworkStatus` con suscripción a cambios de red (no polling)
- [ ] Mostrar banner superior amarillo "Sin conexión" (Material Design 3 banner pattern)
- [ ] Implementar caché stale-while-revalidate: guardar `{ data, timestamp, ttl: 300000 }` en AsyncStorage
- [ ] Cargar datos cacheados inmediatamente al abrir dashboard (incluso con conexión)
- [ ] Refrescar en background si hay conexión y caché está stale
- [ ] Mostrar "Actualizado hace X min" cuando se muestren datos cacheados
- [ ] Refrescar automáticamente al recuperar conexión (NetInfo subscription)
- [ ] Ocultar banner con animación al confirmarse la reconexión
- [ ] Asegurar contraste 4.5:1 en texto del banner (WCAG 2.2 SC 1.4.3)

---

## RQF-05 — Bitácora apícola con calendario

**Normas aplicadas:** ISO 9241-110 (suitability for task, controllability), ISO 9241-11 (efficiency), WCAG 2.2 SC 2.5.8 (touch targets en calendario)

**Estado actual:** No existe tabla `bitacora` en PostgreSQL. No hay endpoints de bitácora en `backend/index.js`. No hay `react-native-calendars` instalado. `react-native-svg` ya está instalado (dependencia requerida por calendars).

**Mejores prácticas de UX para calendarios:**
- Los dots en días con eventos deben tener contraste suficiente contra el fondo (WCAG 2.2)
- Touch target mínimo 44x44dp en días del calendario (WCAG 2.2 SC 2.5.5 Enhanced)
- Formulario de evento: agrupar campos relacionados (ISO 9241-125: agrupación de información)
- Confirmación antes de eliminar (ISO 9241-110: tolerancia a errores — usar Alert.alert destructivo)
- Feedback háptico al crear/editar/eliminar evento (RNF-02)

### Backend
- [ ] Crear tabla `bitacora` en PostgreSQL (id, usuario_id, colmena_id, apiario_id, tipo_evento, titulo, comentario, fecha_evento, created_at, updated_at)
- [ ] Endpoint POST /api/bitacora — validar campos obligatorios
- [ ] Endpoint GET /api/bitacora con filtros (usuario_id, fecha_inicio, fecha_fin, colmena_id, apiario_id)
- [ ] Endpoint GET /api/bitacora/:id
- [ ] Endpoint PUT /api/bitacora/:id
- [ ] Endpoint DELETE /api/bitacora/:id
- [ ] Validar propietario del evento en PUT y DELETE (seguridad: OWASP MASVS)

### Frontend
- [ ] Instalar `react-native-calendars` (requiere `react-native-svg` ✅ ya instalado)
- [ ] Crear pantalla Bitácora accesible desde el drawer (`app/(user)/_layout.tsx`)
- [ ] Mostrar calendario mensual con dots en días con eventos (contraste WCAG)
- [ ] Listar eventos al seleccionar un día (ordenados por hora)
- [ ] Crear formulario de evento con tipo, colmena/apiario, título y comentario (campos agrupados)
- [ ] Editar eventos existentes (cargar datos previos en formulario)
- [ ] Eliminar eventos con confirmación Alert.alert destructiva (ISO 9241-110: error tolerance)
- [ ] Acceso rápido "Registrar evento" desde detalle de colmena (FAB button, 56x56dp)
- [ ] Filtrar calendario por colmena o apiario (dropdown selector)
- [ ] Integrar con endpoints /api/bitacora
- [ ] Aplicar i18n a todos los textos del calendario y formularios (RNF-01)
- [ ] Aplicar toasts para feedback de crear/editar/eliminar (RNF-02)

---

## RNF-01 — Soporte bilingüe Español/Inglés

**Normas aplicadas:** ISO 9241-110 (individualisation — personalización por usuario), ISO 9241-11 (satisfaction en contexto cultural)

**Estado actual:** `i18next` + `react-i18next` ya configurados en `utils/i18n.ts`. Archivos `locales/es.json` y `locales/en.json` existen con ~83 claves. Persistencia en AsyncStorage ya funciona. Selector de idioma ya funciona en `profile.tsx`. **Faltan 3 pantallas sin i18n y localización de fechas en charts.**

**Mejores prácticas de i18n:**
- Toda cadena visible al usuario debe pasar por `t()` — cero strings hardcoded
- Formato de fechas y números debe adaptarse al locale (date-fns con locale dinámico)
- El idioma del dispositivo debe respetarse como fallback inicial (ya implementado)
- El cambio de idioma debe ser instantáneo sin reiniciar la app (i18n.changeLanguage ya lo soporta)

- [ ] **login.tsx** — No tiene `useTranslation`. 8 strings hardcoded en español (títulos, placeholders, botones, links, Alert.alert)
- [ ] **register.tsx** — No tiene `useTranslation`. 7 strings hardcoded en español (validaciones, Alert.alert, textos)
- [ ] **onboarding.tsx** — No tiene `useTranslation`. 8 strings hardcoded en español (3 slides + "Omitir" + "Siguiente" + "Comenzar")
- [ ] **forgot-password.tsx** — ✅ Ya usa `useTranslation` y `t()`
- [ ] **profile.tsx** — ✅ Ya usa `useTranslation` y `t()`
- [ ] **AlertsScreen.tsx** — ✅ Ya usa `useTranslation` y `t()`
- [ ] **_layout.tsx (user)** — ✅ Ya usa `useTranslation` y `t()`
- [ ] Agregar claves nuevas en `locales/es.json` y `locales/en.json` para login, register y onboarding
- [ ] Localizar formato de fechas en `SensorChart.tsx` (usa `{ locale: es }` hardcoded de date-fns → usar locale dinámico según idioma)
- [ ] Localizar formato de fechas en `ComparisonChartModal.tsx` (usa `{ locale: es }` hardcoded de date-fns → usar locale dinámico según idioma)
- [ ] ✅ Persistir preferencia de idioma en AsyncStorage (ya implementado en `utils/i18n.ts`)
- [ ] ✅ Aplicar idioma al siguiente arranque (ya implementado en `utils/i18n.ts`)
- [ ] ✅ Selector de idioma en perfil (ya implementado en `profile.tsx` con `changeLanguage`)

---

## RNF-02 — Retroalimentación háptica y toasts no intrusivos

**Normas aplicadas:** ISO 9241-110 (auto-descriptividad, conformidad con expectativas), Material Design 3 (snackbars/toasts), WCAG 2.2 SC 1.4.2 (audio control — equivalente háptico)

**Estado actual:** `expo-haptics` ya instalado (13.0.1) y usado en `HapticTab.tsx` (solo iOS, solo tabs). `react-native-toast-message` NO instalado. Hay **37 `Alert.alert` calls** distribuidos en 4 archivos: login.tsx (6), register.tsx (7), forgot-password.tsx (10), profile.tsx (14). `AlertsScreen.tsx` no tiene `Alert.alert`.

**Mejores prácticas de feedback UX (LogRocket, Mobbin 2024):**
- **Toasts** para feedback no intrusivo: éxito, error, info (auto-dismiss 3-4s)
- **Alert/dialog** para confirmaciones que requieren acción del usuario (ej. "¿Confirmar cambios?")
- **Hápticos** para acciones críticas: login, guardado, eliminación (no spam háptico)
- Toasts deben aparecer en la parte superior o inferior, no bloquear contenido
- Toasts de error deben durar más (4-5s) que los de éxito (2-3s)
- El texto del toast debe ser conciso (máx. 2 líneas)

- [ ] Instalar `react-native-toast-message` (compatible con Expo SDK 51 / RN 0.74.5)
- [ ] Configurar Toast global: éxito (verde, 3s), error (rojo, 4s), advertencia (amarillo, 3s)
- [ ] Reemplazar Alert.alert por toast en **login.tsx** (6 calls — errores de auth y red)
- [ ] Reemplazar Alert.alert por toast en **register.tsx** (7 calls — errores de validación y registro)
- [ ] Reemplazar Alert.alert por toast en **forgot-password.tsx** (10 calls — errores y éxito)
- [ ] Reemplazar Alert.alert por toast en **profile.tsx** (14 calls, mantener Alert.alert en confirmación destructiva de guardar cambios — línea 55 `handleSaveChanges`)
- [ ] Agregar háptico `ImpactFeedbackStyle.Light` en login exitoso
- [ ] Agregar háptico `ImpactFeedbackStyle.Light` en guardado de perfil exitoso
- [ ] Agregar háptico `ImpactFeedbackStyle.Medium` en marcado de alertas como leídas (`AlertsScreen.tsx`)
- [ ] Agregar háptico `ImpactFeedbackStyle.Heavy` en eliminación de eventos de bitácora
- [ ] Configurar auto-dismiss: éxito 3s, error 4s, advertencia 3s
- [ ] Mantener Alert.alert solo para confirmaciones destructivas (ej. "Confirmar Cambios" en profile, "¿Eliminar evento?" en bitácora)
- [ ] Asegurar contraste 4.5:1 en texto de toasts (WCAG 2.2 SC 1.4.3)

---

## RNF-03 — Bloqueo automático por inactividad

**Normas aplicadas:** NIST SP 800-63B (session management, reauthentication), ISO 9241-110 (controllability — no bloquear sin aviso)

**Estado actual:** `expo-local-authentication` ya instalado (14.0.1). `AuthContext.tsx` ya tiene `proveBiometrics()` que valida biometría al restaurar sesión y al volver de segundo plano. **Falta el temporizador de inactividad.** No requiere código nativo ni cambios en iOS.

**NIST SP 800-63B — Reautenticación por inactividad:**
- NIST define dos tipos de timeout: **overall timeout** (duración total de la sesión) e **inactivity timeout** (sin actividad del usuario)
- AAL2: inactivity timeout SHOULD be no more than 1 hour. Para apps móviles no financieras, 5-15 min es aceptable y más seguro
- La reautenticación tras inactivity timeout MAY usar **solo comparación biométrica** (sin reingresar password) — NIST SP 800-63B Sec 2.2.3
- **Una sola verificación biométrica es el estándar**: el prompt biométrico del SO ya maneja reintentos internamente. No es necesario implementar lógica de 3 intentos a nivel app
- Si la biometría falla o el usuario cancela → logout inmediato (sesión terminada)
- El timeout de inactividad se reinicia con cualquier actividad del usuario

- [ ] Crear temporizador de inactividad de 5 minutos (JS puro con `setTimeout`, sin dependencias nuevas)
- [ ] Implementar wrapper a nivel de app para detectar interacciones (toque, scroll) — usar `PanResponder` o gesture handler
- [ ] Reiniciar temporizador en cada interacción del usuario (reset inactivity timer)
- [ ] Pausar temporizador cuando la app pase a segundo plano (usar `AppState` ya importado en AuthContext)
- [ ] Reanudar temporizador al volver a primer plano (si ya pasó el tiempo, disparar biometría)
- [ ] Disparar `proveBiometrics()` al expirar el temporizador (función ya existente)
- [ ] **Verificación biométrica única**: si falla o se cancela → `logout()` inmediato (NIST SP 800-63B: sesión terminada)
- [ ] Regresar a pantalla previa tras autenticación exitosa
- [ ] ✅ `expo-local-authentication` ya integrado
- [ ] ✅ Biometría al restaurar sesión ya funciona
- [ ] ✅ Biometría al volver de segundo plano ya funciona
- [ ] ✅ Logout en fallo biométrico ya implementado en `proveBiometrics()` (línea 56 de AuthContext.tsx)

---

## RNF-04 — Compatibilidad multiplataforma

**Normas aplicadas:** WCAG 2.2 (aplicado a mobile — W3C WCAG2Mobile 2024), ISO 9241-125 (presentación visual multiplataforma)

**Estado actual:** Expo SDK 51 ya soporta Android 8+ e iOS 13+ por defecto. El código ya maneja ambas plataformas (`Platform.OS === 'ios'` en login, `HapticTab` con código iOS, `app.json` con `iosClientId`). **No hay versiones mínimas declaradas explícitamente en `app.json`.**

**Mejores prácticas de compatibilidad multiplataforma:**
- Usar `Platform.select()` para diferencias de UI (ya se usa en tabs)
- Touch targets: 48x48dp Android / 44x44pt iOS (WCAG 2.2 SC 2.5.8)
- SafeArea: usar `react-native-safe-area-context` (ya instalado) para notch y home indicator
- KeyboardAvoidingView ya implementado en login con `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- Hápticos: iOS usa `expo-haptics`, Android usa `Vibration` API nativa

- [ ] Declarar Android 8.0 (API 26) mínimo en `app.json` → `android.permissions` o documentar en README
- [ ] Declarar iOS 13.0 mínimo en `app.json` → `ios.infoPlist.MinimumOSVersion` o documentar en README
- [ ] Validar touch targets ≥ 48x48dp en todos los botones (WCAG 2.2 SC 2.5.8)
- [ ] Validar contraste 4.5:1 en todos los textos (WCAG 2.2 SC 1.4.3)
- [ ] Validar SafeArea en pantallas con notch (iPhone X+) y home indicator
- [ ] Validar que `react-native-toast-message`, `netinfo` y `react-native-calendars` sean compatibles con Android 8+ e iOS 13+
- [ ] Probar funcionalidades nuevas en emulador Android 8.0
- [ ] ~~Probar funcionalidades nuevas en simulador iOS 13.0~~ (POSPUESTO — sin acceso a Mac por ahora)
- [ ] Actualizar README con versiones mínimas documentadas y tabla de compatibilidad

---

## RNF-05 — Tiempo de respuesta en operaciones locales

**Normas aplicadas:** ISO 9241-11 (efficiency — tiempo de tarea), ISO 9241-110 (controllability — respuesta percibida)

**Estado actual:** No hay mediciones. `react-native-reanimated` ya está instalado para animaciones a 60 FPS.

**Mejores prácticas de performance UX (Google RAIL Model):**
- **Response**: responder a input en < 100ms (percepción de instantaneidad)
- **Animation**: mantener 60 FPS en animaciones (16ms por frame)
- **Idle**: usar tiempo idle para pre-cargar datos
- **Load**: cargar contenido en < 1s (usar caché para primer paint)
- Medir con `performance.now()` en desarrollo, no en producción
- Documentar resultados en tabla para auditoría de calidad (ISO 9241-11: medible)

- [x] Medir transición dashboard → bitácora con `performance.now()` (objetivo: < 300ms)
- [x] Medir cambio de idioma desde el perfil (objetivo: < 100ms, instantáneo)
- [x] Medir apertura de pantalla de bitácora (objetivo: < 500ms con datos cacheados)
- [x] Medir validación de formularios onBlur (objetivo: < 50ms)
- [x] Medir primer paint del dashboard con caché (objetivo: < 200ms)
- [ ] Verificar animaciones a 60 FPS sin caídas perceptibles (React Native Performance Monitor)
- [ ] Documentar tabla de tiempos medidos en README (ISO 9241-11: usabilidad medible)

---

## Resumen de compatibilidad

| Dependencia nueva | Expo SDK 51 | RN 0.74.5 | Android 7.0+ | iOS 13+ | Riesgo |
|---|---|---|---|---|---|
| `@react-native-community/netinfo` | ✅ | ✅ | ✅ | ✅ | Ninguno |
| `react-native-toast-message` | ✅ | ✅ | ✅ | ✅ | Ninguno |
| `react-native-calendars` | ✅ | ✅ | ✅ | ✅ | Ninguno (requiere `react-native-svg` ✅ ya instalado) |

**Versiones mínimas documentadas (app.json):**
- **Android**: minSdkVersion 24 (Android 7.0 Nougat) — soporte para biometría, notificaciones push y permisos runtime
- **iOS**: MinimumOSVersion 13.0 — soporte para Face ID, Dark Mode y SwiftUI
- **Touch targets**: todos los botones y elementos interactivos cumplen WCAG 2.2 SC 2.5.5 (mínimo 44x44 pt iOS / 48x48 dp Android)

**Dependencias ya instaladas que se reutilizan:**

| Dependencia | Versión | Requerimiento |
|---|---|---|
| `expo-haptics` | 13.0.1 | RNF-02 |
| `expo-local-authentication` | 14.0.1 | RNF-03 |
| `i18next` + `react-i18next` | 25.10.4 / 16.6.1 | RNF-01 |
| `react-native-svg` | 15.2.0 | RQF-05 (calendars) |
| `@react-native-async-storage/async-storage` | 1.23.1 | RQF-04, RNF-01 |
| `react-native-reanimated` | 3.10.1 | RNF-05 (animaciones 60 FPS) |
| `react-native-safe-area-context` | 4.10.5 | RNF-04 (SafeArea multiplataforma) |

---

## Referencias de normas y mejores prácticas

| Fuente | URL |
|---|---|
| ISO 9241-210:2019 (Human-centred design) | https://www.iso.org/standard/77520.html |
| ISO 9241-110 (Dialog principles) | https://www.softwareevaluation.de/en/foundations/iso-9241-110-dialog-principles/ |
| WCAG 2.2 (W3C Recommendation 2023) | https://www.w3.org/TR/WCAG22/ |
| WCAG 2.2 Mobile Guidance (W3C 2024) | https://www.w3.org/TR/wcag2mobile-22/ |
| NIST SP 800-63B (Digital Identity) | https://pages.nist.gov/800-63-4/sp800-63b/ |
| Android Biometric Best Practices | https://developer.android.com/security/fraud-prevention/authentication |
| Material Design 3 (Components) | https://m3.material.io/ |
| NN/g Form Validation Guidelines | https://www.nngroup.com/articles/errors-forms-design-guidelines/ |
| Stale-while-revalidate (web.dev) | https://web.dev/articles/stale-while-revalidate |
| Android Offline-first Architecture | https://developer.android.com/topic/architecture/data-layer/offline-first |
