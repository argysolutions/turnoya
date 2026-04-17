import { useState, useCallback } from 'react'
import client from '../api/client'

/**
 * Hook para gestionar la lógica de clientes.
 */
export const useClientes = () => {
  const [clientes, setClientes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(null)

  const fetchClientes = useCallback(async () => {
    setIsLoading(true)
    setIsError(null)
    try {
      const response = await client.get('/clientes')
      setClientes(response.data)
    } catch (err) {
      console.error('Error fetching clientes:', err)
      setIsError(err.response?.data?.error || 'Error al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addCliente = async (data) => {
    setIsLoading(true)
    try {
      const response = await client.post('/clientes', data)
      setClientes(prev => [...prev, response.data])
      return response.data
    } catch (err) {
      console.error('Error adding cliente:', err)
      throw err.response?.data?.error || 'Error al crear cliente'
    } finally {
      setIsLoading(false)
    }
  }

  const updateCliente = async (id, data) => {
    setIsLoading(true)
    try {
      const response = await client.put(`/clientes/${id}`, data)
      setClientes(prev => prev.map(c => c.id === id ? response.data : c))
      return response.data
    } catch (err) {
      console.error('Error updating cliente:', err)
      throw err.response?.data?.error || 'Error al actualizar cliente'
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCliente = async (id) => {
    setIsLoading(true)
    try {
      await client.delete(`/clientes/${id}`)
      setClientes(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Error deleting cliente:', err)
      throw err.response?.data?.error || 'Error al eliminar cliente'
    } finally {
      setIsLoading(false)
    }
  }

  return {
    clientes,
    isLoading,
    isError,
    fetchClientes,
    addCliente,
    updateCliente,
    deleteCliente
  }
}
