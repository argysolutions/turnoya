import { pool } from '../config/db.js'

/**
 * Busca clientes que tengan turnos en el negocio actual.
 * Filtra por nombre, teléfono o email.
 * Incluye las notas internas privadas especificas de ese negocio.
 */
export const searchClientsByBusiness = async (businessId, query) => {
  const searchTerm = `%${query}%`
  const result = await pool.query(
    `SELECT DISTINCT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.created_at,
        n.internal_notes
     FROM clients c
     JOIN appointments a ON c.id = a.client_id
     LEFT JOIN client_business_notes n ON c.id = n.client_id AND n.business_id = a.business_id
     WHERE a.business_id = $1 
       AND (c.name ILIKE $2 OR c.phone ILIKE $2 OR c.email ILIKE $2)
     ORDER BY c.name ASC`,
    [businessId, searchTerm]
  )
  return result.rows
}

/**
 * Actualiza o inserta notas internas privadas para un cliente en un negocio específico.
 */
export const updateClientNotes = async (clientId, businessId, notes) => {
  const result = await pool.query(
    `INSERT INTO client_business_notes (client_id, business_id, internal_notes)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_id, business_id) 
     DO UPDATE SET internal_notes = EXCLUDED.internal_notes
     RETURNING *`,
    [clientId, businessId, notes]
  )
  return result.rows[0]
}
