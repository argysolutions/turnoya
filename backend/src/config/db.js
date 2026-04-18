import pg from 'pg'
import { ENV } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  ...ENV.DB,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
})

export const connectDB = async (logger = console) => {
  try {
    const client = await pool.connect()
    logger.info('✅ PostgreSQL conectado')
    client.release()
  } catch (err) {
    logger.error(err, '❌ Error al conectar a PostgreSQL')
    process.exit(1)
  }
}