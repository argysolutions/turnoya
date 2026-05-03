const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'turnoya',
  user: 'postgres',
  password: 'admin'
});

async function migrate() {
  try {
    console.log('Adding columns to LOCAL services table...');
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS service_icon VARCHAR(50) DEFAULT 'scissors',
      ADD COLUMN IF NOT EXISTS service_color VARCHAR(50) DEFAULT 'bg-blue-600';
    `);
    console.log('✅ Local columns added successfully');
  } catch (err) {
    console.error('❌ Error migrating local:', err);
  } finally {
    await pool.end();
  }
}

migrate();
