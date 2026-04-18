import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Plus, 
  Search,
  Lock,
  Clock,
  TrendingUp,
  Filter
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
import { motion } from 'framer-motion'

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
      <div className="max-w-6xl mx-auto px-4 py-0 mb-4 sm:py-2">
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          
          {/* Main Agenda Column (Flex-1) */}
          <div className="flex-1 w-full order-2 lg:order-1 pt-1">
            <header className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-0"
              >
                <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-0.5 opacity-80">Panel de Control</h2>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter capitalize leading-none">
                  {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                </h1>
                <p className="text-slate-400 font-bold text-[10px] tracking-tight pt-1 capitalize">{format(date, "yyyy")}</p>
              </motion.div>
              
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <Input 
                    placeholder="Buscar..." 
                    className="pl-9 h-10 border-slate-100 bg-white shadow-sm rounded-xl focus:ring-slate-900 focus:border-slate-900 transition-all font-medium text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-10 w-10 rounded-xl border-slate-100 bg-white shrink-0 shadow-sm">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </div>
            </header>

            {loading ? (
              <AgendaSkeleton />
            ) : (
              <div className="space-y-3">
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

          {/* Sidebar Control Column (Fixed small width - 1/4 approx) */}
          <aside className="w-full lg:w-[260px] lg:sticky lg:top-20 space-y-4 order-1 lg:order-2">
            
            {/* Calendar Compact Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-3 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30"
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                className="w-full"
              />
              <div className="w-full h-px bg-slate-50 my-2" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 h-6"
                onClick={() => setDate(new Date())}
              >
                Volver a Hoy
              </Button>
            </motion.div>

            {/* Compact Actions */}
            <div className="space-y-2 px-1">
              <Button 
                onClick={() => setShowDialog(true)}
                className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-md shadow-slate-300 text-xs font-black transition-all group"
              >
                AGENDAR TURNO
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  className="h-10 rounded-xl text-slate-500 font-black text-[8px] uppercase tracking-widest border-slate-100 bg-white"
                >
                  <Lock className="w-3 h-3 mr-1" /> Bloquear
                </Button>
                <Button 
                  variant="outline"
                  className="h-10 rounded-xl text-slate-500 font-black text-[8px] uppercase tracking-widest border-slate-100 bg-white"
                >
                  <Clock className="w-3 h-3 mr-1" /> Horarios
                </Button>
              </div>
            </div>

            {/* Compact Metric */}
            <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/20 flex items-center gap-3">
                 <TrendingUp className="w-4 h-4 text-emerald-500" />
                 <div>
                   <h4 className="text-[8px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-0.5">Ocupación</h4>
                   <p className="text-[10px] font-bold text-slate-500">85% del día</p>
                 </div>
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
