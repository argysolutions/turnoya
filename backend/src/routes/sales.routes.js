import { verifyToken } from '../middlewares/auth.middleware.js'
import { listSales } from '../controllers/sales.controller.js'

export const salesRoutes = async (app) => {
  app.get('/sales', { preHandler: verifyToken }, listSales)
}
