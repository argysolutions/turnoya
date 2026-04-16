import api from './index'

export const getClients = (params) => api.get('/clients', { params })
export const updateClientNotes = (id, notes) => api.put(`/clients/${id}/notes`, { notes })
