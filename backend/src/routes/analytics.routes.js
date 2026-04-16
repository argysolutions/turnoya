import { getDashboardStats } from '../controllers/analytics.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'

export const analyticsRoutes = async (app) => {
  // Solo el dueño (u otros roles con permiso si lo expandimos) pueden ver analíticas
  // Por ahora lo dejamos restringido a Admin/Owner para máxima seguridad
  app.get('/dashboard', { preHandler: [verifyToken, requireRole('owner')] }, getDashboardStats)
}
