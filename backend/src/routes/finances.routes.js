import { verifyToken } from '../middlewares/auth.middleware.js'
import { addExpense, removeExpense } from '../controllers/expenses.controller.js'
import { financesSummary, listExpenses } from '../controllers/finances.controller.js'

export const financesRoutes = async (app) => {
  // Listar gastos del día/rango: ?date=YYYY-MM-DD o ?startDate=...&endDate=...
  app.get('/expenses', { preHandler: verifyToken }, listExpenses)

  // Registrar un gasto
  app.post('/expenses', { preHandler: verifyToken }, addExpense)

  // Eliminar un gasto (borrado por error)
  app.delete('/expenses/:id', { preHandler: verifyToken }, removeExpense)

  // Resumen financiero: ingresos, gastos, neto real, desglose por método
  // Query params: ?date=YYYY-MM-DD  o  ?startDate=...&endDate=...
  app.get('/finances/summary', { preHandler: verifyToken }, financesSummary)
}
