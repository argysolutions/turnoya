import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateSchema() {
  try {
    console.log('Adding columns to businesses table...');
    await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS expense_categories TEXT[] DEFAULT ARRAY['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro'];
    `);
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    await pool.end();
  }
}

updateSchema();
