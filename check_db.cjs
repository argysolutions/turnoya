const { Pool } = require('./backend/node_modules/pg');
const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status';");
    console.log('Column Type:', res.rows);
    
    const constraints = await pool.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'appointments'::regclass AND contype = 'c';");
    console.log('Constraints:', constraints.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
