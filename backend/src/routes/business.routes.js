import { getSettings, updateSettings, updateStaffPin } from '../controllers/business.controller.js'
import { updateOwnerPin } from '../controllers/auth.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyToken, requireRole('owner')] }, getSettings)
  app.put('/settings', { preHandler: [verifyToken, requireRole('owner')] }, updateSettings)
  
  // Security — PINs
  app.put('/settings/staff/pin', { preHandler: [verifyToken, requireRole('owner')] }, updateStaffPin)
  app.put('/settings/owner-pin', { preHandler: [verifyToken, requireRole('owner')] }, updateOwnerPin)
}
