import { pool } from '../config/db.js'

export const findBusinessByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM businesses WHERE email = $1',
    [email]
  )
  return result.rows[0]
}

export const findBusinessBySlug = async (slug) => {
  const result = await pool.query(
    'SELECT * FROM businesses WHERE slug = $1',
    [slug]
  )
  return result.rows[0]
}

export const createBusiness = async ({ name, slug, email, password, phone, address, description }) => {
  const result = await pool.query(
    `INSERT INTO businesses (name, slug, email, password, phone, address, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, slug, email, phone, address, description, created_at`,
    [name, slug, email, password, phone, address, description]
  )
  return result.rows[0]
}

export const findBusinessById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM businesses WHERE id = $1',
    [id]
  )
  return result.rows[0]
}

export const updateGoogleRefreshToken = async (id, token) => {
  const result = await pool.query(
    'UPDATE businesses SET google_refresh_token = $1 WHERE id = $2 RETURNING *',
    [token, id]
  )
  return result.rows[0]
}

export const updateBusinessSettings = async (id, settings) => {
  const { cancellation_policy, anticipation_margin, buffer_time, whatsapp_enabled } = settings
  const result = await pool.query(
    `UPDATE businesses 
     SET cancellation_policy = $1, anticipation_margin = $2, buffer_time = $3, whatsapp_enabled = $4
     WHERE id = $5
     RETURNING *`,
    [cancellation_policy, anticipation_margin, buffer_time, whatsapp_enabled, id]
  )
  return result.rows[0]
}