import React, { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'

export const BlockTimeModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    isAllDay: true,
    start_time: '09:00',
    end_time: '18:00',
    notes: ''
  })

  // Prevent multiple calls
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      let startAt, endAt

      if (formData.isAllDay) {
        startAt = new Date(`${formData.date}T00:00:00`).toISOString()
        endAt = new Date(`${formData.date}T23:59:59`).toISOString()
      } else {
        startAt = new Date(`${formData.date}T${formData.start_time}:00`).toISOString()
        endAt = new Date(`${formData.date}T${formData.end_time}:00`).toISOString()
      }

      await onConfirm({
        start_at: startAt,
        end_at: endAt,
        notes: formData.notes
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open) => {
    if (!open && !loading) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 bg-white border-slate-100 shadow-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Bloquear Horario</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Reserva un espacio en la agenda para evitar que los clientes agenden.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="block_date" className="font-semibold text-slate-700">Fecha</Label>
            <Input 
              id="block_date" 
              type="date" 
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="space-y-0.5">
              <Label className="font-bold text-slate-800">Día Completo</Label>
              <p className="text-xs text-slate-500">Bloquear las 24 horas del día seleccionado.</p>
            </div>
            <Switch 
              checked={formData.isAllDay} 
              onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
            />
          </div>

          {/* Conditional Time Inputs */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="block_start_time" className="font-semibold text-slate-700">Hora Inicio</Label>
                <Input 
                  id="block_start_time" 
                  type="time" 
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block_end_time" className="font-semibold text-slate-700">Hora Fin</Label>
                <Input 
                  id="block_end_time" 
                  type="time" 
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="block_reason" className="font-semibold text-slate-700">Motivo (Opcional)</Label>
            <Input 
              id="block_reason" 
              type="text" 
              placeholder="Ej: Feriado, Almuerzo, Receso..."
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="rounded-xl font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl font-bold"
            >
              {loading ? 'Bloqueando...' : 'Confirmar Bloqueo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
