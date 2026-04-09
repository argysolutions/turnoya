import { pool } from './src/config/db.js'

async function run() {
  try {
    console.log('Alterando chequeo de la DB...')
    await pool.query(`
      ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
      ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed'));
    `)
    console.log('Exito')
  } catch (e) {
    console.error('Error:', e)
  } finally {
    process.exit()
  }
}

run()
