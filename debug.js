// debug.js - Ejecuta con: node debug.js
const pool = require('./config/bd');

async function testDatabase() {
  console.log('🔍 Probando conexión a la base de datos...');
  
  try {
    // Test 1: Conexión básica
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    // Test 2: Verificar tablas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Test 3: Verificar usuarios
    const usuarios = await client.query('SELECT COUNT(*) as total, estado_cuenta FROM usuario GROUP BY estado_cuenta');
    console.log(`👤 Usuarios por estado:`);
    usuarios.rows.forEach(row => {
      console.log(`   - ${row.estado_cuenta}: ${row.total}`);
    });
    
    // Test 4: Verificar foros
    const foros = await client.query('SELECT COUNT(*) as total, estado FROM foro GROUP BY estado');
    console.log(`📝 Foros por estado:`);
    foros.rows.forEach(row => {
      console.log(`   - ${row.estado}: ${row.total}`);
    });
    
    // Test 5: Verificar categorías
    const categorias = await client.query('SELECT COUNT(*) as total, activa FROM categoria GROUP BY activa');
    console.log(`🗂️ Categorías por estado:`);
    categorias.rows.forEach(row => {
      console.log(`   - ${row.activa ? 'activa' : 'inactiva'}: ${row.total}`);
    });
    
    // Test 6: Verificar estructura de usuario
    console.log('🔍 Estructura de tabla usuario:');
    const usuarioCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuario'
      ORDER BY ordinal_position
    `);
    usuarioCols.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    client.release();
    console.log('✅ Todas las pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error en la base de datos:', error.message);
    console.error('❌ Stack:', error.stack);
  } finally {
    process.exit();
  }
}

testDatabase();