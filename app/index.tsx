import { Redirect } from 'expo-router';

// Este componente es el punto de entrada principal de la aplicación.
// Su única responsabilidad es redirigir inmediatamente a una ruta que esté
// manejada por nuestra lógica de autenticación en _layout.tsx.
// _layout.tsx interceptará esta navegación, comprobará el estado de autenticación
// y redirigirá al usuario a /login o al dashboard correspondiente.
export default function RootIndex() {
  return <Redirect href="/(user)/dashboard" />;
}
