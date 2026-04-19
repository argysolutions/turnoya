import { pool } from './src/config/db.js'

async function run() {
  try {
    // 1. Check current constraint
    const check = await pool.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'appointments_status_check'"
    )
    console.log('BEFORE:', check.rows)

    // 2. Drop and recreate with all statuses
    await pool.query("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check")
    await pool.query(
      "ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed', 'blocked', 'pending_block', 'cancelled_timeout', 'no_show', 'liberate'))"
    )

    // 3. Verify
    const verify = await pool.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'appointments_status_check'"
    )
    console.log('AFTER:', verify.rows)
    console.log('SUCCESS: Constraint updated!')
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    process.exit()
  }
}

run()
