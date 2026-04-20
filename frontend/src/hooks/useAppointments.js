import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { getAppointments, createAppointment, updateAppointmentStatus, deleteAppointment, blockTime, getBlockedDates } from '@/api/appointments'
import { format } from 'date-fns'

export const useAppointments = (initialDate = new Date()) => {
  const [date, setDate] = useState(initialDate)
  const [appointments, setAppointments] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    // MOCK DATA PARA TESTING DE LAYOUT
    const mockAppointments = [
      { id: 1, start_at: '2026-04-20T09:00:00', end_at: '2026-04-20T09:45:00', client_name: 'Martina Ruiz', phone: '3472-551122', client_phone: '3472-551122', service_name: 'Coloración', status: 'pending', is_frequent: true, price: 4500, duration: 45 },
      { id: 2, start_at: '2026-04-20T09:30:00', end_at: '2026-04-20T10:00:00', client_name: 'Lucas Vega', phone: '3472-553344', client_phone: '3472-553344', service_name: 'Corte Clásico', status: 'pending', is_frequent: false, price: 2500, duration: 30 },
      { id: 3, start_at: '2026-04-20T10:00:00', end_at: '2026-04-20T10:30:00', client_name: 'Prueba', phone: '1233122455', client_phone: '1233122455', service_name: 'Test', status: 'confirmed', is_frequent: true, price: 1000, duration: 30 },
      { id: 4, start_at: '2026-04-20T11:00:00', end_at: '2026-04-20T11:45:00', client_name: 'Sofía Castro', phone: '3472-558899', client_phone: '3472-558899', service_name: 'Manicura', status: 'confirmed', is_frequent: false, price: 3000, duration: 45 },
      { id: 5, start_at: '2026-04-20T12:00:00', end_at: '2026-04-20T12:30:00', client_name: 'Diego Torres', phone: '3472-557766', client_phone: '3472-557766', service_name: 'Barbería', status: 'confirmed', is_frequent: true, price: 2200, duration: 30 },
      { id: 6, start_at: '2026-04-20T14:00:00', end_at: '2026-04-20T14:45:00', client_name: 'Valeria Luna', phone: '3472-551234', client_phone: '3472-551234', service_name: 'Corte Mujer', status: 'confirmed', is_frequent: false, price: 3500, duration: 45 },
      { id: 7, start_at: '2026-04-20T08:00:00', end_at: '2026-04-20T08:30:00', client_name: 'Carlos Díaz', phone: '3472-559900', client_phone: '3472-559900', service_name: 'Corte Clásico', status: 'completed', is_frequent: true, price: 2500, duration: 30 },
      { id: 8, start_at: '2026-04-20T15:30:00', end_at: '2026-04-20T16:15:00', client_name: 'Ana Gómez', phone: '3472-554455', client_phone: '3472-554455', service_name: 'Peinado', status: 'cancelled', is_frequent: false, price: 4000, duration: 45 },
      { id: 9, start_at: '2026-04-21T10:00:00', end_at: '2026-04-21T10:45:00', client_name: 'Julieta Paz', phone: '3472-441122', client_phone: '3472-441122', service_name: 'Coloración', status: 'confirmed', is_frequent: true, price: 4500, duration: 45 },
      { id: 10, start_at: '2026-04-21T11:30:00', end_at: '2026-04-21T12:00:00', client_name: 'Marcos Silva', phone: '3472-443344', client_phone: '3472-443344', service_name: 'Barbería', status: 'pending', is_frequent: false, price: 2200, duration: 30 },
      { id: 11, start_at: '2026-04-21T16:00:00', end_at: '2026-04-21T16:45:00', client_name: 'Laura Sosa', phone: '3472-445566', client_phone: '3472-445566', service_name: 'Manicura', status: 'confirmed', is_frequent: true, price: 3000, duration: 45 },
      { id: 12, start_at: '2026-04-23T09:00:00', end_at: '2026-04-23T09:30:00', client_name: 'Pedro Arce', phone: '3472-661122', client_phone: '3472-661122', service_name: 'Corte Clásico', status: 'confirmed', is_frequent: false, price: 2500, duration: 30 },
      { id: 13, start_at: '2026-04-24T17:00:00', end_at: '2026-04-24T18:00:00', client_name: 'Camila Ríos', phone: '3472-663344', client_phone: '3472-663344', service_name: 'Alisado', status: 'pending', is_frequent: true, price: 8000, duration: 60 },
      { id: 14, start_at: '2026-04-25T10:30:00', end_at: '2026-04-25T11:00:00', client_name: 'Emilio Rey', phone: '3472-665566', client_phone: '3472-665566', service_name: 'Corte Niño', status: 'confirmed', is_frequent: true, price: 2000, duration: 30 },
    ];

    try {
      // Simulamos latencia de red
      await new Promise(resolve => setTimeout(resolve, 500));
      setAppointments(mockAppointments)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al cargar la agenda'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const addAppointment = async (appointmentData) => {
    try {
      const { data } = await createAppointment(appointmentData)
      toast.success('Turno agendado con éxito')
      fetchAppointments()
      return data
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Solapamiento detectado: El horario ya está ocupado.')
      } else {
        toast.error(err.response?.data?.error || 'Error al agendar turno')
      }
      throw err
    }
  }

  const updateStatus = async (id, status, paymentInfo = null) => {
    try {
      await updateAppointmentStatus(id, { status, paymentInfo })
      toast.success('Estado del turno actualizado')
      fetchAppointments()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar estado')
      throw err
    }
  }

  const removeAppointment = async (id) => {
    try {
      await deleteAppointment(id)
      toast.success('Registro eliminado')
      fetchAppointments()
      return true
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar registro')
      throw err
    }
  }

  const addBlock = async (blockData) => {
    try {
      await blockTime(blockData)
      toast.success('Horario bloqueado')
      fetchAppointments()
      // We could also refresh blocked dates here if the block was on a different day
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al bloquear horario')
      throw err
    }
  }

  const fetchBlockedDates = useCallback(async (year, month) => {
    try {
      const { data } = await getBlockedDates({ year, month })
      // Map strings "YYYY-MM-DD" or full ISO to safe local Date objects
      const dates = data.map(dateStr => {
        const justDate = dateStr.split('T')[0]
        const [y, m, d] = justDate.split('-').map(Number)
        return new Date(y, m - 1, d) // Local day without time shifting
      })
      setBlockedDates(dates)
    } catch (err) {
      console.error('Error fetching blocked dates:', err)
    }
  }, [])

  return {
    date,
    setDate,
    appointments,
    setAppointments,
    loading,
    error,
    refresh: fetchAppointments,
    addAppointment,
    updateStatus,
    removeAppointment,
    addBlock,
    blockedDates,
    fetchBlockedDates
  }
}

export default useAppointments
