import { describe, expect, jest, test } from '@jest/globals';
import { clasificarLectura, evaluarLectura, nivelDeValor, registrarAlertaYNotificar, UMBRALES } from './alertas.js';

// BD falsa: responde según un fragmento del SQL.
const crearDb = (respuestas = {}) => ({
  query: jest.fn(async (sql, params) => {
    for (const [fragmento, valor] of Object.entries(respuestas)) {
      if (sql.includes(fragmento)) return { rows: typeof valor === 'function' ? valor(params) : valor };
    }
    return { rows: [] };
  }),
});

// Historial de lecturas: cada elemento { hace: minutos, temperatura, humedad }; el primero (hace: 0) es la lectura actual.
const BASE = Date.UTC(2026, 10, 21, 12, 0, 0);
const historial = (lecturas) => lecturas.map((l) => ({ temperatura: l.temperatura ?? 34, humedad: l.humedad ?? 60, fecha_registro: new Date(BASE - l.hace * 60000) }));
const dbCon = (lecturas, extra = {}) => crearDb({
  'FROM sensores': [{ colmena_id: 4 }],
  'FROM lecturas_ambientales': historial(lecturas),
  'SELECT nombre FROM colmenas': [{ nombre: 'Colmena Prueba' }],
  ...extra,
});
const noti = () => jest.fn().mockResolvedValue({ usuariosDestino: 2, push: { enviadas: 2, fallidas: 0 } });
const T = UMBRALES.temperatura;

describe('niveles de temperatura (aviso 32–36, crítico 29–37, extremo ≥ 43 °C)', () => {
  const nivel = (v) => nivelDeValor(v, T)?.nivel ?? null;
  test('dentro del rango del nido de cría (32–36 °C, incluidos los límites) no hay nivel', () => {
    for (const v of [32, 34.5, 36]) expect(nivel(v)).toBeNull();
  });
  test('fuera de 32–36 pero dentro de 29–37: aviso', () => {
    for (const v of [31.9, 30, 29, 36.1, 37]) expect(nivel(v)).toBe('aviso');
  });
  test('fuera de 29–37: crítico', () => {
    for (const v of [28.9, 20, 37.1, 40, 42.9]) expect(nivel(v)).toBe('critico');
  });
  test('≥ 43 °C: extremo', () => {
    for (const v of [43, 50]) expect(nivel(v)).toBe('extremo');
  });
  test('dirección y tipo de alerta', () => {
    expect(clasificarLectura({ temperatura: 40 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
    expect(clasificarLectura({ temperatura: 20 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_BAJA']);
    expect(clasificarLectura({ temperatura: 36.5 }).map((c) => c.tipo_alerta)).toEqual(['AVISO_TEMPERATURA_ALTA']);
    expect(clasificarLectura({ temperatura: 30 }).map((c) => c.tipo_alerta)).toEqual(['AVISO_TEMPERATURA_BAJA']);
  });
  test('un límite en null (desactivado) no alerta de ese lado', () => {
    const sinBajo = { ...T, criticoMin: null, avisoMin: null };
    expect(nivelDeValor(10, sinBajo)).toBeNull();
    expect(nivelDeValor(45, sinBajo)?.nivel).toBe('extremo');
  });
  test('valores ausentes, nulos o no numéricos se ignoran; acepta números como texto', () => {
    expect(clasificarLectura({ temperatura: null, humedad: undefined })).toEqual([]);
    expect(clasificarLectura({ temperatura: 'abc', humedad: '' })).toEqual([]);
    expect(clasificarLectura()).toEqual([]);
    expect(clasificarLectura({ temperatura: '40.5' }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
  });
});

describe('humedad (por defecto solo crítica baja < 40 %)', () => {
  test('baja crítica; normal y alta no alertan', () => {
    expect(clasificarLectura({ humedad: 35 }).map((c) => c.tipo_alerta)).toEqual(['HUMEDAD_BAJA']);
    expect(clasificarLectura({ humedad: 40 })).toEqual([]);
    expect(clasificarLectura({ humedad: 75 })).toEqual([]);
    expect(clasificarLectura({ humedad: 95 })).toEqual([]);
  });
  test('si se configuran límites superiores, también alerta', () => {
    const conAlta = { ...UMBRALES, humedad: { ...UMBRALES.humedad, criticoMax: 95 } };
    expect(clasificarLectura({ humedad: 97 }, conAlta).map((c) => c.tipo_alerta)).toEqual(['HUMEDAD_ALTA']);
  });
});

describe('evaluarLectura', () => {
  test('lectura normal: no genera nada', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 34, humedad: 60 }, { db: dbCon([{ hace: 0 }, { hace: 1 }]), notificar });
    expect(r).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('EXTREMO (≥ 43 °C): alerta inmediata, sin esperar confirmación', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 44, humedad: 60 }, { db: dbCon([{ hace: 0, temperatura: 44 }]), notificar });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ colmena_id: 4, tipo_alerta: 'TEMPERATURA_ALTA', valor_registrado: '44 °C', mensaje: expect.stringContaining('EXTREMA') }));
    expect(r[0].nivel).toBe('extremo');
  });

  test('CRÍTICO: exige que la lectura anterior también esté fuera del rango crítico', async () => {
    const sin = noti();
    expect(await evaluarLectura(1, { temperatura: 38 }, { db: dbCon([{ hace: 0, temperatura: 38 }, { hace: 1, temperatura: 34 }]), notificar: sin })).toEqual([]);
    expect(sin).not.toHaveBeenCalled();

    const con = noti();
    const r = await evaluarLectura(1, { temperatura: 38 }, { db: dbCon([{ hace: 0, temperatura: 38 }, { hace: 1, temperatura: 38.5 }]), notificar: con });
    expect(con).toHaveBeenCalledWith(expect.objectContaining({ tipo_alerta: 'TEMPERATURA_ALTA', mensaje: expect.stringContaining('máximo seguro: 37') }));
    expect(r[0].nivel).toBe('critico');
  });

  test('AVISO sostenido: fuera de 32–36 °C durante más de 30 min seguidos', async () => {
    const lecturas = Array.from({ length: 32 }, (_, i) => ({ hace: i, temperatura: 36.5 })); // 31 min de lecturas fuera
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 36.5 }, { db: dbCon(lecturas), notificar });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo_alerta: 'AVISO_TEMPERATURA_ALTA', mensaje: expect.stringContaining('32–36') }));
    expect(r[0].nivel).toBe('aviso');
  });

  test('AVISO: NO se dispara si hubo una lectura dentro del rango en la ventana', async () => {
    const lecturas = Array.from({ length: 32 }, (_, i) => ({ hace: i, temperatura: i === 15 ? 34 : 36.5 }));
    const notificar = noti();
    expect(await evaluarLectura(1, { temperatura: 36.5 }, { db: dbCon(lecturas), notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('AVISO: NO se dispara si solo hay unos minutos de lecturas fuera del rango', async () => {
    const lecturas = Array.from({ length: 8 }, (_, i) => ({ hace: i, temperatura: 36.5 }));
    expect(await evaluarLectura(1, { temperatura: 36.5 }, { db: dbCon(lecturas), notificar: noti() })).toEqual([]);
  });

  test('CAMBIO BRUSCO: ≥ 10 °C en ≤ 5 min (30 → 50 °C en 2 minutos)', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 50 }, { hace: 1, temperatura: 40 }, { hace: 2, temperatura: 30 }]);
    const r = await evaluarLectura(1, { temperatura: 50 }, { db, notificar });
    const tipos = r.map((a) => a.tipo_alerta).sort();
    expect(tipos).toEqual(['CAMBIO_BRUSCO_TEMPERATURA', 'TEMPERATURA_ALTA']); // salto + extremo
    const salto = notificar.mock.calls.map((c) => c[0]).find((a) => a.tipo_alerta === 'CAMBIO_BRUSCO_TEMPERATURA');
    expect(salto.mensaje).toContain('cambió 20');
  });

  test('CAMBIO BRUSCO hacia abajo (caída de 14 °C en 1 min) también avisa', async () => {
    const r = await evaluarLectura(1, { temperatura: 20 }, { db: dbCon([{ hace: 0, temperatura: 20 }, { hace: 1, temperatura: 34 }]), notificar: noti() });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['CAMBIO_BRUSCO_TEMPERATURA']);
  });

  test('CAMBIO BRUSCO: un cambio grande pero LENTO (más de 5 min) no es un salto', async () => {
    const r = await evaluarLectura(1, { temperatura: 22 }, { db: dbCon([{ hace: 0, temperatura: 22 }, { hace: 10, temperatura: 34 }]), notificar: noti() });
    expect(r).toEqual([]);
  });

  test('enfriamiento: si ya se avisó hace poco, no repite', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 44 }], { 'FROM alertas': [{ '?column?': 1 }] });
    expect(await evaluarLectura(1, { temperatura: 44 }, { db, notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('el enfriamiento es por tipo: un cambio brusco no queda bloqueado por una alerta de otro tipo', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 20 }, { hace: 1, temperatura: 34 }], { 'FROM alertas': (p) => (p[1] === 'TEMPERATURA_BAJA' ? [{ '?column?': 1 }] : []) });
    const r = await evaluarLectura(1, { temperatura: 20 }, { db, notificar });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['CAMBIO_BRUSCO_TEMPERATURA']);
  });

  test('humedad crítica baja confirmada por la lectura anterior', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 34, humedad: 30 }, { db: dbCon([{ hace: 0, humedad: 30 }, { hace: 1, humedad: 32 }]), notificar });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['HUMEDAD_BAJA']);
    expect(r[0].mensaje).toContain('mínimo seguro: 40');
  });

  test('sensor sin colmena asignada: no hay a quién avisar', async () => {
    const notificar = noti();
    const db = crearDb({ 'FROM sensores': [{ colmena_id: null }] });
    expect(await evaluarLectura(1, { temperatura: 44 }, { db, notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('con alertas automáticas apagadas no hace nada', async () => {
    const db = dbCon([{ hace: 0, temperatura: 44 }]); const notificar = noti();
    expect(await evaluarLectura(1, { temperatura: 44 }, { db, notificar, activas: false })).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
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

  test('los tipos nuevos tienen título legible (aviso y cambio brusco)', async () => {
    const enviar = jest.fn().mockResolvedValue({ enviadas: 1, fallidas: 0, tokensEliminados: 0, errores: [] });
    const db = crearDb({ 'JOIN usuarios_apiarios ua ON u.id': [{ id: 3, push_token: 'ExponentPushToken[aaa]' }], 'unreadCount': [{ unreadCount: '1' }] });
    await registrarAlertaYNotificar({ ...alerta, tipo_alerta: 'CAMBIO_BRUSCO_TEMPERATURA' }, { db, enviar });
    expect(enviar.mock.calls[0][0][0].title).toContain('Cambio brusco de temperatura');
    await registrarAlertaYNotificar({ ...alerta, tipo_alerta: 'AVISO_TEMPERATURA_BAJA' }, { db, enviar });
    expect(enviar.mock.calls[1][0][0].title).toContain('Aviso: temperatura baja');
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
