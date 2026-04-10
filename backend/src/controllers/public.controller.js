import {
  getBusinessBySlug,
  getActiveServicesByBusiness,
  getAvailabilityByDay,
  getOccupiedSlots
} from '../db/public.queries.js'

import { generateAvailableSlots } from '../services/availability.service.js'

export const getBusinessPublicProfile = async (req, reply) => {
  const { slug } = req.params

  const business = await getBusinessBySlug(slug)
  if (!business) {
    return reply.status(404).send({ error: 'Negocio no encontrado' })
  }

  const services = await getActiveServicesByBusiness(business.id)

  reply.send({ business, services })
}

export const getAvailableSlots = async (req, reply) => {
  const { slug } = req.params
  const { date, service_id } = req.query

  if (!date || !service_id) {
    return reply.status(400).send({ error: 'Fecha y servicio son obligatorios' })
  }

  const business = await getBusinessBySlug(slug)
  if (!business) {
    return reply.status(404).send({ error: 'Negocio no encontrado' })
  }

  const dateObj = new Date(date + 'T00:00:00')
  const dayOfWeek = dateObj.getDay()

  const availability = await getAvailabilityByDay(business.id, dayOfWeek)
  if (!availability) {
    return reply.send({ slots: [], message: 'El negocio no atiende ese día' })
  }

  const services = await getActiveServicesByBusiness(business.id)
  const service = services.find(s => s.id === parseInt(service_id))
  if (!service) {
    return reply.status(404).send({ error: 'Servicio no encontrado' })
  }

  const occupiedSlots = await getOccupiedSlots(business.id, date)
  const slots = generateAvailableSlots({
    date,
    business,
    service,
    availability,
    occupiedSlots
  })

  reply.send({ date, slots })
}