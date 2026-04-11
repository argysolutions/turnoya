import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAppointments, updateStatus, createBlock } from '@/api/appointments'
import { es } from 'react-day-picker/locale'
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
import WheelTimePicker from '@/components/ui/wheel-time-picker'
import WeeklyCalendar from '@/components/ui/weekly-calendar'

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

// Helper para el subrayado animado de las pestañas
const TabUnderline = ({ value, activeTab, color }) => {
  if (value !== activeTab) return null;
  return (
    <motion.div
      layoutId="activeTab"
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 ${color} rounded-full z-10`}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    />
  );
};

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pendientes')
  
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  const [date, setDate] = useState(today())
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  
  const [cancelModal, setCancelModal] = useState(null)
  const [pendingCancelModal, setPendingCancelModal] = useState(null)
  const [liberateModal, setLiberateModal] = useState(null)
  const [blockModal, setBlockModal] = useState(false)
  const [confirmBlockModal, setConfirmBlockModal] = useState(false)
  const [activeBlocksListModal, setActiveBlocksListModal] = useState(false)
  const [eventModal, setEventModal] = useState(false)
  const [blockForm, setBlockForm] = useState({ date: today(), start_time: '14:00', end_time: '15:00', fullDay: false })
  const [eventForm, setEventForm] = useState({ date: today(), start_time: '09:00', end_time: '18:00', text: '', color: 'blue' })
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

  const handleBlockTimeRequest = (e) => {
    e.preventDefault()
    setConfirmBlockModal(true)
  }

  const submitBlockPayload = async () => {
    try {
      const payload = { ...blockForm }
      if (payload.fullDay) {
        payload.start_time = '00:00'
        payload.end_time = '23:59'
      }
      
      const [sh, sm] = payload.start_time.split(':').map(Number)
      const [eh, em] = payload.end_time.split(':').map(Number)
      let durationMins = (eh * 60 + em) - (sh * 60 + sm)
      if (durationMins <= 0) durationMins = 60
      payload.duration = durationMins

      await createBlock(payload)
      setConfirmBlockModal(false)
      setBlockModal(false)
      fetchAppointments()
      toast.success(payload.fullDay ? 'Día bloqueado con éxito' : 'Bache horario bloqueado con éxito')
    } catch (error) {
      toast.error('Error insertando el bloqueo manual')
    }
  }

  const submitEventPayload = async (e) => {
    e.preventDefault()
    try {
      const payload = { 
        ...eventForm,
        notes: JSON.stringify({ text: eventForm.text, color: eventForm.color }),
        isEvent: true 
      }
      const [sh, sm] = payload.start_time.split(':').map(Number)
      const [eh, em] = payload.end_time.split(':').map(Number)
      let durationMins = (eh * 60 + em) - (sh * 60 + sm)
      if (durationMins <= 0) durationMins = 60 // Fallback
      payload.duration = durationMins

      await createBlock(payload)
      setEventModal(false)
      fetchAppointments()
      toast.success('Fecha destacada en el calendario')
    } catch (error) {
      toast.error('Error insertando evento destacado')
    }
  }

  // ===== LÓGICA EVENTOS ESTRUCTURADOS ===== //
  const getEventData = (notesStr) => {
    try {
      const data = JSON.parse(notesStr || '{}')
      return { text: data.text || notesStr, color: data.color || 'blue' }
    } catch {
      return { text: notesStr || '', color: 'blue' }
    }
  }

  // ===== LÓGICA DE FILTROS =====
  const todayStr = today()
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const safeDate = (dbDate) => (dbDate ? dbDate.split('T')[0] : '')

  const allPending = appointments.filter(a => a.status === 'pending')
  const confirmedForDate = appointments.filter(a => a.status === 'confirmed' && safeDate(a.date) === date)
  const completedForDate = appointments.filter(a => a.status === 'completed' && safeDate(a.date) === date)
  const cancelledForDate = appointments.filter(a => ['cancelled', 'cancelled_occupied'].includes(a.status) && safeDate(a.date) === date && !a.client_name?.includes('Evento'))

  const activeBlocksArray = appointments.filter(a => a.status === 'cancelled_occupied' && a.client_name?.includes('Bloqueo'))
  
  const allEventsArray = appointments.filter(a => a.status === 'cancelled' && a.client_name?.includes('Evento'))
  const eventForDate = allEventsArray.find(a => safeDate(a.date) === date)

  const eventBlue = allEventsArray.filter(e => getEventData(e.notes).color === 'blue').map(e => new Date(safeDate(e.date) + 'T12:00:00'))
  const eventRed = allEventsArray.filter(e => getEventData(e.notes).color === 'red').map(e => new Date(safeDate(e.date) + 'T12:00:00'))
  const eventGreen = allEventsArray.filter(e => getEventData(e.notes).color === 'green').map(e => new Date(safeDate(e.date) + 'T12:00:00'))
  const eventPurple = allEventsArray.filter(e => getEventData(e.notes).color === 'purple').map(e => new Date(safeDate(e.date) + 'T12:00:00'))
  const eventAmber = allEventsArray.filter(e => getEventData(e.notes).color === 'amber').map(e => new Date(safeDate(e.date) + 'T12:00:00'))

  const boxOfficeToday = completedForDate.reduce((acc, a) => acc + parseFloat(a.price || 0), 0)

  const pendingForDate = allPending.filter(a => safeDate(a.date) === date)
  const pendingSemana = allPending.filter(a => safeDate(a.date) > todayStr && safeDate(a.date) <= next7DaysStr && safeDate(a.date) !== date)
  const pendingProx = allPending.filter(a => safeDate(a.date) > next7DaysStr && safeDate(a.date) !== date)
  const pendingAtrasados = allPending.filter(a => safeDate(a.date) < todayStr && safeDate(a.date) !== date)

  const totalPending = pendingForDate.length + pendingSemana.length + pendingProx.length + pendingAtrasados.length
  
  // Arreglo de fechas para el Calendario (Rojo para las cancelaciones)
  const cancelledDatesArray = appointments
    .filter(a => ['cancelled', 'cancelled_occupied'].includes(a.status) && !a.client_name?.includes('Evento'))
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
              <div className="flex gap-4 sm:gap-6 w-full min-w-0 flex-1 pr-2 sm:pr-4 cursor-default">
                <div className="text-sm font-semibold text-slate-900 w-12 pt-0.5 shrink-0 tabular-nums">
                  {a.start_time.slice(0, 5)}
                </div>
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {a.client_name}
                    </p>
                    {isLiberating && <span className="text-xs text-yellow-600 font-normal truncate">(Liberando slot temporalmente...)</span>}
                    {(() => {
                      const count = a.client_history_count || 1;
                      if (count === 1) return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shadow-sm">NUEVO 🥇</span>
                      if (count > 1) return <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded shadow-sm">FRECUENTE 🔥</span>
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
                        className="h-11 sm:h-9 text-xs text-yellow-800 bg-yellow-200/50 hover:bg-yellow-200 hover:text-yellow-900 border border-yellow-300/50 px-3 sm:px-2"
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
                  <div className="flex gap-1 sm:gap-2">
                     <Button size="sm" className="h-10 sm:h-9 w-10 sm:w-auto px-0 sm:px-3 bg-[#34C759] hover:bg-[#2eaa4d] text-white border-none shadow-md shadow-emerald-100 rounded-xl sm:rounded-md transition-all active:scale-95" onClick={() => handleStatus(a.id, 'confirmed')}>
                       <Check className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                       <span className="hidden sm:inline">Confirmar</span>
                     </Button>
                     <Button size="sm" variant="ghost" className="h-10 sm:h-9 w-10 sm:w-auto px-0 sm:px-3 text-red-600 bg-red-50 hover:bg-red-100/80 hover:text-red-700 border-none rounded-xl sm:rounded-md transition-all active:scale-95" onClick={() => setPendingCancelModal(a)}>
                       <X className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                       <span className="hidden sm:inline">Rechazar</span>
                     </Button>
                  </div>
                )}
                {a.status === 'confirmed' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950">
                      <MoreVertical className="h-5 w-5" />
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
          </div>
          <p className="text-sm text-slate-500 mt-1">Navegá entre fechas, bloqueos o revisá turnos pendientes.</p>
        </div>

        {business.slug && (
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-100 shadow-sm max-w-[280px] sm:max-w-sm shrink-0">
            <div className="flex flex-col overflow-hidden px-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Link público</span>
              <span className="text-xs text-slate-600 truncate w-32 sm:w-48 font-medium">{publicLink}</span>
            </div>
            <Button variant="ghost" className="h-9 w-9 px-0 flex-shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center" onClick={copyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Calendario ARRIBA en Mobile para acceso rápido */}
      <div className="flex flex-col lg:flex-row-reverse gap-8">
        
        {/* === LADO SECUNDARIO (Derecha): CALENDARIO Y COUNTERS === */}
        <div className="w-full lg:w-[260px] shrink-0 space-y-3">

          {isMobile && !isCalendarExpanded ? (
            <WeeklyCalendar
              selectedDate={calendarDate}
              onSelect={handleCalendarSelect}
              onExpand={() => setIsCalendarExpanded(true)}
              modifiers={{ 
                cancelled: cancelledDatesArray, 
                evtBlue: eventBlue, 
                evtRed: eventRed, 
                evtGreen: eventGreen, 
                evtPurple: eventPurple, 
                evtAmber: eventAmber 
              }}
              modifiersClassNames={{ 
                cancelled: "bg-red-500",
                evtBlue: "bg-blue-500",
                evtRed: "bg-rose-500",
                evtGreen: "bg-[#34C759]",
                evtPurple: "bg-purple-500",
                evtAmber: "bg-amber-500"
              }}
              actions={
                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-slate-50">
                  <Button size="sm" className="flex-1 h-11 text-[10px] bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl font-bold uppercase tracking-wider" onClick={() => setBlockModal(true)}>
                    Bloquear Día/Horario
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-11 text-[10px] text-blue-600 border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:text-blue-700 shadow-sm rounded-xl font-bold uppercase tracking-wider" onClick={() => setEventModal(true)}>
                    Destacar Día/Evento
                  </Button>
                </div>
              }
            />
          ) : (
            <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden rounded-2xl max-h-[50vh] lg:max-h-none overflow-y-auto lg:overflow-visible transition-all duration-300">
              <CardContent className="p-1">
                <Calendar
                  mode="single"
                  locale={es}
                  selected={calendarDate}
                  onSelect={handleCalendarSelect}
                  modifiers={{ 
                    cancelled: cancelledDatesArray, 
                    evtBlue: eventBlue, 
                    evtRed: eventRed, 
                    evtGreen: eventGreen, 
                    evtPurple: eventPurple, 
                    evtAmber: eventAmber 
                  }}
                  modifiersClassNames={{ 
                    cancelled: "text-red-500 font-bold bg-red-50 ring-1 ring-inset ring-red-200 rounded-full",
                    evtBlue: "text-blue-500 font-bold bg-blue-50 ring-1 ring-inset ring-blue-200 rounded-full",
                    evtRed: "text-rose-500 font-bold bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-full",
                    evtGreen: "text-[#34C759] font-bold bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-full",
                    evtPurple: "text-purple-500 font-bold bg-purple-50 ring-1 ring-inset ring-purple-200 rounded-full",
                    evtAmber: "text-amber-500 font-bold bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-full"
                  }}
                  className="mx-auto text-sm scale-90 origin-top -mb-6"
                />
                
                <div className="pt-2 px-4 pb-4">
                  {isMobile && (
                    <div className="flex justify-center mb-4">
                      <Button variant="ghost" size="sm" onClick={() => setIsCalendarExpanded(false)} className="text-xs text-slate-400 font-medium h-8">
                        Contraer vista semanal
                      </Button>
                    </div>
                  )}
                  {eventForDate && (() => {
                    const evData = getEventData(eventForDate.notes)
                    const mapBorders = {
                      blue: 'bg-blue-50 border-blue-200 text-blue-700',
                      red: 'bg-rose-50 border-rose-200 text-rose-700',
                      green: 'bg-emerald-50 border-emerald-100 text-[#34C759]',
                      purple: 'bg-purple-50 border-purple-200 text-purple-700',
                      amber: 'bg-amber-50 border-amber-200 text-amber-700'
                    }
                    return (
                      <div className={`mb-3 p-3 rounded-lg border shadow-sm flex items-center justify-between ${mapBorders[evData.color]}`}>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-80">Evento Destacado</p>
                          <p className="font-semibold text-sm leading-tight">{evData.text}</p>
                          <p className="text-xs opacity-80 mt-1">{eventForDate.start_time.slice(0,5)} hs - {eventForDate.end_time.slice(0,5)} hs</p>
                        </div>
                        <Button variant="ghost" className="opacity-70 hover:opacity-100 hover:bg-white/50 h-11 w-11 px-0 flex items-center justify-center shrink-0" onClick={() => handleStatus(eventForDate.id, 'cancelled')}> <X className="w-5 h-5"/> </Button>
                      </div>
                    )
                  })()}

                {/* === BOTONES DE ACCIÓN === */}
                <div className="px-4 pb-4">
                  <div className="flex gap-2 w-full pt-4 border-t border-slate-50">
                    <Button size="sm" className="flex-1 h-10 text-[10px] bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl font-bold uppercase tracking-wider" onClick={() => setBlockModal(true)}>
                      Bloquear Día/Horario
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-10 text-[10px] text-blue-600 border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:text-blue-700 shadow-sm rounded-xl font-bold uppercase tracking-wider" onClick={() => setEventModal(true)}>
                      Destacar Día/Evento
                    </Button>
                  </div>
                </div>

                {/* === TOTALES COMPACTOS === */}
                <div className="px-4 pb-4">
                  {boxOfficeToday > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-bold uppercase text-[#34C759] tracking-widest opacity-80">Caja del Día</span>
                        <span className="text-sm font-bold text-slate-900">${boxOfficeToday.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </CardContent>
            </Card>
          )}
        </div>



        {/* === LADO PRINCIPAL (Izquierda): PESTAÑAS (TABS) === */}
        <div className="flex-1 min-w-0 w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto no-scrollbar mask-fade-edges pb-2 -mb-2">
              <TabsList className="mb-4 bg-slate-100/50 p-1 rounded-xl flex w-max min-w-full justify-start sm:justify-center border-none">
                <TabsTrigger value="pendientes" className="relative rounded-lg h-10 px-4 transition-all data-[state=active]:bg-transparent data-[state=active]:text-yellow-700 data-[state=active]:shadow-none">
                  Pendientes {totalPending > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px] bg-yellow-100 text-yellow-700 border-none">{totalPending}</Badge>}
                  <TabUnderline value="pendientes" activeTab={activeTab} color="bg-yellow-500" />
                </TabsTrigger>
                <TabsTrigger value="confirmados" className="relative rounded-lg h-10 px-4 transition-all data-[state=active]:bg-transparent data-[state=active]:text-[#269442] data-[state=active]:shadow-none">
                  Confirmados {confirmedForDate.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px] bg-emerald-100 text-[#269442] border-none">{confirmedForDate.length}</Badge>}
                  <TabUnderline value="confirmados" activeTab={activeTab} color="bg-[#34C759]" />
                </TabsTrigger>
                <TabsTrigger value="cancelados" className="relative rounded-lg h-10 px-4 transition-all data-[state=active]:bg-transparent data-[state=active]:text-red-700 data-[state=active]:shadow-none">
                  Cancelados {cancelledForDate.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px] bg-red-100 text-red-700 border-none">{cancelledForDate.length}</Badge>}
                  <TabUnderline value="cancelados" activeTab={activeTab} color="bg-red-500" />
                </TabsTrigger>
              </TabsList>
            </div>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear Horario Rápido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBlockTimeRequest}>
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
                    <Label className="text-xs uppercase text-slate-400 font-bold ml-1">Hora inicio</Label>
                    {isMobile ? (
                      <WheelTimePicker value={blockForm.start_time} onChange={val => setBlockForm({...blockForm, start_time: val})} />
                    ) : (
                      <input type="time" required={!blockForm.fullDay} value={blockForm.start_time} onChange={e => setBlockForm({...blockForm, start_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs uppercase text-slate-400 font-bold ml-1">Hora fin</Label>
                    {isMobile ? (
                      <WheelTimePicker value={blockForm.end_time} onChange={val => setBlockForm({...blockForm, end_time: val})} />
                    ) : (
                      <input type="time" required={!blockForm.fullDay} value={blockForm.end_time} onChange={e => setBlockForm({...blockForm, end_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <Button type="button" variant="link" className="text-emerald-700 font-semibold px-0" onClick={() => setActiveBlocksListModal(true)}>
                Ver bloqueos activos ({activeBlocksArray.length})
              </Button>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="ghost" onClick={() => setBlockModal(false)}>Cancelar</Button>
                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">Continuar</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM BLOCK MODAL */}
      <Dialog open={confirmBlockModal} onOpenChange={setConfirmBlockModal}>
         <DialogContent className="sm:max-w-sm">
           <DialogHeader>
             <DialogTitle className="text-slate-900">¿Estás seguro de continuar?</DialogTitle>
           </DialogHeader>
           <div className="py-4 text-center">
             <p className="text-slate-600 leading-relaxed">
               Estás a punto de deshabilitar la disponibilidad de tu agenda pública para {blockForm.fullDay ? "todo el día de forma completa" : "el lapso seleccionado"}. En este tiempo nadie podrá reservar.
             </p>
           </div>
           <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="ghost" onClick={() => setConfirmBlockModal(false)}>Volver atrás</Button>
             <Button variant="destructive" onClick={submitBlockPayload}>Sí, Bloquear Espacio</Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* ACTIVE BLOCKS LIST MODAL */}
      <Dialog open={activeBlocksListModal} onOpenChange={setActiveBlocksListModal}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-2">
             <DialogTitle>Tus Bloqueos / Recesos Activos</DialogTitle>
             <p className="text-sm text-slate-500">Al deshabilitarlos, la agenda pública vuelve a permitir reservas en esos horarios inmediatamente.</p>
          </DialogHeader>
          <div className="space-y-3">
             {activeBlocksArray.length === 0 ? (
               <div className="bg-slate-50 border border-slate-100 rounded-lg p-6 text-center text-slate-500 text-sm">
                 Actualmente no tienes cierres forzados bloqueando la disponibilidad online.
               </div>
             ) : activeBlocksArray.map(b => (
               <div key={b.id} className="flex justify-between items-center p-3 border border-slate-200 shadow-sm rounded-lg hover:border-slate-300 transition-colors bg-white">
                   <div>
                     <p className="font-semibold text-sm text-slate-900">{formatDate(safeDate(b.date))}</p>
                     <p className="text-xs text-slate-500 font-medium mt-0.5">{b.start_time.slice(0,5)} hs - {b.end_time ? b.end_time.slice(0,5) : 'NaN'} hs</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-11 sm:h-9" onClick={() => handleStatus(b.id, 'cancelled')}>
                    Deshabilitar
                  </Button>
               </div>
             ))}
          </div>
          <DialogFooter className="mt-4">
             <Button variant="outline" className="w-full" onClick={() => setActiveBlocksListModal(false)}>Cerrar Listado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EVENT HIGHLIGHT MODAL */}
      <Dialog open={eventModal} onOpenChange={setEventModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-blue-600">Destacar Día / Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEventPayload}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-500 leading-relaxed">Coloreá de celeste una fecha especial en tu calendario sin bloquear ni afectar la agenda pública.</p>
              
              <div className="grid gap-2">
                <Label>Fecha del Evento</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" required value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Nombre del Asunto</Label>
                <input type="text" placeholder="Ej: Día de la Primavera 20% OFF" required value={eventForm.text} onChange={e => setEventForm({...eventForm, text: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>

              <div className="grid gap-2">
                <Label>Color del Calendario</Label>
                <div className="flex items-center gap-3 mt-1">
                  {[
                    { id: 'blue', text: 'bg-blue-500 ring-blue-200' },
                    { id: 'red', text: 'bg-rose-500 ring-rose-200' },
                    { id: 'green', text: 'bg-[#34C759] ring-emerald-200' },
                    { id: 'purple', text: 'bg-purple-500 ring-purple-200' },
                    { id: 'amber', text: 'bg-amber-500 ring-amber-200' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEventForm({...eventForm, color: c.id})}
                      className={`w-7 h-7 rounded-full shadow-sm ring-offset-2 transition-all ${c.text} ${eventForm.color === c.id ? `ring-2 scale-110` : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs uppercase text-slate-400 font-bold ml-1">Hora inicio</Label>
                  {isMobile ? (
                    <WheelTimePicker value={eventForm.start_time} onChange={val => setEventForm({...eventForm, start_time: val})} />
                  ) : (
                    <input type="time" required value={eventForm.start_time} onChange={e => setEventForm({...eventForm, start_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  )}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs uppercase text-slate-400 font-bold ml-1">Hora fin</Label>
                  {isMobile ? (
                    <WheelTimePicker value={eventForm.end_time} onChange={val => setEventForm({...eventForm, end_time: val})} />
                  ) : (
                    <input type="time" required value={eventForm.end_time} onChange={e => setEventForm({...eventForm, end_time: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEventModal(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Destacar Fecha</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}