# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Rendimiento (RNF-05)

En modo `__DEV__` la app registra en consola el tiempo de las operaciones locales listadas abajo, usando `performance.now()` (ver `utils/perfMetrics.ts`, `app/(user)/dashboard.tsx`, `app/(user)/BitacoraScreen.tsx`, `app/(user)/profile.tsx` y las tres pantallas de `app/(auth)/`). Cada log aparece con el prefijo `[PERF]` en la terminal de `npx expo start` o en Logcat/Console del dispositivo.

Para llenar la columna "Medido" con datos reales: correr `npx expo start --dev-client` (o el APK de debug) en el dispositivo objetivo, repetir cada operación 3-5 veces y anotar el promedio.

| Operación | Objetivo | Medido (promedio) | Dispositivo/fecha |
|---|---|---|---|
| Transición Dashboard → Bitácora | < 300 ms | _pendiente de medir en dispositivo_ | — |
| Cambio de idioma desde el perfil | < 100 ms | _pendiente de medir en dispositivo_ | — |
| Apertura de Bitácora con datos cacheados | < 500 ms | _pendiente de medir en dispositivo_ | — |
| Validación de formularios onBlur (login/register/recuperar) | < 50 ms | _pendiente de medir en dispositivo_ | — |
| Primer paint del dashboard con caché | < 200 ms | _pendiente de medir en dispositivo_ | — |

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
