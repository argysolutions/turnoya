import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://postgres:admin@localhost:5432/turnoya' });

async function check() {
  try {
    const r = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
    console.log('Columns in clients table:', r.rows.map(x => x.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
