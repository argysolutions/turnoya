import { getSettings, updateSettings } from '../controllers/business.controller.js'
import { verifyAuth } from '../middlewares/auth.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyAuth] }, getSettings)
  app.put('/settings', { preHandler: [verifyAuth] }, updateSettings)
}
