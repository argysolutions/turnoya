import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getAppointments, updateStatus } from '@/api/appointments'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATUS_LABEL = {
  pending: 'pendiente',
  confirmed: 'confirmado',
  cancelled: 'cancelado',
}

const STATUS_VARIANT = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'outline',
}

const today = () => new Date().toISOString().split('T')[0]

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today())

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const { data } = await getAppointments(date)
      setAppointments(data)
    } catch {
      toast.error('Error al cargar los turnos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [date])

  const handleStatus = async (id, status) => {
    try {
      await updateStatus(id, status)
      toast.success(`Turno ${STATUS_LABEL[status]}`)
      fetchAppointments()
    } catch {
      toast.error('Error al actualizar el turno')
    }
  }

  const confirmed = appointments.filter(a => a.status === 'confirmed').length
  const pending = appointments.filter(a => a.status === 'pending').length
  const cancelled = appointments.filter(a => a.status === 'cancelled').length

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">{formatDate(date)}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Confirmados</p>
            <p className="text-3xl font-semibold text-slate-900">{confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Pendientes</p>
            <p className="text-3xl font-semibold text-slate-900">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Cancelados</p>
            <p className="text-3xl font-semibold text-slate-900">{cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Turnos del día
            <span className="ml-2 text-slate-400 font-normal text-sm">({appointments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Cargando...</p>
          ) : appointments.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No hay turnos para este día</p>
          ) : (
            <div className="space-y-1">
              {appointments.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-slate-50 ${
                    a.status === 'cancelled' ? 'opacity-40' : ''
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{
                      background: a.status === 'confirmed' ? '#3B6D11'
                        : a.status === 'pending' ? '#854F0B' : '#CBD5E1'
                    }}
                  />
                  <div className="font-mono text-sm text-slate-400 w-12 flex-shrink-0">
                    {a.start_time.slice(0, 5)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{a.client_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {a.service_name}
                      </span>
                      <span className="text-xs text-slate-400">{a.duration} min</span>
                      <span className="text-xs text-slate-400">{a.client_phone}</span>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status]}>
                    {STATUS_LABEL[a.status]}
                  </Badge>
                  {a.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleStatus(a.id, 'confirmed')}>
                        Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleStatus(a.id, 'cancelled')}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}