import React, { useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppointments } from '@/hooks/useAppointments'
import AppointmentCard from '@/components/Agenda/AppointmentCard'
import AgendaSkeleton from '@/components/Agenda/AgendaSkeleton'
import AppointmentDialog from '@/components/Agenda/AppointmentDialog'
import AppointmentDetailDialog from '@/components/Agenda/AppointmentDetailDialog'
import Layout from '@/components/shared/Layout'

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

  const handlePrevDay = () => setDate(prev => subDays(prev, 1))
  const handleNextDay = () => setDate(prev => addDays(prev, 1))
  const handleToday = () => setDate(new Date())

  const handleConfirmAdd = async (data) => {
    await addAppointment(data)
  }

  const handleUpdateStatus = async (id, status) => {
    await updateStatus(id, status)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este turno?')) {
      await removeAppointment(id)
    }
  }

  const filteredAppointments = (appointments || []).filter(app => 
    app.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    app.service_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Agenda de Turnos">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Header - Navegación de Fecha */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-2xl border shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 rounded-xl text-white">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black capitalize">
                {format(date, "EEEE, d 'de' MMMM", { locale: es })}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Gestioná tus citas del día</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="secondary" className="px-6 font-bold" onClick={handleToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="ml-2 w-px h-8 bg-slate-200" />
            <Button 
              onClick={() => setShowDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200/50"
            >
              <Plus className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Nuevo Turno</span>
            </Button>
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

        {/* Barra de Filtros */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente o servicio..." 
              className="pl-10 h-11 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Grid de Turnos / Lista */}
        <div className="space-y-3">
          {loading ? (
            <AgendaSkeleton />
          ) : filteredAppointments.length > 0 ? (
            filteredAppointments.map(appointment => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment} 
                onClick={(app) => setSelectedAppointment(app)}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No hay turnos para este día</h3>
              <p className="text-sm text-slate-500 max-w-[250px] mx-auto mt-1">
                Apretá en "Nuevo Turno" para empezar a llenar tu agenda.
              </p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
