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
import { format } from 'date-fns'
import { VisualTimePicker } from '@/components/shared/VisualTimePicker'

export const BlockTimeModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [isAllDay, setIsAllDay] = useState(true)
  const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      let startAt, endAt

      if (isAllDay) {
        startAt = new Date(`${date}T00:00:00`).toISOString()
        endAt = new Date(`${date}T23:59:59`).toISOString()
      } else {
        startAt = new Date(`${date}T${startTime}:00`).toISOString()
        endAt = new Date(`${date}T${endTime}:00`).toISOString()
      }

      await onConfirm({
        start_at: startAt,
        end_at: endAt,
        notes: notes
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle de Día Completo */}
          <div 
            className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 cursor-pointer select-none"
            onClick={() => setIsAllDay(!isAllDay)}
          >
            <div>
              <p className="font-medium text-slate-900">Día Completo</p>
              <p className="text-sm text-slate-500">Bloquear las 24 horas del día seleccionado.</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${isAllDay ? 'bg-slate-900' : 'bg-slate-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${isAllDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {/* Fila principal: Fecha y (condicionalmente) Horas */}
          <div className="flex w-full gap-4 items-end">
            <div className={isAllDay ? "w-full" : "w-1/2"}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
              <Input 
                id="block_date" 
                type="date" 
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950 font-medium"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {!isAllDay && (
              <div className="flex w-1/2 gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Inicio</label>
                  <VisualTimePicker
                    label="Inicio"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fin</label>
                  <VisualTimePicker
                    label="Fin"
                    value={endTime}
                    onChange={setEndTime}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Motivo (Opcional)</label>
            <Input 
              id="block_reason" 
              type="text" 
              placeholder="Ej: Feriado, Almuerzo, Receso..."
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-950"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
