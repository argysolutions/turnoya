import {
  getServicesByBusiness,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../db/services.queries.js'

export const listServices = async (req, reply) => {
  const services = await getServicesByBusiness(req.user.business_id)
  reply.send(services)
}

export const createServiceHandler = async (req, reply) => {
  const { name, duration, price, description, service_icon, service_color } = req.body

  if (!name || !duration) {
    return reply.status(400).send({ error: 'Nombre y duración son obligatorios' })
  }

  const service = await createService({
    businessId: req.user.business_id,
    name,
    duration,
    price,
    description,
    service_icon,
    service_color
  })

  reply.status(201).send(service)
}

export const updateServiceHandler = async (req, reply) => {
  const { id } = req.params

  const existing = await getServiceById(id, req.user.business_id)
  if (!existing) {
    return reply.status(404).send({ error: 'Servicio no encontrado' })
  }

  const updated = await updateService(id, req.user.business_id, req.body)
  reply.send(updated)
}

export const deleteServiceHandler = async (req, reply) => {
  const { id } = req.params

  const existing = await getServiceById(id, req.user.business_id)
  if (!existing) {
    return reply.status(404).send({ error: 'Servicio no encontrado' })
  }

  await deleteService(id, req.user.business_id)
  reply.send({ message: 'Servicio eliminado' })
}