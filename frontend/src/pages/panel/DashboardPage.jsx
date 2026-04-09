import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getAppointments, updateStatus } from '@/api/appointments'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

const STATUS_LABEL = {
  pending: 'pendiente',
  confirmed: 'confirmado',
  cancelled: 'cancelado',
  cancelled_occupied: 'OCUPADO',
}

const STATUS_VARIANT = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'outline',
  cancelled_occupied: 'destructive',
}

const today = () => new Date().toISOString().split('T')[0]

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const Countdown = ({ targetTime, onFinished }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetTime) return
    const update = () => {
      const diff = new Date(targetTime).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:00')
        onFinished()
      } else {
        const m = Math.floor(diff / 60000).toString().padStart(2, '0')
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
        setTimeLeft(`${m}:${s}`)
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [targetTime, onFinished])

  if (!timeLeft) return null
  return <span className="font-mono font-bold ml-1 text-yellow-700">{timeLeft}</span>
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today())
  
  const [cancelModal, setCancelModal] = useState(null)
  const [liberateModal, setLiberateModal] = useState(null)
  const [cancelStrategy, setCancelStrategy] = useState('liberate')

  const business = JSON.parse(localStorage.getItem('business') || '{}')
  const publicLink = `${window.location.origin}/p/${business.slug}`

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink)
    toast.success('¡Link público copiado al portapapeles!')
  }

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

  const handleUndoLiberation = async (id) => {
    try {
      await updateStatus(id, 'confirmed')
      toast.success('Acción deshecha. El turno volvió a estar Confirmado.')
      fetchAppointments()
    } catch {
      toast.error('Error al deshacer la acción')
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

  const handleCancelSubmit = async () => {
    if (!cancelModal) return
    const statusPayload = cancelStrategy === 'keep_occupied' ? 'cancelled_occupied' : 'liberate'
    try {
      await updateStatus(cancelModal.id, statusPayload)
      toast.success(statusPayload === 'liberate' ? 'Turno liberado' : 'Turno ocupado en agenda')
      setCancelModal(null)
      fetchAppointments()
    } catch {
      toast.error('Error al cancelar el turno')
    }
  }

  const handleLiberateSubmit = async () => {
    if (!liberateModal) return
    try {
      await updateStatus(liberateModal.id, 'liberate')
      toast.success('Horario liberado exitosamente')
      setLiberateModal(null)
      fetchAppointments()
    } catch {
      toast.error('Error al habilitar horario')
    }
  }

  const confirmed = appointments.filter(a => a.status === 'confirmed').length
  const pending = appointments.filter(a => a.status === 'pending').length
  const cancelled = appointments.filter(a => a.status === 'cancelled' || a.status === 'cancelled_occupied').length

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">{formatDate(date)}</p>
        </div>

        {business.slug && (
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm ml-4 mr-auto max-w-sm">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link público</span>
              <span className="text-xs text-slate-700 truncate w-32 sm:w-56">{publicLink}</span>
            </div>
            <Button size="icon" variant="secondary" className="h-7 w-7 flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

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
              {appointments.map((a, i) => {
                const isLiberating = a.status === 'cancelled_occupied' && a.liberates_at != null
                const opacityClass = a.status === 'cancelled' || (a.status === 'cancelled_occupied' && !isLiberating) ? 'opacity-40' : ''
                const pointerClass = a.status === 'cancelled_occupied' && !isLiberating ? 'cursor-pointer' : ''
                const highlightClass = isLiberating ? 'bg-yellow-50/80 border border-yellow-200 shadow-sm' : ''

                return (
                  <div
                  key={a.id}
                  onDoubleClick={() => {
                    if (a.status === 'cancelled_occupied' && !isLiberating) setLiberateModal(a)
                  }}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-slate-50 ${opacityClass} ${pointerClass} ${highlightClass}`}
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
                    <p className={`text-sm font-medium ${a.status === 'cancelled_occupied' ? (isLiberating ? 'text-yellow-800 font-bold' : 'text-red-700 font-bold') : 'text-slate-900'}`}>
                      {a.status === 'cancelled_occupied' ? 'Turno Cancelado' : a.client_name}
                    </p>
                    
                    {isLiberating ? (
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-xs font-semibold text-yellow-700 bg-yellow-100/70 px-2 py-0.5 rounded-full inline-flex items-center">
                          Volverá a figurar disponible en:
                          <Countdown targetTime={a.liberates_at} onFinished={fetchAppointments} />
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-yellow-800 bg-yellow-200/50 hover:bg-yellow-200 hover:text-yellow-900 border border-yellow-300/50 px-2"
                          onClick={() => handleUndoLiberation(a.id)}
                        >
                          Deshacer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {a.service_name}
                        </span>
                        <span className="text-xs text-slate-400">{a.duration} min</span>
                        <span className="text-xs text-slate-400">{a.client_phone}</span>
                      </div>
                    )}
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
                  {a.status === 'confirmed' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => setCancelModal(a)}>
                          Cancelar turno
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!cancelModal} onOpenChange={(o) => (!o ? setCancelModal(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Turno Confirmado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={cancelStrategy} onValueChange={setCancelStrategy} className="space-y-4">
              <div className="flex items-start space-x-3 space-y-0 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="liberate" id="r-liberate" className="mt-1" />
                <Label htmlFor="r-liberate" className="cursor-pointer flex-1">
                  <div className="font-semibold text-slate-900">Habilitar disponibilidad para otro turno</div>
                  <div className="text-sm text-slate-500 font-normal">Libera el horario para recibir una reserva nueva (demora 2 mins).</div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 space-y-0 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <RadioGroupItem value="keep_occupied" id="r-keep" className="mt-1" />
                <Label htmlFor="r-keep" className="cursor-pointer flex-1">
                  <div className="font-semibold text-slate-900">Permanecer ocupado</div>
                  <div className="text-sm text-slate-500 font-normal">Mantiene el horario bloqueado en la agenda pública.</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelModal(null)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancelSubmit}>Confirmar cancelación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!liberateModal} onOpenChange={(o) => (!o ? setLiberateModal(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar horario bloqueado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-4">
            Este horario figura ocupado artificialmente debido a una cancelación previa. ¿Deseás habilitarlo nuevamente en tu agenda pública?
            Se eliminará visualmente del dashboard y estará disponible en el calendario público en 2 minutos.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLiberateModal(null)}>Cancelar</Button>
            <Button variant="default" onClick={handleLiberateSubmit}>Sí, habilitar horario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}