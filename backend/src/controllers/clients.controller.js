import { getClientsByBusiness, updateClientNotes } from '../db/clients.queries.js'

export const listClients = async (req, reply) => {
  const businessId = req.business.id
  try {
    const clients = await getClientsByBusiness(businessId)
    reply.send(clients)
  } catch (error) {
    console.error('[listClients] Error:', error.message)
    reply.status(500).send({ error: 'Error al obtener el listado de clientes' })
  }
}

export const updateNotes = async (req, reply) => {
  const { id } = req.params
  const { notes } = req.body
  
  try {
    const updated = await updateClientNotes(id, notes)
    if (!updated) return reply.status(404).send({ error: 'Cliente no encontrado' })
    reply.send(updated)
  } catch (error) {
    console.error('[updateNotes] Error:', error.message)
    reply.status(500).send({ error: 'Error al actualizar las notas del cliente' })
  }
}
