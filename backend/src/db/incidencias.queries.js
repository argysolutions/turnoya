import { pool } from '../config/db.js'

/**
 * Elimina un reporte de incidencia por id, verificando siempre el business_id para aislamiento SaaS.
 */
export const deleteIncidenciaById = async (id, businessId) => {
  const { rows } = await pool.query(
    'DELETE FROM incidencias WHERE id = $1 AND business_id = $2 RETURNING *',
    [id, businessId]
  )
  return rows[0]
}

/**
 * Crea un reporte de incidencia.
 */
export const createIncidencia = async (businessId, data) => {
  const { sintoma, causa_raiz, solucion, accion_preventiva } = data
  const { rows } = await pool.query(
    `INSERT INTO incidencias (business_id, sintoma, causa_raiz, solucion, accion_preventiva)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [businessId, sintoma, causa_raiz, solucion, accion_preventiva]
  )
  return rows[0]
}

/**
 * Obtiene todos los reportes de un negocio, ordenados por fecha descendente.
 */
export const getAllIncidenciasByBusiness = async (businessId) => {
  const { rows } = await pool.query(
    'SELECT * FROM incidencias WHERE business_id = $1 ORDER BY created_at DESC',
    [businessId]
  )
  return rows
}
