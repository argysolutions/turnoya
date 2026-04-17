import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import {
  listClientes,
  updateNotes
} from '../controllers/clientes.controller.js'

export const clientesRoutes = async (app) => {
  // Buscar clientes: Cualquier miembro del staff autenticado
  app.get('/clientes', { preHandler: [verifyToken] }, listClientes)

  // Actualizar notas privadas: Solo el Dueño (owner)
  app.put('/clientes/:id/notas', { 
    preHandler: [verifyToken, requireRole('owner')] 
  }, updateNotes)
}
