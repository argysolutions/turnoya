import { pool } from '../config/db.js'

/**
 * Crea un nuevo turno en la base de datos.
 */
export const createAppointment = async ({ businessId, serviceId, clientId, startAt, endAt, notes }) => {
  const result = await pool.query(
    `INSERT INTO appointments (business_id, service_id, client_id, start_at, end_at, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
     RETURNING *`,
    [businessId, serviceId, clientId, startAt, endAt, notes]
  )
  return result.rows[0]
}

/**
 * Busca o crea un cliente en la tabla 'clientes' (plural).
 */
export const findOrCreateClient = async ({ businessId, name, phone, email }) => {
  const existing = await pool.query(
    `SELECT * FROM clientes WHERE telefono = $1 AND business_id = $2`,
    [phone, businessId]
  )
  if (existing.rows[0]) return existing.rows[0]

  const result = await pool.query(
    `INSERT INTO clientes (business_id, nombre, telefono, email) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [businessId, name, phone, email]
  )
  return result.rows[0]
}

/**
 * Verifica si existe un solapamiento de horarios para un negocio específico.
 * Retorna true si hay un solapamiento, false si está libre.
 */
export const checkOverlap = async (businessId, startAt, endAt, excludeId = null) => {
  let query = `
    SELECT id FROM appointments 
    WHERE business_id = $1 
      AND status NOT IN ('cancelled', 'liberate')
      AND (
        (start_at < $3 AND end_at > $2)
      )
  `
  const params = [businessId, startAt, endAt]

  if (excludeId) {
    query += ` AND id != $4`
    params.push(excludeId)
  }

  const result = await pool.query(query, params)
  return result.rows.length > 0
}

export const getAppointmentById = async (id, businessId) => {
  const result = await pool.query(
    `SELECT a.*, 
            b.name as business_name, b.address as business_address, b.phone as business_phone,
            s.name as service_name, s.duration, s.price, s.service_icon, s.service_color,
            c.nombre as client_name, c.telefono as client_phone
     FROM appointments a
     JOIN businesses b ON a.business_id = b.id
     JOIN services s ON a.service_id = s.id
     JOIN clientes c ON a.client_id = c.id
     WHERE a.id = $1 AND a.business_id = $2`,
    [id, businessId]
  )
  return result.rows[0]
}

export const getAppointmentsByBusiness = async (businessId, date) => {
  let query = `SELECT a.*,
                      s.name as service_name, s.duration, s.price, s.service_icon, s.service_color,
                      c.nombre as client_name, c.telefono as client_phone,
                      (SELECT CAST(COUNT(*) AS INTEGER) FROM appointments a2 WHERE a2.client_id = a.client_id AND a2.business_id = a.business_id AND a2.client_id IS NOT NULL) as client_history_count
               FROM appointments a
               LEFT JOIN services s ON a.service_id = s.id
               LEFT JOIN clientes c ON a.client_id = c.id
               WHERE a.business_id = $1`
  const params = [businessId]

  if (date) {
    query += ` AND a.start_at::date = $2`
    params.push(date)
  }

  const result = await pool.query(query, params)
  return result.rows
}

export const getPendingBlocks = async (businessId) => {
  const result = await pool.query(
    `SELECT a.*, s.name as service_name, s.service_icon, s.service_color, c.nombre as client_name
     FROM appointments a
     LEFT JOIN services s ON a.service_id = s.id
     LEFT JOIN clientes c ON a.client_id = c.id
     WHERE a.business_id = $1 AND a.status = 'pending_block'
     ORDER BY a.start_at ASC`,
    [businessId]
  )
  return result.rows
}

/**
 * Returns distinct dates that have at least one blocked appointment in a given month.
 */
export const getBlockedDates = async (businessId, year, month) => {
  const result = await pool.query(
    `SELECT start_at, end_at
     FROM appointments
     WHERE business_id = $1
       AND status = 'blocked'
       AND EXTRACT(YEAR FROM start_at) = $2
       AND EXTRACT(MONTH FROM start_at) = $3
     ORDER BY start_at ASC`,
    [businessId, year, month]
  )
  return result.rows
}

export const updateAppointmentStatus = async (id, businessId, status, paymentInfo = null, staffContext = null) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    const res = await client.query(
      `UPDATE appointments SET status = $1
       WHERE id = $2 AND business_id = $3
       RETURNING *`,
      [status, id, businessId]
    )

    if (res.rows[0] && status === 'completed' && paymentInfo) {
      const amount = parseFloat(paymentInfo.amount) || 0
      const method = paymentInfo.method || 'Efectivo'
      const professionalName = paymentInfo.professional_name || staffContext?.professional_name || null
      const staffId = staffContext?.staff_id || null

      // Traemos client_name y phone
      const clientRes = await client.query(
        `SELECT c.nombre, c.telefono
         FROM appointments a
         JOIN clientes c ON a.client_id = c.id
         WHERE a.id = $1`,
        [id]
      )
      const clientData = clientRes.rows[0] || {}

      await client.query(
        `INSERT INTO sales (business_id, appointment_id, client_name, phone, amount, payment_method, professional_name, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [businessId, id, clientData.nombre || null, clientData.telefono || null, amount, method, professionalName, staffId]
      )
    }

    await client.query('COMMIT')
    return res.rows[0]
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export const deleteAppointment = async (id, businessId) => {
  const result = await pool.query(
    `DELETE FROM appointments WHERE id = $1 AND business_id = $2 RETURNING *`,
    [id, businessId]
  )
  return result.rows[0]
}

export const setAppointmentLiberationTime = async (id, businessId, liberatesAt) => {
  const result = await pool.query(
    `UPDATE appointments SET liberates_at = $1 WHERE id = $2 AND business_id = $3 RETURNING *`,
    [liberatesAt, id, businessId]
  )
  return result.rows[0]
}

/**
 * Busca turnos que ocurren en las próximas 24 horas y aún no han enviado recordatorio.
 */
export const getAppointmentsForReminders = async () => {
  const result = await pool.query(
    `SELECT a.*, c.nombre as client_name, c.telefono as client_phone, s.name as service_name
     FROM appointments a
     JOIN clientes c ON a.client_id = c.id
     JOIN services s ON a.service_id = s.id
     WHERE a.reminder_sent = FALSE
       AND a.status = 'confirmed'
       AND a.start_at > NOW()
       AND a.start_at <= NOW() + INTERVAL '24 hours'`
  )
  return result.rows
}

/**
 * Marca un turno como recordatorio enviado.
 */
export const markReminderSent = async (id) => {
  await pool.query(
    `UPDATE appointments SET reminder_sent = TRUE WHERE id = $1`,
    [id]
  )
}