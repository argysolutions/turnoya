import { pool } from '../config/db.js'

export const getAvailabilityByBusiness = async (businessId) => {
  const result = await pool.query(
    'SELECT * FROM availability WHERE business_id = $1 ORDER BY day_of_week ASC',
    [businessId]
  )
  return result.rows
}

export const upsertAvailability = async (businessId, dayOfWeek, startTime, endTime) => {
  const result = await pool.query(
    `INSERT INTO availability (business_id, day_of_week, start_time, end_time)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (business_id, day_of_week)
     DO UPDATE SET start_time = $3, end_time = $4
     RETURNING *`,
    [businessId, dayOfWeek, startTime, endTime]
  )
  return result.rows[0]
}

export const deleteAvailability = async (businessId, dayOfWeek) => {
  const result = await pool.query(
    'DELETE FROM availability WHERE business_id = $1 AND day_of_week = $2 RETURNING id',
    [businessId, dayOfWeek]
  )
  return result.rows[0]
}