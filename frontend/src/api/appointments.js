import client from './client'

export const getAppointments = (date) => 
  client.get('/appointments', { params: { date } })

export const getBlockedDates = ({ year, month }) => 
  client.get('/appointments/blocked-dates', { params: { year, month } })

export const getAppointment = (id) => 
  client.get(`/appointments/${id}`)

export const createAppointment = (data) => 
  client.post('/appointments', data)

export const updateAppointmentStatus = (id, data) => 
  client.patch(`/appointments/${id}/status`, data)

export const updateStatus = updateAppointmentStatus // Alias for compatibility

export const deleteAppointment = (id) => 
  client.delete(`/appointments/${id}`)

export const blockTime = (data) => 
  client.post('/appointments/block', data)

export const createBlock = blockTime // Alias for compatibility

export const bookAppointment = (slug, data) =>
  client.post(`/public/${slug}/book`, data)