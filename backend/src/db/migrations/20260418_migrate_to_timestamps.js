import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
const { Pool } = pg

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('🚀 Iniciando migración a TIMESTAMPTZ en la tabla appointments...')

    // 1. Agregar nuevas columnas
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
    `)

    // 2. Migrar datos existentes (si los hay)
    // Combinamos date + start_time y date + end_time
    await client.query(`
      UPDATE appointments 
      SET start_at = (date + start_time)::TIMESTAMPTZ,
          end_at = (date + end_time)::TIMESTAMPTZ
      WHERE start_at IS NULL;
    `)

    // 3. Hacer las columnas NOT NULL después de la migración de datos
    await client.query(`
      ALTER TABLE appointments 
      ALTER COLUMN start_at SET NOT NULL,
      ALTER COLUMN end_at SET NOT NULL;
    `)

    // 4. Eliminar columnas viejas
    await client.query(`
      ALTER TABLE appointments 
      DROP COLUMN IF EXISTS date,
      DROP COLUMN IF EXISTS start_time,
      DROP COLUMN IF EXISTS end_time;
    `)

    console.log('✅ Columnas migradas a start_at y end_at.')

    await client.query('COMMIT')
    console.log('🎉 Migración completada con éxito.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error en la migración:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
