import { pool } from '../config/db.js'

/**
 * Obtiene las ventas de un negocio, opcionalmente filtradas por fecha.
 * También retorna el total del día filtrado (o de hoy si no se pasa fecha).
 */
export const getSalesByBusiness = async (businessId, date) => {
  const params = [businessId]
  let whereDate = ''

  if (date) {
    whereDate = `AND s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' >= ($2::date)::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'
                 AND s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' <  ($2::date + interval '1 day')::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'`
    params.push(date)
  }

  const { rows: sales } = await pool.query(
    `SELECT s.*
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
    totalWhere = `AND s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' >= ($2::date)::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'
                  AND s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires' <  ($2::date + interval '1 day')::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires'`
    totalParams.push(date)
  }

  const { rows: totals } = await pool.query(
    `SELECT COALESCE(SUM(s.amount), 0) AS total,
            COUNT(*)::int                AS count
     FROM sales s
     WHERE s.business_id = $1
       ${totalWhere}`,
    totalParams
  )

  return { sales, total: parseFloat(totals[0]?.total || 0), count: totals[0]?.count || 0 }
}
