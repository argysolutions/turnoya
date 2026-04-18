import React, { useState, useEffect } from 'react'
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
import TimePickerModal from '@/components/ui/time-picker-modal'

export const AppointmentDialog = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState([])
  const [services, setServices] = useState([])
  
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
    e.preventDefault()
    if (!formData.client_id || !formData.service_id || !formData.date || !formData.start_time) {
      return toast.error('Por favor completa los campos obligatorios')
    }

    setLoading(true)
    try {
      // Calculamos el end_time basado en la duración del servicio seleccionado
      const service = services.find(s => s.id === parseInt(formData.service_id))
      const startTimeParts = formData.start_at ? new Date(formData.start_at) : new Date(`${formData.date}T${formData.start_time}:00`)
      
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
      // El error ya lo maneja el hook useAppointments
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agendar Nuevo Turno</DialogTitle>
          <DialogDescription>
            Completá los datos para reservar un espacio en la agenda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <select 
              id="client_id"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.telefono})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_id">Servicio *</Label>
            <select 
              id="service_id"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
            >
              <option value="">Seleccionar servicio...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input 
                id="date" 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <TimePickerModal
                label="Hora Inicio"
                value={formData.start_time}
                onChange={(val) => setFormData({ ...formData, start_time: val })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              placeholder="Notas internas..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-900 text-white" disabled={loading}>
              {loading ? 'Agendando...' : 'Confirmar Turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AppointmentDialog
