import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'turnoya',
  user: 'postgres',
  password: 'admin',
});

async function run() {
  try {
    const r1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'businesses' ORDER BY ordinal_position");
    console.log('businesses:', r1.rows.map(r => r.column_name));

    const r2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cash_sessions' ORDER BY ordinal_position");
    console.log('cash_sessions:', r2.rows.map(r => r.column_name));

    const r3 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' ORDER BY ordinal_position");
    console.log('expenses:', r3.rows.map(r => r.column_name));

    const r4 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' ORDER BY ordinal_position");
    console.log('staff:', r4.rows.map(r => r.column_name));
    
    const r5 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'business_connections' ORDER BY ordinal_position");
    console.log('business_connections:', r5.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
