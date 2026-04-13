import { verifyToken } from '../middlewares/auth.middleware.js'
import { addExpense, removeExpense } from '../controllers/expenses.controller.js'
import {
  financesSummary,
  listExpenses,
  getSession,
  openSession,
  closeSession,
} from '../controllers/finances.controller.js'

export const financesRoutes = async (app) => {
  // ── Gastos ────────────────────────────────────────────────────────────────

  // Listar gastos del día/rango: ?date=YYYY-MM-DD o ?startDate=...&endDate=...
  app.get('/expenses', { preHandler: verifyToken }, listExpenses)

  // Registrar un gasto
  app.post('/expenses', { preHandler: verifyToken }, addExpense)

  // Eliminar un gasto (borrado por error)
  app.delete('/expenses/:id', { preHandler: verifyToken }, removeExpense)

  // ── Resumen financiero ────────────────────────────────────────────────────

  // Resumen financiero: ingresos, gastos, neto real, desglose por método
  // Query params: ?date=YYYY-MM-DD  o  ?startDate=...&endDate=...
  app.get('/finances/summary', { preHandler: verifyToken }, financesSummary)

  // ── Sesión de Caja ────────────────────────────────────────────────────────

  // Obtener sesión abierta actual (o sesión cerrada de un día: ?date=YYYY-MM-DD)
  app.get('/finances/session', { preHandler: verifyToken }, getSession)

  // Abrir una nueva sesión de caja
  // Body: { initial_amount: number }
  app.post('/finances/session/open', { preHandler: verifyToken }, openSession)

  // Cerrar la sesión de caja activa (calcula difference en servidor)
  // Body: { counted_amount: number }
  app.post('/finances/session/close', { preHandler: verifyToken }, closeSession)
}
