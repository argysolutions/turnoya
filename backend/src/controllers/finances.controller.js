import { getFinancesSummary } from '../db/finances.queries.js'
import { getExpensesByBusiness } from '../db/expenses.queries.js'

export const financesSummary = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { startDate, endDate, date } = req.query

    const start = startDate || date || null
    const end   = endDate   || date || null

    const summary = await getFinancesSummary(businessId, start, end)
    reply.send(summary)
  } catch (error) {
    console.error('Error obteniendo resumen financiero:', error)
    reply.status(500).send({ error: 'Error al obtener el resumen financiero' })
  }
}

export const listExpenses = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { startDate, endDate, date } = req.query

    const start = startDate || date || null
    const end   = endDate   || date || null

    const expenses = await getExpensesByBusiness(businessId, start, end)
    reply.send({ expenses })
  } catch (error) {
    console.error('Error obteniendo gastos:', error)
    reply.status(500).send({ error: 'Error al obtener los gastos' })
  }
}
