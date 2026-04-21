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
import { User, Briefcase, Calendar as DateIcon } from 'lucide-react'
import { MobilePicker, PickerButton } from '@/components/shared/MobilePicker'
import { MobileTimePicker } from '@/components/shared/MobileTimePicker'

export const AppointmentDialog = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState([])
  const [services, setServices] = useState([])
  
  // Picker states
  const [activePicker, setActivePicker] = useState(null) // 'cliente' | 'servicio' | 'hora'

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      Promise.all([getClientes(), getServices()])
        .then(([{ data: cData }, { data: sData }]) => {
          setClientes(cData)
          setServices(sData)
        })
        .catch(() => toast.error('Error al cargar datos auxiliares'))
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!formData.client_id || !formData.service_id || !formData.date || !formData.start_time) {
      return toast.error('Por favor completa los campos obligatorios')
    }

    setLoading(true)
    try {
      const service = services.find(s => s.id === parseInt(formData.service_id))
      const startTimeParts = new Date(`${formData.date}T${formData.start_time}:00`)
      
      const startAt = startTimeParts.toISOString()
      const endAt = new Date(startTimeParts.getTime() + (service.duration * 60000)).toISOString()

      await onConfirm({
        client_id: parseInt(formData.client_id),
        service_id: parseInt(formData.service_id),
        start_at: startAt,
        end_at: endAt,
        notes: formData.notes
      })
      onClose()
    } catch (err) {
      // handled elsewhere
    } finally {
      setLoading(false)
    }
  }

  // Memoized options for pickers
  const clientOptions = useMemo(() => 
    clientes.map(c => ({ id: c.id, label: c.nombre, subtext: c.telefono })), 
  [clientes])

  const serviceOptions = useMemo(() => 
    services.map(s => ({ id: s.id, label: s.name, subtext: `${s.duration} min` })), 
  [services])

  const clientName = clientOptions.find(c => c.id === parseInt(formData.client_id))?.label
  const serviceName = serviceOptions.find(s => s.id === parseInt(formData.service_id))?.label

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Turno</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              Completá los datos para agendar la cita.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Selector de Cliente */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente *</Label>
                <PickerButton
                  icon={User}
                  placeholder="Seleccionar cliente..."
                  value={clientName}
                  onClick={() => setActivePicker('cliente')}
                />
              </div>

              {/* Selector de Servicio */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Servicio *</Label>
                <PickerButton
                  icon={Briefcase}
                  placeholder="Seleccionar servicio..."
                  value={serviceName}
                  onClick={() => setActivePicker('servicio')}
                />
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha</Label>
                  <div className="relative">
                    <DateIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <Input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="pl-12 h-14 rounded-2xl border-slate-200 text-base font-bold text-slate-900 bg-slate-50/50 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hora inicio</Label>
                  <PickerButton
                    placeholder="Hora..."
                    value={formData.start_time}
                    onClick={() => setActivePicker('hora')}
                    className="h-14 font-bold text-slate-900 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notas (Opcional)</Label>
                <textarea
                  className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                  placeholder="Instrucciones especiales para el turno..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50">
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
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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

      <MobileTimePicker
        isOpen={activePicker === 'hora'}
        onClose={() => setActivePicker(null)}
        value={formData.start_time}
        onChange={(val) => setFormData({ ...formData, start_time: val })}
        title="Hora de Inicio"
      />
    </>
  )
}

export default AppointmentDialog
