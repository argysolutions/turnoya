import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import {
  listClientes,
  addCliente,
  editCliente,
  removeCliente
} from '../controllers/clientes.controller.js'

/**
 * Rutas para la gestión de Clientes (per-business).
 */
export const clientesRoutes = async (app) => {
  // Ver y Listar clientes: Dueño y Empleado
  app.get('/clientes', { 
    preHandler: [verifyToken, requireRole('owner', 'employee')] 
  }, listClientes)

  // Crear cliente: Dueño y Empleado
  app.post('/clientes', { 
    preHandler: [verifyToken, requireRole('owner', 'employee')] 
  }, addCliente)

  // Editar cliente: Dueño y Empleado
  app.put('/clientes/:id', { 
    preHandler: [verifyToken, requireRole('owner', 'employee')] 
  }, editCliente)

  // Eliminar cliente: SOLO Dueño
  app.delete('/clientes/:id', { 
    preHandler: [verifyToken, requireRole('owner')] 
  }, removeCliente)
}
