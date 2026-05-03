const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'turnoya',
  user: 'postgres',
  password: 'admin'
});

const tableName = process.argv[2] || 'clientes';

async function check() {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`);
    console.log(`Columns for ${tableName}:`, res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
