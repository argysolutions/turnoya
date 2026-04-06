import pg from 'pg'
import { ENV } from './env.js'

const { Pool } = pg

export const pool = new Pool(ENV.DB)

export const connectDB = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ PostgreSQL conectado')
    client.release()
  } catch (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message)
    process.exit(1)
  }
}