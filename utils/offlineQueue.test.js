jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQueuedEvents, queueEvent, syncQueuedEvents } from './offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('getQueuedEvents devuelve un arreglo vacío cuando no hay nada guardado', async () => {
    const queue = await getQueuedEvents();
    expect(queue).toEqual([]);
  });

  test('queueEvent agrega un evento con localId único', async () => {
    const payload = { apiario_id: 1, colmena_id: null, tipo_evento: 'revision', descripcion: 'test' };
    const queued = await queueEvent(payload);

    expect(queued.localId).toBeDefined();
    expect(queued.payload).toEqual(payload);

    const queue = await getQueuedEvents();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual(payload);
  });

  test('syncQueuedEvents envía cada evento y lo remueve de la cola en éxito', async () => {
    await queueEvent({ apiario_id: 1, colmena_id: null, tipo_evento: 'revision', descripcion: 'a' });
    await queueEvent({ apiario_id: 1, colmena_id: null, tipo_evento: 'cosecha', descripcion: 'b' });

    const sendFn = jest.fn().mockResolvedValue(undefined);
    const synced = await syncQueuedEvents(sendFn);

    expect(synced).toBe(2);
    expect(sendFn).toHaveBeenCalledTimes(2);
    expect(await getQueuedEvents()).toEqual([]);
  });

  test('syncQueuedEvents deja en la cola los eventos que siguen fallando', async () => {
    await queueEvent({ apiario_id: 1, colmena_id: null, tipo_evento: 'revision', descripcion: 'a' });

    const sendFn = jest.fn().mockRejectedValue(new Error('sin conexión'));
    const synced = await syncQueuedEvents(sendFn);

    expect(synced).toBe(0);
    expect(await getQueuedEvents()).toHaveLength(1);
  });

  test('un evento rechazado con 400 se descarta y no bloquea a los siguientes', async () => {
    await queueEvent({ apiario_id: 1, colmena_id: 99, tipo_evento: 'revision', descripcion: 'invalido' });
    await queueEvent({ apiario_id: 1, colmena_id: null, tipo_evento: 'cosecha', descripcion: 'valido' });

    const sendFn = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Bad Request'), { response: { status: 400 } }))
      .mockResolvedValueOnce({});
    const synced = await syncQueuedEvents(sendFn);

    expect(synced).toBe(1); // solo el válido cuenta como sincronizado
    expect(sendFn).toHaveBeenCalledTimes(2);
    expect(await getQueuedEvents()).toHaveLength(0); // el inválido se descartó
  });

  test('un 401 o un 500 NO descartan el evento (pueden ser temporales)', async () => {
    await queueEvent({ apiario_id: 1, colmena_id: null, tipo_evento: 'revision', descripcion: 'a' });

    for (const status of [401, 500]) {
      const sendFn = jest.fn().mockRejectedValue(Object.assign(new Error('x'), { response: { status } }));
      expect(await syncQueuedEvents(sendFn)).toBe(0);
      expect(await getQueuedEvents()).toHaveLength(1);
    }
  });
});
