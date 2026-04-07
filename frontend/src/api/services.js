import client from './client'

export const getServices = () => client.get('/services')
export const createService = (data) => client.post('/services', data)
export const updateService = (id, data) => client.put(`/services/${id}`, data)
export const deleteService = (id) => client.delete(`/services/${id}`)
export const getPublicBusiness = (slug) => client.get(`/p/${slug}`)
export const getAvailableSlots = (slug, date, serviceId) =>
  client.get(`/p/${slug}/slots?date=${date}&service_id=${serviceId}`)