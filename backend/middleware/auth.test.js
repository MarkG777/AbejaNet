import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { verificarApiKey, verificarSetupSecret, verificarToken } from './auth.js';

const JWT_SECRET = 'test-secret';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  return res;
}

describe('verificarToken', () => {
  const originalSecret = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = JWT_SECRET; });
  afterAll(() => { process.env.JWT_SECRET = originalSecret; });

  test('rechaza requests sin header de autorización', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza un token inválido con 403', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('acepta un token válido y llama a next()', () => {
    const token = jwt.sign({ userId: 1, rol: 'usuario' }, JWT_SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verificarToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.usuario.userId).toBe(1);
  });
});

describe('verificarApiKey', () => {
  const originalKey = process.env.ESP32_API_KEY;
  beforeAll(() => { process.env.ESP32_API_KEY = 'clave-correcta'; });
  afterAll(() => { process.env.ESP32_API_KEY = originalKey; });

  test('rechaza requests sin X-API-Key', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verificarApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza una API key incorrecta', () => {
    const req = { headers: { 'x-api-key': 'clave-incorrecta' } };
    const res = mockRes();
    const next = jest.fn();

    verificarApiKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('si ESP32_API_KEY no está definida, rechaza siempre', () => {
    const guardada = process.env.ESP32_API_KEY;
    delete process.env.ESP32_API_KEY;
    try {
      const req = { headers: { 'x-api-key': 'cualquiera' } };
      const res = mockRes();
      const next = jest.fn();

      verificarApiKey(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    } finally {
      process.env.ESP32_API_KEY = guardada;
    }
  });

  test('acepta la API key correcta', () => {
    const req = { headers: { 'x-api-key': 'clave-correcta' } };
    const res = mockRes();
    const next = jest.fn();

    verificarApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('verificarSetupSecret', () => {
  const originalSecret = process.env.SETUP_SECRET;
  beforeAll(() => { process.env.SETUP_SECRET = 'setup-correcto'; });
  afterAll(() => { process.env.SETUP_SECRET = originalSecret; });

  test('rechaza requests sin secret con 403', () => {
    const req = { headers: {}, body: {} };
    const res = mockRes();
    const next = jest.fn();

    verificarSetupSecret(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza un secret incorrecto aunque tenga otra longitud', () => {
    const req = { headers: { 'x-setup-secret': 'x' }, body: {} };
    const res = mockRes();
    const next = jest.fn();

    verificarSetupSecret(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('si SETUP_SECRET no está definido, rechaza siempre (incluso sin secret ni body)', () => {
    const guardado = process.env.SETUP_SECRET;
    delete process.env.SETUP_SECRET;
    try {
      const req = { headers: {}, body: undefined };
      const res = mockRes();
      const next = jest.fn();

      verificarSetupSecret(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    } finally {
      process.env.SETUP_SECRET = guardado;
    }
  });

  test('acepta el secret correcto vía header', () => {
    const req = { headers: { 'x-setup-secret': 'setup-correcto' }, body: {} };
    const res = mockRes();
    const next = jest.fn();

    verificarSetupSecret(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
