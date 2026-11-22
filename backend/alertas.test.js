import { describe, expect, jest, test } from '@jest/globals';
import { clasificarLectura, describirAlerta, evaluarLectura, glosarioDeAlertas, nivelDeValor, registrarAlertaYNotificar, UMBRALES } from './alertas.js';

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
const minutos = (n, props) => Array.from({ length: n }, (_, i) => ({ hace: i, ...props })); // n lecturas, una por minuto
const T = UMBRALES.temperatura;

describe('temperatura: un solo nivel CRÍTICO (rango 29–37 °C) y extremo (≥ 43 °C)', () => {
  const nivel = (v) => nivelDeValor(v, T)?.nivel ?? null;
  test('dentro de 29–37 °C (incluidos los límites) no hay alerta, incluso fuera del rango ideal de 32–36', () => {
    for (const v of [29, 30, 32, 34.5, 36, 36.5, 37]) expect(nivel(v)).toBeNull();
  });
  test('fuera de 29–37: crítico', () => {
    for (const v of [28.9, 20, 37.1, 40, 42.9]) expect(nivel(v)).toBe('critico');
  });
  test('≥ 43 °C: extremo', () => {
    for (const v of [43, 50]) expect(nivel(v)).toBe('extremo');
  });
  test('tipos de alerta', () => {
    expect(clasificarLectura({ temperatura: 40 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_ALTA']);
    expect(clasificarLectura({ temperatura: 20 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_BAJA']);
    expect(clasificarLectura({ temperatura: 44 }).map((c) => c.tipo_alerta)).toEqual(['TEMPERATURA_EXTREMA']);
  });
  test('un límite en null (desactivado) no alerta de ese lado', () => {
    const sinBajo = { ...T, criticoMin: null };
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
    for (const v of [40, 75, 95]) expect(clasificarLectura({ humedad: v })).toEqual([]);
  });
  test('si se configura un límite superior, también alerta', () => {
    const conAlta = { ...UMBRALES, humedad: { ...UMBRALES.humedad, criticoMax: 95 } };
    expect(clasificarLectura({ humedad: 97 }, conAlta).map((c) => c.tipo_alerta)).toEqual(['HUMEDAD_ALTA']);
  });
});

describe('evaluarLectura', () => {
  test('lectura normal (incluso 36.5 °C, fuera del rango ideal pero dentro de 29–37): no genera nada', async () => {
    for (const temperatura of [34, 36.5, 30]) {
      const notificar = noti();
      const r = await evaluarLectura(1, { temperatura, humedad: 60 }, { db: dbCon(minutos(40, { temperatura })), notificar });
      expect(r).toEqual([]);
      expect(notificar).not.toHaveBeenCalled();
    }
  });

  test('CALOR crítico (> 37 °C): alerta INMEDIATA, sin esperar', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 38 }, { db: dbCon([{ hace: 0, temperatura: 38 }]), notificar });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ colmena_id: 4, tipo_alerta: 'TEMPERATURA_ALTA', valor_registrado: '38 °C', mensaje: expect.stringContaining('máximo seguro: 37') }));
    expect(r[0].nivel).toBe('critico');
  });

  test('EXTREMO (≥ 43 °C): inmediato y advierte de un posible incendio', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 44 }, { db: dbCon([{ hace: 0, temperatura: 44 }]), notificar });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo_alerta: 'TEMPERATURA_EXTREMA', mensaje: expect.stringContaining('incendio') }));
    expect(r[0].nivel).toBe('extremo');
  });

  test('FRÍO crítico (< 29 °C): avisa solo si dura más de 15 min', async () => {
    const notificar = noti();
    const r = await evaluarLectura(1, { temperatura: 28 }, { db: dbCon(minutos(17, { temperatura: 28 })), notificar });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo_alerta: 'TEMPERATURA_BAJA', mensaje: expect.stringContaining('durante más de 15 min') }));
    expect(r[0].nivel).toBe('critico');
  });

  test('FRÍO: unos minutos fríos (p. ej. inspección con la colmena abierta) NO avisan', async () => {
    const notificar = noti();
    expect(await evaluarLectura(1, { temperatura: 28 }, { db: dbCon(minutos(6, { temperatura: 28 })), notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('FRÍO: si en la ventana hubo una lectura dentro del rango, no es sostenido', async () => {
    const lecturas = minutos(17, { temperatura: 28 }).map((l, i) => (i === 8 ? { ...l, temperatura: 33 } : l));
    expect(await evaluarLectura(1, { temperatura: 28 }, { db: dbCon(lecturas), notificar: noti() })).toEqual([]);
  });

  test('CAMBIO BRUSCO: 30 → 50 °C en 2 minutos = cambio brusco + extremo, inmediato', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 50 }, { hace: 1, temperatura: 40 }, { hace: 2, temperatura: 30 }]);
    const r = await evaluarLectura(1, { temperatura: 50 }, { db, notificar });
    expect(r.map((a) => a.tipo_alerta).sort()).toEqual(['CAMBIO_BRUSCO_TEMPERATURA', 'TEMPERATURA_EXTREMA']);
    const salto = notificar.mock.calls.map((c) => c[0]).find((a) => a.tipo_alerta === 'CAMBIO_BRUSCO_TEMPERATURA');
    expect(salto.mensaje).toContain('cambió 20');
  });

  test('CAMBIO BRUSCO hacia abajo (34 → 20 °C en 1 min) avisa de inmediato aunque el frío aún no sea sostenido', async () => {
    const r = await evaluarLectura(1, { temperatura: 20 }, { db: dbCon([{ hace: 0, temperatura: 20 }, { hace: 1, temperatura: 34 }]), notificar: noti() });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['CAMBIO_BRUSCO_TEMPERATURA']);
  });

  test('un cambio grande pero LENTO (más de 5 min) no es un salto y el frío todavía no es sostenido', async () => {
    const r = await evaluarLectura(1, { temperatura: 22 }, { db: dbCon([{ hace: 0, temperatura: 22 }, { hace: 10, temperatura: 34 }]), notificar: noti() });
    expect(r).toEqual([]);
  });

  test('enfriamiento: si ya se avisó hace poco, no repite', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 44 }], { 'FROM alertas': [{ '?column?': 1 }] });
    expect(await evaluarLectura(1, { temperatura: 44 }, { db, notificar })).toEqual([]);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('el enfriamiento es por tipo: una alerta de calor previa no bloquea una EXTREMA posterior (escalada)', async () => {
    const notificar = noti();
    const db = dbCon([{ hace: 0, temperatura: 44 }], { 'FROM alertas': (p) => (p[1] === 'TEMPERATURA_ALTA' ? [{ '?column?': 1 }] : []) });
    const r = await evaluarLectura(1, { temperatura: 44 }, { db, notificar });
    expect(r.map((a) => a.tipo_alerta)).toEqual(['TEMPERATURA_EXTREMA']);
  });

  test('humedad baja (< 40 %) sostenida 5 min: alerta; una sola lectura no', async () => {
    const con = await evaluarLectura(1, { temperatura: 34, humedad: 30 }, { db: dbCon(minutos(7, { humedad: 30 })), notificar: noti() });
    expect(con.map((a) => a.tipo_alerta)).toEqual(['HUMEDAD_BAJA']);
    expect(con[0].mensaje).toContain('mínimo seguro: 40');
    const sin = await evaluarLectura(1, { temperatura: 34, humedad: 30 }, { db: dbCon([{ hace: 0, humedad: 30 }]), notificar: noti() });
    expect(sin).toEqual([]);
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

describe('descripciones para el chatbot (salen de los mismos valores que usa el sistema)', () => {
  test('cada tipo automático tiene nivel y significado con los umbrales reales', () => {
    expect(describirAlerta('TEMPERATURA_ALTA')).toMatchObject({ nivel: 'critico', significado: expect.stringContaining('37') });
    expect(describirAlerta('TEMPERATURA_BAJA').significado).toMatch(/29.*15 min/);
    expect(describirAlerta('TEMPERATURA_EXTREMA')).toMatchObject({ nivel: 'extremo', significado: expect.stringContaining('incendio') });
    expect(describirAlerta('CAMBIO_BRUSCO_TEMPERATURA')).toMatchObject({ nivel: 'salto' });
    expect(describirAlerta('HUMEDAD_BAJA').significado).toContain('40');
  });
  test('un tipo que no es por umbral se describe de forma genérica', () => {
    for (const tipo of ['PRUEBA_NOTIFICACION', 'PESO_BAJO', 'BATERIA_BAJA']) expect(describirAlerta(tipo).nivel).toBe('otro');
  });
  test('el glosario menciona el nivel crítico, todos los tipos y que los umbrales son una primera propuesta', () => {
    const g = glosarioDeAlertas();
    for (const tipo of ['TEMPERATURA_ALTA', 'TEMPERATURA_BAJA', 'TEMPERATURA_EXTREMA', 'CAMBIO_BRUSCO_TEMPERATURA', 'HUMEDAD_BAJA']) expect(g).toContain(tipo);
    expect(g).toContain('CRÍTICO');
    expect(g).toContain('PRIMERA PROPUESTA');
  });
});

describe('registrarAlertaYNotificar: TODOS los usuarios a cargo de la colmena reciben el push', () => {
  const alerta = { colmena_id: 4, tipo_alerta: 'TEMPERATURA_ALTA', valor_registrado: '40 °C', mensaje: 'mensaje' };

  test('un push por cada usuario con token, con su propio contador y título "Crítico"', async () => {
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
    expect(mensajes[0].title).toBe('🚨 Crítico: temperatura alta · Colmena Alfa');
    expect(r.usuariosDestino).toBe(3);
  });

  test('todos los tipos llevan "Crítico" en el título', async () => {
    const enviar = jest.fn().mockResolvedValue({ enviadas: 1, fallidas: 0, tokensEliminados: 0, errores: [] });
    const db = crearDb({ 'JOIN usuarios_apiarios ua ON u.id': [{ id: 3, push_token: 'ExponentPushToken[aaa]' }], 'unreadCount': [{ unreadCount: '1' }] });
    for (const tipo of ['TEMPERATURA_BAJA', 'TEMPERATURA_EXTREMA', 'CAMBIO_BRUSCO_TEMPERATURA', 'HUMEDAD_BAJA']) {
      enviar.mockClear();
      await registrarAlertaYNotificar({ ...alerta, tipo_alerta: tipo }, { db, enviar });
      expect(enviar.mock.calls[0][0][0].title).toContain('Crítico:');
    }
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
