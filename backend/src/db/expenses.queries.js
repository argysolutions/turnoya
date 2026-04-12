import { pool } from '../config/db.js'

/**
 * Crea un gasto para un negocio.
 */
export const createExpense = async (businessId, description, amount, category, created_at) => {
  const { rows } = await pool.query(
    `INSERT INTO expenses (business_id, description, amount, category, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [businessId, description, amount, category, created_at || new Date()]
  )
  return rows[0]
}

/**
 * Lista gastos de un negocio con filtro de rango de fechas.
 */
export const getExpensesByBusiness = async (businessId, startDate, endDate) => {
  const params = [businessId]
  let whereDate = ''

  if (startDate && endDate) {
    whereDate = `
      AND e.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' >= ($2::date)::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'
      AND e.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' <  ($3::date + interval '1 day')::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'`
    params.push(startDate, endDate)
  }

  const { rows } = await pool.query(
    `SELECT * FROM expenses
     WHERE business_id = $1 ${whereDate}
     ORDER BY created_at DESC`,
    params
  )
  return rows
}

/**
 * Elimina un gasto por id, verificando que pertenece al negocio.
 */
export const deleteExpenseById = async (id, businessId) => {
  const { rows } = await pool.query(
    `DELETE FROM expenses WHERE id = $1 AND business_id = $2 RETURNING *`,
    [id, businessId]
  )
  return rows[0]
}
