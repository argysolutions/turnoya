import { register, login, staffLogin, getProfiles, verifyPin, refresh, logout } from '../controllers/auth.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

export const authRoutes = async (app) => {
  // Públicas
  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/staff-login', staffLogin)
  app.post('/auth/refresh', refresh)
  app.post('/auth/logout', logout)

  // Kiosco (requieren token de terminal)
  app.get('/auth/profiles', { preHandler: verifyToken }, getProfiles)
  app.post('/auth/verify-pin', { preHandler: verifyToken }, verifyPin)
}