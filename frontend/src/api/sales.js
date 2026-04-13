import client from './client'

export const getSales = (date) =>
  client.get(`/sales${date ? `?date=${date}` : ''}`)

export const getExpenses = ({ date, startDate, endDate } = {}) => {
  const params = new URLSearchParams()
  if (startDate && endDate) {
    params.set('startDate', startDate)
    params.set('endDate', endDate)
  } else if (date) {
    params.set('date', date)
  }
  const qs = params.toString()
  return client.get(`/expenses${qs ? `?${qs}` : ''}`)
}

export const postExpense = (data) =>
  client.post('/expenses', data)

export const deleteExpense = (id) =>
  client.delete(`/expenses/${id}`)

/**
 * Obtiene el resumen financiero.
 * @param {string} date - Fecha YYYY-MM-DD (devuelve datos de ese día)
 * @param {string} [startDate] - Inicio de rango
 * @param {string} [endDate] - Fin de rango
 */
export const getFinancesSummary = ({ date, startDate, endDate } = {}) => {
  const params = new URLSearchParams()
  if (startDate && endDate) {
    params.set('startDate', startDate)
    params.set('endDate', endDate)
  } else if (date) {
    params.set('date', date)
  }
  const qs = params.toString()
  return client.get(`/finances/summary${qs ? `?${qs}` : ''}`)
}

// ─── Sesión de Caja ───────────────────────────────────────────────────────────

/**
 * Obtiene la sesión de caja activa del negocio.
 * Si se pasa una fecha, devuelve la sesión cerrada de ese día (si existe).
 * Responde: { session: SessionObject | null }
 */
export const getCashSession = (date) => {
  const qs = date ? `?date=${date}` : ''
  return client.get(`/finances/session${qs}`)
}

/**
 * Abre una nueva sesión de caja.
 * @param {number} initialAmount - Fondo inicial en caja
 * Responde: { session: SessionObject }
 */
export const openCashSession = (initialAmount) =>
  client.post('/finances/session/open', { initial_amount: initialAmount })

/**
 * Cierra la sesión de caja activa.
 * El servidor calcula la diferencia: counted_amount - expected_cash.
 * @param {number} countedAmount - Efectivo contado físicamente
 * Responde: { session, difference, expected_cash }
 */
export const closeCashSession = (countedAmount) =>
  client.post('/finances/session/close', { counted_amount: countedAmount })
