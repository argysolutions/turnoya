import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  listAvailability,
  setAvailability,
  removeAvailability
} from '../controllers/availability.controller.js'

export const availabilityRoutes = async (app) => {
  app.get('/availability', { preHandler: verifyToken }, listAvailability)
  app.post('/availability', { preHandler: verifyToken }, setAvailability)
  app.delete('/availability/:day', { preHandler: verifyToken }, removeAvailability)
}