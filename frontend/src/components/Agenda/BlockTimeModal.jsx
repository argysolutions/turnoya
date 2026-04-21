import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Calendar as DateIcon, Clock } from 'lucide-react'
import { MobileTimePicker } from '@/components/shared/MobileTimePicker'
import { PickerButton } from '@/components/shared/MobilePicker'

export const BlockTimeModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [isAllDay, setIsAllDay] = useState(false)
  const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [notes, setNotes] = useState('')
  
  // Picker states
  const [activePicker, setActivePicker] = useState(null) // 'start' | 'end'

  const handleSubmit = async () => {
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
    } catch (err) {
      // errors handled by parent
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open) => {
    if (!open && !loading) onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Bloquear Horario</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              Reserva un espacio en la agenda para evitar citas.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Toggle de Día Completo */}
              <div 
                className={`flex items-center justify-between p-4 border transition-all rounded-2xl cursor-pointer select-none ${isAllDay ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                onClick={() => setIsAllDay(!isAllDay)}
              >
                <div>
                  <p className="font-bold text-[15px]">Día Completo</p>
                  <p className={`text-xs ${isAllDay ? 'text-slate-400' : 'text-slate-500'}`}>Bloquear las 24 horas del día.</p>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isAllDay ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de bloqueo</Label>
                <div className="relative">
                  <DateIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <Input 
                    type="date"
                    className="pl-12 h-14 rounded-2xl border-slate-200 text-base font-bold text-slate-900 bg-slate-50/50 focus:bg-white transition-all shadow-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Horas (Condicional) */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde</Label>
                    <PickerButton
                      placeholder="Inicio..."
                      value={startTime}
                      onClick={() => setActivePicker('start')}
                      className="h-14 font-bold text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta</Label>
                    <PickerButton
                      placeholder="Fin..."
                      value={endTime}
                      onClick={() => setActivePicker('end')}
                      className="h-14 font-bold text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motivo (Opcional)</Label>
                <Input 
                  placeholder="Ej: Feriado, Almuerzo, Receso..."
                  className="h-14 rounded-2xl border-slate-200 text-base font-medium text-slate-900 bg-slate-50/50 focus:bg-white transition-all shadow-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50">
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
                {loading ? 'Bloqueando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MOBILE TIME PICKERS */}
      <MobileTimePicker
        isOpen={activePicker === 'start'}
        onClose={() => setActivePicker(null)}
        value={startTime}
        onChange={setStartTime}
        title="Hora de Inicio"
      />

      <MobileTimePicker
        isOpen={activePicker === 'end'}
        onClose={() => setActivePicker(null)}
        value={endTime}
        onChange={setEndTime}
        title="Hora de Finalización"
      />
    </>
  )
}
  )
}
