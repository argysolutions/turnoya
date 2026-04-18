import { 
  findOrCreateClient, 
  createAppointment, 
  getAppointmentById, 
  getAppointmentsByBusiness, 
  updateAppointmentStatus, 
  deleteAppointment, 
  setAppointmentLiberationTime,
  checkOverlap
} from '../db/appointments.queries.js'
import { getBusinessBySlug, getAvailabilityByDay } from '../db/public.queries.js'
import { getServiceById } from '../db/services.queries.js'
import { sendConfirmation } from '../services/whatsapp.service.js'
import { ensureContactExists } from '../services/google.service.js'
import { pool } from '../config/db.js'
import { bookingQueue } from '../services/queue.service.js'

export const bookAppointment = async (req, reply) => {
  const { slug } = req.params
  const { service_id, start_at, end_at, client_name, client_phone, client_email, notes } = req.body

  if (!service_id || !start_at || !end_at || !client_name || !client_phone) {
    return reply.status(400).send({ error: 'Faltan datos obligatorios' })
  }

  const business = await getBusinessBySlug(slug)
  if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' })

  const service = await getServiceById(service_id, business.id)
  if (!service) return reply.status(404).send({ error: 'Servicio no encontrado' })

  // 1. Validar solapamiento de forma estricta
  const isOccupied = await checkOverlap(business.id, start_at, end_at)
  if (isOccupied) {
    return reply.status(409).send({ 
      error: 'Lo sentimos, este horario ya ha sido reservado. Por favor, elige otro.',
      code: 'OVERLAP_CONFLICT'
    })
  }

  // 2. Buscar o crear cliente (ahora atado a business_id)
  const client = await findOrCreateClient({ 
    businessId: business.id, 
    name: client_name, 
    phone: client_phone, 
    email: client_email 
  })

  // 3. Crear el turno
  const appointment = await createAppointment({
    businessId: business.id,
    serviceId: service_id,
    clientId: client.id,
    startAt: start_at,
    endAt: end_at,
    notes
  })

  const full = await getAppointmentById(appointment.id)
  
  // Si en el futuro el estado es 'pending', añadiríamos la cola aquí.
  // Por ahora, bookAppointment crea turnos 'confirmed' directamente.
  
  // Sincronización pasiva
  ensureContactExists(business.id, {
    name: client_name,
    phone: client_phone,
    email: client_email
  }).catch(e => reply.log.debug({ err: e.message }, 'Google Sync ignorado'))

  sendConfirmation(client_phone, {
    businessName: business.name,
    serviceName: service.name,
    date: new Date(start_at).toLocaleDateString(),
    startTime: new Date(start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }).catch(e => reply.log.error({ err: e.message }, 'WP Notify Error'))

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
  const appointments = await getAppointmentsByBusiness(req.user.business_id, date)
  reply.send(appointments)
}

export const updateStatus = async (req, reply) => {
  const { id } = req.params
  const { status, paymentInfo } = req.body

  if (!['confirmed', 'cancelled', 'cancelled_occupied', 'liberate', 'completed', 'pending_block', 'cancelled_timeout', 'no_show'].includes(status)) {
    return reply.status(400).send({ error: 'Estado inválido' })
  }

  try {
    if (status === 'liberate') {
      const liberatesAt = new Date(Date.now() + 600000) // 10 min
      await updateAppointmentStatus(id, req.user.business_id, 'cancelled_occupied')
      await setAppointmentLiberationTime(id, req.user.business_id, liberatesAt)

      // Reemplazamos setTimeout por BullMQ (10 minutos)
      await bookingQueue.add('expire-lock', { appointmentId: id }, { delay: 600000 })

      return reply.send({ success: true, action: 'liberating' })
    }

    if (status === 'cancelled_occupied' || status === 'confirmed') {
      await setAppointmentLiberationTime(id, req.user.business_id, null)
    }

    const staffContext = {
      staff_id: req.user.id,
      professional_name: paymentInfo?.professional_name || null,
    }
    const updated = await updateAppointmentStatus(id, req.user.business_id, status, paymentInfo, staffContext)
    if (!updated) return reply.status(404).send({ error: 'Turno no encontrado' })

    // Agendar expiración de 10 min si queda en un estado temporal
    if (status === 'pending_block' || status === 'cancelled_occupied') {
      await bookingQueue.add('expire-lock', { appointmentId: id }, { delay: 600000 })
    }

    reply.send(updated)
  } catch (error) {
    reply.log.error(error, '[updateStatus] Error')
    reply.status(500).send({ error: 'Error al actualizar el turno' })
  }
}

export const blockTime = async (req, reply) => {
  const { start_at, end_at, isEvent, notes } = req.body
  const businessId = req.user.business_id
  
  try {
    const { rows } = await pool.query('SELECT id FROM services WHERE business_id=$1 LIMIT 1', [businessId])
    const serviceId = rows[0]?.id
    if (!serviceId) throw new Error('No hay servicios creados para enlazar el bloqueo')
    
    // Validar solapamiento también para bloqueos manuales
    const isOccupied = await checkOverlap(businessId, start_at, end_at)
    if (isOccupied) {
      return reply.status(409).send({ error: 'Ya existe un turno o bloqueo en este rango.' })
    }

    const isEmployee = req.user?.role === 'employee'
    const clientName = isEvent ? '🌟 Evento Destacado' : (isEmployee ? '⏳ Bloqueo Pendiente' : '🛠️ Receso / Bloqueo')
    let status = isEvent ? 'cancelled' : 'cancelled_occupied'
    if (!isEvent && isEmployee) {
      status = 'pending_block'
    }

    const cl = await pool.query(
      `INSERT INTO clientes (business_id, nombre, telefono) VALUES ($1, $2, '0000000000') RETURNING id`, 
      [businessId, clientName]
    )
    
    const staffName = req.user.name || 'Staff'
    const metaNotes = JSON.stringify({ 
      text: notes || '', 
      requested_by_name: staffName,
      requested_by_id: req.user.id 
    })

    const res = await pool.query(
      `INSERT INTO appointments (business_id, service_id, client_id, start_at, end_at, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, 
      [businessId, serviceId, cl.rows[0].id, start_at, end_at, status, metaNotes]
    )

    // Agendar expiración de 10 min si es un bloqueo que requiere acción
    if (status === 'pending_block' || status === 'cancelled_occupied') {
      await bookingQueue.add('expire-lock', { appointmentId: res.rows[0].id }, { delay: 600000 })
    }

    reply.send({ success: true, id: res.rows[0].id })
  } catch (err) {
    reply.log.error(err, 'Error insertando bloqueo manual')
    reply.status(500).send({ error: 'Hubo un error al ejecutar el bloqueo' })
  }
}

export const createInternalAppointment = async (req, reply) => {
  const { service_id, client_id, start_at, end_at, notes } = req.body
  const businessId = req.user.business_id

  if (!service_id || !client_id || !start_at || !end_at) {
    return reply.status(400).send({ error: 'Faltan datos obligatorios' })
  }

  try {
    const isOccupied = await checkOverlap(businessId, start_at, end_at)
    if (isOccupied) {
      return reply.status(409).send({ error: 'El horario ya está ocupado.' })
    }

    const appointment = await createAppointment({
      businessId,
      serviceId: service_id,
      clientId: client_id,
      startAt: start_at,
      endAt: end_at,
      notes
    })

    const full = await getAppointmentById(appointment.id)
    reply.status(201).send(full)
  } catch (err) {
    req.log.error(err, 'Error en createInternalAppointment')
    reply.status(500).send({ error: 'Error al crear el turno' })
  }
}