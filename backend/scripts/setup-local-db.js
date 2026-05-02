import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function setup() {
  const pool = new Pool({ connectionString: 'postgres://postgres:admin@localhost:5432/turnoya' });
  
  // 1. Admin setup
  const adminHash = await bcrypt.hash('admin', 10);
  await pool.query('UPDATE businesses SET password = $1 WHERE email = $2', [adminHash, 'admin@turnoya.com']);
  console.log('✅ Admin credentials synced: admin@turnoya.com / admin');

  // 2. Employee setup
  const businessId = 1;
  const pin = '1111';
  const pepperedPin = `${businessId}:${pin}`;
  const pinHash = await bcrypt.hash(pepperedPin, 10);
  
  // Check if staff exists
  const staffRes = await pool.query('SELECT id FROM staff WHERE business_id = $1 AND name = $2', [businessId, 'Empleado Test']);
  
  if (staffRes.rows.length > 0) {
    await pool.query('UPDATE staff SET pin_hash = $1 WHERE id = $2', [pinHash, staffRes.rows[0].id]);
    console.log('✅ Employee credentials updated: PIN 1111 for business 1');
  } else {
    await pool.query(
      'INSERT INTO staff (business_id, name, pin_hash, role, is_active) VALUES ($1, $2, $3, $4, $5)',
      [businessId, 'Empleado Test', pinHash, 'empleado', true]
    );
    console.log('✅ Employee created: Empleado Test (PIN 1111) for business 1');
  }

  await pool.end();
}

setup().catch(console.error);
