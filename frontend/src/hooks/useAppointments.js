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
    try {
      const formattedDate = format(date, 'yyyy-MM-dd')
      const { data } = await getAppointments(formattedDate)
      setAppointments(data)
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
      toast.success('Turno eliminado')
      fetchAppointments()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar turno')
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
      // Map strings to Date objects for the calendar modifiers
      const dates = data.map(dateStr => new Date(dateStr + 'T12:00:00')) // Use noon to avoid TZ shift issues
      setBlockedDates(dates)
    } catch (err) {
      console.error('Error fetching blocked dates:', err)
    }
  }, [])

  return {
    date,
    setDate,
    appointments,
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
