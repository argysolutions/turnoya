import { getBusinessPublicProfile, getAvailableSlots } from '../controllers/public.controller.js'

export const publicRoutes = async (app) => {
  app.get('/p/:slug', getBusinessPublicProfile)
  app.get('/p/:slug/slots', getAvailableSlots)
}