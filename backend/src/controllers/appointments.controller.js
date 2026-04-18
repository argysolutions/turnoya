import { z } from 'zod'
import { AppointmentService } from '../services/appointment.service.js'
import { getAppointmentsByBusiness, getAppointmentById } from '../db/appointments.queries.js'

/**
 * Appointments Controller (Refactored Phase 1)
 * Handles HTTP requests for turn management using Zod for validation 
 * and AppointmentService for business logic.
 */

// --- SCHEMAS ---

const bookAppointmentSchema = z.object({
  service_id: z.number().int().positive(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  client_name: z.string().min(2),
  client_phone: z.string().min(7),
  client_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional()
})

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'cancelled_occupied', 'liberate', 'completed', 'pending_block', 'cancelled_timeout', 'no_show', 'blocked']),
  paymentInfo: z.object({
    amount: z.number().optional().or(z.string()),
    method: z.string().optional(),
    professional_name: z.string().optional()
  }).optional()
})

const blockTimeSchema = z.object({
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  isEvent: z.boolean().optional().default(false),
  notes: z.string().optional()
})

const createInternalSchema = z.object({
  service_id: z.number().int().positive(),
  client_id: z.number().int().positive(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  notes: z.string().optional()
})

// --- HANDLERS ---

/**
 * Booking público (vía Slug)
 */
export const bookAppointment = async (req, reply) => {
  try {
    const { slug } = req.params
    const data = bookAppointmentSchema.parse(req.body)

    const full = await AppointmentService.book({
      slug,
      serviceId: data.service_id,
      startAt: data.start_at,
      endAt: data.end_at,
      clientData: {
        name: data.client_name,
        phone: data.client_phone,
        email: data.client_email
      },
      notes: data.notes
    })

    reply.status(201).send(full)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Datos de reserva inválidos', details: err.errors })
    }
    if (err.code === 'OVERLAP_CONFLICT') {
      return reply.status(409).send({ error: err.message, code: err.code })
    }
    req.log.error(err)
    reply.status(500).send({ error: err.message || 'Error al procesar reserva' })
  }
}

/**
 * Consulta un turno específico
 */
export const getAppointment = async (req, reply) => {
  const { id } = req.params
  const appointment = await getAppointmentById(id)
  if (!appointment) return reply.status(404).send({ error: 'Turno no encontrado' })
  reply.send(appointment)
}

/**
 * Lista turnos por negocio y fecha
 */
export const listAppointments = async (req, reply) => {
  const { date } = req.query
  const appointments = await getAppointmentsByBusiness(req.user.business_id, date)
  reply.send(appointments)
}

/**
 * Actualiza estado (Admin)
 */
export const updateStatus = async (req, reply) => {
  try {
    const { id } = req.params
    const { business_id } = req.user
    const { status, paymentInfo } = updateStatusSchema.parse(req.body)

    const result = await AppointmentService.updateStatus(id, business_id, {
      status,
      paymentInfo,
      staffContext: {
        staff_id: req.user.id,
        professional_name: paymentInfo?.professional_name || null
      }
    })

    reply.send(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Actualización inválida', details: err.errors })
    }
    req.log.error(err)
    reply.status(err.message === 'Turno no encontrado' ? 404 : 500).send({ error: err.message })
  }
}

/**
 * Bloqueo manual de agenda (Admin)
 */
export const blockTime = async (req, reply) => {
  try {
    const { business_id } = req.user
    const data = blockTimeSchema.parse(req.body)

    const result = await AppointmentService.blockTime(business_id, {
      startAt: data.start_at,
      endAt: data.end_at,
      isEvent: data.isEvent,
      notes: data.notes,
      user: req.user
    })

    reply.send(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Bloqueo inválido', details: err.errors })
    }
    req.log.error(err)
    reply.status(500).send({ error: err.message })
  }
}

/**
 * Creación interna de turno (vía Panel)
 */
export const createInternalAppointment = async (req, reply) => {
  try {
    const { business_id } = req.user
    const data = createInternalSchema.parse(req.body)

    // Reutilizamos la lógica de book pero con clientId directo si ya existe
    // o simplemente creamos un wrapper en el service
    const full = await AppointmentService.book({
      businessId: business_id,
      serviceId: data.service_id,
      startAt: data.start_at,
      endAt: data.end_at,
      clientData: { client_id: data.client_id }, // El service debería manejar esto o extenderse
      notes: data.notes
    })

    reply.status(201).send(full)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Datos inválidos', details: err.errors })
    }
    req.log.error(err)
    reply.status(500).send({ error: err.message })
  }
}