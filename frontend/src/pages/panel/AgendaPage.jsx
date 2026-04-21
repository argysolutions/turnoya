import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
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
  ChevronDown,
  LayoutGrid as Grid3X3,
  Rows3,
  CheckCircle,
  CalendarX2,
  Sun,
  Sunrise,
  CalendarRange,
  CalendarDays,
  MoreVertical,
  Check,
  X,
  XCircle,
  CalendarCheck,
  User,
  MapPin,
  MessageSquare,
  Menu
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
import BlockTimeModal from '@/components/Agenda/BlockTimeModal'
import Layout from '@/components/shared/Layout'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import AgendaGridColumn from '@/components/panel/AgendaGridColumn'
import { toast } from 'sonner'

export default function AgendaPage() {
  const { 
    date, 
    setDate, 
    appointments, 
    setAppointments,
    loading, 
    addAppointment, 
    updateStatus, 
    removeAppointment,
    addBlock, 
    blockedDates, 
    fetchBlockedDates, 
    refresh
  } = useAppointments(new Date('2026-04-20'))


  // Fetch blocked dates for the calendar whenever the visible month changes
  const [currentMonth, setCurrentMonth] = React.useState(new Date('2026-04-20T00:00:00'))

  React.useEffect(() => {
    fetchBlockedDates(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
  }, [currentMonth, fetchBlockedDates])

  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false)
  const [isGridView, setIsGridView] = useState(false)
  const [activeTab, setActiveTab] = useState('pendientes')
  const [quickView, setQuickView] = useState({ isOpen: false, filterType: null })
  const [quickViewStatusFilter, setQuickViewStatusFilter] = useState('all')
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const [isPriorityExpanded, setIsPriorityExpanded] = useState(true)
  const [showSearchFilters, setShowSearchFilters] = useState(false)
  const [activeSearchFilters, setActiveSearchFilters] = useState({
    jornada: [], // 'manana', 'tarde'
    cliente: [], // 'frecuente', 'nuevo'
    staff: [] // array de IDs o nombres
  })
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Lógica de Swipe Sincronizado para Móvil (High Fidelity)
  const tabs = ['pendientes', 'confirmados', 'finalizados', 'cancelados']
  const currentIndex = tabs.indexOf(activeTab)
  
  // Motion values para el carrusel
  const dragX = useMotionValue(0)
  
  // Posición base del carrusel (donde debería estar según la pestaña activa)
  const [baseX, setBaseX] = useState(0)
  
  useEffect(() => {
    // Cuando cambia el tab, actualizamos la base con el índice correspondiente
    setBaseX(-tabs.indexOf(activeTab) * window.innerWidth)
    dragX.set(0) // Reiniciar el offset de arrastre
  }, [activeTab])

  // X final del carrusel = Base (pestaña) + Offset (arrastre manual)
  const carouselX = useTransform(dragX, (val) => baseX + val)
  const springCarouselX = useSpring(carouselX, { stiffness: 400, damping: 40 })

  // Sincronización del Indicador de Pestaña (Interpolación)
  // Mapeamos el progreso del carrusel a la posición física de la píldora [0% a 75%]
  const pillX = useTransform(carouselX, 
    [-(tabs.length - 1) * window.innerWidth, 0], 
    ['75%', '0%']
  )

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 50
    const { offset, velocity } = info
    
    if (offset.x < -swipeThreshold || velocity.x < -500) {
      // Siguiente
      const nextIndex = Math.min(currentIndex + 1, tabs.length - 1)
      setActiveTab(tabs[nextIndex])
    } else if (offset.x > swipeThreshold || velocity.x > 500) {
      // Anterior
      const prevIndex = Math.max(currentIndex - 1, 0)
      setActiveTab(tabs[prevIndex])
    } else {
      // Snap al mismo
      dragX.set(0)
    }
  }

  // Derivado para saber si hay filtros activos y cambiar el color del botón
  const hasActiveFilters = Object.values(activeSearchFilters).some(arr => arr.length > 0)

  const scrollRef = useRef(null)
  const searchFiltersRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchFiltersRef.current && !searchFiltersRef.current.contains(event.target)) {
        setShowSearchFilters(false)
      }
    }

    if (showSearchFilters) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchFilters])

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

  const handleAcceptAllPending = async () => {
    try {
      // 1. Actualización de Estado Local (Optimistic UI)
      setAppointments(prevAppointments => 
        prevAppointments.map(turno => 
          turno.status === 'pending' || turno.status === 'pending_block'
            ? { ...turno, status: 'confirmed' } 
            : turno
        )
      );

      // 2. Notificación de éxito
      toast.success("Turnos confirmados exitosamente");
    } catch (error) {
      console.error("Error confirmando turnos:", error);
      toast.error("Hubo un error al confirmar los turnos");
    }
  };

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

  const quickViewCounts = useMemo(() => {
    if (!quickView.isOpen || !quickView.filterType) return { all: 0, pendientes: 0, confirmados: 0, finalizados: 0, cancelados: 0 }
    
    const today = startOfToday()
    const tomorrow = addDays(today, 1)
    const todayForWeek = startOfToday()
    const weekStartAt = startOfWeek(todayForWeek, { weekStartsOn: 1 })
    const weekEndAt = endOfWeek(todayForWeek, { weekStartsOn: 1 })

    const baseList = (appointments || []).filter(app => {
      const appDate = new Date(app.start_at)
      if (quickView.filterType === 'hoy') return isSameDay(appDate, today)
      if (quickView.filterType === 'manana') return isSameDay(appDate, tomorrow)
      if (quickView.filterType === 'semana') return isWithinInterval(appDate, { start: weekStartAt, end: weekEndAt })
      return false
    })

    return {
      all: baseList.length,
      pendientes: baseList.filter(app => ['pending', 'pending_block'].includes(app.status)).length,
      confirmados: baseList.filter(app => app.status === 'confirmed').length,
      finalizados: baseList.filter(app => app.status === 'completed').length,
      cancelados: baseList.filter(app => ['cancelled', 'cancelled_timeout', 'cancelled_occupied', 'no_show'].includes(app.status)).length,
    }
  }, [appointments, quickView.isOpen, quickView.filterType])

  // Lógica de Indicador de Scroll para el Modal
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // El icono solo se muestra si el usuario está arriba Y hay contenido oculto abajo
      // Se desaparece en cuanto baja más de 20px
      const isAtTop = scrollTop < 20;
      const hasMoreDown = scrollHeight > clientHeight + 10;
      setShowScrollIndicator(isAtTop && hasMoreDown);
    }
  };

  useEffect(() => {
    if (quickView.isOpen) {
      // Check inmediatamente y después de un breve delay por renderizado
      checkScroll();
      const timer = setTimeout(checkScroll, 100);
      return () => clearTimeout(timer);
    }
  }, [quickView.isOpen, quickViewFilteredAppointments]);

  // Helper para estilos del QuickView basados en el filtro
  const quickViewTheme = useMemo(() => {
    if (quickView.filterType === 'hoy') return { color: 'blue', label: 'Hoy', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', secondary: 'text-blue-400', dot: 'bg-blue-600', shadow: 'shadow-blue-100', icon: Sun }
    if (quickView.filterType === 'manana') return { color: 'emerald', label: 'Mañana', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', secondary: 'text-emerald-400', dot: 'bg-emerald-600', shadow: 'shadow-emerald-100', icon: Sunrise }
    return { color: 'violet', label: 'Semana', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', secondary: 'text-violet-400', dot: 'bg-violet-600', shadow: 'shadow-violet-100', icon: CalendarRange }
  }, [quickView.filterType])

  const pendientes = filteredSections.pendiente;
  const confirmados = filteredSections.confirmado;
  const finalizados = filteredSections.finalizado;
  const canceladosAusentes = [...filteredSections.cancelado, ...filteredSections.ausente];

  // Agrupación de pendientes por fecha para la bandeja prioritaria
  const groupedPendientes = useMemo(() => {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    
    const groups = {};
    pendientes.forEach(app => {
      const dateKey = format(new Date(app.start_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = { items: [], label: '' };
      groups[dateKey].items.push(app);
      
      const appDate = new Date(app.start_at);
      if (isSameDay(appDate, today)) groups[dateKey].label = "Hoy";
      else if (isSameDay(appDate, tomorrow)) groups[dateKey].label = "Mañana";
      else groups[dateKey].label = format(appDate, "EEEE d 'de' MMMM", { locale: es });
    });

    return Object.keys(groups)
      .sort()
      .map(key => ({
        key,
        ...groups[key]
      }));
  }, [pendientes])

  // Smart auto-collapse for Priority Inbox
  useEffect(() => {
    if (activeTab !== 'pendientes') {
      setIsPriorityExpanded(false);
    } else {
      setIsPriorityExpanded(true);
    }
  }, [activeTab]);

  return (
    <Layout maxWidth="max-w-screen-2xl" hideMobileHeader={true} mobileMenuState={[isMenuOpen, setIsMenuOpen]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header - Consolidated following ClientesPage pattern (Desktop) */}
        <header className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-0">
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
            <button 
              onClick={() => {
                const today = new Date(); // Use actual current date
                setDate(today);
                setCurrentMonth(today);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors shadow-sm"
            >
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Volver a hoy
            </button>
            <Button 
              onClick={() => setShowDialog(true)}
              className="rounded-xl font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Turno
            </Button>
          </div>
        </header>

        {/* MASTER HEADER MÓVIL (Ultra Compacto) */}
        <div className="lg:hidden px-5 pt-3 bg-white sticky top-0 z-[70] border-b border-slate-100 shadow-sm">
          {/* Fila 1: Fecha e Iconos */}
          <div className="flex justify-between items-center mb-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
              {format(date, "EEEE, d MMM", { locale: es })}
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95",
                  isSearchOpen ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <Search className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsMobileCalendarOpen(true)}
                className="w-11 h-11 text-slate-500 rounded-full flex items-center justify-center active:scale-95 transition-all"
              >
                <CalendarDays className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="w-11 h-11 text-slate-900 rounded-full flex items-center justify-center active:scale-95 transition-all"
              >
                <Menu className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Fila 2: Título */}
          <div className="mb-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Agenda</h1>
          </div>

          <AnimatePresence>
            {isSearchOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-2.5 shadow-inner">
                  <Search className="text-slate-400 w-4 h-4 focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente..." 
                    autoFocus
                    className="bg-transparent border-none focus:ring-0 outline-none text-sm ml-3 w-full text-slate-800 placeholder:text-slate-400" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NAVEGACIÓN DE ESTADOS MÓVIL (Edge-to-Edge iOS Style) */}
        <div className="lg:hidden flex overflow-x-auto hide-scrollbar p-1 bg-slate-100/50 backdrop-blur-xl sticky top-0 z-[60] border-b border-slate-200/50 shadow-inner mx-1.5 rounded-2xl animate-in fade-in transition-all">
          <div className="relative flex w-full">
            {/* Indicador Continuo (Synced Pill) */}
            <motion.div
              style={{ 
                x: pillX,
                width: '25%' // 1/4 para 4 pestañas
              }}
              className="absolute inset-y-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] rounded-xl z-0"
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            />
            
            {[
              { id: 'pendientes', label: 'Pends', icon: Clock, count: pendientes.length },
              { id: 'confirmados', label: 'Confirms', icon: CheckCircle, count: confirmados.length },
              { id: 'finalizados', label: 'Finals', icon: CalendarCheck, count: finalizados.length },
              { id: 'cancelados', label: 'Cancels', icon: XCircle, count: canceladosAusentes.length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-1 whitespace-nowrap flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[14px] font-bold transition-all active:scale-95 z-10",
                    isActive ? "text-slate-900" : "text-slate-500"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "opacity-40")} />
                  <div className="flex items-center gap-1">
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={cn(
                        "py-0.5 px-1.5 rounded-md text-[9px] font-black",
                        isActive ? "bg-slate-100 text-slate-600" : "bg-slate-200/50 text-slate-400"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
            )
          })}
        </div>

        {/* TRIPLE COLUMN LAYOUT */}
        <Tabs 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex flex-col lg:flex-row gap-8 w-full items-start pb-8">
            
            {!isGridView && (
              <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-6 gap-10">
                <div className="flex flex-col w-full mt-2">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">Turnos:</h4>
                  <TabsList className="flex flex-col h-auto w-full bg-white border border-slate-200 shadow-sm p-1.5 rounded-2xl items-stretch justify-start">
                    <TabsTrigger 
                      value="pendientes" 
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-l-4 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-amber-50 transition-all"
                    >
                      <span className="text-sm font-bold text-slate-900">Pendientes</span>
                      <span className="bg-amber-200 text-amber-800 py-0.5 px-2.5 rounded-full text-[10px] font-bold">{pendientes.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="confirmados" 
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-l-4 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-50 transition-all"
                    >
                      <span className="text-sm font-bold text-slate-900">Confirmados</span>
                      <span className="bg-emerald-200 text-emerald-800 py-0.5 px-2.5 rounded-full text-[10px] font-black">{confirmados.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="finalizados" 
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-l-4 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 transition-all"
                    >
                      <span className="text-sm font-bold text-slate-900">Finalizados</span>
                      <span className="bg-blue-200 text-blue-800 py-0.5 px-2.5 rounded-full text-[10px] font-black">{finalizados.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="cancelados" 
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-l-4 border-transparent data-[state=active]:border-rose-500 data-[state=active]:bg-rose-50 transition-all"
                    >
                      <span className="text-sm font-bold text-slate-900">Cancelados</span>
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
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                          <Sun className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Hoy</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ver ahora</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                    <button 
                      onClick={() => setQuickView({ isOpen: true, filterType: 'manana' })} 
                      className="w-full h-[60px] px-5 text-sm font-bold rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <Sunrise className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Mañana</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Día siguiente</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                    <button 
                      onClick={() => setQuickView({ isOpen: true, filterType: 'semana' })} 
                      className="w-full h-[60px] px-5 text-sm font-bold rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-center justify-between group shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                          <CalendarRange className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Esta Semana</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lun a Dom</span>
                        </div>
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
            <div className="flex-1 w-full flex flex-col gap-6 items-start justify-start pt-2 min-w-0 pb-32">
              {loading ? (
                <AgendaSkeleton />
              ) : (
                <>
                  {/* 1. BUSCADOR Y FILTROS AVANZADOS (Hidden in mobile, we use the iOS header search) */}
                  <div className="hidden md:flex relative flex-col md:flex-row items-center gap-3 w-full">
                    {/* Buscador */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar cliente o servicio..." 
                        className="w-full pl-10 pr-4 py-2.5 h-11 bg-white border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {/* Botón de Filtro (Con estado activo) */}
                      <div className="relative" ref={searchFiltersRef}>
                        <button 
                          type="button" 
                          onClick={() => setShowSearchFilters(!showSearchFilters)}
                          className={`flex items-center justify-center p-2.5 h-11 w-11 rounded-xl border transition-all shadow-sm shrink-0 active:scale-95 ${
                            hasActiveFilters || showSearchFilters 
                              ? 'bg-blue-50 border-blue-200 text-blue-600' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Filter className="w-5 h-5" />
                          {/* Indicador de filtro activo */}
                          {hasActiveFilters && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white -mt-1 -mr-1"></span>}
                        </button>

                        {/* MENÚ FLOTANTE DE FILTROS (Popover) - Ultra Compacted */}
                        {showSearchFilters && (
                          <div className="absolute top-full right-0 mt-3 w-[260px] bg-white rounded-2xl shadow-xl border border-slate-200 z-[60] p-3.5 animate-in fade-in slide-in-from-top-2">
                            {/* Header del Popover */}
                            <div className="flex justify-between items-center mb-2.5 border-b border-slate-100 pb-2">
                              <h4 className="font-bold text-slate-800 text-sm">Filtros Avanzados</h4>
                              <button onClick={() => setShowSearchFilters(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus className="w-5 h-5 rotate-45" />
                              </button>
                            </div>

                            {/* Contenido de Filtros - Alineación perfecta */}
                            <div className="flex flex-col gap-2.5">
                              {/* Bloque: Jornada */}
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jornada</span>
                                <div className="flex items-center gap-4 px-0.5">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 transition-colors">Mañana</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 transition-colors">Tarde</span>
                                  </label>
                                </div>
                              </div>

                              {/* Ergonomía Móvil: Escala de fuente mejorada para máxima legibilidad */}
                              <style jsx>{`
                                @media (max-width: 1023px) {
                                  .mobile-text-scale { font-size: 108%; }
                                }
                              `}</style>

                              {/* Bloque: Tipo de Cliente */}
                              <div className="mobile-text-scale">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Cliente</span>
                                <div className="flex items-center gap-4 px-0.5">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 transition-colors">Frecuente</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600 rounded text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 transition-colors">Primera Vez</span>
                                  </label>
                                </div>
                              </div>

                              {/* Bloque: Profesional / Staff */}
                              <div>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Profesional</span>
                                <select className="w-full py-1 px-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                                  <option value="todos">Todos los profesionales</option>
                                  <option value="prof1">Martín (Barbero)</option>
                                  <option value="prof2">Sofía (Colorista)</option>
                                </select>
                              </div>
                            </div>

                            {/* Footer / Acciones */}
                            <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100">
                              <button 
                                onClick={() => {
                                  setActiveSearchFilters({ jornada: [], cliente: [], staff: [] });
                                  setShowSearchFilters(false);
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                Limpiar
                              </button>
                              <button 
                                onClick={() => setShowSearchFilters(false)}
                                className="px-5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => setIsGridView(!isGridView)}
                        className="flex items-center justify-center p-2.5 h-11 w-11 rounded-xl bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-500 focus:outline-none transition-all shrink-0 shadow-sm active:scale-95"
                        title={isGridView ? "Vista Lista" : "Vista Tablero"}
                      >
                        {isGridView ? <Rows3 className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* BANDEJA DE ACCIÓN PRIORITARIA: Solo visible en Vista Lista y cuando NO estamos en la pestaña de pendientes */}
                  {!isGridView && activeTab !== 'pendientes' && groupedPendientes.length > 0 && (
                    <div className="w-full mb-8 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        {/* Lado Izquierdo: Título y Ping (Clickable to Toggle) */}
                        <div 
                          onClick={() => setIsPriorityExpanded(!isPriorityExpanded)}
                          className="flex items-center gap-2 cursor-pointer select-none group"
                        >
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                            Requieren Acción Inmediata ({pendientes.length})
                          </h3>
                          <motion.div
                            animate={{ rotate: isPriorityExpanded ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors ml-1"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </div>
                        
                        {/* Lado Derecho: Botón de Acción Masiva */}
                        <button 
                          type="button"
                          onClick={handleAcceptAllPending}
                          className="flex items-center gap-2 px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aceptar Todos
                        </button>
                      </div>
                      
                      <AnimatePresence initial={false}>
                        {isPriorityExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                            className="overflow-hidden space-y-10"
                          >
                            {groupedPendientes.map(group => (
                              <div key={`group-${group.key}`} className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                    Pendientes de {group.label}
                                  </span>
                                  <div className="h-[1px] w-full bg-slate-100" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max w-full">
                                  {group.items.map(turno => (
                                    <div key={`priority-pending-${turno.id}`} className="w-full">
                                      <AppointmentCard appointment={turno} onClick={(app) => setSelectedAppointment(app)} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 2. AREA DE CONTENIDO (LISTA O TABLERO KANBAN) */}
                  {isGridView ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 w-full mt-4 items-start">
                      <AgendaGridColumn 
                        title="Pendientes" 
                        count={pendientes.length} 
                        dotColor="bg-amber-400" 
                        items={pendientes} 
                        onCardClick={setSelectedAppointment} 
                        headerAction={
                          pendientes.length > 0 && (
                            <button 
                              onClick={handleAcceptAllPending}
                              className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 transition-colors"
                            >
                              Aceptar Todos
                            </button>
                          )
                        }
                      />
                      <AgendaGridColumn title="Confirmados" count={confirmados.length} dotColor="bg-emerald-500" items={confirmados} onCardClick={setSelectedAppointment} />
                      <AgendaGridColumn title="Finalizados" count={finalizados.length} dotColor="bg-blue-500" items={finalizados} onCardClick={setSelectedAppointment} />
                      <AgendaGridColumn title="Cancelados" count={canceladosAusentes.length} dotColor="bg-rose-500" items={canceladosAusentes} onCardClick={setSelectedAppointment} />
                    </div>
                  ) : (
                    <div className="lg:hidden w-full overflow-hidden mt-0 min-h-[75vh]">
                      <motion.div
                        drag="x"
                        dragDirectionLock={true}
                        dragConstraints={{ left: -(tabs.length - 1) * window.innerWidth - 40, right: 40 }}
                        style={{ x: springCarouselX }}
                        onDragEnd={handleDragEnd}
                        className="flex w-[400%] h-full mt-2"
                      >
                        {tabs.map(tabId => {
                          const items = tabId === 'pendientes' ? pendientes : 
                                       tabId === 'confirmados' ? confirmados : 
                                       tabId === 'finalizados' ? finalizados : canceladosAusentes;
                          return (
                            <div key={`carousel-${tabId}`} className="w-[100vw] px-4">
                              {items.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 pb-32">
                                  {items.map(turno => (
                                    <AppointmentCard key={turno.id} appointment={turno} onClick={setSelectedAppointment} />
                                  ))}
                                </div>
                               ) : (
                                <div className="w-full flex flex-col items-center justify-center py-14 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                  <CalendarX2 className="w-6 h-6 text-slate-400 mb-2" />
                                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sin turnos</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar DERECHA - Calendario y Acciones (Sticky) - Oculto en Mobile */}
            <aside className="hidden xl:flex flex-col w-full lg:w-[320px] shrink-0 space-y-4 sticky top-6 pt-2">
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

      <AnimatePresence>
        {isMobileCalendarOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileCalendarOpen(false)}
              className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm lg:hidden"
            />
            {/* Bottom Sheet - Calendar */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[120] bg-white rounded-t-[32px] p-8 pb-10 lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">Seleccionar Fecha</h3>
                <button 
                  onClick={() => setIsMobileCalendarOpen(false)}
                  className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                >
                  <Plus className="w-7 h-7 rotate-45" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-3xl p-6 mb-2">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setCurrentMonth(d);
                      setIsMobileCalendarOpen(false);
                    }
                  }}
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
              <button 
                onClick={() => {
                  const today = new Date();
                  setDate(today);
                  setCurrentMonth(today);
                  setIsMobileCalendarOpen(false);
                }}
                className="w-full mt-6 py-4.5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-95 transition-all text-lg"
              >
                Volver a Hoy
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB (Floating Action Button) - Mobile Only */}
      <button 
        onClick={() => setShowDialog(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-blue-600 transition-all active:scale-90"
      >
        <Plus className="w-7 h-7" />
      </button>

      <AppointmentDialog 
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleConfirmAdd}
        initialDate={date}
      />

      <AnimatePresence>
        {quickView.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setQuickView({ isOpen: false, filterType: null });
                setQuickViewStatusFilter('all');
              }
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-hidden"
          >
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
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* MODAL NAVIGATION */}
                <div className="flex gap-6 border-b border-transparent">
                  {[
                    { id: 'all', label: 'Todos', count: quickViewCounts.all },
                    { id: 'pendientes', label: 'Pendientes', count: quickViewCounts.pendientes },
                    { id: 'confirmados', label: 'Confirmados', count: quickViewCounts.confirmados },
                    { id: 'finalizados', label: 'Finalizados', count: quickViewCounts.finalizados },
                    { id: 'cancelados', label: 'Cancelados', count: quickViewCounts.cancelados }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setQuickViewStatusFilter(tab.id)}
                      className={`pb-4 text-sm font-bold transition-all relative ${
                        quickViewStatusFilter === tab.id ? quickViewTheme.text : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1.5 opacity-50 px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
                        {tab.count}
                      </span>
                      {quickViewStatusFilter === tab.id && (
                        <motion.div 
                          layoutId="activeQuickTab"
                          className={cn("absolute bottom-0 left-0 right-0 h-1 rounded-t-full", quickViewTheme.dot)} 
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODAL CONTENT */}
              <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
                {quickViewFilteredAppointments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                    {(() => {
                      let currentHeader = null;
                      return quickViewFilteredAppointments.map((appointment, idx) => {
                        const time = format(new Date(appointment.start_at), 'HH:mm');
                        const showHeader = currentHeader !== time;
                        currentHeader = time;

                        return (
                          <React.Fragment key={appointment.id}>
                            {showHeader && (
                              <div className="col-span-full mt-6 first:mt-0 mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                    {time} HS
                                  </span>
                                  <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
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

                {/* FLOATING SCROLL INDICATOR */}
                <AnimatePresence>
                  {showScrollIndicator && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-10 right-10 z-50 pointer-events-none"
                    >
                      <div className="bg-white/80 backdrop-blur-md shadow-xl border border-slate-100 p-2.5 rounded-full animate-bounce">
                        <ChevronDown className="w-5 h-5 text-indigo-600" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MODAL FOOTER */}
              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border", quickViewTheme.bg, quickViewTheme.border, quickViewTheme.text)}>
                    Total: {quickViewFilteredAppointments.length} turnos
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÓN FLOTANTE (FAB) iOs Style con Safe Area */}
      <button
        onClick={() => setShowDialog(true)}
        className="md:hidden fixed bottom-6 right-5 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/40 active:scale-90 transition-all z-50 mb-[env(safe-area-inset-bottom)]"
      >
        <Plus className="w-7 h-7" />
      </button>

      <BlockTimeModal 
        isOpen={showBlockModal} 
        onClose={() => setShowBlockModal(false)} 
        onConfirm={handleConfirmBlock}
        initialDate={date}
      />

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />
    </Layout>
  )
}
