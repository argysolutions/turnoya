import {
  getAllClientesByBusiness,
  createCliente,
  updateCliente,
  deleteCliente
} from '../db/clientes.queries.js'

/**
 * Lista todos los clientes del negocio.
 */
export const listClientes = async (req, reply) => {
  const businessId = req.user.business_id
  try {
    const clientes = await getAllClientesByBusiness(businessId)
    reply.send(clientes)
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudieron obtener los clientes' })
  }
}

/**
 * Crea un nuevo cliente.
 */
export const addCliente = async (req, reply) => {
  const businessId = req.user.business_id
  const { nombre, telefono, email, notas_internas } = req.body

  if (!nombre || !telefono) {
    return reply.status(400).send({ error: 'Nombre y teléfono son obligatorios' })
  }

  try {
    const newCliente = await createCliente(businessId, {
      nombre,
      telefono,
      email,
      notas_internas
    })
    reply.status(201).send(newCliente)
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudo crear el cliente' })
  }
}

/**
 * Actualiza los datos de un cliente.
 */
export const editCliente = async (req, reply) => {
  const businessId = req.user.business_id
  const { id } = req.params
  const { nombre, telefono, email, notas_internas } = req.body

  try {
    const updated = await updateCliente(id, businessId, {
      nombre,
      telefono,
      email,
      notas_internas
    })

    if (!updated) {
      return reply.status(404).send({ error: 'Cliente no encontrado' })
    }

    reply.send(updated)
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudo actualizar el cliente' })
  }
}

/**
 * Elimina un cliente.
 */
export const removeCliente = async (req, reply) => {
  const businessId = req.user.business_id
  const { id } = req.params

  try {
    const deleted = await deleteCliente(id, businessId)

    if (!deleted) {
      return reply.status(404).send({ error: 'Cliente no encontrado' })
    }

    reply.send({ message: 'Cliente eliminado correctamente', id })
  } catch (error) {
    req.log.error(error)
    reply.status(500).send({ error: 'No se pudo eliminar el cliente' })
  }
}
