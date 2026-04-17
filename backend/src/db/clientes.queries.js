import { pool } from '../config/db.js'

/**
 * Obtiene todos los clientes de un negocio específico.
 */
export const getAllClientesByBusiness = async (businessId) => {
  const result = await pool.query(
    'SELECT * FROM clientes WHERE business_id = $1 ORDER BY nombre ASC',
    [businessId]
  )
  return result.rows
}

/**
 * Crea un nuevo cliente vinculado a un negocio.
 */
export const createCliente = async (businessId, { nombre, telefono, email, notas_internas }) => {
  const result = await pool.query(
    `INSERT INTO clientes (business_id, nombre, telefono, email, notas_internas)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [businessId, nombre, telefono, email, notas_internas]
  )
  return result.rows[0]
}

/**
 * Actualiza los datos de un cliente existente.
 */
export const updateCliente = async (id, businessId, { nombre, telefono, email, notas_internas }) => {
  const result = await pool.query(
    `UPDATE clientes 
     SET nombre = $1, telefono = $2, email = $3, notas_internas = $4
     WHERE id = $5 AND business_id = $6
     RETURNING *`,
    [nombre, telefono, email, notas_internas, id, businessId]
  )
  return result.rows[0]
}

/**
 * Elimina un cliente de forma definitiva.
 */
export const deleteCliente = async (id, businessId) => {
  const result = await pool.query(
    'DELETE FROM clientes WHERE id = $1 AND business_id = $2 RETURNING *',
    [id, businessId]
  )
  return result.rows[0]
}
