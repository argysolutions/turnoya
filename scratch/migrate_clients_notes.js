const { Pool } = require('./backend/node_modules/pg');
const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log('⏳ Aplicando migración para notas internas en clientes...');
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS internal_notes TEXT;
    `);
    console.log('✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error en migración:', err);
  } finally {
    await pool.end();
  }
}
migrate();
