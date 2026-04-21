import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
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

  // Listar gastos: empleados y dueños pueden leer
  app.get('/expenses', { preHandler: verifyToken }, listExpenses)

  // Registrar gasto: solo el dueño
  app.post('/expenses', { preHandler: [verifyToken, requireRole('owner')] }, addExpense)

  // Eliminar gasto: solo el dueño
  app.delete('/expenses/:id', { preHandler: [verifyToken, requireRole('owner')] }, removeExpense)

  // ── Resumen financiero ────────────────────────────────────────────────────

  // Empleados y dueños pueden ver el resumen (el frontend filtra por rol)
  app.get('/finances/summary', { preHandler: [verifyToken, requireRole('owner')] }, financesSummary)

  // ── Sesión de Caja ────────────────────────────────────────────────────────

  // Consultar sesión: ambos roles
  app.get('/finances/session', { preHandler: verifyToken }, getSession)

  // Abrir/cerrar caja: solo el dueño
  app.post('/finances/session/open', { preHandler: [verifyToken, requireRole('owner')] }, openSession)
  app.post('/finances/session/close', { preHandler: [verifyToken, requireRole('owner')] }, closeSession)
}
