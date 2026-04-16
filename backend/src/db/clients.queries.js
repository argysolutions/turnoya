import { pool } from '../config/db.js'

/**
 * Obtiene el listado de clientes que han asistido al negocio.
 * Incluye estadísticas de visitas y última asistencia.
 */
export const getClientsByBusiness = async (businessId) => {
  const result = await pool.query(
    `SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.internal_notes,
        CAST(COUNT(a.id) AS INTEGER) as total_visits,
        MAX(a.date) as last_visit
     FROM clients c
     JOIN appointments a ON c.id = a.client_id
     WHERE a.business_id = $1
     GROUP BY c.id
     ORDER BY last_visit DESC`,
    [businessId]
  )
  return result.rows
}

/**
 * Actualiza las notas internas de un cliente.
 */
export const updateClientNotes = async (clientId, notes) => {
  const result = await pool.query(
    `UPDATE clients 
     SET internal_notes = $1 
     WHERE id = $2 
     RETURNING *`,
    [notes, clientId]
  )
  return result.rows[0]
}
