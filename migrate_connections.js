/**
 * Migración: business_connections
 * Crea la tabla de integraciones (Google Pack, etc) con tokens encriptados.
 * Ejecutar: node migrate_connections.js
 */

const { Pool } = require('./backend/node_modules/pg')

const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
})

const run = async () => {
  console.log('🔄 Ejecutando migración: business_connections...')
  try {
    await pool.query(`
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
    console.log('   ✅ Tabla business_connections creada.')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_connections_bid
        ON business_connections(business_id);
    `)
    console.log('   ✅ Índice idx_business_connections_bid creado.')

    console.log('✅ Migración completada correctamente.')
  } catch (err) {
    console.error('❌ Error durante la migración:', err)
    process.exit(1)
  } finally {
    pool.end()
  }
}

run()
