import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { 
  removeIncidencia, 
  addIncidencia, 
  listIncidencias 
} from '../controllers/incidencias.controller.js'

/**
 * Rutas para la gestión de reportes de incidencias técnicas.
 */
export const incidenciasRoutes = async (app) => {
  // Ver todas las incidencias: Solo Dueño
  app.get('/incidencias', {
    preHandler: [verifyToken, requireRole('owner')]
  }, listIncidencias)

  // Crear incidencia: Dueño y Empleado
  app.post('/incidencias', {
    preHandler: [verifyToken, requireRole(['owner', 'employee'])]
  }, addIncidencia)

  // Eliminar reporte: Solo Dueño
  app.delete('/incidencias/:id', { 
    preHandler: [verifyToken, requireRole('owner')] 
  }, removeIncidencia)
}
