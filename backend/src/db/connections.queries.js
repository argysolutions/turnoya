import { pool } from '../config/db.js'

/**
 * Persiste o actualiza los tokens de una integración (Google, etc)
 */
export const createOrUpdateConnection = async (businessId, provider, tokens) => {
  const { access_token, refresh_token, expires_at } = tokens
  
  const result = await pool.query(
    `INSERT INTO business_connections (business_id, provider, access_token, refresh_token, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (business_id, provider) DO UPDATE SET
       access_token  = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, business_connections.refresh_token),
       expires_at    = EXCLUDED.expires_at,
       updated_at    = NOW()
     RETURNING *`,
    [businessId, provider, access_token, refresh_token, expires_at]
  )
  
  return result.rows[0]
}

/**
 * Obtiene la conexión activa de un negocio para un proveedor
 */
export const findConnection = async (businessId, provider = 'google') => {
  const result = await pool.query(
    'SELECT * FROM business_connections WHERE business_id = $1 AND provider = $2',
    [businessId, provider]
  )
  return result.rows[0]
}

/**
 * Elimina una conexión
 */
export const removeConnection = async (businessId, provider = 'google') => {
  await pool.query(
    'DELETE FROM business_connections WHERE business_id = $1 AND provider = $2',
    [businessId, provider]
  )
}
