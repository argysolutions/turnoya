import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAppointment } from '@/api/appointments'

export default function ConfirmationPage() {
  const { id } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getAppointment(id)
        setAppointment(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Cargando...</p>
    </div>
  )

  if (error || !appointment) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Turno no encontrado</p>
    </div>
  )

  const date = new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">¡Turno confirmado!</h1>
          <p className="text-sm text-slate-500 mt-1">Te esperamos en {appointment.business_name}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-slate-900 px-5 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Turno #{appointment.id}</p>
            <p className="text-white font-semibold text-lg">{appointment.service_name}</p>
            <p className="text-slate-300 text-sm capitalize">{date}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Horario</span>
              <span className="font-medium font-mono">
                {appointment.start_time.slice(0, 5)} — {appointment.end_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Duración</span>
              <span className="font-medium">{appointment.duration} min</span>
            </div>
            {appointment.price && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Precio</span>
                <span className="font-medium">${Number(appointment.price).toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium">{appointment.client_name}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Teléfono</span>
                <span className="font-medium">{appointment.client_phone}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Dirección</span>
                <span className="font-medium text-right">{appointment.business_address}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Contacto</span>
                <span className="font-medium">{appointment.business_phone}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Guardá esta página o anotá el número de turno #{appointment.id}
        </p>

        <Link
          to={`/p/${appointment.business_name.toLowerCase().replace(/\s+/g, '-')}`}
          className="block text-center text-sm text-slate-500 hover:text-slate-900 transition-colors mt-4"
        >
          ← Volver al negocio
        </Link>

      </div>
    </div>
  )
}