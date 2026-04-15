import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

const pool = new Pool({ 
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_HOST?.includes('render.com') || process.env.DB_HOST?.includes('elephantsql') 
    ? { rejectUnauthorized: false } 
    : false 
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Add staff_id column to sales if it doesn't exist
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;
    `);
    console.log('✅ sales.staff_id column added (or already existed)');

    // Ensure client_name and phone columns exist
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT NULL;`);
    await client.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;`);
    console.log('✅ sales.client_name and sales.phone columns ensured');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
