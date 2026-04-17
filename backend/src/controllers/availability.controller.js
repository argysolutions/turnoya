import {
  getAvailabilityByBusiness,
  upsertAvailability,
  deleteAvailability
} from '../db/availability.queries.js'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const listAvailability = async (req, reply) => {
  const availability = await getAvailabilityByBusiness(req.user.business_id)
  reply.send(availability)
}

export const setAvailability = async (req, reply) => {
  const { day_of_week, start_time, end_time } = req.body

  if (day_of_week === undefined || !start_time || !end_time) {
    return reply.status(400).send({ error: 'Día, hora de inicio y hora de fin son obligatorios' })
  }

  if (day_of_week < 0 || day_of_week > 6) {
    return reply.status(400).send({ error: 'Día inválido (0=Domingo, 6=Sábado)' })
  }

  if (start_time >= end_time) {
    return reply.status(400).send({ error: 'La hora de inicio debe ser menor a la hora de fin' })
  }

  const result = await upsertAvailability(req.user.business_id, day_of_week, start_time, end_time)
  reply.send(result)
}

export const removeAvailability = async (req, reply) => {
  const { day } = req.params

  const deleted = await deleteAvailability(req.user.business_id, day)
  if (!deleted) {
    return reply.status(404).send({ error: 'Disponibilidad no encontrada' })
  }

  reply.send({ message: `Disponibilidad del ${DAYS[day]} eliminada` })
}