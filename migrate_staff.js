/**
 * migrate_staff.js
 * Migración one-shot: tabla staff + columnas de auditoría en sales y expenses.
 * Ejecutar: node migrate_staff.js
 */
import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'backend', '.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── 1. Tabla staff ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id                SERIAL PRIMARY KEY,
        business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name              TEXT    NOT NULL,
        pin_hash          TEXT    NOT NULL,
        role              TEXT    NOT NULL DEFAULT 'empleado'
                            CHECK (role IN ('empleado', 'dueño')),
        professional_name TEXT,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✅  Tabla staff creada/verificada')

    // ── 2. Auditoría en sales ───────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE sales
        ADD COLUMN IF NOT EXISTS payment_recipient   TEXT NOT NULL DEFAULT 'dueño'
                                                       CHECK (payment_recipient IN ('dueño', 'profesional')),
        ADD COLUMN IF NOT EXISTS created_by_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL
    `)
    console.log('✅  sales: payment_recipient + created_by_staff_id')

    // ── 3. Auditoría en expenses ────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS is_advance          BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS professional_name   TEXT,
        ADD COLUMN IF NOT EXISTS created_by_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL
    `)
    console.log('✅  expenses: is_advance + professional_name + created_by_staff_id')

    await client.query('COMMIT')
    console.log('\n🎉  Migración completada exitosamente.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌  Error en migración — ROLLBACK ejecutado:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
