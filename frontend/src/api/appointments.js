import client from './client'

export const getAppointments = async (date) => {
  try {
    return await client.get('/appointments', { params: { date } })
  } catch (e) {
    // Fallback Mock Data for Mobile UI testing
    return { data: [
      { id: 1, client_name: 'Ana García (Mock)', service_name: 'Corte + Barba', start_time: '10:00:00', duration: 45, status: 'confirmed', date: new Date().toISOString() },
      { id: 2, client_name: 'Roberto Pérez (Mock)', service_name: 'Color Global', start_time: '11:30:00', duration: 90, status: 'pending', date: new Date().toISOString() },
      { id: 3, client_name: 'Lucía Fernández (Mock)', service_name: 'Peinado', start_time: '15:00:00', duration: 30, status: 'completed', date: new Date().toISOString() }
    ]}
  }
}

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