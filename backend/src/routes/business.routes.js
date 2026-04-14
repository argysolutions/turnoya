import { getSettings, updateSettings, updateStaffPin } from '../controllers/business.controller.js'
import { updateOwnerPin } from '../controllers/auth.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyToken, requireRole('dueño')] }, getSettings)
  app.put('/settings', { preHandler: [verifyToken, requireRole('dueño')] }, updateSettings)
  
  // Security — PINs
  app.put('/settings/staff/pin', { preHandler: [verifyToken, requireRole('dueño')] }, updateStaffPin)
  app.put('/settings/owner-pin', { preHandler: [verifyToken, requireRole('dueño')] }, updateOwnerPin)
}
