import { getSettings, updateSettings, updateStaffPin } from '../controllers/business.controller.js'
import { updateOwnerPin } from '../controllers/auth.controller.js'
import { listStaff, addStaff, editStaff, updateMemberPin, removeStaff } from '../controllers/staff.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyToken, requireRole('owner')] }, getSettings)
  app.put('/settings', { preHandler: [verifyToken, requireRole('owner')] }, updateSettings)
  
  // Security — PINs (legacy endpoints)
  app.put('/settings/staff/pin', { preHandler: [verifyToken, requireRole('owner')] }, updateStaffPin)
  app.put('/settings/owner-pin', { preHandler: [verifyToken, requireRole('owner')] }, updateOwnerPin)

  // Staff Management CRUD
  app.get('/staff', { preHandler: [verifyToken, requireRole('owner')] }, listStaff)
  app.post('/staff', { preHandler: [verifyToken, requireRole('owner')] }, addStaff)
  app.put('/staff/:id', { preHandler: [verifyToken, requireRole('owner')] }, editStaff)
  app.put('/staff/:id/pin', { preHandler: [verifyToken, requireRole('owner')] }, updateMemberPin)
  app.delete('/staff/:id', { preHandler: [verifyToken, requireRole('owner')] }, removeStaff)
}
