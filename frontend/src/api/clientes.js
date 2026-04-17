import client from './client'

export const searchClientes = (query = '') => 
  client.get(`/clientes?q=${encodeURIComponent(query)}`)

export const updateClientNotes = (id, notes) => 
  client.put(`/clientes/${id}/notas`, { internal_notes: notes })
