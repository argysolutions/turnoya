import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import {
  listServices,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler
} from '../controllers/services.controller.js'

export const servicesRoutes = async (app) => {
  app.get('/services', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, listServices)
  app.post('/services', { preHandler: [verifyToken, requireRole('owner')] }, createServiceHandler)
  app.put('/services/:id', { preHandler: [verifyToken, requireRole('owner')] }, updateServiceHandler)
  app.delete('/services/:id', { preHandler: [verifyToken, requireRole('owner')] }, deleteServiceHandler)
}