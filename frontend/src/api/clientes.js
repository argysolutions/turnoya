import client from './client'

export const getClientes = () => 
  client.get('/clientes')

export const createCliente = (data) => 
  client.post('/clientes', data)

export const updateCliente = (id, data) => 
  client.put(`/clientes/${id}`, data)

export const deleteCliente = (id) => 
  client.delete(`/clientes/${id}`)
