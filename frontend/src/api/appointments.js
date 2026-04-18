import client from './client'

export const getAppointments = (date) => 
  client.get('/appointments', { params: { date } })

export const getAppointment = (id) => 
  client.get(`/appointments/${id}`)

export const createAppointment = (data) => 
  client.post('/appointments', data)

export const updateAppointmentStatus = (id, data) => 
  client.patch(`/appointments/${id}/status`, data)

export const deleteAppointment = (id) => 
  client.delete(`/appointments/${id}`)

export const blockTime = (data) => 
  client.post('/appointments/block', data)