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
  ChevronRight
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

  console.log('DEBUG: FECHAS BLOQUEADAS ACTUALES:', blockedDates)

  // Fetch blocked dates for the calendar whenever the visible month changes
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  React.useEffect(() => {
    fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
  }, [currentMonth, fetchBlockedDates])

  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)

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
            <span className="hidden md:block text-slate-500 font-bold bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50 text-sm capitalize">
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
          <span className="text-sm font-bold text-slate-900 capitalize">
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
                {/* 1. BUSCADOR Y BOTÓN DE FILTRO (ARRIBA) */}
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
                  <button type="button" className="flex items-center justify-center p-2.5 h-11 w-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm shrink-0">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>

                {/* 2. PESTAÑAS / ESTADOS (DEBAJO DEL BUSCADOR) */}
                <Tabs defaultValue="pendientes" className="w-full">
                  <TabsList className="flex w-full justify-start h-auto p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar flex-nowrap border border-slate-200/50 mb-6">
                    <TabsTrigger value="pendientes" className="flex gap-2.5 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all whitespace-nowrap">
                      <span className="font-bold text-xs sm:text-sm">Pendientes</span>
                      <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px] font-black">
                        {filteredSections.pendiente.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="confirmados" className="flex gap-2.5 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 transition-all whitespace-nowrap">
                      <span className="font-bold text-xs sm:text-sm">Confirmados</span>
                      <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px] font-black">
                        {filteredSections.confirmado.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="finalizados" className="flex gap-2.5 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 transition-all whitespace-nowrap">
                      <span className="font-bold text-xs sm:text-sm">Finalizados</span>
                      <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px] font-black">
                        {filteredSections.finalizado.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="cancelados" className="flex gap-2.5 px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-rose-600 transition-all whitespace-nowrap">
                      <span className="font-bold text-xs sm:text-sm">Cancelados</span>
                      <span className="bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full text-[10px] font-black">
                        {filteredSections.cancelado.length + filteredSections.ausente.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* 3. CONTENIDO Y EMPTY STATE (OCUPANDO TODO EL ANCHO) */}
                  <TabsContent value="pendientes" className="w-full mt-0 outline-none animate-in fade-in slide-in-from-left-4 duration-300">
                    {filteredSections.pendiente.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                          {filteredSections.pendiente.map(appointment => (
                            <AppointmentRow 
                              key={appointment.id}
                              appointment={appointment}
                              onClick={(app) => setSelectedAppointment(app)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Filter className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">No hay turnos pendientes</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="confirmados" className="w-full mt-0 outline-none animate-in fade-in slide-in-from-left-4 duration-300">
                    {filteredSections.confirmado.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                          {filteredSections.confirmado.map(appointment => (
                            <AppointmentRow 
                              key={appointment.id}
                              appointment={appointment}
                              onClick={(app) => setSelectedAppointment(app)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Filter className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">No hay turnos confirmados</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="finalizados" className="w-full mt-0 outline-none animate-in fade-in slide-in-from-left-4 duration-300">
                    {filteredSections.finalizado.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                          {filteredSections.finalizado.map(appointment => (
                            <AppointmentRow 
                              key={appointment.id}
                              appointment={appointment}
                              onClick={(app) => setSelectedAppointment(app)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Filter className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sin turnos finalizados</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="cancelados" className="w-full mt-0 outline-none animate-in fade-in slide-in-from-left-4 duration-300">
                    {([...filteredSections.cancelado, ...filteredSections.ausente]).length > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                          {([...filteredSections.cancelado, ...filteredSections.ausente])
                            .sort((a, b) => a.time.localeCompare(b.time))
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
                      <div className="w-full flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Filter className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sin turnos cancelados</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
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
