import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import {
  listAvailability,
  setAvailability,
  removeAvailability
} from '../controllers/availability.controller.js'

export const availabilityRoutes = async (app) => {
  app.get('/availability', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, listAvailability)
  app.post('/availability', { preHandler: [verifyToken, requireRole('owner')] }, setAvailability)
  app.delete('/availability/:day', { preHandler: [verifyToken, requireRole('owner')] }, removeAvailability)
}