import { verifyToken } from '../middlewares/auth.middleware.js'
import { bookAppointment, getAppointment, listAppointments, updateStatus, blockTime, createInternalAppointment } from '../controllers/appointments.controller.js'

export const appointmentsRoutes = async (app) => {
  app.post('/p/:slug/book', bookAppointment)
  app.get('/appointments/:id', getAppointment)
  app.get('/appointments', { preHandler: verifyToken }, listAppointments)
  app.post('/appointments', { preHandler: verifyToken }, createInternalAppointment)
  app.patch('/appointments/:id/status', { preHandler: verifyToken }, updateStatus)
  app.post('/appointments/block', { preHandler: verifyToken }, blockTime)
}