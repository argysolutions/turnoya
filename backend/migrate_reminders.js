import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function migrate() {
  try {
    console.log('🚀 Iniciando migración: reminder_sent...');
    await pool.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Columna reminder_sent añadida con éxito.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
