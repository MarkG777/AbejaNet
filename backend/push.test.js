import { describe, expect, jest, test } from '@jest/globals';
import { enviarPush } from './push.js';

// Expo falso: chunkPushNotifications como el real (un solo lote) y tickets configurables.
const crearExpo = (tickets) => ({
  chunkPushNotifications: (mensajes) => [mensajes],
  sendPushNotificationsAsync: jest.fn().mockResolvedValue(tickets),
});
const crearDb = () => ({ query: jest.fn().mockResolvedValue({ rowCount: 1 }) });
const mensajes = [{ to: 'ExponentPushToken[a]' }, { to: 'ExponentPushToken[b]' }];

describe('enviarPush', () => {
  test('cuenta las notificaciones enviadas y no toca la BD si todo salió bien', async () => {
    const db = crearDb();
    const r = await enviarPush(mensajes, { expo: crearExpo([{ status: 'ok' }, { status: 'ok' }]), db });
    expect(r).toEqual({ enviadas: 2, fallidas: 0, tokensEliminados: 0, errores: [] });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('un token DeviceNotRegistered cuenta como fallido y se borra de la BD', async () => {
    const db = crearDb();
    const tickets = [{ status: 'ok' }, { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } }];
    const r = await enviarPush(mensajes, { expo: crearExpo(tickets), db });
    expect(r.enviadas).toBe(1);
    expect(r.fallidas).toBe(1);
    expect(r.tokensEliminados).toBe(1);
    expect(r.errores).toEqual(['DeviceNotRegistered']);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('push_token = NULL'), [['ExponentPushToken[b]']]);
  });

  test('otros errores de ticket se reportan pero NO borran el token', async () => {
    const db = crearDb();
    const r = await enviarPush(mensajes, { expo: crearExpo([{ status: 'ok' }, { status: 'error', message: 'MessageTooBig', details: { error: 'MessageTooBig' } }]), db });
    expect(r.fallidas).toBe(1);
    expect(r.tokensEliminados).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('si falla el envío del lote completo, todas cuentan como fallidas y no revienta', async () => {
    const expo = { chunkPushNotifications: (m) => [m], sendPushNotificationsAsync: jest.fn().mockRejectedValue(new Error('sin red')) };
    const r = await enviarPush(mensajes, { expo, db: crearDb() });
    expect(r).toMatchObject({ enviadas: 0, fallidas: 2, errores: ['sin red'] });
  });

  test('sin mensajes no envía nada', async () => {
    const expo = { chunkPushNotifications: () => [], sendPushNotificationsAsync: jest.fn() };
    const r = await enviarPush([], { expo, db: crearDb() });
    expect(r).toEqual({ enviadas: 0, fallidas: 0, tokensEliminados: 0, errores: [] });
    expect(expo.sendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});
