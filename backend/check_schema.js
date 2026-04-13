import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses'");
    console.log('Columns in businesses table:', res.rows.map(r => r.column_name));
    
    const settingsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'business_settings'");
    console.log('Columns in business_settings table (if exists):', settingsRes.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error checking schema:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
