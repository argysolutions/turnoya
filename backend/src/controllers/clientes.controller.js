import {
  searchClientsByBusiness,
  updateClientNotes
} from '../db/clientes.queries.js'

/**
 * Lista/Busca clientes asociados al negocio.
 * SEGURO: El business_id se extrae del token JWT.
 */
export const listClientes = async (req, reply) => {
  const businessId = req.user.business_id
  const { q = '' } = req.query

  const clientes = await searchClientsByBusiness(businessId, q)
  reply.send(clientes)
}

/**
 * Actualiza las notas privadas de un cliente.
 * SEGURO: El business_id se extrae del token JWT.
 */
export const updateNotes = async (req, reply) => {
  const businessId = req.user.business_id
  const { id: clientId } = req.params
  const { internal_notes } = req.body

  // Validación de entrada
  if (typeof internal_notes !== 'string') {
    return reply.status(400).send({ error: 'Las notas deben ser un texto' })
  }

  const updated = await updateClientNotes(clientId, businessId, internal_notes)
  
  if (!updated) {
    return reply.status(404).send({ error: 'Cliente no encontrado o sin interacción con este negocio' })
  }

  reply.send({ 
    message: 'Notas actualizadas correctamente',
    client_id: updated.client_id,
    internal_notes: updated.internal_notes 
  })
}
