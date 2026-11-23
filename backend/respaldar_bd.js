// Respaldo lógico de la base de datos en un archivo .sql restaurable (estructura + datos).
//
// Por qué existe: pg_dump se niega a respaldar un servidor más nuevo que él (Render usa PostgreSQL 18 y no siempre hay un
// pg_dump 18 a la mano). Este script solo usa la conexión del backend y no necesita instalar nada.
//
// Uso (desde backend/):
//   node --env-file=.env respaldar_bd.js                 -> ../../AbejaNet_Backups/bd_AAAA-MM-DD_HHMM/
//   node --env-file=.env respaldar_bd.js "C:\ruta\carpeta"
//
// Genera dos archivos:
//   abejanet_completo.sql  estructura + datos (restaurar con: psql "<DATABASE_URL nueva>" -f abejanet_completo.sql)
//   abejanet_esquema.sql   solo estructura (sirve como evidencia de la versión de la BD)
//
// ⚠️ abejanet_completo.sql contiene datos reales (correos, hashes de contraseñas, tokens). NO se sube a git: guárdalo
// fuera del repositorio. Restaurar sobre una base VACÍA (los CREATE TABLE fallan si la tabla ya existe, a propósito).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const ident = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const literal = (v) => (v === null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'");

async function tablasEnOrden(db) {
  const { rows: tablas } = await db.query(
    `SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','p') ORDER BY c.relname`
  );
  const { rows: fks } = await db.query(
    `SELECT conrelid::regclass::text AS hijo, confrelid::regclass::text AS padre FROM pg_constraint WHERE contype = 'f'`
  );
  const nombres = tablas.map((t) => t.relname);
  const dependeDe = new Map(nombres.map((n) => [n, new Set()]));
  for (const f of fks) {
    const hijo = f.hijo.replace(/^public\./, '').replace(/"/g, '');
    const padre = f.padre.replace(/^public\./, '').replace(/"/g, '');
    if (hijo !== padre && dependeDe.has(hijo) && dependeDe.has(padre)) dependeDe.get(hijo).add(padre);
  }
  const orden = [];
  const pendientes = new Set(nombres);
  while (pendientes.size) {
    const listas = [...pendientes].filter((n) => [...dependeDe.get(n)].every((p) => !pendientes.has(p)));
    const lote = listas.length ? listas : [...pendientes]; // ciclo: se rompe por orden alfabético
    for (const n of lote.sort()) { orden.push(n); pendientes.delete(n); }
  }
  return orden.map((n) => tablas.find((t) => t.relname === n));
}

export async function generarRespaldo(db = pool) {
  const ver = (await db.query('SHOW server_version')).rows[0].server_version;
  const ahora = new Date().toISOString();
  const esquema = [];
  const datos = [];
  const finales = []; // llaves foráneas y setval: después de cargar los datos

  esquema.push(`-- AbejaNet — respaldo lógico de la base de datos`);
  esquema.push(`-- Generado: ${ahora}`);
  esquema.push(`-- Servidor de origen: PostgreSQL ${ver}`);
  esquema.push(`-- Restaurar sobre una base vacía:  psql "<DATABASE_URL>" -f <este archivo>`);
  esquema.push(`SET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\n`);

  // Tipos ENUM propios (p. ej. sensor_estado): deben existir antes que las tablas que los usan.
  const { rows: enums } = await db.query(
    `SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS etiquetas
       FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname`
  );
  for (const e of enums) esquema.push(`CREATE TYPE ${ident(e.typname)} AS ENUM (${e.etiquetas.map(literal).join(', ')});`);
  if (enums.length) esquema.push('');

  // Objetos que este script todavía NO copia: si aparecen, hay que avisar para no creer que el respaldo está completo.
  const { rows: noCopiados } = await db.query(
    `SELECT 'funcion ' || p.proname AS objeto FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
     UNION ALL SELECT 'trigger ' || tgname FROM pg_trigger WHERE NOT tgisinternal
     UNION ALL SELECT 'vista ' || viewname FROM pg_views WHERE schemaname = 'public'`
  );
  if (noCopiados.length) {
    const lista = noCopiados.map((o) => o.objeto).join(', ');
    esquema.push(`-- ⚠️ ADVERTENCIA: este respaldo NO incluye estos objetos: ${lista}`);
    console.warn(`⚠️ El respaldo NO incluye: ${lista}`);
  }

  const { rows: secuencias } = await db.query(
    `SELECT s.sequencename, s.data_type::text AS tipo, s.start_value, s.min_value, s.max_value, s.increment_by, s.cycle, s.last_value,
            (SELECT d.refobjid::regclass::text FROM pg_depend d WHERE d.objid = (quote_ident(s.schemaname)||'.'||quote_ident(s.sequencename))::regclass
               AND d.deptype IN ('a','i') LIMIT 1) AS dueno
       FROM pg_sequences s WHERE s.schemaname = 'public' ORDER BY s.sequencename`
  );
  // Las secuencias de columnas IDENTITY las crea la propia columna; solo se crean aparte las de DEFAULT nextval().
  const { rows: identidad } = await db.query(
    `SELECT pg_get_serial_sequence(quote_ident(c.relname), a.attname) AS seq
       FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND a.attidentity <> '' AND NOT a.attisdropped`
  );
  const secIdentidad = new Set(identidad.map((r) => (r.seq || '').replace(/^public\./, '')));
  for (const s of secuencias) {
    if (secIdentidad.has(s.sequencename)) continue;
    esquema.push(`CREATE SEQUENCE ${ident(s.sequencename)} AS ${s.tipo} START WITH ${s.start_value} INCREMENT BY ${s.increment_by} MINVALUE ${s.min_value} MAXVALUE ${s.max_value} ${s.cycle ? 'CYCLE' : 'NO CYCLE'};`);
  }
  esquema.push('');

  const tablas = await tablasEnOrden(db);
  const resumen = {};
  for (const t of tablas) {
    const { rows: cols } = await db.query(
      `SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull, a.attidentity, a.attgenerated,
              pg_get_expr(d.adbin, d.adrelid) AS def
         FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum`,
      [t.oid]
    );
    const lineas = cols.map((c) => {
      let l = `  ${ident(c.attname)} ${c.tipo}`;
      if (c.attidentity === 'a') l += ' GENERATED ALWAYS AS IDENTITY';
      else if (c.attidentity === 'd') l += ' GENERATED BY DEFAULT AS IDENTITY';
      else if (c.attgenerated === 's') l += ` GENERATED ALWAYS AS (${c.def}) STORED`;
      else if (c.def) l += ` DEFAULT ${c.def}`;
      if (c.attnotnull) l += ' NOT NULL';
      return l;
    });
    esquema.push(`CREATE TABLE ${ident(t.relname)} (\n${lineas.join(',\n')}\n);`);

    const { rows: cons } = await db.query(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = $1 ORDER BY contype DESC, conname`,
      [t.oid]
    );
    for (const c of cons) {
      const sentencia = `ALTER TABLE ONLY ${ident(t.relname)} ADD CONSTRAINT ${ident(c.conname)} ${c.def};`;
      (c.contype === 'f' ? finales : esquema).push(sentencia);
    }
    const { rows: idx } = await db.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1
          AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE conrelid = $2) ORDER BY indexname`,
      [t.relname, t.oid]
    );
    // Sin el prefijo "public.": así el respaldo se restaura en el esquema que esté activo (y la prueba de restauración
    // en un esquema temporal no toca las tablas reales).
    for (const i of idx) esquema.push(i.indexdef.replace(/ ON (ONLY )?public\./, ' ON $1') + ';');
    esquema.push('');

    // Datos: cada columna se pide como texto y se reinserta como literal; PostgreSQL la convierte al tipo de la columna.
    const insertables = cols.filter((c) => c.attgenerated !== 's');
    const lista = insertables.map((c) => `${ident(c.attname)}::text AS ${ident(c.attname)}`).join(', ');
    const { rows } = await db.query(`SELECT ${lista} FROM ${ident(t.relname)} ORDER BY 1`);
    resumen[t.relname] = rows.length;
    if (rows.length) {
      const nombres = insertables.map((c) => ident(c.attname)).join(', ');
      const anular = insertables.some((c) => c.attidentity === 'a') ? ' OVERRIDING SYSTEM VALUE' : '';
      datos.push(`-- ${t.relname}: ${rows.length} filas`);
      for (let i = 0; i < rows.length; i += 200) {
        const bloque = rows.slice(i, i + 200)
          .map((r) => '(' + insertables.map((c) => literal(r[c.attname])).join(', ') + ')').join(',\n  ');
        datos.push(`INSERT INTO ${ident(t.relname)} (${nombres})${anular} VALUES\n  ${bloque};`);
      }
      datos.push('');
    }
  }

  for (const s of secuencias) {
    finales.push(s.last_value === null
      ? `-- ${s.sequencename}: sin uso todavía`
      : `SELECT setval('${ident(s.sequencename)}', ${s.last_value}, true);`);
  }

  const cabecera = esquema.join('\n');
  const soloEsquema = `${cabecera}\n${finales.filter((f) => f.startsWith('ALTER')).join('\n')}\n`;
  const completo = `${cabecera}\n-- ===== DATOS =====\nBEGIN;\n${datos.join('\n')}\nCOMMIT;\n\n-- ===== LLAVES FORÁNEAS Y SECUENCIAS =====\n${finales.join('\n')}\n`;
  return { completo, soloEsquema, resumen, version: ver };
}

// Ejecución directa: node respaldar_bd.js [carpeta]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sello = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const destino = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'AbejaNet_Backups', `bd_${sello}`);
  try {
    const r = await generarRespaldo();
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, 'abejanet_completo.sql'), r.completo, 'utf8');
    fs.writeFileSync(path.join(destino, 'abejanet_esquema.sql'), r.soloEsquema, 'utf8');
    console.log(`Respaldo guardado en: ${destino}`);
    console.log(`Servidor: PostgreSQL ${r.version}`);
    console.table(r.resumen);
  } catch (e) {
    console.error('No se pudo generar el respaldo:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
