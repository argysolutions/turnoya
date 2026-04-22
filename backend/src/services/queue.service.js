import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '../config/logger.js'

// 🛡️ HOTFIX: Validación de REDIS_URL para evitar crash en entornos sin Redis (ej. Render Free/Starter)
const REDIS_URL = process.env.REDIS_URL

let connection = null
let queue = null

if (REDIS_URL) {
  try {
    // Configuración de la conexión a Redis
    connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Requerido por BullMQ
      retryStrategy: (times) => {
        // Estrategia de reconexión amigable: reintentar cada 10s
        return Math.min(times * 1000, 10000);
      }
    })

    connection.on('error', (err) => {
      // Logueamos pero NO tiramos abajo el proceso
      logger.warn(`[Redis] Error de conexión (ignorable si no usas BullMQ): ${err.message}`)
    })

    // Inicializamos la cola real
    queue = new Queue('bookingQueue', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      }
    })
    logger.info('🚀 BullMQ: bookingQueue inicializada correctamente.')
  } catch (err) {
    logger.error(`❌ Error inicializando BullMQ: ${err.message}. El sistema continuará sin colas.`)
    queue = null
  }
} else {
  logger.warn('⚠️ BullMQ desactivado: No se encontró REDIS_URL. Las tareas en segundo plano (expiración de bloqueos) no se ejecutarán.')
}

/**
 * Mock Queue para evitar que el sistema crashee si Redis no está disponible.
 * Implementa el método .add() como un no-op.
 */
const mockQueue = {
  add: async (name, data, opts) => {
    logger.debug(`[Queue Mock] Job "${name}" ignorado (Redis no configurado).`)
    return null
  },
  on: () => {}
}

export const bookingQueue = queue || mockQueue
export { connection }
