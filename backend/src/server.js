import Fastify from 'fastify'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import { ENV } from './config/env.js'
import { connectDB } from './config/db.js'
import { authRoutes } from './routes/auth.routes.js'
import { servicesRoutes } from './routes/services.routes.js'
import { availabilityRoutes } from './routes/availability.routes.js'
import { publicRoutes } from './routes/public.routes.js'
import { appointmentsRoutes } from './routes/appointments.routes.js'
import { googleRoutes } from './routes/google.routes.js'
import { businessRoutes } from './routes/business.routes.js'
import { salesRoutes } from './routes/sales.routes.js'
import { financesRoutes } from './routes/finances.routes.js'
import { clientesRoutes } from './routes/clientes.routes.js'
import { incidenciasRoutes } from './routes/incidencias.routes.js'
import { paymentRoutes } from './routes/payment.routes.js'

const loggerConfig = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true
      },
    },
  },
  production: true,
  test: false,
}

export const app = Fastify({ 
  logger: loggerConfig[process.env.NODE_ENV] || true 
})

// CORS Hardening: producción, staging y desarrollo local
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : [
      'https://turnoya-cliente.onrender.com', // Producción actual
      'https://www.turnoya.com',              // Dominio oficial
      'https://turnoya-staging.onrender.com', // Futuro Staging
      'http://localhost:5173'                 // Desarrollo
    ]

// Registro de Seguridad (Helmet) con mejores prácticas CSP básicas
await app.register(helmet, {
  contentSecurityPolicy: false, // Desactivado para facilitar la carga de recursos externos en esta etapa si es necesario
})

await app.register(cors, {
  origin: (origin, cb) => {
    // Permitir requests sin origin (curl, health checks, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      app.log.warn(`CORS bloqueado para origin: ${origin}`)
      cb(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})
await app.register(cookie)

// Registro unificado de rutas de la API bajo el prefijo /api
await app.register(async (api) => {
  api.register(authRoutes)
  api.register(servicesRoutes)
  api.register(availabilityRoutes)
  api.register(publicRoutes)
  api.register(appointmentsRoutes)
  api.register(googleRoutes)
  api.register(businessRoutes)
  api.register(salesRoutes)
  api.register(financesRoutes)
  api.register(clientesRoutes)
  api.register(incidenciasRoutes)
  api.register(paymentRoutes)
}, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok', app: 'TurnoYa' }))

import { startBookingWorker } from './workers/booking.worker.js'
import { startReminderCron } from './workers/reminder.worker.js'

export const start = async () => {
  // Inyectamos el logger de Fastify en la conexión a la DB y en el Worker
  await connectDB(app.log)

  // Auto-migrate: ensure all status values exist in the CHECK constraint
  try {
    const { pool } = await import('./config/db.js')
    await pool.query("ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check")
    await pool.query(
      "ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed', 'blocked', 'pending_block', 'cancelled_timeout', 'no_show', 'liberate'))"
    )
    app.log.info('✅ appointments_status_check constraint synced')
  } catch (err) {
    app.log.warn('⚠️ Could not sync status constraint: ' + err.message)
  }
  
  // Iniciar Worker de BullMQ
  startBookingWorker(app.log)
  
  // Iniciar Cron Job de Recordatorios
  console.log('DEBUG: Llamando a startReminderCron...');
  startReminderCron(app.log)

  try {
    const port = ENV.PORT || 3000
    await app.listen({ port: port, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Solo arrancar automáticamente si no estamos en modo script/test (ej: si es el archivo principal)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  start()
}