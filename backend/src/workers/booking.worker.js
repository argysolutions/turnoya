import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// 🛡️ HOTFIX: Validación de REDIS_URL para evitar crash en el Worker
const REDIS_URL = process.env.REDIS_URL
let connection = null

if (REDIS_URL) {
  connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 1000, 10000)
  })
  connection.on('error', (err) => {
    // Silencioso para evitar spam en logs de producción si Redis no es crítico
    // console.warn('[Worker Redis Error] Ignorado:', err.message)
  })
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

export const startBookingWorker = (logger = console) => {
  if (!connection) {
    logger.warn('⚠️ BullMQ Worker desactivado: No hay REDIS_URL configurada.');
    return null;
  }

  const worker = new Worker('bookingQueue', async (job) => {
    if (job.name === 'expire-lock') {
      const { appointmentId } = job.data
      logger.info({ appointmentId }, '🔍 BullMQ: Procesando expiración para turno')

      try {
        const res = await pool.query(
          'SELECT status FROM appointments WHERE id = $1',
          [appointmentId]
        )

        if (res.rowCount === 0) {
          logger.warn({ appointmentId }, '⚠️ Turno no encontrado. Ignorando.')
          return
        }

        const currentStatus = res.rows[0].status

        if (currentStatus === 'pending' || currentStatus === 'blocked') {
          logger.info({ appointmentId, currentStatus }, '⏰ Expirando turno')
          
          await pool.query(
            "UPDATE appointments SET status = 'cancelled_timeout' WHERE id = $1",
            [appointmentId]
          )
          
          logger.info({ appointmentId }, '✅ Turno marcado como cancelled_timeout')
        } else {
          logger.info({ appointmentId, currentStatus }, 'ℹ️ Turno ya cambió de estado. No se requiere acción.')
        }
      } catch (err) {
        logger.error({ err, appointmentId }, '❌ Error procesando expiración del turno')
        throw err 
      }
    }
  }, { connection })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '✨ Trabajo completado')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job.id, err: err.message }, '💥 Trabajo falló')
  })

  logger.info('👷 BullMQ: Worker de Agenda iniciado y escuchando...')
  return worker
}
