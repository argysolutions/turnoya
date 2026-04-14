import { getSettings, updateSettings } from '../controllers/business.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyToken, requireRole('dueño')] }, getSettings)
  app.put('/settings', { preHandler: [verifyToken, requireRole('dueño')] }, updateSettings)
}
