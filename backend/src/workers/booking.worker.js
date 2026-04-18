import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Re-usamos la lógica de conexión para el worker
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

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
  const worker = new Worker('bookingQueue', async (job) => {
    if (job.name === 'expire-lock') {
      const { appointmentId } = job.data
      logger.info({ appointmentId }, '🔍 BullMQ: Procesando expiración para turno')

      try {
        // Verificar el estado actual del turno
        const res = await pool.query(
          'SELECT status FROM appointments WHERE id = $1',
          [appointmentId]
        )

        if (res.rowCount === 0) {
          logger.warn({ appointmentId }, '⚠️ Turno no encontrado. Ignorando.')
          return
        }

        const currentStatus = res.rows[0].status

        // Si el turno sigue en estado 'pendiente' o 'bloqueado', lo expiramos
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
        throw err // BullMQ reintentará según la configuración
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
