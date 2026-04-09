import { pool } from '../config/db.js'

export const createAppointment = async ({ businessId, serviceId, clientId, date, startTime, endTime, notes }) => {
  const result = await pool.query(
    `INSERT INTO appointments (business_id, service_id, client_id, date, start_time, end_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [businessId, serviceId, clientId, date, startTime, endTime, notes]
  )
  return result.rows[0]
}

export const findOrCreateClient = async ({ name, phone, email }) => {
  const existing = await pool.query(
    `SELECT * FROM clients WHERE phone = $1`,
    [phone]
  )
  if (existing.rows[0]) return existing.rows[0]

  const result = await pool.query(
    `INSERT INTO clients (name, phone, email) VALUES ($1, $2, $3) RETURNING *`,
    [name, phone, email]
  )
  return result.rows[0]
}

export const getAppointmentById = async (id) => {
  const result = await pool.query(
    `SELECT a.*, 
            b.name as business_name, b.address as business_address, b.phone as business_phone,
            s.name as service_name, s.duration, s.price,
            c.name as client_name, c.phone as client_phone
     FROM appointments a
     JOIN businesses b ON a.business_id = b.id
     JOIN services s ON a.service_id = s.id
     JOIN clients c ON a.client_id = c.id
     WHERE a.id = $1`,
    [id]
  )
  return result.rows[0]
}

export const getAppointmentsByBusiness = async (businessId, date) => {
  let query = `SELECT a.*,
                      s.name as service_name, s.duration, s.price,
                      c.name as client_name, c.phone as client_phone
               FROM appointments a
               JOIN services s ON a.service_id = s.id
               JOIN clients c ON a.client_id = c.id
               WHERE a.business_id = $1`
  const params = [businessId]

  if (date) {
    query += ` AND a.date = $2`
    params.push(date)
  }

  query += ` ORDER BY a.date ASC, a.start_time ASC`

  const result = await pool.query(query, params)
  return result.rows
}

export const updateAppointmentStatus = async (id, businessId, status) => {
  const result = await pool.query(
    `UPDATE appointments SET status = $1
     WHERE id = $2 AND business_id = $3
     RETURNING *`,
    [status, id, businessId]
  )
  return result.rows[0]
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