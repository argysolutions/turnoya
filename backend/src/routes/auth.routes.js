import { register, login, staffLogin, fixStaffPin } from '../controllers/auth.controller.js'

export const authRoutes = async (app) => {
  app.post('/auth/register', register)
  app.post('/auth/login', login)
  app.post('/auth/staff-login', staffLogin)
  
  // Dev route
  app.get('/auth/dev/fix-pin', fixStaffPin)
}