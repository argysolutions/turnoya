/**
 * seed.js — Datos de prueba para TurnoYa
 *
 * Crea un negocio "dueño" con PIN kiosco y un empleado asociado.
 *
 * Credenciales resultantes:
 *   Dueño:    admin@turnoya.com / admin  (login) + PIN kiosco: 0000
 *   Empleado: PIN 1234 (business_id del negocio creado como pepper)
 *
 * Uso:
 *   node seed.js                  (usa DATABASE_URL del env)
 *   DATABASE_URL=... node seed.js (override explícito)
 */

import pg from 'pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
})

const OWNER_EMAIL = 'admin@turnoya.com'
const OWNER_PASSWORD = 'admin'
const OWNER_PIN = '0000'
const OWNER_NAME = 'Color Craft Test'
const OWNER_SLUG = 'color-craft-test'

const STAFF_NAME = 'Juan Perez'
const STAFF_PIN = '1234'
const STAFF_ROLE = 'employee'

async function seed() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // ── Asegurar columna owner_pin_hash existe ─────────────────────────────
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'businesses' AND column_name = 'owner_pin_hash'
    `)
    if (colCheck.rows.length === 0) {
      await client.query('ALTER TABLE businesses ADD COLUMN owner_pin_hash TEXT DEFAULT NULL')
      console.log('📐 Columna owner_pin_hash creada')
    }

    // ── Limpiar datos de prueba anteriores ──────────────────────────────────
    const existing = await client.query(
      'SELECT id FROM businesses WHERE email = $1',
      [OWNER_EMAIL]
    )

    if (existing.rows.length > 0) {
      const bId = existing.rows[0].id
      console.log(`🧹 Limpiando datos anteriores (business_id: ${bId})...`)
      await client.query('DELETE FROM staff WHERE business_id = $1', [bId])
      await client.query('DELETE FROM cash_sessions WHERE business_id = $1', [bId])
      await client.query('DELETE FROM expenses WHERE business_id = $1', [bId])
      await client.query('DELETE FROM sales WHERE business_id = $1', [bId])
      await client.query('DELETE FROM appointments WHERE business_id = $1', [bId])
      await client.query('DELETE FROM availability WHERE business_id = $1', [bId])
      await client.query('DELETE FROM services WHERE business_id = $1', [bId])
      await client.query('DELETE FROM connections WHERE business_id = $1', [bId])
      await client.query('DELETE FROM businesses WHERE id = $1', [bId])
    }

    // ── Crear negocio (dueño) ───────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(OWNER_PASSWORD, 10)

    const bizResult = await client.query(
      `INSERT INTO businesses (name, slug, email, password, phone, address, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, email`,
      [
        OWNER_NAME,
        OWNER_SLUG,
        OWNER_EMAIL,
        hashedPassword,
        '+5491112345678',
        'Av. Corrientes 1234, CABA',
        'Negocio de prueba para testing de roles',
      ]
    )

    const business = bizResult.rows[0]
    console.log(`✅ Negocio creado: "${business.name}" (id: ${business.id})`)

    // ── Configurar PIN kiosco del dueño ─────────────────────────────────────
    const ownerPepperedPin = `owner:${business.id}:${OWNER_PIN}`
    const ownerPinHash = await bcrypt.hash(ownerPepperedPin, 10)
    await client.query(
      'UPDATE businesses SET owner_pin_hash = $1 WHERE id = $2',
      [ownerPinHash, business.id]
    )
    console.log(`✅ PIN kiosco del dueño configurado: ${OWNER_PIN}`)

    // ── Crear empleado con PIN peppered ──────────────────────────────────────
    const pepperedPin = `${business.id}:${STAFF_PIN}`
    const hashedPin = await bcrypt.hash(pepperedPin, 10)

    const staffResult = await client.query(
      `INSERT INTO staff (business_id, name, pin_hash, role, professional_name, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, role`,
      [business.id, STAFF_NAME, hashedPin, STAFF_ROLE, STAFF_NAME]
    )

    const staff = staffResult.rows[0]
    console.log(`✅ Empleado creado: "${staff.name}" (id: ${staff.id}, rol: ${staff.role})`)

    await client.query('COMMIT')

    console.log('\n════════════════════════════════════════════')
    console.log('  CREDENCIALES DE PRUEBA')
    console.log('════════════════════════════════════════════')
    console.log(`  Dueño:`)
    console.log(`    Email:      ${OWNER_EMAIL}`)
    console.log(`    Password:   ${OWNER_PASSWORD}`)
    console.log(`    PIN Kiosco: ${OWNER_PIN}`)
    console.log(`  Empleado:`)
    console.log(`    Business ID: ${business.id}`)
    console.log(`    Nombre:      ${STAFF_NAME}`)
    console.log(`    PIN:         ${STAFF_PIN}`)
    console.log('════════════════════════════════════════════\n')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error en seed:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
  .then(() => {
    console.log('🎉 Seed completado.')
    process.exit(0)
  })
  .catch(() => {
    process.exit(1)
  })
