// ================================================================
// SCRIPT TEMPORAL PARA CONFIGURAR LA BASE DE DATOS
// ================================================================
// Este script se ejecuta UNA SOLA VEZ para configurar la BD nueva.
// NO modifica index.js ni afecta la aplicación.
// Después de ejecutarlo, puedes eliminarlo.

import dotenv from 'dotenv';
import fs from 'fs';
import { dirname, join } from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool } = pg;

async function setupDatabase() {
  console.log('\n🚀 INICIANDO CONFIGURACIÓN DE BASE DE DATOS');
  console.log('='.repeat(60));
  
  // Crear pool de conexión
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. Probar conexión
    console.log('\n📡 Probando conexión...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa');

    // 2. Leer script SQL
    console.log('\n📄 Leyendo script SQL...');
    const sqlPath = join(__dirname, '..', 'abeja_net_v3_postgres.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    console.log(`✅ Script cargado (${sqlScript.length} caracteres)`);

    // 3. Ejecutar script
    console.log('\n⚙️  Ejecutando script...');
    console.log('   (Esto puede tardar 1-2 minutos)');
    await pool.query(sqlScript);
    console.log('✅ Script ejecutado exitosamente');

    // 4. Verificar tablas creadas
    console.log('\n📊 Verificando tablas creadas...');
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n✅ Tablas creadas:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // 5. Verificar datos insertados
    console.log('\n📈 Verificando datos insertados...');
    const { rows: counts } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM roles) as roles,
        (SELECT COUNT(*) FROM usuarios) as usuarios,
        (SELECT COUNT(*) FROM apiarios) as apiarios,
        (SELECT COUNT(*) FROM colmenas) as colmenas,
        (SELECT COUNT(*) FROM sensores) as sensores,
        (SELECT COUNT(*) FROM usuarios_apiarios) as usuarios_apiarios
    `);

    console.log('\n✅ Datos insertados:');
    console.log(`   - Roles: ${counts[0].roles}`);
    console.log(`   - Usuarios: ${counts[0].usuarios}`);
    console.log(`   - Apiarios: ${counts[0].apiarios}`);
    console.log(`   - Colmenas: ${counts[0].colmenas}`);
    console.log(`   - Sensores: ${counts[0].sensores}`);
    console.log(`   - Usuarios-Apiarios: ${counts[0].usuarios_apiarios}`);

    // 6. Verificar usuario de prueba
    console.log('\n👤 Verificando usuario de prueba...');
    const { rows: users } = await pool.query(`
      SELECT correo_electronico, nombre, apellido_paterno
      FROM usuarios
      LIMIT 3
    `);

    console.log('\n✅ Usuarios disponibles:');
    users.forEach(u => console.log(`   - ${u.correo_electronico} (${u.nombre} ${u.apellido_paterno})`));

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📝 SIGUIENTE PASO:');
    console.log('   1. Verifica que tu backend funcione: /test-db');
    console.log('   2. Verifica los datos: /debug/data');
    console.log('   3. Elimina este script: setup_database_once.js');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR AL CONFIGURAR BASE DE DATOS:');
    console.error('='.repeat(60));
    console.error(error);
    console.error('\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
setupDatabase();
