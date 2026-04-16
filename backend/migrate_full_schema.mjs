import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting full schema migration...\n');

    // ─── 1. Businesses — missing columns ────────────────────────────────────
    console.log('1. Patching businesses table...');
    await client.query(`
      ALTER TABLE businesses
        ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS anticipation_margin  INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS buffer_time          INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS whatsapp_enabled     BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS commission_rate      DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS expense_categories   TEXT[] DEFAULT ARRAY['General','Insumos','Servicios','Alquiler','Personal','Marketing','Otro'],
        ADD COLUMN IF NOT EXISTS owner_pin_hash       TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS staff_permissions    JSONB DEFAULT NULL;
    `);
    console.log('   ✅ businesses OK\n');

    // ─── 2. Staff table ──────────────────────────────────────────────────────
    console.log('2. Creating staff table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id                SERIAL PRIMARY KEY,
        business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name              TEXT NOT NULL,
        pin_hash          TEXT NOT NULL,
        role              TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'owner')),
        professional_name TEXT DEFAULT NULL,
        is_active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✅ staff OK\n');

    // ─── 3. Business Connections table ───────────────────────────────────────
    console.log('3. Creating business_connections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_connections (
        id            SERIAL PRIMARY KEY,
        business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        provider      TEXT NOT NULL DEFAULT 'google',
        access_token  TEXT,
        refresh_token TEXT,
        expires_at    TIMESTAMPTZ,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (business_id, provider)
      );
    `);
    console.log('   ✅ business_connections OK\n');

    // ─── 4. Expenses table ───────────────────────────────────────────────────
    console.log('4. Creating expenses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id                    SERIAL PRIMARY KEY,
        business_id           INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        description           TEXT NOT NULL,
        amount                DECIMAL(12,2) NOT NULL,
        category              TEXT DEFAULT 'General',
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_advance            BOOLEAN NOT NULL DEFAULT FALSE,
        professional_name     TEXT DEFAULT NULL,
        created_by_staff_id   INTEGER REFERENCES staff(id) ON DELETE SET NULL
      );
    `);
    console.log('   ✅ expenses OK\n');

    // ─── 5. Cash Sessions table ──────────────────────────────────────────────
    console.log('5. Creating cash_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id             SERIAL PRIMARY KEY,
        business_id    INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        opened_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at      TIMESTAMPTZ DEFAULT NULL,
        initial_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        counted_amount DECIMAL(12,2) DEFAULT NULL,
        difference     DECIMAL(12,2) DEFAULT NULL,
        status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
      );
    `);
    // Index to make open-session lookups fast
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_sessions_open
      ON cash_sessions(business_id, status)
      WHERE status = 'open';
    `);
    console.log('   ✅ cash_sessions OK\n');

    // ─── 6. Sales table ─────────────────────────────────────────────────────
    console.log('6. Checking sales table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id                SERIAL PRIMARY KEY,
        business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        appointment_id    INTEGER DEFAULT NULL,
        amount            DECIMAL(12,2) NOT NULL,
        payment_method    TEXT NOT NULL DEFAULT 'Efectivo',
        client_name       TEXT DEFAULT NULL,
        phone             TEXT DEFAULT NULL,
        service_name      TEXT DEFAULT NULL,
        professional_name TEXT DEFAULT NULL,
        staff_id          INTEGER REFERENCES staff(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('   ✅ sales OK\n');

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!\n');

    // ─── Final check ─────────────────────────────────────────────────────────
    const tables = ['businesses','staff','business_connections','expenses','cash_sessions','sales'];
    for (const t of tables) {
      const r = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`📋 ${t}: [${r.rows.map(x => x.column_name).join(', ')}]`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
