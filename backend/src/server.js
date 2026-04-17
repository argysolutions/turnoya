import Fastify from 'fastify'
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

const app = Fastify({ logger: true })

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
      console.warn(`CORS bloqueado para origin: ${origin}`)
      cb(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})
await app.register(cookie)

app.register(authRoutes, { prefix: '/api' })
app.register(servicesRoutes, { prefix: '/api' })
app.register(availabilityRoutes, { prefix: '/api' })
app.register(publicRoutes, { prefix: '/api' })
app.register(appointmentsRoutes, { prefix: '/api' })
app.register(googleRoutes, { prefix: '/api' })
app.register(businessRoutes, { prefix: '/api' })
app.register(salesRoutes, { prefix: '/api' })
app.register(financesRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok', app: 'TurnoYa' }))

const start = async () => {
  await connectDB()
  await app.listen({ port: ENV.PORT, host: '0.0.0.0' })
}

start()