import { pool } from '../config/db.js'

export const getBusinessBySlug = async (slug) => {
  const result = await pool.query(
    `SELECT id, name, slug, phone, address, description FROM businesses WHERE slug = $1`,
    [slug]
  )
  return result.rows[0]
}

export const getActiveServicesByBusiness = async (businessId) => {
  const result = await pool.query(
    `SELECT id, name, duration, price, description FROM services
     WHERE business_id = $1 AND active = true ORDER BY name ASC`,
    [businessId]
  )
  return result.rows
}

export const getAvailabilityByDay = async (businessId, dayOfWeek) => {
  const result = await pool.query(
    `SELECT start_time, end_time FROM availability
     WHERE business_id = $1 AND day_of_week = $2`,
    [businessId, dayOfWeek]
  )
  return result.rows[0]
}

export const getOccupiedSlots = async (businessId, date) => {
  const result = await pool.query(
    `SELECT start_time, end_time FROM appointments
     WHERE business_id = $1 AND date = $2 AND status != 'cancelled'`,
    [businessId, date]
  )
  return result.rows
}