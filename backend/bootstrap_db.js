/**
 * bootstrap_db.js — Inicialización Maestro de Base de Datos
 *
 * Este script garantiza que el esquema completo (tablas base + extensiones)
 * esté presente y cargado con datos de prueba iniciales.
 *
 * Diseñado para entornos sin acceso a consola (como Render Free Tier).
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

async function bootstrap() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('🔄 Iniciando Bootstrap de Base de Datos...')

    // ── 1. Tablas Base ────────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        email       VARCHAR(150) NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        phone       VARCHAR(20),
        address     VARCHAR(200),
        description TEXT,
        owner_pin_hash TEXT DEFAULT NULL,
        commission_rate DECIMAL(5,2) DEFAULT 0,
        expense_categories TEXT[] DEFAULT ARRAY['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro'],
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('   ✅ Tabla: businesses')

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id           SERIAL PRIMARY KEY,
        business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name         VARCHAR(100) NOT NULL,
        duration     INTEGER NOT NULL,
        price        NUMERIC(10,2),
        description  TEXT,
        active       BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('   ✅ Tabla: services')

    await client.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id           SERIAL PRIMARY KEY,
        business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time   TIME NOT NULL,
        end_time     TIME NOT NULL,
        CONSTRAINT unique_business_day UNIQUE (business_id, day_of_week)
      );
    `)
    console.log('   ✅ Tabla: availability')

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        phone      VARCHAR(20) NOT NULL,
        email      VARCHAR(150),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('   ✅ Tabla: clients')

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id          SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL,
        status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed')),
        liberates_at TIMESTAMP NULL,
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('   ✅ Tabla: appointments')

    // ── 2. Extensiones (Módulos Avanzados) ────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id                SERIAL PRIMARY KEY,
        business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name              VARCHAR(100) NOT NULL,
        pin_hash          TEXT NOT NULL,
        role              VARCHAR(20) DEFAULT 'empleado',
        professional_name VARCHAR(100),
        is_active         BOOLEAN DEFAULT TRUE,
        created_at        TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('   ✅ Tabla: staff')

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id              SERIAL PRIMARY KEY,
        business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        client_name     TEXT,
        phone           TEXT,
        amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_method  TEXT NOT NULL DEFAULT 'Efectivo',
        professional_name TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales (business_id, created_at DESC);
    `)
    console.log('   ✅ Tabla: sales')

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id           SERIAL PRIMARY KEY,
        business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        description  TEXT NOT NULL,
        amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
        category     TEXT NOT NULL DEFAULT 'General',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses (business_id, created_at DESC);
    `)
    console.log('   ✅ Tabla: expenses')

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_connections (
        id              SERIAL PRIMARY KEY,
        business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        provider        TEXT NOT NULL DEFAULT 'google',
        access_token    TEXT,
        refresh_token   TEXT,
        expires_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(business_id, provider)
      );
    `)
    console.log('   ✅ Tabla: business_connections')

    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id              SERIAL PRIMARY KEY,
        business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at       TIMESTAMPTZ,
        initial_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
        counted_amount  NUMERIC(12,2),
        difference      NUMERIC(12,2),
        status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
      );
    `)
    console.log('   ✅ Tabla: cash_sessions')

    // ── 3. Migraciones de Columnas Específicas ──────────────────────────────

    await client.query(`
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_pin_hash TEXT DEFAULT NULL;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS professional_name TEXT;
    `)
    console.log('   ✅ Columnas de seguridad y Caja Pro')

    // ── 4. Seeding (Datos de prueba si no existen) ──────────────────────────

    const checkOwner = await client.query('SELECT id FROM businesses WHERE email = $1', [OWNER_EMAIL])
    
    if (checkOwner.rows.length === 0) {
      console.log('🌱 Poblando base de datos con cuenta admin...')
      
      const hashedPassword = await bcrypt.hash(OWNER_PASSWORD, 10)
      const bizResult = await client.query(
        `INSERT INTO businesses (name, slug, email, password, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['Color Craft Test', 'color-craft-test', OWNER_EMAIL, hashedPassword, 'Negocio de prueba']
      )
      
      const bId = bizResult.rows[0].id

      // PIN Dueño
      const ownerPinHash = await bcrypt.hash(`owner:${bId}:${OWNER_PIN}`, 10)
      await client.query('UPDATE businesses SET owner_pin_hash = $1 WHERE id = $2', [ownerPinHash, bId])

      // Empleado Test
      const staffPinHash = await bcrypt.hash(`${bId}:1234`, 10)
      await client.query(
        `INSERT INTO staff (business_id, name, pin_hash, role, professional_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [bId, 'Juan Perez', staffPinHash, 'empleado', 'Juan Perez']
      )
      
      console.log('   ✅ Datos de prueba creados')
    } else {
      console.log('   ⏩ Cuenta admin ya existe, omitiendo seed')
    }

    await client.query('COMMIT')
    console.log('🎉 Bootstrap completado con éxito.')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error durante el bootstrap:', err.message)
    // No salimos con error para permitir que el servidor intente iniciar de todos modos
  } finally {
    client.release()
  }
}

bootstrap()
  .then(() => pool.end())
  .catch(err => console.error('Error fatal:', err))
