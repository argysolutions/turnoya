const { Pool } = require('./backend/node_modules/pg');

const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando migración de esquema para appointments...');
    await client.query('BEGIN');

    // 1. Agregar nuevas columnas
    console.log('Step 1: Agregando columnas start_at y end_at...');
    await client.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ');
    await client.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ');

    // 2. Migrar datos de las columnas legacy a las nuevas
    // Concatenamos date y time para crear los registros TIMESTAMPTZ
    console.log('Step 2: Migrando datos existentes...');
    await client.query(`
      UPDATE appointments 
      SET 
        start_at = (date + start_time)::timestamptz,
        end_at = (date + end_time)::timestamptz
      WHERE start_at IS NULL;
    `);

    // 3. Hacer las nuevas columnas NOT NULL después de la migración (opcional pero recomendado)
    await client.query('ALTER TABLE appointments ALTER COLUMN start_at SET NOT NULL');
    await client.query('ALTER TABLE appointments ALTER COLUMN end_at SET NOT NULL');

    // 4. ELIMINAR columnas legacy
    console.log('Step 3: Eliminando columnas legacy (date, start_time, end_time)...');
    await client.query('ALTER TABLE appointments DROP COLUMN date');
    await client.query('ALTER TABLE appointments DROP COLUMN start_time');
    await client.query('ALTER TABLE appointments DROP COLUMN end_time');

    await client.query('COMMIT');
    console.log('✅ Migración completada con éxito.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
