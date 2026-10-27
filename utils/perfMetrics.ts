// Utilidad de instrumentación de rendimiento para desarrollo (RNF-05).
// Los logs [PERF] solo tienen valor en modo __DEV__; en producción no hacen nada.

const navMarks = new Map<string, number>();

export function markPerfNav(key: string) {
  if (!__DEV__) return;
  navMarks.set(key, performance.now());
}

export function logPerfNav(key: string, label: string) {
  if (!__DEV__) return;
  const start = navMarks.get(key);
  if (start === undefined) return;
  navMarks.delete(key);
  console.log(`[PERF] ${label}: ${(performance.now() - start).toFixed(0)}ms`);
}

export function logPerfDuration(label: string, startTime: number) {
  if (!__DEV__) return;
  console.log(`[PERF] ${label}: ${(performance.now() - startTime).toFixed(0)}ms`);
}
