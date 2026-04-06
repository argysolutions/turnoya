import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { ENV } from './config/env.js'
import { connectDB } from './config/db.js'
import { authRoutes } from './routes/auth.routes.js'
import { servicesRoutes } from './routes/services.routes.js'
import { availabilityRoutes } from './routes/availability.routes.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true, credentials: true })
await app.register(cookie)

app.register(authRoutes, { prefix: '/api' })
app.register(servicesRoutes, { prefix: '/api' })
app.register(availabilityRoutes, { prefix: '/api' })

app.get('/health', async () => ({ status: 'ok', app: 'TurnoYa' }))

const start = async () => {
  await connectDB()
  await app.listen({ port: ENV.PORT, host: '0.0.0.0' })
}

start()