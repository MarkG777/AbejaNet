// offlineQueue.js
// Cola simple en AsyncStorage para eventos de bitácora creados sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@bitacora_offline_queue';

export async function getQueuedEvents() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function queueEvent(payload) {
  const queue = await getQueuedEvents();
  const queuedEvent = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    payload,
    queuedAt: new Date().toISOString(),
  };
  queue.push(queuedEvent);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queuedEvent;
}

async function removeFromQueue(localId) {
  const queue = await getQueuedEvents();
  const remaining = queue.filter((item) => item.localId !== localId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

// Intenta sincronizar cada evento pendiente usando la función de envío provista.
// Devuelve la cantidad de eventos sincronizados con éxito.
export async function syncQueuedEvents(sendFn) {
  const queue = await getQueuedEvents();
  let synced = 0;
  for (const item of queue) {
    try {
      await sendFn(item.payload);
      await removeFromQueue(item.localId);
      synced++;
    } catch (err) {
      // Si sigue fallando (aún sin red, o error del servidor), se deja en la cola para el próximo intento.
      break;
    }
  }
  return synced;
}
