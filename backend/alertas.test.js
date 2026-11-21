import { describe, expect, jest, test } from '@jest/globals';
import { clasificarLectura, evaluarLectura, registrarAlertaYNotificar, UMBRALES } from './alertas.js';

// BD falsa: responde según un fragmento del SQL.
const crearDb = (respuestas = {}) => ({
  query: jest.fn(async (sql, params) => {
    for (const [fragmento, valor] of Object.entries(respuestas)) {
      if (sql.includes(fragmento)) return { rows: typeof valor === 'function' ? valor(params) : valor };
    }
    return { rows: [] };
  }),
});

describe('clasificarLectura (umbrales provisionales: temperatura 29–38 °C, humedad 40–70 %)', () => {
  test('una lectura normal no genera alertas', () => {
    expect(clasificarLectura({ temperatura: 34.5, humedad: 55 })).toEqual([]);
  });
  test('en el límite exacto no es crítica (solo fuera del rango)', () => {
    expect(clasificarLectura({ temperatura: UMBRALES.temperatura.max, humedad: UMBRALES.humedad.min })).toEqual([]);
    expect(clasificarLectura({ temperatura: UMBRALES.temperatura.min, humedad: UMBRALES.humedad.max })).toEqual([]);
  });
  test('exceso de calor y frío extremo', () => {
    expect(clasificarLectura({ temperatura: 40.1 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
    expect(clasificarLectura({ temperatura: 20 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_BAJA']);
  });
  test('humedad alta y baja', () => {
    expect(clasificarLectura({ humedad: 85 }).map((c) => c.tipo_alerta)).toEqual(['HUMEDAD_ALTA']);
    expect(clasificarLectura({ humedad: 30 }).map((c) => c.tipo_alerta)).toEqual(['HUMEDAD_BAJA']);
  });
  test('temperatura y humedad críticas a la vez dan dos alertas', () => {
    expect(clasificarLectura({ temperatura: 41, humedad: 30 })).toHaveLength(2);
  });
  test('valores ausentes, nulos o no numéricos se ignoran (sensor sin esa magnitud)', () => {
    expect(clasificarLectura({ temperatura: null, humedad: undefined })).toEqual([]);
    expect(clasificarLectura({ temperatura: 'abc', humedad: '' })).toEqual([]);
    expect(clasificarLectura()).toEqual([]);
  });
  test('acepta números como texto (lo que devuelve PostgreSQL)', () => {
    expect(clasificarLectura({ temperatura: '40.5' }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
  });
});

describe('evaluarLectura', () => {
  const critica = { temperatura: 40, humedad: 55 };
  const normal = { temperatura: 34, humedad: 55 };
  const dbBase = (extra = {}) => crearDb({
    'FROM sensores': [{ colmena_id: 4 }],
    'FROM lecturas_ambientales': [normal],
    'SELECT nombre FROM colmenas': [{ nombre: 'Colmena Prueba' }],
    ...extra,
  });

  test('lectura normal: no consulta nada ni notifica', async () => {
    const db = dbBase(); const notificar = jest.fn();
    expect(await evaluarLectura(1, normal, { db, notificar })).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
    expect(notificar).not.toHaveBeenCalled();
  });

  test('crítica pero la lectura anterior era normal: NO alerta (podría ser un pico del sensor)', async () => {
    const notificar = jest.fn();
    expect(await evaluarLectura(1, critica, { db: dbBase(), notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('crítica y confirmada por la lectura anterior: crea la alerta y notifica', async () => {
    const notificar = jest.fn().mockResolvedValue({ usuariosDestino: 2, push: { enviadas: 2, fallidas: 0 } });
    const db = dbBase({ 'FROM lecturas_ambientales': [{ temperatura: 39.5, humedad: 55 }] });
    const r = await evaluarLectura(1, critica, { db, notificar, cooldownMin: 120 });
    expect(notificar).toHaveBeenCalledTimes(1);
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({
      colmena_id: 4,
      tipo_alerta: 'TEMPERATURA_ALTA',
      valor_registrado: '40 °C',
      mensaje: expect.stringContaining('Colmena Prueba'),
    }));
    expect(r).toHaveLength(1);
    expect(r[0].usuariosDestino).toBe(2);
  });

  test('si ya se avisó hace poco (enfriamiento), no repite la alerta', async () => {
    const notificar = jest.fn();
    const db = dbBase({ 'FROM lecturas_ambientales': [{ temperatura: 40, humedad: 55 }], 'FROM alertas': [{ '?column?': 1 }] });
    expect(await evaluarLectura(1, critica, { db, notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('sensor sin colmena asignada: no hay a quién avisar', async () => {
    const notificar = jest.fn();
    const db = crearDb({ 'FROM sensores': [{ colmena_id: null }] });
    expect(await evaluarLectura(1, critica, { db, notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('primera lectura del sensor (sin anterior): no alerta', async () => {
    const notificar = jest.fn();
    const db = crearDb({ 'FROM sensores': [{ colmena_id: 4 }], 'FROM lecturas_ambientales': [] });
    expect(await evaluarLectura(1, critica, { db, notificar })).toEqual([]);
  });

  test('con alertas automáticas apagadas no hace nada', async () => {
    const db = dbBase(); const notificar = jest.fn();
    expect(await evaluarLectura(1, critica, { db, notificar, activas: false })).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('temperatura y humedad críticas confirmadas: dos alertas, solo la que no está en enfriamiento', async () => {
    const notificar = jest.fn().mockResolvedValue({ usuariosDestino: 1, push: {} });
    const db = dbBase({
      'FROM lecturas_ambientales': [{ temperatura: 41, humedad: 30 }],
      'FROM alertas': (params) => (params[1] === 'HUMEDAD_BAJA' ? [{ '?column?': 1 }] : []),
    });
    const r = await evaluarLectura(1, { temperatura: 41, humedad: 30 }, { db, notificar });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
  });
});

describe('registrarAlertaYNotificar: TODOS los usuarios a cargo de la colmena reciben el push', () => {
  const alerta = { colmena_id: 4, tipo_alerta: 'TEMPERATURA_ALTA', valor_registrado: '40 °C', mensaje: 'mensaje' };

  test('un push por cada usuario con token, con su propio contador', async () => {
    const enviar = jest.fn().mockResolvedValue({ enviadas: 3, fallidas: 0, tokensEliminados: 0, errores: [] });
    const db = crearDb({
      'JOIN usuarios_apiarios ua ON u.id': [
        { id: 3, push_token: 'ExponentPushToken[aaa]' },
        { id: 5, push_token: 'ExponentPushToken[bbb]' },
        { id: 7, push_token: 'ExponentPushToken[ccc]' },
      ],
      'SELECT nombre FROM colmenas': [{ nombre: 'Colmena Alfa' }],
      'unreadCount': (p) => [{ unreadCount: String(p[0]) }],
    });
    const r = await registrarAlertaYNotificar(alerta, { db, enviar });
    const mensajes = enviar.mock.calls[0][0];
    expect(mensajes.map((m) => m.to)).toEqual(['ExponentPushToken[aaa]', 'ExponentPushToken[bbb]', 'ExponentPushToken[ccc]']);
    expect(mensajes.map((m) => m.badge)).toEqual([3, 5, 7]);
    expect(mensajes[0].title).toContain('Temperatura alta');
    expect(mensajes[0].title).toContain('Colmena Alfa');
    expect(r.usuariosDestino).toBe(3);
  });

  test('un mismo teléfono (token repetido) no recibe el push dos veces; tokens inválidos se omiten', async () => {
    const enviar = jest.fn().mockResolvedValue({ enviadas: 1, fallidas: 0, tokensEliminados: 0, errores: [] });
    const db = crearDb({
      'JOIN usuarios_apiarios ua ON u.id': [
        { id: 3, push_token: 'ExponentPushToken[aaa]' },
        { id: 5, push_token: 'ExponentPushToken[aaa]' },
        { id: 7, push_token: 'token-malformado' },
      ],
      'unreadCount': [{ unreadCount: '0' }],
    });
    const r = await registrarAlertaYNotificar(alerta, { db, enviar });
    expect(enviar.mock.calls[0][0]).toHaveLength(1);
    expect(r.usuariosDestino).toBe(1);
  });

  test('sin usuarios con token: la alerta se registra, no se envía nada y no revienta', async () => {
    const enviar = jest.fn();
    const db = crearDb({ 'JOIN usuarios_apiarios ua ON u.id': [] });
    const r = await registrarAlertaYNotificar(alerta, { db, enviar });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO alertas'), expect.any(Array));
    expect(enviar).not.toHaveBeenCalled();
    expect(r).toMatchObject({ usuariosDestino: 0, push: { enviadas: 0 } });
  });
});
