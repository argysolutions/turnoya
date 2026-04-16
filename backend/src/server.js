import Fastify from 'fastify'
import cors from '@fastify/cors'
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
import { clientsRoutes } from './routes/clients.routes.js'

const app = Fastify({ logger: true })

// CORS: acepta FRONTEND_URL (puede ser comma-separated), o fallback a producción + dev
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['https://turnoya-cliente.onrender.com', 'http://localhost:5173']

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
app.register(clientsRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok', app: 'TurnoYa' }))

const start = async () => {
  await connectDB()
  await app.listen({ port: ENV.PORT, host: '0.0.0.0' })
}

start()