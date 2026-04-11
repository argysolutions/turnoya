import { getSettings, updateSettings } from '../controllers/business.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: verifyToken }, getSettings)
  app.put('/settings', { preHandler: verifyToken }, updateSettings)
}
