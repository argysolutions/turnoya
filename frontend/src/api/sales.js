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
