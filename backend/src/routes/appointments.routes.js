import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import { bookAppointment, getAppointment, listAppointments, updateStatus, blockTime, createInternalAppointment } from '../controllers/appointments.controller.js'

export const appointmentsRoutes = async (app) => {
  app.post('/p/:slug/book', bookAppointment)
  app.get('/appointments/:id', getAppointment)
  app.get('/appointments', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, listAppointments)
  app.post('/appointments', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, createInternalAppointment)
  app.patch('/appointments/:id/status', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, updateStatus)
  app.post('/appointments/block', { preHandler: [verifyToken, requireRole('owner', 'employee')] }, blockTime)
}