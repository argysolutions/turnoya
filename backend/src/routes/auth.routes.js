import { register, login } from '../controllers/auth.controller.js'

export const authRoutes = async (app) => {
  app.post('/auth/register', register)
  app.post('/auth/login', login)
}