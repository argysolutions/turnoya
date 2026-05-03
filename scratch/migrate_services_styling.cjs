const { Pool } = require('../backend/node_modules/pg');
const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log('Adding columns to services table...');
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS service_icon VARCHAR(50) DEFAULT 'scissors',
      ADD COLUMN IF NOT EXISTS service_color VARCHAR(50) DEFAULT 'bg-blue-600';
    `);
    console.log('✅ Columns added successfully');
  } catch (err) {
    console.error('❌ Error migrating:', err);
  } finally {
    await pool.end();
  }
}

migrate();
