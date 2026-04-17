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
    
    console.log('🗑️ Eliminando tablas obsoletas...')
    await client.query('DROP TABLE IF EXISTS client_business_notes CASCADE')
    await client.query('DROP TABLE IF EXISTS appointments CASCADE')
    await client.query('DROP TABLE IF EXISTS clients CASCADE')
    
    console.log('🆕 Creando nueva tabla: clientes...')
    await client.query(`
      CREATE TABLE clientes (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        nombre VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        email VARCHAR(150),
        notas_internas TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_clientes_business ON clientes(business_id);
    `)

    console.log('🔄 Recreando tabla: appointments...')
    await client.query(`
      CREATE TABLE appointments (
        id          SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        client_id   INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL,
        status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed')),
        liberates_at TIMESTAMP NULL,
        notes       TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
      );
    `)

    await client.query('COMMIT')
    console.log('✅ Migración de Clientes completada exitosamente.')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error en la migración:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
