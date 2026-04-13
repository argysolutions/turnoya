import { pool } from '../config/db.js'

/**
 * Devuelve el resumen financiero de un negocio para un rango de fechas.
 * Si no se pasan fechas, default = día actual (Buenos Aires).
 *
 * @returns {
 *   totalIncome:    number,    // suma de sales.amount en el rango
 *   totalExpenses:  number,    // suma de expenses.amount en el rango
 *   netBalance:     number,    // totalIncome - totalExpenses
 *   byMethod: { [method]: { total: number, count: number } },
 *   salesCount:     number,
 *   expensesCount:  number,
 * }
 */
export const getFinancesSummary = async (businessId, startDate, endDate) => {
  // Si no llegan fechas usamos el día de hoy en Buenos Aires
  const tz = `'America/Argentina/Buenos_Aires'`

  let salWhere = ''
  let expWhere = ''
  const salParams = [businessId]
  const expParams = [businessId]

  if (startDate && endDate) {
    const dateFilter = `
      AND (created_at AT TIME ZONE ${tz})::date >= $2::date
      AND (created_at AT TIME ZONE ${tz})::date <= $3::date`
    salWhere = dateFilter
    expWhere = dateFilter
    salParams.push(startDate, endDate)
    expParams.push(startDate, endDate)
  } else if (startDate) {
    // If we have a specific timestamp (like session opened_at)
    const sessionFilter = ` AND created_at >= $2::timestamptz`
    salWhere = sessionFilter
    expWhere = sessionFilter
    salParams.push(startDate)
    expParams.push(startDate)
  } else {
    // default: hoy en Argentina
    const todayFilter = ` AND (created_at AT TIME ZONE ${tz})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${tz})::date`
    salWhere = todayFilter
    expWhere = todayFilter
  }

  // Ingresos totales y por método de pago
  const { rows: salRows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0)   AS total_income,
       COUNT(*)::int               AS sales_count,
       payment_method
     FROM sales
     WHERE business_id = $1 ${salWhere}
     GROUP BY payment_method`,
    salParams
  )

  // Gastos totales
  const { rows: expRows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_expenses,
       COUNT(*)::int             AS expenses_count
     FROM expenses
     WHERE business_id = $1 ${expWhere}`,
    expParams
  )

  // Construir byMethod
  const byMethod = {}
  let totalIncome = 0
  let salesCount = 0
  for (const row of salRows) {
    const method = row.payment_method || 'Otro'
    const t = parseFloat(row.total_income)
    totalIncome += t
    salesCount += row.sales_count
    byMethod[method] = { total: t, count: row.sales_count }
  }

  const totalExpenses = parseFloat(expRows[0]?.total_expenses || 0)
  const expensesCount = expRows[0]?.expenses_count || 0

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    byMethod,
    salesCount,
    expensesCount,
  }
}
