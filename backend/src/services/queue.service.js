import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { ENV } from '../config/env.js'
import { logger } from '../config/logger.js'

// Configuración de la conexión a Redis
// BullMQ recomienda usar una conexión dedicada para la cola y otra para el worker (o reusar con cuidado)
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Requerido por BullMQ
})

connection.on('error', (err) => {
  logger.error(err, 'Redis Connection Error')
})

// Cola para gestionar la expiración de turnos
export const bookingQueue = new Queue('bookingQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true, // Limpiar trabajos exitosos
    removeOnFail: 1000,      // Mantener últimos 1000 fallos para auditoría
  }
})

logger.info('🚀 BullMQ: bookingQueue inicializada')
