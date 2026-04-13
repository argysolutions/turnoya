import { pool } from '../config/db.js'

/**
 * Obtiene las ventas de un negocio, opcionalmente filtradas por fecha.
 * También retorna el total del día filtrado (o de hoy si no se pasa fecha).
 */
export const getSalesByBusiness = async (businessId, date) => {
  const params = [businessId]
  const tz = `'America/Argentina/Buenos_Aires'`
  if (date) {
    whereDate = `AND (s.created_at AT TIME ZONE ${tz})::date = $2::date`
    params.push(date)
  }

  const { rows: sales } = await pool.query(
    `SELECT s.id, s.business_id, s.appointment_id, s.client_name, s.phone,
            s.amount::NUMERIC(10,2) AS amount, s.payment_method,
            s.professional_name, s.created_at
     FROM sales s
     WHERE s.business_id = $1
       ${whereDate}
     ORDER BY s.created_at DESC`,
    params
  )

  // Total del rango filtrado
  const totalParams = [businessId]
  let totalWhere = ''
  if (date) {
    totalWhere = `AND (s.created_at AT TIME ZONE ${tz})::date = $2::date`
    totalParams.push(date)
  }

  const { rows: totals } = await pool.query(
    `SELECT COALESCE(SUM(COALESCE(s.amount, 0)), 0) AS total,
            COUNT(*)::int                AS count
     FROM sales s
     WHERE s.business_id = $1
       ${totalWhere}`,
    totalParams
  )

  return { sales, total: parseFloat(totals[0]?.total || 0), count: totals[0]?.count || 0 }
}
