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
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { VisualTimePicker } from '@/components/shared/VisualTimePicker'

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
      <DialogContent className="sm:max-w-xl rounded-2xl p-6 bg-white border-slate-100 shadow-xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">Bloquear Horario</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Reserva un espacio en la agenda para evitar que los clientes agenden.
          </DialogDescription>
          <h1 className="text-red-500 text-4xl font-black">TEST VISUAL AQUI</h1>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Fila superior: Switch de Día Completo */}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">Día Completo</p>
                <p className="text-sm text-slate-500">Bloquear las 24 horas del día seleccionado.</p>
              </div>
              <Switch 
                checked={formData.isAllDay === true} 
                onCheckedChange={(val) => setFormData({ ...formData, isAllDay: val === true })}
              />
            </div>

            {/* Fila principal: Fecha y (condicionalmente) Horas */}
            <div className="flex w-full gap-4 items-end">
              <div className={formData.isAllDay ? "w-full" : "w-1/2"}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
                <Input 
                  id="block_date" 
                  type="date" 
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950 font-medium"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              {!formData.isAllDay && (
                <div className="flex w-1/2 gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Inicio</label>
                    <VisualTimePicker
                      label="Inicio"
                      value={formData.start_time}
                      onChange={(val) => setFormData({ ...formData, start_time: val })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fin</label>
                    <VisualTimePicker
                      label="Fin"
                      value={formData.end_time}
                      onChange={(val) => setFormData({ ...formData, end_time: val })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="block_reason" className="font-semibold text-slate-700 ml-1 block mb-1.5">Motivo (Opcional)</Label>
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
