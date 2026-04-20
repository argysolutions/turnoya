import React, { useState, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
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

        <div className="flex flex-col lg:flex-row-reverse gap-8 w-full items-start pb-8">
          
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
                <div className="mt-3 pt-3 border-t border-slate-50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-sm font-medium text-slate-500 hover:text-slate-900 rounded-xl"
                    onClick={() => setDate(new Date())}
                  >
                    Hoy: {format(new Date(), "d 'de' MMM")}
                  </Button>
                </div>
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
                      className="w-full pl-10 pr-4 py-2.5 h-11 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button type="button" className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-md active:scale-95 shrink-0">
                      <Filter className="w-5 h-5" />
                    </button>
                    
                    <button 
                      onClick={() => setIsGridView(!isGridView)}
                      className="flex items-center justify-center p-2.5 h-11 w-11 rounded-full bg-slate-900 text-white hover:bg-blue-600 transition-all shrink-0 shadow-md active:scale-95"
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
                  <Tabs defaultValue="pendientes" className="flex flex-col xl:flex-row gap-8 w-full mt-6 items-start">
                    
                    {/* MENÚ LATERAL IZQUIERDO */}
                    <TabsList className="flex flex-col h-auto w-full xl:w-64 bg-white border border-slate-200 space-y-1 p-2 rounded-2xl items-stretch justify-start shrink-0 shadow-sm">
                      <TabsTrigger 
                        value="pendientes" 
                        className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-slate-900 border-l-4 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900 hover:text-amber-600 hover:bg-amber-50/50 transition-all"
                      >
                        <span>Pendientes</span>
                        <span className="bg-amber-100 text-amber-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{pendientes.length}</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="confirmados" 
                        className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-slate-900 border-l-4 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all"
                      >
                        <span>Confirmados</span>
                        <span className="bg-emerald-100 text-emerald-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{confirmados.length}</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="finalizados" 
                        className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-slate-900 border-l-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                      >
                        <span>Finalizados</span>
                        <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{finalizados.length}</span>
                      </TabsTrigger>

                      <TabsTrigger 
                        value="cancelados" 
                        className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl text-slate-900 border-l-4 border-transparent data-[state=active]:border-rose-500 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-900 hover:text-rose-600 hover:bg-rose-50/50 transition-all"
                      >
                        <span>Cancelados</span>
                        <span className="bg-rose-100 text-rose-700 py-0.5 px-2.5 rounded-full text-xs font-bold">{canceladosAusentes.length}</span>
                      </TabsTrigger>
                    </TabsList>

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
                          <div className="w-full flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                            <Filter className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay turnos pendientes</p>
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
                          <div className="w-full flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                            <Filter className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay turnos confirmados</p>
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
                          <div className="w-full flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                            <Filter className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos finalizados</p>
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
                          <div className="w-full flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                            <Filter className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin turnos cancelados</p>
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
