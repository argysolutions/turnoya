import { findOrCreateClient, createAppointment, getAppointmentById, getAppointmentsByBusiness, updateAppointmentStatus, deleteAppointment } from '../db/appointments.queries.js'
import { getBusinessBySlug, getAvailabilityByDay, getOccupiedSlots } from '../db/public.queries.js'
import { getServiceById } from '../db/services.queries.js'
import { sendConfirmation } from '../services/whatsapp.service.js'

const timeToMinutes = (time) => {
  const [h, m] = time.toString().split(':').map(Number)
  return h * 60 + m
}

export const bookAppointment = async (req, reply) => {
  const { slug } = req.params
  const { service_id, date, start_time, client_name, client_phone, client_email, notes } = req.body

  if (!service_id || !date || !start_time || !client_name || !client_phone) {
    return reply.status(400).send({ error: 'Faltan datos obligatorios' })
  }

  const business = await getBusinessBySlug(slug)
  if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' })

  const service = await getServiceById(service_id, business.id)
  if (!service) return reply.status(404).send({ error: 'Servicio no encontrado' })

  const dateObj = new Date(date + 'T00:00:00')
  const dayOfWeek = dateObj.getDay()
  const availability = await getAvailabilityByDay(business.id, dayOfWeek)
  if (!availability) return reply.status(400).send({ error: 'El negocio no atiende ese día' })

  const startMinutes = timeToMinutes(start_time)
  const endMinutes = startMinutes + service.duration
  const end_time = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

  const occupiedSlots = await getOccupiedSlots(business.id, date)
  const isOccupied = occupiedSlots.some(occupied => {
    const occStart = timeToMinutes(occupied.start_time)
    const occEnd = timeToMinutes(occupied.end_time)
    return startMinutes < occEnd && endMinutes > occStart
  })

  if (isOccupied) return reply.status(409).send({ error: 'Ese horario ya no está disponible' })

  const client = await findOrCreateClient({ name: client_name, phone: client_phone, email: client_email })

  const appointment = await createAppointment({
    businessId: business.id,
    serviceId: service_id,
    clientId: client.id,
    date,
    startTime: start_time,
    endTime: end_time,
    notes
  })

  const full = await getAppointmentById(appointment.id)
  
  // Enviamos la notificación por WhatsApp en segundo plano (para no blockear al front)
  sendConfirmation(client_phone, {
    businessName: business.name,
    serviceName: service.name,
    date,
    startTime: start_time
  }).catch(e => console.error('Fallo el trigger de WP:', e.message))

  reply.status(201).send(full)
}

export const getAppointment = async (req, reply) => {
  const { id } = req.params
  const appointment = await getAppointmentById(id)
  if (!appointment) return reply.status(404).send({ error: 'Turno no encontrado' })
  reply.send(appointment)
}

export const listAppointments = async (req, reply) => {
  const { date } = req.query
  const appointments = await getAppointmentsByBusiness(req.business.id, date)
  reply.send(appointments)
}

export const updateStatus = async (req, reply) => {
  const { id } = req.params
  const { status } = req.body

  if (!['confirmed', 'cancelled', 'cancelled_occupied', 'liberate'].includes(status)) {
    return reply.status(400).send({ error: 'Estado inválido' })
  }

  // Lógica A: Liberar (con retraso de 2 minutos)
  if (status === 'liberate') {
    // Lo fijamos como occupied para que nadie lo pueda usar en estos 2 minutos
    await updateAppointmentStatus(id, req.business.id, 'cancelled_occupied')
    
    // Disparamos timer no bloqueante
    setTimeout(async () => {
      try {
        await deleteAppointment(id, req.business.id)
        console.log(`⏱️ Turno ${id} liberado y eliminado permanentemente luego de 2 minutos.`)
      } catch (err) {
        console.error('Error liberando turno:', err.message)
      }
    }, 120000) // 120,000 ms = 2 minutos

    return reply.send({ success: true, action: 'liberating' })
  }

  // Lógicas estándar
  const updated = await updateAppointmentStatus(id, req.business.id, status)
  if (!updated) return reply.status(404).send({ error: 'Turno no encontrado' })

  reply.send(updated)
}