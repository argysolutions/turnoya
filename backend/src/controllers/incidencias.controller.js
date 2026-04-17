import { 
  deleteIncidenciaById, 
  createIncidencia, 
  getAllIncidenciasByBusiness 
} from '../db/incidencias.queries.js'

/**
 * Obtiene todas las incidencias del negocio.
 * SEGURO: Filtrado por business_id del token.
 */
export const listIncidencias = async (req, reply) => {
  const businessId = req.user.business_id
  try {
    const list = await getAllIncidenciasByBusiness(businessId)
    reply.send(list)
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudieron obtener las incidencias' })
  }
}

/**
 * Crea una nueva incidencia.
 * SEGURO: El business_id viene del token, no del cliente.
 */
export const addIncidencia = async (req, reply) => {
  const businessId = req.user.business_id
  const { sintoma, causa_raiz, solucion, accion_preventiva } = req.body

  if (!sintoma || !causa_raiz || !solucion || !accion_preventiva) {
    return reply.status(400).send({ error: 'Todos los campos técnicos son obligatorios' })
  }

  try {
    const newIncidencia = await createIncidencia(businessId, {
      sintoma,
      causa_raiz,
      solucion,
      accion_preventiva
    })

    reply.status(201).send({
      success: true,
      data: newIncidencia
    })
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudo crear el reporte de incidencia' })
  }
}

/**
 * Elimina un reporte de incidencia.
 * SEGURO: El business_id se extrae del token JWT (req.user).
 */
export const removeIncidencia = async (req, reply) => {
  const { id } = req.params
  const businessId = req.user.business_id

  try {
    const deleted = await deleteIncidenciaById(id, businessId)

    if (!deleted) {
      return reply.status(404).send({ 
        error: 'Reporte no encontrado', 
        message: 'El reporte no existe o no pertenece a tu negocio' 
      })
    }

    reply.send({ 
      success: true, 
      message: 'Reporte de incidencia eliminado correctamente',
      data: deleted 
    })
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ 
      error: 'Error interno', 
      message: 'No se pudo eliminar el reporte' 
    })
  }
}
