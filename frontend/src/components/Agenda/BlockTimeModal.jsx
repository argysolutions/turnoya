import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Calendar as DateIcon, Clock, X } from 'lucide-react'
import { MobileTimePicker } from '@/components/shared/MobileTimePicker'
import { PickerButton } from '@/components/shared/MobilePicker'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const BlockTimeModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
  const [loading, setLoading] = useState(false)
  const [isAllDay, setIsAllDay] = useState(false)
  const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [notes, setNotes] = useState('')
  
  const [isMobile, setIsMobile] = useState(false)
  
  // Picker states
  const [activePicker, setActivePicker] = useState(null) // 'start' | 'end'

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const renderContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
      
      <div className="flex flex-col p-6 md:p-8 pt-2 md:pt-6">
        <div className="mb-6 pr-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bloquear Horario</h2>
          <p className="text-slate-500 font-medium mt-1">Reserva un espacio en la agenda para evitar citas.</p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Toggle de Día Completo */}
            <div 
              className={`flex items-center justify-between p-5 border transition-all rounded-[2rem] md:rounded-2xl cursor-pointer select-none ${isAllDay ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-slate-50 border-transparent text-slate-900'}`}
              onClick={() => setIsAllDay(!isAllDay)}
            >
              <div>
                <p className="font-black text-base">Día Completo</p>
                <p className={`text-xs font-bold leading-tight mt-0.5 ${isAllDay ? 'text-slate-400' : 'text-slate-500'}`}>Bloquear las 24 horas del día.</p>
              </div>
              <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${isAllDay ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${isAllDay ? 'translate-x-6' : 'translate-x-1 shadow-sm'}`} />
              </div>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Fecha de bloqueo</label>
              <div className="relative group">
                <DateIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  type="date"
                  className="h-16 md:h-14 pl-12 rounded-2xl border-transparent bg-slate-50/80 text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Horas (Condicional) */}
            {!isAllDay && (
              <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Desde</label>
                  {!isMobile ? (
                    <Input 
                      type="time"
                      className="h-11 rounded-xl border-slate-200"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  ) : (
                    <PickerButton
                      placeholder="Inicio..."
                      value={startTime}
                      onClick={() => setActivePicker('start')}
                      className="h-16 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Hasta</label>
                  {!isMobile ? (
                    <Input 
                      type="time"
                      className="h-11 rounded-xl border-slate-200"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  ) : (
                    <PickerButton
                      placeholder="Fin..."
                      value={endTime}
                      onClick={() => setActivePicker('end')}
                      className="h-16 font-bold text-slate-900 bg-slate-50/80 border-transparent hover:bg-white hover:border-slate-200 transition-all rounded-2xl"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Motivo (Opcional)</label>
              <Input 
                placeholder="Ej: Feriado, Almuerzo, Receso..."
                className="h-16 md:h-14 px-5 rounded-2xl border-transparent bg-slate-50/80 text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              {loading ? 'Bloqueando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {!isMobile && (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-lg p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem]">
            {renderContent()}
          </DialogContent>
        </Dialog>
      )}

      <AnimatePresence>
        {isOpen && isMobile && (
          <div className="fixed inset-0 z-[160] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[160]"
            />
            
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
              className="relative w-full bg-white rounded-t-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto hide-scrollbar z-[170]"
            >
              {renderContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export default BlockTimeModal
