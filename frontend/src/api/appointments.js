import client from './client'

export const bookAppointment = (slug, data) => client.post(`/p/${slug}/book`, data)
export const getAppointment = (id) => client.get(`/appointments/${id}`)
export const getAppointments = (date) => client.get(`/appointments${date ? `?date=${date}` : ''}`)
export const updateStatus = (id, status) => client.patch(`/appointments/${id}/status`, { status })