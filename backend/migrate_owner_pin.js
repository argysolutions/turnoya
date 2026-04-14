/**
 * migrate_owner_pin.js — Agrega owner_pin_hash a la tabla businesses
 *
 * Uso:
 *   DATABASE_URL=... node migrate_owner_pin.js
 */

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
})

async function migrate() {
  const client = await pool.connect()
  try {
    // Verificar si la columna ya existe
    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'businesses' AND column_name = 'owner_pin_hash'
    `)

    if (check.rows.length > 0) {
      console.log('✅ Columna owner_pin_hash ya existe. Nada que hacer.')
      return
    }

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN owner_pin_hash TEXT DEFAULT NULL
    `)

    console.log('✅ Columna owner_pin_hash agregada a businesses')
  } catch (err) {
    console.error('❌ Error en migración:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
