import { verifyToken } from '../middlewares/auth.middleware.js'
import {
  listServices,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler
} from '../controllers/services.controller.js'

export const servicesRoutes = async (app) => {
  app.get('/services', { preHandler: verifyToken }, listServices)
  app.post('/services', { preHandler: verifyToken }, createServiceHandler)
  app.put('/services/:id', { preHandler: verifyToken }, updateServiceHandler)
  app.delete('/services/:id', { preHandler: verifyToken }, deleteServiceHandler)
}