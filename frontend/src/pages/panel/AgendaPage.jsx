import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Plus, 
  Search,
  Lock,
  Clock,
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { useAppointments } from '@/hooks/useAppointments'
import AppointmentRow from '@/components/Agenda/AppointmentRow'
import AccordionSection from '@/components/Agenda/AccordionSection'
import AgendaSkeleton from '@/components/Agenda/AgendaSkeleton'
import AppointmentDialog from '@/components/Agenda/AppointmentDialog'
import AppointmentDetailDialog from '@/components/Agenda/AppointmentDetailDialog'
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
    removeAppointment
  } = useAppointments()

  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
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

  const sections = [
    { id: 'pendiente', title: 'Pendientes', color: 'bg-amber-400', defaultOpen: true },
    { id: 'confirmado', title: 'Confirmados', color: 'bg-emerald-500', defaultOpen: true },
    { id: 'finalizado', title: 'Finalizados', color: 'bg-slate-400', defaultOpen: false },
    { id: 'cancelado', title: 'Cancelados', color: 'bg-rose-400', defaultOpen: false },
    { id: 'ausente', title: 'Ausentes', color: 'bg-red-600', defaultOpen: false },
  ]

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header - Consolidated following ClientesPage pattern */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-slate-900" />
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda de Turnos</h1>
            </div>
            <p className="text-sm text-slate-500 leading-tight">
              Gestioná tu día, confirma citas y optimizá tu tiempo de trabajo.
            </p>
          </div>
          <Button 
            onClick={() => setShowDialog(true)}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Turno
          </Button>
        </header>

        {/* Date Selector Banner (Mobile friendly) */}
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm sm:hidden mb-2">
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

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Agenda Column */}
          <div className="flex-1 w-full space-y-4">
            
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar cliente o servicio..." 
                  className="pl-10 h-11 border-slate-200 shadow-sm rounded-xl focus:ring-slate-900 transition-all font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200 bg-white text-slate-500 font-bold gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>

            {loading ? (
              <AgendaSkeleton />
            ) : (
              <div className="space-y-3">
                <h2 className="text-base font-medium text-slate-500 capitalize pl-1 mb-2">
                  {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                </h2>
                {sections.map(section => (
                  <AccordionSection
                    key={section.id}
                    title={section.title}
                    count={(filteredSections[section.id] || []).length}
                    color={section.color}
                    defaultOpen={section.defaultOpen}
                  >
                    <div className="divide-y divide-slate-50">
                      {(filteredSections[section.id] || []).map(appointment => (
                        <AppointmentRow 
                          key={appointment.id}
                          appointment={appointment}
                          onClick={(app) => setSelectedAppointment(app)}
                        />
                      ))}
                    </div>
                  </AccordionSection>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Desktop Only sticky */}
          <aside className="hidden lg:block w-[360px] space-y-4 sticky top-6">
            <Card className="border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className="w-full"
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

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                className="h-12 rounded-xl text-slate-600 font-bold text-xs border-slate-200 bg-white gap-2"
              >
                <Lock className="w-4 h-4" /> Bloquear
              </Button>
              <Button 
                variant="outline"
                className="h-12 rounded-xl text-slate-600 font-bold text-xs border-slate-200 bg-white gap-2"
              >
                <Clock className="w-4 h-4" /> Horarios
              </Button>
            </div>
          </aside>
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
