import React, { useState, useMemo } from 'react'
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
import { useAppointments } from '@/hooks/useAppointments'
import AppointmentRow from '@/components/Agenda/AppointmentRow'
import AgendaSkeleton from '@/components/Agenda/AgendaSkeleton'
import AppointmentDialog from '@/components/Agenda/AppointmentDialog'
import AppointmentDetailDialog from '@/components/Agenda/AppointmentDetailDialog'
import { BlockTimeModal } from '@/components/Agenda/BlockTimeModal'
import Layout from '@/components/shared/Layout'
import { motion, AnimatePresence } from 'framer-motion'
import AgendaGridColumn from '@/components/panel/AgendaGridColumn'

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
  } = useAppointments()


  // Fetch blocked dates for the calendar whenever the visible month changes
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

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
    if (e) e.preventDefault() // Evita recargas si está en un form
    
    if (!activeBlock || !activeBlock.id) {
      toast.error('No se encontró el ID del bloqueo')
      return
    }

    try {
      const success = await removeAppointment(activeBlock.id)
      if (success) {
        // 1. Recargar los turnos del día seleccionado
        refresh() 
        
        // 2. Recargar los días rojos del calendario del mes actual
        fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
        
        toast.success('Bloqueo eliminado correctamente')
      }
    } catch (err) {
      console.error('Error al deshacer bloqueo:', err)
      // toast errors handled inside removeAppointment or here
    }
  }

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
  
  // Lógica de filtrado para la Vista Rápida (Modal)
  const quickViewFilteredAppointments = useMemo(() => {
    if (!quickView.isOpen || !quickView.filterType) return []
    
    const today = startOfToday()
    const tomorrow = addDays(today, 1)
    const weekStart = startOfToday()
    const todayForWeek = startOfToday()
    const weekStartAt = startOfWeek(todayForWeek, { weekStartsOn: 1 }) // Lunes
    const weekEndAt = endOfWeek(todayForWeek, { weekStartsOn: 1 })     // Domingo

    return (appointments || []).filter(app => {
      // 1. Filtrar por Estado (Pestaña Activa)
      let matchesStatus = false
      if (activeTab === 'pendientes') matchesStatus = ['pending', 'pending_block'].includes(app.status)
      if (activeTab === 'confirmados') matchesStatus = app.status === 'confirmed'
      if (activeTab === 'finalizados') matchesStatus = app.status === 'completed'
      if (activeTab === 'cancelados') matchesStatus = ['cancelled', 'cancelled_timeout', 'cancelled_occupied', 'no_show'].includes(app.status)
      
      if (!matchesStatus) return false

      // 2. Filtrar por Tiempo
      const appDate = new Date(app.start_at)
      if (quickView.filterType === 'hoy') return isSameDay(appDate, today)
      if (quickView.filterType === 'manana') return isSameDay(appDate, tomorrow)
      if (quickView.filterType === 'semana') {
        return isWithinInterval(appDate, { start: weekStartAt, end: weekEndAt })
      }
      
      return false
    }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
  }, [appointments, quickView.isOpen, quickView.filterType, activeTab])



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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda de Turnos</h1>
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

        <div className="flex flex-col lg:flex-row-reverse gap-8 w-full items-stretch pb-8">
          
          {/* Sidebar - Desktop Only sticky (Ahora a la DERECHA vía flex-row-reverse) */}
          <aside className="hidden lg:block w-full lg:w-[350px] lg:shrink-0 lg:pr-4 space-y-4 sticky top-6">
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
                      backgroundColor: '#fee2e2', // bg-red-100
                      color: '#dc2626',           // text-red-600
                      fontWeight: 'bold',
                      borderRadius: '0.5rem'
                    } 
                  }}
                />
              </div>
            </Card>

            {/* Undo Block Card */}
            {activeBlock && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900">Bloqueo Activo</p>
                    <p className="text-xs text-red-700 leading-tight mt-0.5">
                      Este día tiene un bloqueo de horario. Los clientes no pueden agendar.
                    </p>
                    <p className="text-xs italic text-red-600 mt-1">"{blockReason}"</p>
                  </div>
                </div>
                <Button 
                  type="button"
                  variant="destructive" 
                  size="sm" 
                  className="w-full h-9 rounded-xl font-bold text-xs"
                  onClick={handleUndoBlock}
                >
                  Deshacer Bloqueo
                </Button>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 h-11 text-sm font-medium text-white hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => setShowBlockModal(true)}
              >
                <Lock className="w-4 h-4" />
                Bloquear
              </button>
              <button 
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 h-11 text-sm font-medium text-white hover:bg-blue-600 hover:text-white transition-colors"
              >
                <Clock className="w-4 h-4" />
                Horarios
              </button>
            </div>
          </aside>

          {/* Main Agenda Column (Ahora a la IZQUIERDA vía flex-row-reverse) */}
          <div className="flex-1 w-full lg:pl-4 flex flex-col gap-6 items-start justify-start pt-0">
            
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
                      className="w-full pl-10 pr-4 py-2.5 h-11 bg-slate-50/80 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button type="button" className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-slate-50/80 text-slate-400 border border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm active:scale-95 shrink-0">
                      <Filter className="w-5 h-5" />
                    </button>
                    
                    <button 
                      onClick={() => setIsGridView(!isGridView)}
                      className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-slate-50/80 text-slate-400 border border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shrink-0 shadow-sm active:scale-95"
                      title={isGridView ? "Vista Lista" : "Vista Tablero"}
                    >
                      {isGridView ? <Rows3 className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* 2. AREA DE CONTENIDO (LISTA O TABLERO KANBAN) */}
                {isGridView ? (
                  /* --- MODO TABLERO KANBAN (GRID VIEW) --- */
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 w-full mt-4 items-start">
                    <AgendaGridColumn 
                      title="Pendientes" 
                      count={pendientes.length} 
                      dotColor="bg-amber-400" 
                      items={pendientes} 
                      onCardClick={setSelectedAppointment}
                    />
                    <AgendaGridColumn 
                      title="Confirmados" 
                      count={confirmados.length} 
                      dotColor="bg-emerald-500" 
                      items={confirmados} 
                      onCardClick={setSelectedAppointment}
                    />
                    <AgendaGridColumn 
                      title="Finalizados" 
                      count={finalizados.length} 
                      dotColor="bg-blue-500" 
                      items={finalizados} 
                      onCardClick={setSelectedAppointment}
                    />
                    <AgendaGridColumn 
                      title="Cancelados" 
                      count={canceladosAusentes.length} 
                      dotColor="bg-rose-500" 
                      items={canceladosAusentes} 
                      onCardClick={setSelectedAppointment}
                    />
                  </div>
                ) : (
                  /* --- MODO LISTA CON SIDEBAR (CURRENT DESIGN) --- */
                  <Tabs 
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-col xl:flex-row gap-8 w-full mt-6 items-stretch"
                  >
                    
                    <div className="flex flex-col w-full xl:w-64 shrink-0 justify-between">
                      {/* MENÚ LATERAL IZQUIERDO */}
                      <TabsList className="flex flex-col h-auto w-full bg-white border border-slate-200 space-y-1 p-2 rounded-2xl items-stretch justify-start shadow-sm mb-6">
                        <TabsTrigger 
                          value="pendientes" 
                          className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900 hover:text-slate-400 hover:bg-amber-50/30 transition-all group"
                        >
                          <span>Pendientes</span>
                          <span className="bg-amber-200 text-amber-800 py-0.5 px-2.5 rounded-full text-xs font-bold">{pendientes.length}</span>
                        </TabsTrigger>

                        <TabsTrigger 
                          value="confirmados" 
                          className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900 hover:text-slate-400 hover:bg-emerald-50/30 transition-all group"
                        >
                          <span>Confirmados</span>
                          <span className="bg-emerald-200 text-emerald-800 py-0.5 px-2.5 rounded-full text-xs font-bold">{confirmados.length}</span>
                        </TabsTrigger>

                        <TabsTrigger 
                          value="finalizados" 
                          className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 hover:text-slate-400 hover:bg-blue-50/30 transition-all group"
                        >
                          <span>Finalizados</span>
                          <span className="bg-blue-200 text-blue-800 py-0.5 px-2.5 rounded-full text-xs font-bold">{finalizados.length}</span>
                        </TabsTrigger>

                        <TabsTrigger 
                          value="cancelados" 
                          className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-black border-l-4 border-transparent data-[state=active]:border-rose-500 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-900 hover:text-slate-400 hover:bg-rose-50/30 transition-all group"
                        >
                          <span>Cancelados</span>
                          <span className="bg-rose-200 text-rose-800 py-0.5 px-2.5 rounded-full text-xs font-bold">{canceladosAusentes.length}</span>
                        </TabsTrigger>
                      </TabsList>

                      <div className="w-full mt-auto pt-10 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4 px-1">Turnos de:</h4>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setQuickView({ isOpen: true, filterType: 'hoy' })} 
                            className="w-full py-3 px-4 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-left flex items-center justify-between group"
                          >
                            <span>Hoy</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                          </button>
                          <button 
                            onClick={() => setQuickView({ isOpen: true, filterType: 'manana' })} 
                            className="w-full py-3 px-4 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-left flex items-center justify-between group"
                          >
                            <span>Mañana</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                          </button>
                          <button 
                            onClick={() => setQuickView({ isOpen: true, filterType: 'semana' })} 
                            className="w-full py-3 px-4 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-left flex items-center justify-between group"
                          >
                            <span>Esta Semana</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CONTENEDOR DE TARJETAS (Derecha) */}
                    <div className="flex-1 w-full">
                      <TabsContent value="pendientes" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {pendientes.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                              {pendientes.map(appointment => (
                                <AppointmentRow 
                                  key={appointment.id}
                                  appointment={appointment}
                                  onClick={(app) => setSelectedAppointment(app)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[204px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="confirmados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {confirmados.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                              {confirmados.map(appointment => (
                                <AppointmentRow 
                                  key={appointment.id}
                                  appointment={appointment}
                                  onClick={(app) => setSelectedAppointment(app)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[204px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="finalizados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {finalizados.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                              {finalizados.map(appointment => (
                                <AppointmentRow 
                                  key={appointment.id}
                                  appointment={appointment}
                                  onClick={(app) => setSelectedAppointment(app)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[204px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="cancelados" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-300">
                        {canceladosAusentes.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                              {canceladosAusentes
                                .sort((a, b) => a.time?.localeCompare(b.time || ''))
                                .map(appointment => (
                                <AppointmentRow 
                                  key={appointment.id}
                                  appointment={appointment}
                                  onClick={(app) => setSelectedAppointment(app)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[204px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos</p>
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                )}
              </>
            )}
          </div>
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

      </div>
      {/* MODAL DE VISTA RÁPIDA (QUICK VIEW) */}
      <AnimatePresence>
        {quickView.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
            >
              
              {/* HEADER DEL MODAL */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Vista Rápida: <span className="text-blue-600 capitalize">{quickView.filterType}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Filtrando {activeTab} para el periodo seleccionado
                  </p>
                </div>
                <Button 
                  onClick={() => setQuickView({ isOpen: false, filterType: null })} 
                  variant="ghost"
                  size="sm"
                  className="rounded-xl hover:bg-slate-100 text-slate-500 font-bold"
                >
                  Cerrar
                </Button>
              </div>

              {/* CUERPO DEL MODAL CON LAS TARJETAS (GRILLA MINIMALISTA) */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {quickViewFilteredAppointments.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {quickViewFilteredAppointments.map(appointment => {
                      // Función para obtener colores según estado
                      const getStatusStyles = (status) => {
                        const base = "p-3 rounded-xl border flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer shadow-sm";
                        if (['pending', 'pending_block'].includes(status)) 
                          return `${base} bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100`;
                        if (status === 'confirmed')
                          return `${base} bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100`;
                        if (status === 'completed')
                          return `${base} bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100`;
                        return `${base} bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100`;
                      };

                      return (
                        <div 
                          key={appointment.id}
                          onClick={() => {
                            setSelectedAppointment(appointment)
                            setQuickView({ isOpen: false, filterType: null })
                          }}
                          className={getStatusStyles(appointment.status)}
                        >
                          <span className="text-sm font-black tracking-tight">
                            {format(new Date(appointment.start_at), 'HH:mm')}
                          </span>
                          <span className="text-[11px] font-bold opacity-80 truncate">
                            {appointment.client_name || appointment.service_name || 'Sin nombre'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full h-48 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos</p>
                  </div>
                )}
              </div>

              {/* FOOTER DEL MODAL */}
              <div className="px-6 py-3 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  Total: {quickViewFilteredAppointments.length}
                </span>
                <p className="text-[10px] text-slate-400 font-medium">
                  Resultados basados en tu vista de {activeTab}
                </p>
              </div>
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppointmentDialog 
        open={showDialog} 
        onClose={() => setShowDialog(false)} 
        onConfirm={handleConfirmAdd} 
      />
      <AppointmentDetailDialog 
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />
      <BlockTimeModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleConfirmBlock}
        selectedDate={date}
      />
    </Layout>
  )
}

function Card({ children, className }) {
  return (
    <div className={`bg-white border ${className}`}>
      {children}
    </div>
  )
}
