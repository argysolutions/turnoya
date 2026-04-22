import { 
  findOrCreateClient, 
  createAppointment, 
  getAppointmentById, 
  getAppointmentsByBusiness, 
  updateAppointmentStatus as dbUpdateStatus, 
  setAppointmentLiberationTime,
  checkOverlap
} from '../db/appointments.queries.js'
import { getBusinessBySlug } from '../db/public.queries.js'
import { getServiceById } from '../db/services.queries.js'
import { sendConfirmation } from './whatsapp.service.js'
import { ensureContactExists } from './google.service.js'
import { bookingQueue } from './queue.service.js'
import { NotificationService } from './notification.service.js'
import { pool } from '../config/db.js'

/**
 * Appointment Service
 * Encapsulates all business logic for turn management, 
 * abstracting the controller from database and side-effect details.
 */
export class AppointmentService {
  
  /**
   * Procesa la reserva de un turno (público o interno)
   */
  static async book({ businessId, slug, serviceId, startAt, endAt, clientData, notes }) {
    let bId = businessId
    let bName = ''

    if (!bId && slug) {
      const business = await getBusinessBySlug(slug)
      if (!business) throw new Error('Negocio no encontrado')
      bId = business.id
      bName = business.name
    } else {
      const { rows } = await pool.query('SELECT name FROM businesses WHERE id = $1', [bId])
      bName = rows[0]?.name
    }

    const service = await getServiceById(serviceId, bId)
    if (!service) throw new Error('Servicio no encontrado')

    // 1. Validar solapamiento (aunque el GIST de la DB es el juez final, avisamos antes)
    const isOccupied = await checkOverlap(bId, startAt, endAt)
    if (isOccupied) {
      const err = new Error('Horario ya ocupado')
      err.code = 'OVERLAP_CONFLICT'
      throw err
    }

    // 2. Cliente (lookup or create)
    let clientId = clientData.client_id
    if (!clientId) {
      const client = await findOrCreateClient({ 
        businessId: bId, 
        name: clientData.name, 
        phone: clientData.phone, 
        email: clientData.email 
      })
      clientId = client.id
    }

    // 3. Persistencia
    const appointment = await createAppointment({
      businessId: bId,
      serviceId,
      clientId,
      startAt,
      endAt,
      notes
    })

    const full = await getAppointmentById(appointment.id, bId)

    // 4. Side Effects (Async)
    ensureContactExists(bId, clientData).catch(() => {})
    sendConfirmation(clientData.phone, {
      businessName: bName,
      serviceName: service.name,
      date: new Date(startAt).toLocaleDateString(),
      startTime: new Date(startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }).catch(() => {})

    NotificationService.sendConfirmation(full).catch(() => {})

    return full
  }

  /**
   * Actualiza el estado de un turno con lógica de negocio específica (Caja/Sales)
   */
  static async updateStatus(id, businessId, { status, paymentInfo, staffContext }) {
    const appointment = await getAppointmentById(id, businessId)
    if (!appointment) throw new Error('Turno no encontrado')

    const isEmployee = staffContext?.role === 'employee'
    const isOwner = staffContext?.role === 'owner'

    // Restricción: Un empleado no puede aprobar un bloqueo pendiente (moverlo a blocked o confirmed)
    if (appointment.status === 'pending_block' && isEmployee && (status === 'blocked' || status === 'confirmed')) {
      throw new Error('No tienes permisos para aprobar este bloqueo. Debe ser aprobado por el dueño.')
    }

    if (status === 'liberate') {
      const liberatesAt = new Date(Date.now() + 600000)
      await dbUpdateStatus(id, businessId, 'cancelled_occupied')
      await setAppointmentLiberationTime(id, businessId, liberatesAt)
      await bookingQueue.add('expire-lock', { appointmentId: id }, { delay: 600000 })
      return { action: 'liberating' }
    }

    if (status === 'cancelled_occupied' || status === 'confirmed') {
      await setAppointmentLiberationTime(id, businessId, null)
    }

    const updated = await dbUpdateStatus(id, businessId, status, paymentInfo, staffContext)
    if (!updated) throw new Error('Error al actualizar el turno')

    // Agendar expiración si es un bloqueo temporal o sigue pendiente
    if (status === 'pending_block' || status === 'cancelled_occupied') {
      await bookingQueue.add('expire-lock', { appointmentId: id }, { delay: 600000 })
    }

    return updated
  }

  /**
   * Bloquea un rango de tiempo manual
   */
  static async blockTime(businessId, { startAt, endAt, isEvent, notes, user }) {
    const { rows } = await pool.query('SELECT id FROM services WHERE business_id=$1 LIMIT 1', [businessId])
    const serviceId = rows[0]?.id
    if (!serviceId) throw new Error('Crea un servicio primero')

    const isOccupied = await checkOverlap(businessId, startAt, endAt)
    if (isOccupied) throw new Error('Horario ocupado')

    const isEmployee = user.role === 'employee'
    const reasonText = notes?.trim() || 'Bloqueo Manual'
    const clientName = isEvent ? '🌟 Evento Destacado' : (isEmployee ? '⏳ Bloqueo Pendiente' : `🛑 ${reasonText}`)
    
    // Status normalization
    let status = 'blocked'
    if (isEvent) status = 'cancelled'
    else if (isEmployee) status = 'pending_block'

    const cl = await pool.query(
      `INSERT INTO clientes (business_id, nombre, telefono) VALUES ($1, $2, '0000000000') RETURNING id`, 
      [businessId, clientName]
    )
    
    const metaNotes = JSON.stringify({ 
      text: reasonText, 
      requested_by_name: user.name || 'Staff',
      requested_by_id: user.id 
    })

    const res = await pool.query(
      `INSERT INTO appointments (business_id, service_id, client_id, start_at, end_at, status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, 
      [businessId, serviceId, cl.rows[0].id, startAt, endAt, status, metaNotes]
    )

    if (status === 'pending_block') {
      await bookingQueue.add('expire-lock', { appointmentId: res.rows[0].id }, { delay: 600000 })
    }

    return { success: true, id: res.rows[0].id }
  }
}
