import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClientes } from '@/api/clientes'
import { getServices } from '@/api/services'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { User, Briefcase, Calendar as DateIcon, X } from 'lucide-react'
import { MobilePicker, PickerButton } from '@/components/shared/MobilePicker'
import { MobileTimePicker } from '@/components/shared/MobileTimePicker'
import { MobileCalendarPicker } from '@/components/shared/MobileCalendarPicker'
import WheelTimePicker from '@/components/ui/wheel-time-picker'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { cn } from '@/lib/utils'

const AppointmentDialog = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '12:00',
    notes: ''
  })

  // Responsive state
  const [isMobile, setIsMobile] = useState(false)
  
  // Picker internal state
  const [activePicker, setActivePicker] = useState(null) // 'cliente' | 'servicio' | 'hora' | 'fecha'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (initialDate) {
        setFormData(prev => ({ ...prev, date: format(initialDate, 'yyyy-MM-dd') }))
      }
    }
  }, [isOpen, initialDate])

  const loadData = async () => {
    try {
      const [{ data: c }, { data: s }] = await Promise.all([getClientes(), getServices()])
      setClientes(c || [])
      setServicios(s || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const clientOptions = useMemo(() => (Array.isArray(clientes) ? clientes : []).map(c => ({
    id: c.id,
    label: c.name,
    subtext: c.phone
  })), [clientes])

  const serviceOptions = useMemo(() => (Array.isArray(servicios) ? servicios : []).map(s => ({
    id: s.id,
    label: s.name,
    subtext: `${s.duration_min} min • $${s.price}`
  })), [servicios])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.client_id || !formData.service_id) {
      toast.error('Por favor selecciona cliente y servicio')
      return
    }

    setLoading(true)
    try {
      // Build ISO string
      const startAt = new Date(`${formData.date}T${formData.start_time}:00`).toISOString()
      await onConfirm({
        client_id: formData.client_id,
        service_id: formData.service_id,
        start_at: startAt,
        notes: formData.notes
      })
      onClose()
    } catch (error) {
      console.error('Error saving appointment:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderDesktopContent = () => (
    <div className="p-8">
      <DialogHeader className="mb-8 pr-12">
        <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Turno</DialogTitle>
        <DialogDescription className="text-slate-500 font-medium text-base mt-1">Completa los datos para agendar la cita.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cliente</Label>
            <select 
              className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat cursor-pointer"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Servicio</Label>
            <select 
              className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat cursor-pointer"
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
            >
              <option value="">Seleccionar servicio...</option>
              {servicios.map(s => (
                <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha</Label>
            <Input 
              type="date"
              className="h-11 rounded-xl border-slate-200"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hora Inicio</Label>
            <Input 
              type="time"
              className="h-11 rounded-xl border-slate-200"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notas (Opcional)</Label>
          <textarea
            className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            placeholder="Instrucciones especiales..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <DialogFooter className="pt-4 gap-3 bg-slate-50 -mx-8 px-8 py-6 mt-6">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="h-11 rounded-xl font-bold text-slate-500">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="h-11 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold px-8">
            {loading ? 'Agendando...' : 'Agendar Turno'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  )

  const renderMobileContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
      
      <div className="flex flex-col p-6 md:p-8 pt-2 md:pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Turno</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Completa los datos para agendar la cita.</p>
          </div>
          <button onClick={onClose} className="hidden md:flex p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Cliente</label>
              <PickerButton
                icon={User}
                placeholder="Seleccionar cliente..."
                value={clientOptions.find(opt => opt.id.toString() === formData.client_id)?.label}
                onClick={() => setActivePicker('cliente')}
                className="h-16 md:h-14 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
              />
            </div>

            {/* Servicio */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Servicio</label>
              <PickerButton
                icon={Briefcase}
                placeholder="¿Qué servicio realizará?"
                value={serviceOptions.find(opt => opt.id.toString() === formData.service_id)?.label}
                onClick={() => setActivePicker('servicio')}
                className="h-16 md:h-14 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Fecha</label>
                <PickerButton 
                  icon={DateIcon}
                  placeholder="Seleccionar..."
                  value={formData.date ? format(new Date(formData.date + 'T12:00:00'), 'dd/MM/yyyy') : ''}
                  onClick={() => setActivePicker('fecha')}
                  className="h-16 md:h-14 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
                />
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Hora Inicio</label>
                <PickerButton
                  placeholder="Hora..."
                  value={formData.start_time}
                  onClick={() => setActivePicker('hora')}
                  className="h-16 md:h-14 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Notas (Opcional)</label>
              <textarea
                className="w-full min-h-[100px] p-4 rounded-2xl border border-transparent bg-slate-50/80 text-base font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                placeholder="Instrucciones especiales para el turno..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50 pb-8 md:pb-0">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="w-full sm:flex-1 h-14 rounded-2xl font-bold text-slate-500 border-slate-100 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-black text-lg transition-all shadow-xl shadow-slate-200 active:scale-95"
            >
              {loading ? 'Agendando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* DESKTOP DIALOG */}
      {!isMobile && (
        <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
          <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem]">
            {renderDesktopContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* MOBILE BOTTOM SHEET */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center md:hidden">
            {/* Backdrop con Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) onClose()
              }}
              className="relative w-full bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto hide-scrollbar"
            >
              {renderMobileContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE PICKERS */}
      <MobilePicker
        isOpen={activePicker === 'cliente'}
        onClose={() => setActivePicker(null)}
        title="Seleccionar Cliente"
        options={clientOptions}
        value={parseInt(formData.client_id)}
        onSelect={(opt) => setFormData({ ...formData, client_id: opt.id.toString() })}
        searchPlaceholder="Buscar por nombre o celular..."
      />

      <MobilePicker
        isOpen={activePicker === 'servicio'}
        onClose={() => setActivePicker(null)}
        title="Seleccionar Servicio"
        options={serviceOptions}
        value={parseInt(formData.service_id)}
        onSelect={(opt) => setFormData({ ...formData, service_id: opt.id.toString() })}
      />

      <MobileCalendarPicker
        isOpen={activePicker === 'fecha'}
        onClose={() => setActivePicker(null)}
        value={formData.date}
        onSelect={(val) => setFormData({ ...formData, date: val })}
        title="Fecha del Turno"
      />

      <MobileTimePicker
        isOpen={activePicker === 'hora'}
        onClose={() => setActivePicker(null)}
        value={formData.start_time}
        onChange={(val) => setFormData({ ...formData, start_time: val })}
        title="Hora de Inicio"
      >
        <div className="p-4 bg-slate-50 rounded-2xl mt-4">
          <WheelTimePicker 
            value={formData.start_time}
            onChange={(val) => setFormData({ ...formData, start_time: val })}
          />
        </div>
      </MobileTimePicker>
    </>
  )
}

export default AppointmentDialog
