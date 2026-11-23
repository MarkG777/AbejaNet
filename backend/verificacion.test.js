import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  MAX_INTENTOS,
  confirmarCodigo,
  enviarCodigoNuevo,
  generarCodigo,
  hashCodigo,
  marcarCorreoVerificado,
} from './verificacion.js';

process.env.JWT_SECRET = 'secreto-de-prueba';

// BD falsa en memoria: una sola fila de usuarios, interpretando solo las sentencias que usa verificacion.js.
function crearDb(fila) {
  const u = { correo_verificado: false, codigo_verificacion: null, vigente: false, intentos: 0, muyReciente: false, contrasena: null, ...fila };
  return {
    u,
    query: jest.fn(async (sql, params = []) => {
      sql = sql.replace(/\s+/g, ' ').trim();
      if (sql.includes('AS muy_reciente')) return { rows: [{ muy_reciente: u.muyReciente }] };
      if (sql.includes('FROM usuarios WHERE LOWER(correo_electronico)')) {
        if (!u.id || params[0] !== u.correo) return { rows: [] };
        return { rows: [{ id: u.id, correo_verificado: u.correo_verificado, codigo_verificacion: u.codigo_verificacion, intentos: u.intentos, vigente: u.vigente }] };
      }
      if (sql.includes('SET codigo_verificacion = $2')) {
        u.codigo_verificacion = params[1]; u.vigente = true; u.intentos = 0; return { rowCount: 1 };
      }
      if (sql.includes('codigo_verificacion = NULL, codigo_verificacion_expira = NULL WHERE id = $1')) {
        u.codigo_verificacion = null; u.vigente = false; return { rowCount: 1 };
      }
      if (sql.includes('SET codigo_verificacion_intentos = $2')) { u.intentos = params[1]; return { rowCount: 1 }; }
      if (sql.includes('codigo_verificacion_intentos = 0 WHERE id = $1') && sql.includes('correo_verificado = TRUE, contrasena')) {
        u.correo_verificado = true; u.contrasena = params[1]; u.codigo_verificacion = null; return { rowCount: 1 };
      }
      if (sql.includes('codigo_verificacion = NULL, codigo_verificacion_expira = NULL, codigo_verificacion_intentos = 0 WHERE id = $1')) {
        if (sql.includes('correo_verificado = TRUE')) u.correo_verificado = true;
        u.codigo_verificacion = null; u.intentos = 0; return { rowCount: 1 };
      }
      throw new Error('SQL no previsto en la prueba: ' + sql);
    }),
  };
}

describe('hashCodigo / generarCodigo', () => {
  test('el código tiene 6 dígitos', () => {
    for (let i = 0; i < 50; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });
  test('el hash no depende de mayúsculas ni espacios del correo, y cambia con el código o el correo', () => {
    expect(hashCodigo(' A@b.com ', '123456')).toBe(hashCodigo('a@b.com', '123456'));
    expect(hashCodigo('a@b.com', '123456')).not.toBe(hashCodigo('a@b.com', '123457'));
    expect(hashCodigo('a@b.com', '123456')).not.toBe(hashCodigo('c@b.com', '123456'));
    expect(hashCodigo('a@b.com', '123456')).not.toContain('123456');
  });
});

describe('enviarCodigoNuevo', () => {
  test('guarda solo el hash del código y lo envía por correo', async () => {
    const db = crearDb({ id: 7, correo: 'a@b.com' });
    const enviar = jest.fn().mockResolvedValue();
    const r = await enviarCodigoNuevo(db, { id: 7, correo: 'a@b.com' }, { enviar });
    expect(r).toEqual({ enviado: true });
    const [, codigo] = enviar.mock.calls[0];
    expect(codigo).toMatch(/^\d{6}$/);
    expect(db.u.codigo_verificacion).toBe(hashCodigo('a@b.com', codigo));
    expect(db.u.codigo_verificacion).not.toBe(codigo);
  });
  test('si se pidió otro hace menos de un minuto no manda uno nuevo', async () => {
    const db = crearDb({ id: 7, correo: 'a@b.com', muyReciente: true });
    const enviar = jest.fn();
    expect(await enviarCodigoNuevo(db, { id: 7, correo: 'a@b.com' }, { enviar })).toEqual({ enviado: false, motivo: 'espera' });
    expect(enviar).not.toHaveBeenCalled();
  });
  test('si el correo no se puede enviar, el código guardado se descarta y el error se propaga', async () => {
    const db = crearDb({ id: 7, correo: 'a@b.com' });
    const enviar = jest.fn().mockRejectedValue(new Error('Brevo caído'));
    await expect(enviarCodigoNuevo(db, { id: 7, correo: 'a@b.com' }, { enviar })).rejects.toThrow('Brevo caído');
    expect(db.u.codigo_verificacion).toBeNull();
  });
});

describe('confirmarCodigo', () => {
  let db;
  beforeEach(() => {
    db = crearDb({ id: 7, correo: 'a@b.com', codigo_verificacion: hashCodigo('a@b.com', '111111'), vigente: true });
  });

  test('con el código correcto confirma el correo y fija la contraseña', async () => {
    expect(await confirmarCodigo(db, 'A@B.com', '111111', 'HASH-DE-LA-CONTRASENA')).toEqual({ ok: true, id: 7 });
    expect(db.u.correo_verificado).toBe(true);
    expect(db.u.contrasena).toBe('HASH-DE-LA-CONTRASENA');
    expect(db.u.codigo_verificacion).toBeNull();
  });
  test('un código incorrecto no confirma nada ni fija contraseña, y cuenta el intento', async () => {
    const r = await confirmarCodigo(db, 'a@b.com', '222222', 'HASH-ATACANTE');
    expect(r).toEqual({ ok: false, motivo: 'incorrecto', restantes: MAX_INTENTOS - 1 });
    expect(db.u.correo_verificado).toBe(false);
    expect(db.u.contrasena).toBeNull();
  });
  test('tras 5 intentos fallidos el código se invalida: ni el correcto sirve', async () => {
    let r;
    for (let i = 0; i < MAX_INTENTOS; i++) r = await confirmarCodigo(db, 'a@b.com', '000000', 'X');
    expect(r).toEqual({ ok: false, motivo: 'bloqueado' });
    expect(await confirmarCodigo(db, 'a@b.com', '111111', 'X')).toEqual({ ok: false, motivo: 'sin_codigo' });
    expect(db.u.contrasena).toBeNull();
  });
  test('un código expirado no sirve', async () => {
    db.u.vigente = false;
    expect(await confirmarCodigo(db, 'a@b.com', '111111', 'X')).toEqual({ ok: false, motivo: 'expirado' });
    expect(db.u.correo_verificado).toBe(false);
  });
  test('una cuenta ya verificada no se puede "re-verificar" para cambiarle la contraseña', async () => {
    db.u.correo_verificado = true; db.u.contrasena = 'ORIGINAL';
    expect(await confirmarCodigo(db, 'a@b.com', '111111', 'OTRA')).toEqual({ ok: false, motivo: 'ya_verificada' });
    expect(db.u.contrasena).toBe('ORIGINAL');
  });
  test('un correo sin cuenta no revela nada más que "sin_cuenta"', async () => {
    expect(await confirmarCodigo(db, 'otro@b.com', '111111', 'X')).toEqual({ ok: false, motivo: 'sin_cuenta' });
  });
  test('sin código pedido no hay nada que confirmar', async () => {
    db.u.codigo_verificacion = null;
    expect(await confirmarCodigo(db, 'a@b.com', '111111', 'X')).toEqual({ ok: false, motivo: 'sin_codigo' });
  });
});

describe('marcarCorreoVerificado (Google / olvidé mi contraseña)', () => {
  test('confirma la cuenta, borra el código pendiente y NO toca la contraseña', async () => {
    const db = crearDb({ id: 7, correo: 'a@b.com', codigo_verificacion: 'h', vigente: true, contrasena: null });
    await marcarCorreoVerificado(db, 7);
    expect(db.u.correo_verificado).toBe(true);
    expect(db.u.codigo_verificacion).toBeNull();
    expect(db.u.contrasena).toBeNull();
  });
});
