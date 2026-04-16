import { verifyToken } from '../middlewares/auth.middleware.js'
import { listClients, updateNotes } from '../controllers/clients.controller.js'

export const clientsRoutes = async (app) => {
  // Accesible tanto para dueños como empleados autenticados
  app.get('/clients', { preHandler: [verifyToken] }, listClients)
  app.put('/clients/:id/notes', { preHandler: [verifyToken] }, updateNotes)
}
