import {
  getBusinessBySlug,
  getActiveServicesByBusiness,
  getAvailabilityByDay,
  getOccupiedSlots
} from '../db/public.queries.js'

const timeToMinutes = (time) => {
  const [h, m] = time.toString().split(':').map(Number)
  return h * 60 + m
}

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

const generateSlots = (startTime, endTime, duration, occupiedSlots) => {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const slots = []

  for (let time = start; time + duration <= end; time += duration) {
    const slotStart = minutesToTime(time)
    const slotEnd = minutesToTime(time + duration)

    const isOccupied = occupiedSlots.some(occupied => {
      const occStart = timeToMinutes(occupied.start_time)
      const occEnd = timeToMinutes(occupied.end_time)
      return time < occEnd && time + duration > occStart
    })

    if (!isOccupied) {
      slots.push({ start: slotStart, end: slotEnd })
    }
  }

  return slots
}

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
  const slots = generateSlots(availability.start_time, availability.end_time, service.duration, occupiedSlots)

  reply.send({ date, slots })
}