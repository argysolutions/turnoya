import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'turnoya',
  user: 'postgres',
  password: 'admin',
});

async function migrate() {
  try {
    console.log('⏳ Aplicando migración local para clientes...');
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS internal_notes TEXT;
    `);
    console.log('✅ Columna internal_notes añadida.');
    
    // Check if email column exists (it should, based on check_db)
    // but just in case we need any other column.
    
    console.log('✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
