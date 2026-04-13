/**
 * Migración: cash_sessions
 * Crea la tabla de sesiones de caja vinculadas a la DB (Opción B).
 * Ejecutar: node migrate_cash_sessions.js
 */

const { Pool } = require('./backend/node_modules/pg')

const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
})

const run = async () => {
  console.log('🔄 Ejecutando migración: cash_sessions...')
  try {
    await pool.query(`
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
    console.log('   ✅ Tabla cash_sessions creada (o ya existía).')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_sessions_business
        ON cash_sessions(business_id);
    `)
    console.log('   ✅ Índice idx_cash_sessions_business creado.')

    await pool.query(`
      COMMENT ON TABLE cash_sessions IS 'Sesiones de apertura/cierre de caja por negocio. Una sesión abierta por negocio a la vez.';
    `)

    console.log('✅ Migración completada correctamente.')
  } catch (err) {
    console.error('❌ Error durante la migración:', err)
    process.exit(1)
  } finally {
    pool.end()
  }
}

run()
