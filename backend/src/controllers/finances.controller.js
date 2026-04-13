import { getFinancesSummary } from '../db/finances.queries.js'
import { getExpensesByBusiness } from '../db/expenses.queries.js'
import {
  getOpenSession,
  createSession,
  closeSession as closeSessionDB,
  getLastClosedSessionForDate,
} from '../db/cash_sessions.queries.js'

// ─── Resumen financiero ───────────────────────────────────────────────────────

export const financesSummary = async (req, reply) => {
  try {
    const businessId = req.business.id
    let start = startDate || date || null
    let end   = endDate   || date || null

    // Si es "Hoy" (no hay rango ni fecha específica, o es la fecha de hoy), 
    // priorizamos el opened_at de la sesión activa para evitar desfasajes de zona horaria.
    const todayStr = new Date().toISOString().split('T')[0]
    const isRequestingToday = (!startDate && !endDate && !date) || (date === todayStr)

    if (isRequestingToday) {
      const openSession = await getOpenSession(businessId)
      if (openSession) {
        start = openSession.opened_at
        end   = null // El query usará created_at >= start
      }
    }

    const summary = await getFinancesSummary(businessId, start, end)
    reply.send(summary)
  } catch (error) {
    console.error('Error obteniendo resumen financiero:', error)
    reply.status(500).send({ error: 'Error al obtener el resumen financiero' })
  }
}

// ─── Gastos ───────────────────────────────────────────────────────────────────

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

// ─── Sesión de Caja ───────────────────────────────────────────────────────────

/**
 * GET /api/finances/session
 * Devuelve la sesión abierta actual del negocio (si existe).
 * También acepta ?date=YYYY-MM-DD para obtener la última sesión cerrada de ese día.
 */
export const getSession = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { date } = req.query

    // Primero intentamos la sesión abierta (tiene prioridad)
    const openSession = await getOpenSession(businessId)
    if (openSession) {
      return reply.send({ session: normalizeSession(openSession) })
    }

    // Si piden una fecha específica, buscamos la sesión cerrada de ese día
    if (date) {
      const closed = await getLastClosedSessionForDate(businessId, date)
      return reply.send({ session: closed ? normalizeSession(closed) : null })
    }

    reply.send({ session: null })
  } catch (error) {
    console.error('Error obteniendo sesión de caja:', error)
    reply.status(500).send({ error: 'Error al obtener la sesión de caja' })
  }
}

/**
 * POST /api/finances/session/open
 * Body: { initial_amount: number }
 * Crea una nueva sesión de caja abierta.
 */
export const openSession = async (req, reply) => {
  try {
    const businessId    = req.business.id
    const initialAmount = parseFloat(req.body?.initial_amount ?? 0)

    if (isNaN(initialAmount) || initialAmount < 0) {
      return reply.status(400).send({ error: 'El monto inicial debe ser un número >= 0' })
    }

    const session = await createSession(businessId, initialAmount)
    reply.status(201).send({ session: normalizeSession(session) })
  } catch (error) {
    if (error.message.includes('Ya existe una sesión')) {
      return reply.status(409).send({ error: error.message })
    }
    console.error('Error abriendo sesión de caja:', error)
    reply.status(500).send({ error: 'Error al abrir la sesión de caja' })
  }
}

/**
 * POST /api/finances/session/close
 * Body: { counted_amount: number }
 * Cierra la sesión actual y calcula la diferencia en el servidor.
 */
export const closeSession = async (req, reply) => {
  try {
    const businessId    = req.business.id
    const countedAmount = parseFloat(req.body?.counted_amount)

    if (isNaN(countedAmount) || countedAmount < 0) {
      return reply.status(400).send({ error: 'El monto contado debe ser un número >= 0' })
    }

    const result = await closeSessionDB(businessId, countedAmount)
    reply.send({
      session:       normalizeSession({ ...result.session, cash_sales: result.cash_sales, cash_expenses: result.cash_expenses }),
      difference:    result.difference,
      expected_cash: result.expected_cash,
    })
  } catch (error) {
    if (error.message.includes('No hay ninguna sesión')) {
      return reply.status(404).send({ error: error.message })
    }
    console.error('Error cerrando sesión de caja:', error)
    reply.status(500).send({ error: 'Error al cerrar la sesión de caja' })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza los campos numéricos de la sesión para que sean números JS, no strings.
 */
function normalizeSession(raw) {
  if (!raw) return null
  return {
    id:             raw.id,
    business_id:    raw.business_id,
    opened_at:      raw.opened_at,
    closed_at:      raw.closed_at ?? null,
    initial_amount: parseFloat(raw.initial_amount ?? 0),
    counted_amount: raw.counted_amount != null ? parseFloat(raw.counted_amount) : null,
    difference:     raw.difference     != null ? parseFloat(raw.difference)     : null,
    status:         raw.status,
    cash_sales:     parseFloat(raw.cash_sales    ?? 0),
    cash_expenses:  parseFloat(raw.cash_expenses ?? 0),
    expected_cash:  parseFloat(raw.expected_cash ?? (
                      parseFloat(raw.initial_amount ?? 0) +
                      parseFloat(raw.cash_sales    ?? 0) -
                      parseFloat(raw.cash_expenses ?? 0)
                    )),
  }
}
