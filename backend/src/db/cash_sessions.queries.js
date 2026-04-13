import { pool } from '../config/db.js'

const TZ = `'America/Argentina/Buenos_Aires'`

// ─────────────────────────────────────────────────────────────────────────────
// getSessionStats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula las estadísticas de efectivo de una sesión dado su ID.
 *
 * La ventana de tiempo es:
 *   - Inicio : opened_at (siempre)
 *   - Fin    : closed_at  si ya cerró  /  NOW()  si todavía está abierta
 *
 * Retorna:
 *   { cash_sales, cash_expenses, expected_cash }
 *
 *   cash_sales    = SUM(sales.amount)  donde payment_method='Efectivo'
 *                   en la ventana [opened_at, fin]
 *   cash_expenses = SUM(expenses.amount) en la ventana [opened_at, fin]
 *   expected_cash = initial_amount + cash_sales - cash_expenses
 *
 * @param {object} session  - Fila de cash_sessions (debe tener id, business_id,
 *                            opened_at, closed_at, initial_amount)
 */
export const getSessionStats = async (session) => {
  const { id, business_id, opened_at, closed_at, initial_amount } = session

  // Límite superior: si hay closed_at usamos ese timestamp; si no, NOW()
  const upperBound = closed_at ? `$3::timestamptz` : `NOW()`
  const params     = closed_at
    ? [business_id, opened_at, closed_at]
    : [business_id, opened_at]

  const { rows } = await pool.query(
    `SELECT
       COALESCE(
         (SELECT SUM(COALESCE(sl.amount, 0))
          FROM sales sl
          WHERE sl.business_id = $1
            AND sl.payment_method = 'Efectivo'
            AND sl.created_at >= $2::timestamptz
            AND sl.created_at <= ${upperBound}),
         0
       )::NUMERIC(12,2) AS cash_sales,

       COALESCE(
         (SELECT SUM(COALESCE(e.amount, 0))
          FROM expenses e
          WHERE e.business_id = $1
            AND e.created_at >= $2::timestamptz
            AND e.created_at <= ${upperBound}),
         0
       )::NUMERIC(12,2) AS cash_expenses`,
    params
  )

  const cashSales    = parseFloat(rows[0]?.cash_sales ?? 0)
  const cashExpenses = parseFloat(rows[0]?.cash_expenses ?? 0)
  const initialAmt   = parseFloat(initial_amount ?? 0)
  const expectedCash = initialAmt + cashSales - cashExpenses

  return {
    cash_sales:    parseFloat(cashSales.toFixed(2)),
    cash_expenses: parseFloat(cashExpenses.toFixed(2)),
    expected_cash: parseFloat(expectedCash.toFixed(2)),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getOpenSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la sesión abierta del negocio enriquecida con stats en tiempo real.
 * Usa getSessionStats internamente (ventana: opened_at → NOW()).
 *
 * @returns session con campos adicionales: cash_sales, cash_expenses, expected_cash
 */
export const getOpenSession = async (businessId) => {
  const { rows } = await pool.query(
    `SELECT * FROM cash_sessions
     WHERE business_id = $1 AND status = 'open'
     ORDER BY opened_at DESC
     LIMIT 1`,
    [businessId]
  )

  const session = rows[0] || null
  if (!session) return null

  const stats = await getSessionStats(session)
  return { ...session, ...stats }
}

// ─────────────────────────────────────────────────────────────────────────────
// createSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abre una nueva sesión de caja.
 * Lanza error si ya existe una sesión abierta para el negocio.
 */
export const createSession = async (businessId, initialAmount) => {
  // Bloquear doble apertura (también hay constraint en la lógica del controller)
  const existing = await getOpenSession(businessId)
  if (existing) {
    throw new Error('Ya existe una sesión de caja abierta.')
  }

  const { rows } = await pool.query(
    `INSERT INTO cash_sessions (business_id, initial_amount, opened_at, status)
     VALUES ($1, $2, NOW(), 'open')
     RETURNING *`,
    [businessId, initialAmount]
  )
  return rows[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// closeSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cierra la sesión activa del negocio.
 *
 * Flujo:
 *   1. Busca la sesión abierta → error si no existe.
 *   2. Llama a getSessionStats (ventana: opened_at → NOW()) para obtener
 *      cash_sales, cash_expenses y expected_cash actualizados al instante exacto.
 *   3. Calcula:  difference = counted_amount - expected_cash  (EN EL SERVIDOR).
 *   4. Persiste closed_at = NOW(), counted_amount, difference, status = 'closed'.
 *
 * @param {number} businessId
 * @param {number} countedAmount  - Dinero contado físicamente
 * @returns {{ session, difference, expected_cash, cash_sales, cash_expenses }}
 */
export const closeSession = async (businessId, countedAmount) => {
  const open = await getOpenSession(businessId)
  if (!open) {
    throw new Error('No hay ninguna sesión de caja abierta.')
  }

  // Stats calculadas justo antes del cierre (ventana: opened_at → NOW())
  const stats        = await getSessionStats(open)
  const expectedCash = stats.expected_cash
  const difference   = parseFloat(countedAmount) - expectedCash

  const { rows } = await pool.query(
    `UPDATE cash_sessions
     SET closed_at      = NOW(),
         counted_amount = $1,
         difference     = $2,
         status         = 'closed'
     WHERE id = $3 AND business_id = $4
     RETURNING *`,
    [countedAmount, parseFloat(difference.toFixed(2)), open.id, businessId]
  )

  return {
    session:       rows[0],
    difference:    parseFloat(difference.toFixed(2)),
    expected_cash: expectedCash,
    cash_sales:    stats.cash_sales,
    cash_expenses: stats.cash_expenses,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getLastClosedSessionForDate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la última sesión cerrada del negocio para un día dado (en hora AR).
 * Enriquecida con getSessionStats (ventana: opened_at → closed_at).
 *
 * @param {number} businessId
 * @param {string} date   - Formato YYYY-MM-DD
 */
export const getLastClosedSessionForDate = async (businessId, date) => {
  const { rows } = await pool.query(
    `SELECT * FROM cash_sessions
     WHERE business_id = $1
       AND status = 'closed'
       AND (opened_at AT TIME ZONE ${TZ})::date = $2::date
     ORDER BY closed_at DESC
     LIMIT 1`,
    [businessId, date]
  )

  const session = rows[0] || null
  if (!session) return null

  const stats = await getSessionStats(session) // ventana: opened_at → closed_at
  return { ...session, ...stats }
}
