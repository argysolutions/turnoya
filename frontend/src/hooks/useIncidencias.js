import { useState, useCallback } from 'react'
import client from '@/api/client'
import { toast } from 'sonner'

export function useIncidencias() {
  const [incidencias, setIncidencias] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const fetchIncidencias = useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const { data } = await client.get('/incidencias')
      setIncidencias(data)
    } catch (error) {
      console.error('Error fetching incidencias:', error)
      setIsError(true)
      toast.error('No se pudieron cargar las incidencias')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createIncidencia = async (formData) => {
    try {
      const { data } = await client.post('/incidencias', formData)
      setIncidencias(prev => [data.data, ...prev])
      toast.success('Incidencia reportada con éxito')
      return true
    } catch (error) {
      console.error('Error creating incidencia:', error)
      toast.error('Error al enviar el reporte técnico')
      return false
    }
  }

  const deleteIncidencia = async (id) => {
    try {
      await client.delete(`/incidencias/${id}`)
      setIncidencias(prev => prev.filter(i => i.id !== id))
      toast.success('Reporte eliminado')
      return true
    } catch (error) {
      console.error('Error deleting incidencia:', error)
      toast.error('No se pudo eliminar el reporte')
      return false
    }
  }

  return {
    incidencias,
    isLoading,
    isError,
    fetchIncidencias,
    createIncidencia,
    deleteIncidencia
  }
}
