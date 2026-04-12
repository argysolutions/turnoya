const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    console.log('Iniciando migración de tabla sales...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id              SERIAL PRIMARY KEY,
        business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        client_name     TEXT,
        phone           TEXT,
        amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_method  TEXT NOT NULL DEFAULT 'Efectivo',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla sales creada (o ya existía).');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_business_date
        ON sales (business_id, created_at DESC);
    `);
    console.log('✅ Índice de búsqueda creado.');

    console.log('🎉 Migración completada con éxito.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    pool.end();
  }
};

run();
