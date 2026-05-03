import { pool } from '../config/db.js'

export const getServicesByBusiness = async (businessId) => {
  const result = await pool.query(
    'SELECT * FROM services WHERE business_id = $1 ORDER BY created_at ASC',
    [businessId]
  )
  return result.rows
}

export const getServiceById = async (id, businessId) => {
  const result = await pool.query(
    'SELECT * FROM services WHERE id = $1 AND business_id = $2',
    [id, businessId]
  )
  return result.rows[0]
}

export const createService = async ({ businessId, name, duration, price, description, service_icon, service_color }) => {
  const result = await pool.query(
    `INSERT INTO services (business_id, name, duration, price, description, service_icon, service_color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [businessId, name, duration, price, description, service_icon || 'scissors', service_color || 'bg-blue-600']
  )
  return result.rows[0]
}

export const updateService = async (id, businessId, { name, duration, price, description, service_icon, service_color, active }) => {
  const result = await pool.query(
    `UPDATE services
     SET name = COALESCE($1, name),
         duration = COALESCE($2, duration),
         price = COALESCE($3, price),
         description = COALESCE($4, description),
         service_icon = COALESCE($5, service_icon),
         service_color = COALESCE($6, service_color),
         active = COALESCE($7, active)
     WHERE id = $8 AND business_id = $9
     RETURNING *`,
    [name, duration, price, description, service_icon, service_color, active, id, businessId]
  )
  return result.rows[0]
}

export const deleteService = async (id, businessId) => {
  const result = await pool.query(
    'DELETE FROM services WHERE id = $1 AND business_id = $2 RETURNING id',
    [id, businessId]
  )
  return result.rows[0]
}