const { Pool } = require('./backend/node_modules/pg');
const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('Tables:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
