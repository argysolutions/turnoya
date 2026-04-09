import { useState, useEffect } from 'react'
import { getAppointments, updateStatus, createBlock } from '@/api/appointments'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, MoreVertical, Check, X, Calendar as CalendarIcon, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"

const STATUS_VARIANT = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'destructive',
  cancelled_occupied: 'destructive',
  completed: 'outline'
}

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Libre',
  cancelled_occupied: 'Bloqueado',
  completed: 'Cobrado 💰'
}

const today = () => new Date().toISOString().split('T')[0]

const formatDate = (dateStr) => {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

// Subcomponente Cronómetro
const Countdown = ({ targetTime, onFinished }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetTime) return
    const targetMs = new Date(targetTime).getTime()
    
    const tick = () => {
      const now = Date.now()
      const diff = targetMs - now
      if (diff <= 0) {
        setTimeLeft('')
        if (onFinished) onFinished()
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }
    
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [targetTime, onFinished])

  if (!timeLeft) return null
  return <span className="font-mono font-bold ml-1 text-yellow-700">{timeLeft}</span>
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [date, setDate] = useState(today())
  const [calendarDate, setCalendarDate] = useState(new Date())
  
  const [cancelModal, setCancelModal] = useState(null)
  const [pendingCancelModal, setPendingCancelModal] = useState(null)
  const [liberateModal, setLiberateModal] = useState(null)
  const [blockModal, setBlockModal] = useState(false)
  const [blockForm, setBlockForm] = useState({ date: today(), start_time: '14:00', end_time: '15:00', fullDay: false })
  const [cancelStrategy, setCancelStrategy] = useState('liberate')

  const business = JSON.parse(localStorage.getItem('business') || '{}')
  const publicLink = `${window.location.origin}/p/${business.slug}`

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink)
    toast.success('¡Link público copiado al portapapeles!')
  }

  // Traer turnos masivos sin filtro de fecha
  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const { data } = await getAppointments() 
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

  useEffect(() => { fetchAppointments() }, [])

  const handleStatus = async (id, status) => {
    try {
      await updateStatus(id, status)
      toast.success(`Turno actualizado`)
      fetchAppointments()
      if (status === 'cancelled' && pendingCancelModal) setPendingCancelModal(null)
    } catch {
      toast.error('Error al actualizar el turno')
    }
  }

  const handleCancelSubmit = async () => {
    if (!cancelModal) return
    const statusPayload = cancelStrategy === 'keep_occupied' ? 'cancelled_occupied' : 'liberate'
    try {
      await updateStatus(cancelModal.id, statusPayload)
      toast.success('Turno cancelado correctamente')
      fetchAppointments()
      setCancelModal(null)
      setCancelStrategy('liberate')
    } catch {
      toast.error('Error al cancelar el turno')
    }
  }

  const handleLiberateSubmit = async () => {
    if (!liberateModal) return
    try {
      await updateStatus(liberateModal.id, 'liberate')
      toast.success('Horario en proceso de liberación temporal. Esperá 2 minutos.')
      fetchAppointments()
      setLiberateModal(null)
    } catch {
      toast.error('Error al habilitar el turno')
    }
  }

  const handleCalendarSelect = (d) => {
    if (!d) return
    setCalendarDate(d)
    setDate(d.toISOString().split('T')[0])
  }

  const handleBlockTime = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...blockForm }
      if (payload.fullDay) {
        payload.start_time = '00:00'
        payload.end_time = '23:59'
      }
      
      // Fallback para tu servidor Render actual (calculamos la duración para que la acepte el código viejo)
      const [sh, sm] = payload.start_time.split(':').map(Number)
      const [eh, em] = payload.end_time.split(':').map(Number)
      let durationMins = (eh * 60 + em) - (sh * 60 + sm)
      if (durationMins <= 0) durationMins = 60
      payload.duration = durationMins

      await createBlock(payload)
      setBlockModal(false)
      fetchAppointments()
      toast.success(payload.fullDay ? 'Día bloqueado con éxito' : 'Bache horario bloqueado con éxito')
    } catch (error) {
      toast.error('Error insertando el bloqueo manual')
    }
  }

  // ===== LÓGICA DE FILTROS =====
  const todayStr = today()
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const safeDate = (dbDate) => (dbDate ? dbDate.split('T')[0] : '')

  const allPending = appointments.filter(a => a.status === 'pending')
  const confirmedForDate = appointments.filter(a => a.status === 'confirmed' && safeDate(a.date) === date)
  const completedForDate = appointments.filter(a => a.status === 'completed' && safeDate(a.date) === date)
  const cancelledForDate = appointments.filter(a => ['cancelled', 'cancelled_occupied'].includes(a.status) && safeDate(a.date) === date)

  const boxOfficeToday = completedForDate.reduce((acc, a) => acc + parseFloat(a.price || 0), 0)

  const pendingForDate = allPending.filter(a => safeDate(a.date) === date)
  const pendingSemana = allPending.filter(a => safeDate(a.date) > todayStr && safeDate(a.date) <= next7DaysStr && safeDate(a.date) !== date)
  const pendingProx = allPending.filter(a => safeDate(a.date) > next7DaysStr && safeDate(a.date) !== date)
  const pendingAtrasados = allPending.filter(a => safeDate(a.date) < todayStr && safeDate(a.date) !== date)

  // Arreglo de fechas para el Calendario (Rojo para las cancelaciones)
  const cancelledDatesArray = appointments
    .filter(a => ['cancelled', 'cancelled_occupied'].includes(a.status))
    .map(a => new Date(safeDate(a.date) + 'T12:00:00'))

  // REUSABLE RENDERER
  const renderAppointmentList = (list, emptyMessage = 'No hay turnos') => {
    if (loading) return <p className="text-sm text-slate-400 py-4 text-center">Cargando...</p>
    if (list.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">{emptyMessage}</p>

    return (
      <div className="divide-y divide-slate-100">
        {list.map((a) => {
          const isLiberating = a.status === 'cancelled_occupied' && a.liberates_at != null
          return (
            <div 
              key={a.id} 
              className={`py-3 flex items-center justify-between group transition-colors ${
                isLiberating ? 'bg-yellow-50/80 -mx-4 px-4 border-l-4 border-l-yellow-400' : 'hover:bg-slate-50/50'
              }`}
              onDoubleClick={() => {
                if (a.status === 'cancelled_occupied' && !isLiberating) setLiberateModal(a)
              }}
            >
              <div className="flex gap-4 sm:gap-6 w-full max-w-[80%] pr-4 cursor-default">
                <div className="text-sm font-semibold text-slate-900 w-12 pt-0.5 shrink-0 tabular-nums">
                  {a.start_time.slice(0, 5)}
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {a.client_name} {isLiberating && <span className="text-xs text-yellow-600 font-normal ml-2">(Liberando slot temporalmente...)</span>}
                    </p>
                    {(() => {
                      const clientOccurrences = appointments.filter(p => p.client_phone === a.client_phone).length
                      if (clientOccurrences === 1) return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shadow-sm">NUEVO 🥇</span>
                      if (clientOccurrences > 1) return <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shadow-sm">FRECUENTE 🔥</span>
                      return null
                    })()}
                  </div>
                  
                  {isLiberating ? (
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs font-semibold text-yellow-700 bg-yellow-100/70 px-2 py-0.5 rounded-full inline-flex items-center">
                        Volverá a figurar disponible en:
                        <Countdown targetTime={a.liberates_at} onFinished={fetchAppointments} />
                      </span>
                      <Button 
                        variant="ghost" size="sm" 
                        className="h-6 text-xs text-yellow-800 bg-yellow-200/50 hover:bg-yellow-200 hover:text-yellow-900 border border-yellow-300/50 px-2"
                        onClick={() => handleUndoLiberation(a.id)}
                      >
                        Deshacer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {a.service_name}
                      </span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{a.duration} min</span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{a.client_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge variant={STATUS_VARIANT[a.status]}>
                  {STATUS_LABEL[a.status]}
                </Badge>
                {a.status === 'pending' && (
                  <div className="flex gap-2">
                     <Button size="sm" variant="outline" onClick={() => handleStatus(a.id, 'confirmed')}>Confirmar</Button>
                     <Button size="sm" variant="ghost" onClick={() => setPendingCancelModal(a)}>Cancelar</Button>
                  </div>
                )}
                {a.status === 'confirmed' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer mb-1 focus:bg-emerald-50 focus:text-emerald-700" onClick={() => handleStatus(a.id, 'completed')}>
                        Finalizar y Cobrar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={() => setCancelModal(a)}>
                        Cancelar turno
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{business.name || 'Agenda de Turnos'}</h1>
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 px-3 rounded-full" onClick={() => setBlockModal(true)}>
              + Bloquear Horario
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-1">Navegá entre fechas, bloqueos o revisá turnos pendientes.</p>
        </div>

        {business.slug && (
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm max-w-sm shrink-0">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link público</span>
              <span className="text-xs text-slate-700 truncate w-32 sm:w-48">{publicLink}</span>
            </div>
            <Button size="icon" variant="secondary" className="h-7 w-7 flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Lado Derecho -> Izquierda (Flex-row-reverse) para tener el calendario secundario a la derecha */}
      <div className="flex flex-col lg:flex-row-reverse gap-8">
        
        {/* === LADO SECUNDARIO (Derecha): CALENDARIO Y COUNTERS === */}
        <div className="w-full lg:w-[260px] shrink-0 space-y-3">
          <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden rounded-2xl">
            <CardContent className="p-1">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={handleCalendarSelect}
                modifiers={{ cancelled: cancelledDatesArray }}
                modifiersClassNames={{ cancelled: "text-red-500 font-bold bg-red-50 ring-1 ring-inset ring-red-200 rounded-full" }}
                className="mx-auto text-sm scale-90 origin-top -mb-6"
              />
              
              {/* === TOTALES COMPACTOS === */}
              <div className="px-3 pb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 border-t border-slate-100 pt-3">
                  {date === todayStr ? 'HOY' : date.slice(-2) + ' / ' + date.slice(5,7)}
                </p>
                <div className="flex gap-1.5">
                  <div className="flex-1 bg-emerald-50 rounded-lg py-2 text-center text-emerald-900 border border-emerald-100/50">
                    <p className="text-[9px] font-bold uppercase text-emerald-600/70 mb-0.5">Conf.</p>
                    <p className="text-xl font-bold leading-none">{confirmedForDate.length}</p>
                  </div>
                  <div className="flex-1 bg-yellow-50 rounded-lg py-2 text-center text-yellow-900 border border-yellow-100/50">
                    <p className="text-[9px] font-bold uppercase text-yellow-600/70 mb-0.5">Pend.</p>
                    <p className="text-xl font-bold leading-none">{pendingForDate.length}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-lg py-2 text-center text-slate-700 border border-slate-100">
                    <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Canc.</p>
                    <p className="text-xl font-bold leading-none">{cancelledForDate.length}</p>
                  </div>
                </div>

                {boxOfficeToday > 0 && (
                  <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-2 mt-1.5 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Caja del Día</span>
                    <span className="text-sm font-bold text-emerald-900">${boxOfficeToday.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>



        {/* === LADO PRINCIPAL (Izquierda): PESTAÑAS (TABS) === */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="pendientes" className="w-full">
            <TabsList className="mb-4 bg-slate-100/80 p-1 rounded-xl">
              <TabsTrigger value="pendientes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Pendientes {allPending.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px] flex items-center justify-center bg-slate-200 text-slate-700">{allPending.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="confirmados" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Confirmados
              </TabsTrigger>
              <TabsTrigger value="cancelados" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Cancelados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="space-y-3 outline-none">
              
              {pendingAtrasados.length > 0 && (
                <Card className="border-red-100 shadow-sm">
                  <CardHeader className="pb-3 bg-red-50/50">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <Clock className="w-4 h-4" /> Atrasados sin Revisar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderAppointmentList(pendingAtrasados)}
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-500" />
                    {date === todayStr ? 'Para Hoy' : `Solicitudes para el ${formatDate(date)}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAppointmentList(pendingForDate, 'No hay turnos pendientes para la fecha seleccionada')}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Esta Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAppointmentList(pendingSemana, 'No hay turnos para los proximos 7 dias')}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Próximamente</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAppointmentList(pendingProx, 'Vacío')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="confirmados" className="space-y-6 outline-none">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Check className="h-5 w-5 text-emerald-500" /> Confirmados para el {formatDate(date)}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAppointmentList(confirmedForDate, 'Día libre. No hay confirmados.')}
                </CardContent>
              </Card>

              {completedForDate.length > 0 && (
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/20">
                  <CardHeader className="pb-3 border-b border-emerald-100">
                     <CardTitle className="text-sm uppercase tracking-wide text-emerald-700">
                       Servicios Finalizados / Cobrados ({completedForDate.length})
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderAppointmentList(completedForDate)}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cancelados" className="outline-none">
              <Card className="shadow-sm">
                 <CardHeader className="pb-3 border-b border-slate-100">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <X className="h-5 w-5 text-red-500" /> Cancelados del {formatDate(date)}
                   </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAppointmentList(cancelledForDate, 'Ningún turno fue cancelado este día.')}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* --- MODALES --- */}
      <Dialog open={!!cancelModal} onOpenChange={(o) => (!o ? setCancelModal(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Turno Confirmado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup defaultValue="liberate" onValueChange={setCancelStrategy}>
              <div className="flex space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                <RadioGroupItem value="liberate" id="r-liberate" className="mt-1" />
                <Label htmlFor="r-liberate" className="cursor-pointer flex-1">
                  <div className="font-semibold text-slate-900">Liberar horario en la agenda</div>
                  <div className="text-sm text-slate-500 font-normal">Borra el turno definitivamente luego de 2 minutos y permite que otra persona lo agende online.</div>
                </Label>
              </div>
              <div className="flex space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <RadioGroupItem value="keep_occupied" id="r-keep" className="mt-1" />
                <Label htmlFor="r-keep" className="cursor-pointer flex-1">
                  <div className="font-semibold text-slate-900">Permanecer ocupado</div>
                  <div className="text-sm text-slate-500 font-normal">Acá figurará Cancelado pero mantiene ese horario bloqueado para el público externo en la web.</div>
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
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLiberateModal(null)}>Cancelar</Button>
            <Button variant="default" onClick={handleLiberateSubmit}>Sí, habilitar horario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={pendingCancelModal !== null} onOpenChange={(open) => !open && setPendingCancelModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-slate-600">¿Estás seguro que deseas <strong>rechazar y eliminar</strong> la solicitud de <strong>{pendingCancelModal?.client_name}</strong>?</p>
            <p className="text-sm text-slate-500 mt-2">Esta acción no se puede deshacer.</p>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingCancelModal(null)}>Volver</Button>
            <Button variant="destructive" onClick={() => { handleStatus(pendingCancelModal.id, 'cancelled'); setPendingCancelModal(null) }}>Sí, Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOCK TIME MODAL */}
      <Dialog open={blockModal} onOpenChange={setBlockModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear Horario Rápido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBlockTime}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-500 leading-relaxed">Cerrás la agenda impidiendo turnos públicos, opcionalmente el día entero o por un lapso exacto.</p>
              
              <div className="grid gap-2">
                <Label>Fecha del bloqueo</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" required value={blockForm.date} onChange={e => setBlockForm({...blockForm, date: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                <input 
                  type="checkbox" 
                  id="fullDay" 
                  checked={blockForm.fullDay} 
                  onChange={e => setBlockForm({...blockForm, fullDay: e.target.checked})} 
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer" 
                />
                <Label htmlFor="fullDay" className="cursor-pointer font-medium text-slate-700">Deshabilitar todo el día completo</Label>
              </div>

              {!blockForm.fullDay && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="grid gap-2">
                    <Label>Hora inicio</Label>
                    <input type="time" required={!blockForm.fullDay} value={blockForm.start_time} onChange={e => setBlockForm({...blockForm, start_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hora fin</Label>
                    <input type="time" required={!blockForm.fullDay} value={blockForm.end_time} onChange={e => setBlockForm({...blockForm, end_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBlockModal(false)}>Cancelar</Button>
              <Button type="submit" variant="destructive">Establecer Bloqueo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}