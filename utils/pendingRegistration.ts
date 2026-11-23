// Guarda EN MEMORIA (nunca en disco ni en la URL de navegación) el correo y la contraseña que la persona acaba de escribir
// al registrarse o al intentar entrar con una cuenta pendiente. La pantalla de verificación los necesita para:
//  1) mandar la contraseña junto con el código (el servidor solo fija la contraseña al confirmar el correo), y
//  2) iniciar sesión sola cuando el código es correcto.
// Se borra al terminar la verificación y al cerrar la app.

let pendiente: { email: string; password: string } | null = null;

const normalizar = (email: string) => email.trim().toLowerCase();

export function guardarRegistroPendiente(email: string, password: string) {
  pendiente = { email: normalizar(email), password };
}

// Devuelve los datos solo si corresponden a ese correo (evita usar la contraseña de otra cuenta).
export function obtenerRegistroPendiente(email: string) {
  return pendiente && pendiente.email === normalizar(email) ? pendiente : null;
}

export function limpiarRegistroPendiente() {
  pendiente = null;
}
