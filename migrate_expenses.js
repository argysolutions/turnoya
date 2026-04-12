const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear tabla expenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id           SERIAL PRIMARY KEY,
        business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        description  TEXT NOT NULL,
        amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
        category     TEXT NOT NULL DEFAULT 'General',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla expenses OK');

    // Índice para búsquedas por negocio y fecha
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_business_date
        ON expenses (business_id, created_at DESC);
    `);
    console.log('✅ Índice de expenses OK');

    // 2. Columna professional_name en sales
    await client.query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS professional_name TEXT;
    `);
    console.log('✅ Columna sales.professional_name OK');

    // 3. Normalizar valores legacy de payment_method
    await client.query(`
      UPDATE sales
      SET payment_method = CASE
        WHEN LOWER(payment_method) LIKE '%transfer%' THEN 'Transferencia'
        WHEN LOWER(payment_method) LIKE '%tarjet%'   THEN 'Tarjeta'
        WHEN LOWER(payment_method) LIKE '%card%'     THEN 'Tarjeta'
        ELSE 'Efectivo'
      END
      WHERE payment_method NOT IN ('Efectivo', 'Transferencia', 'Tarjeta');
    `);
    console.log('✅ payment_method normalizado');

    await client.query('COMMIT');
    console.log('🎉 Migración Caja Pro completada con éxito.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

run();
