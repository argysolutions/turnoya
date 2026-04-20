import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { format, isSameDay, startOfToday, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Plus, 
  Search,
  Lock,
  Clock,
  Filter,
  Inbox,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid as Grid3X3,
  Rows3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from '@/components/ui/card'
import { useAppointments } from '@/hooks/useAppointments'
import AppointmentCard from '@/components/Agenda/AppointmentCard'
import AgendaSkeleton from '@/components/Agenda/AgendaSkeleton'
import AppointmentDialog from '@/components/Agenda/AppointmentDialog'
import AppointmentDetailDialog from '@/components/Agenda/AppointmentDetailDialog'
import { BlockTimeModal } from '@/components/Agenda/BlockTimeModal'
import Layout from '@/components/shared/Layout'
import { motion, AnimatePresence } from 'framer-motion'
import AgendaGridColumn from '@/components/panel/AgendaGridColumn'
import { toast } from 'sonner'

export default function AgendaPage() {
  const { 
    date, 
    setDate, 
    appointments, 
    loading, 
    addAppointment, 
    updateStatus,
    removeAppointment,
    addBlock,
    blockedDates,
    fetchBlockedDates,
    refresh
  } = useAppointments(new Date('2026-04-20T00:00:00'))


  // Fetch blocked dates for the calendar whenever the visible month changes
  const [currentMonth, setCurrentMonth] = React.useState(new Date('2026-04-20T00:00:00'))

  React.useEffect(() => {
    fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
  }, [currentMonth, fetchBlockedDates])

  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isGridView, setIsGridView] = useState(false)
  const [activeTab, setActiveTab] = useState('pendientes')
  const [quickView, setQuickView] = useState({ isOpen: false, filterType: null })
  const [quickViewStatusFilter, setQuickViewStatusFilter] = useState('all')
  const [hasInitializedTab, setHasInitializedTab] = useState(false)

  const handleConfirmAdd = async (data) => {
    await addAppointment(data)
    setShowDialog(false)
  }

  const handleUpdateStatus = async (id, status) => {
    await updateStatus(id, status)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este turno?')) {
      await removeAppointment(id)
    }
  }

  const handleConfirmBlock = async (data) => {
    try {
      await addBlock(data)
      setShowBlockModal(false)
      // Refresh monthly highlights after blocking
      fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    } catch (err) {
      // toast errors handled inside addBlock
    }
  }

  // Detect active block for the currently selected day
  const activeBlock = useMemo(() => {
    return (appointments || []).find(app => app.status === 'blocked')
  }, [appointments])

  const handleUndoBlock = async (e) => {
    if (e) e.preventDefault() 
    
    if (!activeBlock || !activeBlock.id) {
      toast.error('No se encontró el ID del bloqueo')
      return
    }

    try {
      const success = await removeAppointment(activeBlock.id)
      if (success) {
        refresh() 
        fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
        toast.success('Bloqueo eliminado correctamente')
      }
    } catch (err) {
      console.error('Error al deshacer bloqueo:', err)
    }
  }

  // Auto-selección de pestaña por prioridad al cargar
  React.useEffect(() => {
    // Esperamos a que loading sea false y que tengamos turnos para decidir la pestaña principal
    if (!loading && appointments && appointments.length > 0 && !hasInitializedTab) {
      const sections = {
        pendiente: appointments.filter(a => a.status === 'pending' || a.status === 'pending_block'),
        confirmado: appointments.filter(a => a.status === 'confirmed'),
        finalizado: appointments.filter(a => a.status === 'completed'),
        canceladoAusente: appointments.filter(a => ['cancelled', 'cancelled_timeout', 'cancelled_occupied', 'no_show'].includes(a.status)),
      }

      if (sections.pendiente.length > 0) setActiveTab('pendientes')
      else if (sections.confirmado.length > 0) setActiveTab('confirmados')
      else if (sections.finalizado.length > 0) setActiveTab('finalizados')
      else if (sections.canceladoAusente.length > 0) setActiveTab('cancelados')
      
      setHasInitializedTab(true)
    }
  }, [loading, appointments, hasInitializedTab])

  // Parse block reason safely
  const blockReason = useMemo(() => {
    if (!activeBlock?.notes) return "Bloqueo de agenda"
    try {
      const parsed = JSON.parse(activeBlock.notes)
      return parsed.text || "Bloqueo de agenda"
    } catch (e) {
      return activeBlock.notes
    }
  }, [activeBlock])

  const filteredSections = useMemo(() => {
    const list = (appointments || []).filter(app => 
      app.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.service_name?.toLowerCase().includes(search.toLowerCase())
    )

    return {
      pendiente: list.filter(a => a.status === 'pending' || a.status === 'pending_block'),
      confirmado: list.filter(a => a.status === 'confirmed'),
      finalizado: list.filter(a => a.status === 'completed'),
      cancelado: list.filter(a => ['cancelled', 'cancelled_timeout', 'cancelled_occupied'].includes(a.status)),
      ausente: list.filter(a => a.status === 'no_show'),
    }
  }, [appointments, search])
  
  const quickViewFilteredAppointments = useMemo(() => {
    if (!quickView.isOpen || !quickView.filterType) return []
    
    const today = startOfToday()
    const tomorrow = addDays(today, 1)
    const todayForWeek = startOfToday()
    const weekStartAt = startOfWeek(todayForWeek, { weekStartsOn: 1 }) // Lunes
    const weekEndAt = endOfWeek(todayForWeek, { weekStartsOn: 1 })     // Domingo

    return (appointments || []).filter(app => {
      // 1. Filtrar por Fecha
      const appDate = new Date(app.start_at)
      let matchesDate = false
      if (quickView.filterType === 'hoy') matchesDate = isSameDay(appDate, today)
      else if (quickView.filterType === 'manana') matchesDate = isSameDay(appDate, tomorrow)
      else if (quickView.filterType === 'semana') {
        matchesDate = isWithinInterval(appDate, { start: weekStartAt, end: weekEndAt })
      }
      
      if (!matchesDate) return false

      // 2. Filtrar por Estado (si no es 'all')
      if (quickViewStatusFilter === 'all') return true
      if (quickViewStatusFilter === 'pendientes') return ['pending', 'pending_block'].includes(app.status)
      if (quickViewStatusFilter === 'confirmados') return app.status === 'confirmed'
      if (quickViewStatusFilter === 'finalizados') return app.status === 'completed'
      if (quickViewStatusFilter === 'cancelados') return ['cancelled', 'cancelled_timeout', 'cancelled_occupied', 'no_show'].includes(app.status)
      
      return false
    }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
  }, [appointments, quickView.isOpen, quickView.filterType, quickViewStatusFilter])

  // Helper para estilos del QuickView basados en el filtro
  const quickViewTheme = useMemo(() => {
    if (quickView.filterType === 'hoy') return { color: 'blue', label: 'Hoy', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', secondary: 'text-blue-400', dot: 'bg-blue-600', shadow: 'shadow-blue-100' }
    if (quickView.filterType === 'manana') return { color: 'emerald', label: 'Mañana', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', secondary: 'text-emerald-400', dot: 'bg-emerald-600', shadow: 'shadow-emerald-100' }
    return { color: 'violet', label: 'Semana', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', secondary: 'text-violet-400', dot: 'bg-violet-600', shadow: 'shadow-violet-100' }
  }, [quickView.filterType])



  const pendientes = filteredSections.pendiente;
  const confirmados = filteredSections.confirmado;
  const finalizados = filteredSections.finalizado;
  const canceladosAusentes = [...filteredSections.cancelado, ...filteredSections.ausente];

  return (
    <Layout maxWidth="max-w-screen-2xl">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header - Consolidated following ClientesPage pattern */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-slate-900" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda de Turnos</h1>
            </div>
            <p className="text-sm text-slate-500 leading-tight">
              Gestioná tu día, confirma citas y optimizá tu tiempo de trabajo.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:block text-blue-600 font-bold bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 text-sm capitalize">
              {format(date, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            <Button 
              onClick={() => setShowDialog(true)}
              className="rounded-xl font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Turno
            </Button>
          </div>
        </header>

        {/* Date Selector Banner (Mobile friendly) */}
        <div className="mx-4 lg:mx-0 flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sm:hidden mb-2">
          <Button variant="ghost" size="icon" onClick={() => setDate(new Date(date.setDate(date.getDate() - 1)))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold text-blue-600 capitalize">
            {format(date, "EEEE d 'de' MMM", { locale: es })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setDate(new Date(date.setDate(date.getDate() + 1)))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* TRIPLE COLUMN LAYOUT */}
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col lg:flex-row gap-8 w-full items-start pb-8">
            
            {/* Sidebar IZQUIERDA - Filtros y Estados (Sticky) */}
            {!isGridView && (
              <aside className="hidden xl:flex flex-col w-64 shrink-0 sticky top-6 gap-10">
                <div className="flex flex-col w-full">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Turnos:</h4>
                  <TabsList className="flex flex-col h-auto w-full bg-white border border-slate-200 shadow-sm p-1.5 rounded-2xl items-stretch justify-start">
                    <TabsTrigger 
                      value="pendientes" 
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900 transition-all"
                    >
                      <span>Pendientes</span>
                      <span className="bg-amber-200 text-amber-800 py-0.5 px-2.5 rounded-full text-[10px] font-bold">{pendientes.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="confirmados" 
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900 transition-all"
                    >
                      <span>Confirmados</span>
                      <span className="bg-emerald-200 text-emerald-800 py-0.5 px-2.5 rounded-full text-[10px] font-black">{confirmados.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="finalizados" 
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 transition-all"
                    >
                      <span>Finalizados</span>
                      <span className="bg-blue-200 text-blue-800 py-0.5 px-2.5 rounded-full text-[10px] font-black">{finalizados.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="cancelados" 
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-rose-500 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-900 transition-all"
                    >
                      <span>Cancelados</span>
                      <span className="bg-rose-200 text-rose-800 py-0.5 px-2.5 rounded-full text-[10px] font-black">{canceladosAusentes.length}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* FILTROS RÁPIDOS - FORMATO MOSAICO PREMIUM */}
                <div className="w-full">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-1 border-t border-slate-100 pt-6">Vista Rápida:</h4>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setQuickView({ isOpen: true, filterType: 'hoy' })} 
                      className="w-full h-[60px] px-5 text-sm font-bold rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm overflow-hidden"
                    >
                      <div className="flex flex-col">
                        <span className="leading-tight">Hoy</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">Ver ahora</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                    <button 
                      onClick={() => setQuickView({ isOpen: true, filterType: 'manana' })} 
                      className="w-full h-[60px] px-5 text-sm font-bold rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm overflow-hidden"
                    >
                      <div className="flex flex-col">
                        <span className="leading-tight">Mañana</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">Día siguiente</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                    <button 
                      onClick={() => setQuickView({ isOpen: true, filterType: 'semana' })} 
                      className="w-full h-[60px] px-5 text-sm font-bold rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm overflow-hidden"
                    >
                      <div className="flex flex-col">
                        <span className="leading-tight">Esta Semana</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">Lun a Dom</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                  </div>
                </div>
              </aside>
            )}

            {/* Columna CENTRAL - Contenido (Buscador y Turnos) */}
            <div className="flex-1 w-full flex flex-col gap-6 items-start justify-start pt-0 min-w-0">
              {loading ? (
                <AgendaSkeleton />
              ) : (
                <>
                  {/* 1. BUSCADOR, BOTÓN DE FILTRO Y CONMUTADOR DE VISTA */}
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar cliente o servicio..." 
                        className="w-full pl-10 pr-4 py-2.5 h-11 bg-white border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button type="button" className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-500 focus:outline-none transition-all shadow-sm active:scale-95 shrink-0">
                        <Filter className="w-5 h-5" />
                      </button>
                      
                      <button 
                        onClick={() => setIsGridView(!isGridView)}
                        className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-500 focus:outline-none transition-all shrink-0 shadow-sm active:scale-95"
                        title={isGridView ? "Vista Lista" : "Vista Tablero"}
                      >
                        {isGridView ? <Rows3 className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {/* BANDEJA DE ACCIÓN PRIORITARIA: Solo se muestra si hay pendientes */}
                  {pendientes.length > 0 && (
                    <div className="w-full mb-8 mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                          Requieren Acción Inmediata ({pendientes.length})
                        </h3>
                      </div>
                      
                      {/* Grilla compacta de 3 columnas para los pendientes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full">
                        {pendientes.map(turno => (
                          <div key={`priority-pending-${turno.id}`} className="w-full">
                            <AppointmentCard appointment={turno} onClick={(app) => setSelectedAppointment(app)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. AREA DE CONTENIDO (LISTA O TABLERO KANBAN) */}
                  {isGridView ? (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 w-full mt-4 items-start">
                      <AgendaGridColumn title="Pendientes" count={pendientes.length} dotColor="bg-amber-400" items={pendientes} onCardClick={setSelectedAppointment} />
                      <AgendaGridColumn title="Confirmados" count={confirmados.length} dotColor="bg-emerald-500" items={confirmados} onCardClick={setSelectedAppointment} />
                      <AgendaGridColumn title="Finalizados" count={finalizados.length} dotColor="bg-blue-500" items={finalizados} onCardClick={setSelectedAppointment} />
                      <AgendaGridColumn title="Cancelados" count={canceladosAusentes.length} dotColor="bg-rose-500" items={canceladosAusentes} onCardClick={setSelectedAppointment} />
                    </div>
                  ) : (
                    <div className="flex-1 w-full flex flex-col gap-4">
                      
                      <TabsContent value="pendientes" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {pendientes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full pb-4">
                            {pendientes.map(appointment => (
                              <div key={appointment.id} className="w-full">
                                <AppointmentCard appointment={appointment} onClick={(app) => setSelectedAppointment(app)} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin turnos pendientes</h3>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="confirmados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {confirmados.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full pb-4">
                            {confirmados.map(appointment => (
                              <div key={appointment.id} className="w-full">
                                <AppointmentCard appointment={appointment} onClick={(app) => setSelectedAppointment(app)} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin turnos confirmados</h3>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="finalizados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {finalizados.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full pb-4">
                            {finalizados.map(appointment => (
                              <div key={appointment.id} className="w-full">
                                <AppointmentCard appointment={appointment} onClick={(app) => setSelectedAppointment(app)} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin turnos finalizados</h3>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="cancelados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {canceladosAusentes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full pb-4">
                            {canceladosAusentes.sort((a, b) => a.time?.localeCompare(b.time || '')).map(appointment => (
                              <div key={appointment.id} className="w-full">
                                <AppointmentCard appointment={appointment} onClick={(app) => setSelectedAppointment(app)} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin turnos cancelados</h3>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar DERECHA - Calendario y Acciones (Sticky) */}
            <aside className="hidden lg:flex flex-col w-full lg:w-[320px] shrink-0 space-y-4 sticky top-6">
              <Card className="border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    onMonthChange={setCurrentMonth}
                    className="w-full"
                    modifiers={{ blocked: blockedDates }}
                    modifiersStyles={{ 
                      blocked: { 
                        backgroundColor: '#fee2e2', 
                        color: '#dc2626', 
                        fontWeight: 'bold',
                        borderRadius: '0.5rem'
                      } 
                    }}
                  />
                </div>
              </Card>

              {activeBlock && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600"><Lock className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900 leading-tight">Bloqueo Activo</p>
                      <p className="text-[11px] text-red-700 leading-tight mt-1 truncate">"{blockReason}"</p>
                    </div>
                  </div>
                  <Button type="button" variant="destructive" size="sm" className="w-full h-9 rounded-xl font-bold text-xs" onClick={handleUndoBlock}>Deshacer Bloqueo</Button>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 h-11 text-sm font-medium text-white hover:bg-blue-600 transition-colors" onClick={() => setShowBlockModal(true)}>
                  <Lock className="w-4 h-4" /> Bloquear
                </button>
                <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 h-11 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                  <Clock className="w-4 h-4" /> Horarios
                </button>
              </div>
            </aside>
          </div>
        </Tabs>
      </div>

      <AppointmentDialog 
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleConfirmAdd}
        initialDate={date}
      />

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />

      <BlockTimeModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleConfirmBlock}
        initialDate={date}
      />

      <AnimatePresence>
        {quickView.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-hidden">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
              
              {/* MODAL HEADER */}
              <div className="px-8 pt-6 border-b border-slate-100 flex flex-col bg-white shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${quickViewTheme.dot} animate-pulse`} />
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Vista Rápida: <span className={`${quickViewTheme.text.replace('text-', 'text-opacity-100 text-')}`}>{quickViewTheme.label}</span>
                    </h2>
                  </div>
                  <Button 
                    onClick={() => {
                      setQuickView({ isOpen: false, filterType: null });
                      setQuickViewStatusFilter('all');
                    }} 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 text-slate-400"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </Button>
                </div>

                {/* MODAL INTERNAL FILTERS */}
                <Tabs value={quickViewStatusFilter} onValueChange={setQuickViewStatusFilter} className="w-full">
                  <TabsList className="bg-slate-50 p-1 rounded-xl h-10 mb-[-1px] border-b-0">
                    <TabsTrigger value="all" className="text-[11px] font-bold rounded-lg px-4 h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Todos</TabsTrigger>
                    <TabsTrigger value="pendientes" className="text-[11px] font-bold rounded-lg px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">Pendientes</TabsTrigger>
                    <TabsTrigger value="confirmados" className="text-[11px] font-bold rounded-lg px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Confirmados</TabsTrigger>
                    <TabsTrigger value="finalizados" className="text-[11px] font-bold rounded-lg px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Finalizados</TabsTrigger>
                    <TabsTrigger value="cancelados" className="text-[11px] font-bold rounded-lg px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm">Cancelados</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar p-6">
                {quickViewFilteredAppointments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
                    
                    {(() => {
                      let lastDateLabel = null;
                      return quickViewFilteredAppointments.map((appointment, idx) => {
                        const currentDateLabel = format(new Date(appointment.start_at), "EEEE d 'de' MMMM", { locale: es });
                        const isNewDay = currentDateLabel !== lastDateLabel;
                        if (isNewDay) lastDateLabel = currentDateLabel;

                        return (
                          <React.Fragment key={appointment.id}>
                            {quickView.filterType === 'semana' && isNewDay && (
                              <div className="col-span-full mb-2 mt-4 first:mt-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    {currentDateLabel}
                                  </span>
                                  <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
                                </div>
                              </div>
                            )}
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.01 }}
                              className="w-full"
                            >
                              <AppointmentCard 
                                appointment={appointment} 
                                onClick={(app) => { 
                                  setSelectedAppointment(app); 
                                  setQuickView({ isOpen: false, filterType: null }); 
                                  setQuickViewStatusFilter('all');
                                }} 
                              />
                            </motion.div>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin turnos agendados</h3>
                    <p className="text-xs text-slate-300 mt-1">Probá cambiando el filtro lateral para ver otros estados.</p>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border", quickViewTheme.bg, quickViewTheme.border, quickViewTheme.text)}>
                    Total: {quickViewFilteredAppointments.length} turnos
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic">Deslizá para navegar {quickView.filterType === 'semana' ? 'hacia abajo' : 'frecuencialmente'} →</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
