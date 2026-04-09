import { findOrCreateClient, createAppointment, getAppointmentById, getAppointmentsByBusiness, updateAppointmentStatus, deleteAppointment, setAppointmentLiberationTime } from '../db/appointments.queries.js'
import { getBusinessBySlug, getAvailabilityByDay, getOccupiedSlots } from '../db/public.queries.js'
import { getServiceById } from '../db/services.queries.js'
import { sendConfirmation } from '../services/whatsapp.service.js'
import { pool } from '../config/db.js'

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
    // Calculamos el timestamp actual + 2 minutos
    const liberatesAt = new Date(Date.now() + 120000)

    // Lo fijamos como occupied para que nadie lo pueda usar en estos 2 minutos
    await updateAppointmentStatus(id, req.business.id, 'cancelled_occupied')
    
    // Le seteamos el countdown
    await setAppointmentLiberationTime(id, req.business.id, liberatesAt)
    
    // Disparamos timer no bloqueante blindado con validación de estado real
    setTimeout(async () => {
      try {
        const current = await getAppointmentById(id)
        // Solo eliminamos si el usuario no canceló la orden durante estos 2 minutos (es decir, el timer sigue activo en DB)
        if (current && current.liberates_at !== null) {
          await deleteAppointment(id, req.business.id)
          console.log(`⏱️ Turno ${id} liberado y eliminado permanentemente luego de 2 minutos.`)
        } else {
          console.log(`🛑 Liberación de turno ${id} cancelada. El administrador presionó deshacer.`)
        }
      } catch (err) {
        console.error('Error liberando turno:', err.message)
      }
    }, 120000) // 120,000 ms = 2 minutos

    return reply.send({ success: true, action: 'liberating' })
  }

  // Si envuelve manualmente a keep_occupied o apretó "Deshacer" restaurandolo a confirmado, le quitamos toda fecha límite
  if (status === 'cancelled_occupied' || status === 'confirmed') {
    await setAppointmentLiberationTime(id, req.business.id, null)
  }

  // Lógicas estándar
  const updated = await updateAppointmentStatus(id, req.business.id, status)
  if (!updated) return reply.status(404).send({ error: 'Turno no encontrado' })

  reply.send(updated)
}

export const blockTime = async (req, reply) => {
  const { date, start_time, duration, isEvent, notes } = req.body
  const businessId = req.business.id
  try {
    const { rows } = await pool.query('SELECT id FROM services WHERE business_id=$1 LIMIT 1', [businessId])
    const serviceId = rows[0]?.id
    if (!serviceId) throw new Error('No hay servicios creados para enlazar el bloqueo')
    
    // Si es evento, no bloquea turnos (cancelled nativo), si es Receso se vuelve cancelled_occupied
    const clientName = isEvent ? '🌟 Evento Destacado' : '🛠️ Receso / Bloqueo'
    const status = isEvent ? 'cancelled' : 'cancelled_occupied'

    const cl = await pool.query(`INSERT INTO clients (name, phone) VALUES ($1, '0000000000') RETURNING id`, [clientName])
    
    // Soporta end_time provisto, o lo calcula del duration (retrocompatibilidad)
    let end = req.body.end_time;
    if (!end && duration) {
      const [h, m] = start_time.split(':').map(Number)
      const endMins = h * 60 + m + parseInt(duration)
      end = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}:00`
    }
    
    await pool.query(
      `INSERT INTO appointments (business_id, service_id, client_id, date, start_time, end_time, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
      [businessId, serviceId, cl.rows[0].id, date, start_time, end, status, notes || '']
    )
    reply.send({ success: true })
  } catch (err) {
    console.error('Error insertando bloqueo manual:', err)
    reply.status(500).send({ error: 'Hubo un error al ejecutar el bloqueo' })
  }
}