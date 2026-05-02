import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function update() {
  const pool = new Pool({ connectionString: 'postgres://postgres:admin@localhost:5432/turnoya' });
  const hash = await bcrypt.hash('admin', 10);
  await pool.query('UPDATE businesses SET password = $1 WHERE email = $2', [hash, 'admin@turnoya.com']);
  console.log('Password updated for admin@turnoya.com');
  await pool.end();
}

update().catch(console.error);
