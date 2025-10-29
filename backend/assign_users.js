import pool from './db.js';

/**
 * Asigna uno o varios usuarios a un apiario
 * @param {Array} asignaciones - Array de objetos con formato: 
 *   [{ correo_usuario, nombre_apiario, correo_admin }]
 * @returns {Promise<Object>} - Resultado de las asignaciones
 */
const asignarUsuariosAApiario = async (asignaciones) => {
  const client = await pool.connect();
  const resultados = [];
  
  try {
    await client.query('BEGIN');
    
    for (const asignacion of asignaciones) {
      const { correo_usuario, nombre_apiario, correo_admin } = asignacion;
      
      // Validar parámetros
      if (!correo_usuario || !nombre_apiario) {
        resultados.push({
          success: false,
          correo_usuario,
          error: 'Faltan parámetros: correo_usuario y nombre_apiario son obligatorios'
        });
        continue;
      }
      
      try {
        // 1. Obtener ID del usuario
        const usuario = await client.query(
          'SELECT id, nombre FROM usuarios WHERE correo_electronico = $1',
          [correo_usuario]
        );
        
        if (usuario.rows.length === 0) {
          resultados.push({
            success: false,
            correo_usuario,
            error: `Usuario '${correo_usuario}' no encontrado. Debe registrarse primero en la app.`
          });
          continue;
        }
        
        const idUsuario = usuario.rows[0].id;
        const nombreUsuario = usuario.rows[0].nombre;
        
        // 2. Obtener ID del apiario
        const apiario = await client.query(
          'SELECT id FROM apiarios WHERE nombre = $1',
          [nombre_apiario]
        );
        
        if (apiario.rows.length === 0) {
          resultados.push({
            success: false,
            correo_usuario,
            error: `Apiario '${nombre_apiario}' no encontrado`
          });
          continue;
        }
        
        const idApiario = apiario.rows[0].id;
        
        // 3. Obtener ID del admin (por defecto admin@abejanet.com)
        const adminEmail = correo_admin || 'admin@abejanet.com';
        const admin = await client.query(
          'SELECT id FROM usuarios WHERE correo_electronico = $1',
          [adminEmail]
        );
        
        if (admin.rows.length === 0) {
          resultados.push({
            success: false,
            correo_usuario,
            error: `Admin '${adminEmail}' no encontrado`
          });
          continue;
        }
        
        const idAdmin = admin.rows[0].id;
        
        // 4. Verificar si ya está asignado
        const asignacionExistente = await client.query(
          'SELECT * FROM usuarios_apiarios WHERE usuario_id = $1 AND apiario_id = $2',
          [idUsuario, idApiario]
        );
        
        if (asignacionExistente.rows.length > 0) {
          resultados.push({
            success: true,
            correo_usuario,
            nombre_usuario: nombreUsuario,
            nombre_apiario,
            message: 'Usuario ya estaba asignado a este apiario',
            ya_existia: true
          });
          continue;
        }
        
        // 5. Crear la asignación
        await client.query(
          `INSERT INTO usuarios_apiarios (usuario_id, apiario_id, asignado_por_admin_id)
           VALUES ($1, $2, $3)`,
          [idUsuario, idApiario, idAdmin]
        );
        
        resultados.push({
          success: true,
          correo_usuario,
          nombre_usuario: nombreUsuario,
          nombre_apiario,
          message: 'Usuario asignado correctamente',
          ya_existia: false,
          data: {
            usuario_id: idUsuario,
            apiario_id: idApiario,
            admin_id: idAdmin
          }
        });
        
        console.log(`✅ Usuario '${correo_usuario}' asignado al apiario '${nombre_apiario}'`);
        
      } catch (error) {
        resultados.push({
          success: false,
          correo_usuario,
          error: error.message
        });
      }
    }
    
    await client.query('COMMIT');
    
    const exitosos = resultados.filter(r => r.success).length;
    const fallidos = resultados.filter(r => !r.success).length;
    
    return {
      success: fallidos === 0,
      total: asignaciones.length,
      exitosos,
      fallidos,
      resultados
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en asignación de usuarios:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Solo ejecutar si se llama directamente (no cuando se importa)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('--- Script de asignación de usuarios iniciado ---');
  
  // EJEMPLO DE USO: Modifica estos valores según necesites
  const asignaciones = [
    {
      correo_usuario: 'zoevelaz@outlook.com',
      nombre_apiario: 'Apiario Principal'
    },
    {
      correo_usuario: 'orlando@gmail.com',
      nombre_apiario: 'Apiario Secundario del Laboratorio'
    },
    {
      correo_usuario: '2023371124@uteq.edu.mx',
      nombre_apiario: 'Apiario Principal'
    }
  ];
  
  asignarUsuariosAApiario(asignaciones)
    .then(resultado => {
      console.log('\n✅ Resultado:');
      console.log(`Total: ${resultado.total}`);
      console.log(`Exitosos: ${resultado.exitosos}`);
      console.log(`Fallidos: ${resultado.fallidos}`);
      console.log('\nDetalle:');
      resultado.resultados.forEach(r => {
        if (r.success) {
          console.log(`  ✅ ${r.correo_usuario} → ${r.nombre_apiario}`);
        } else {
          console.log(`  ❌ ${r.correo_usuario}: ${r.error}`);
        }
      });
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

export default asignarUsuariosAApiario;
