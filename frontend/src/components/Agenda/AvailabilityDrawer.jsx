import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import client from '@/api/client'
import { cn } from '@/lib/utils'
import { PickerButton } from '@/components/shared/MobilePicker'
import { MobileTimePicker } from '@/components/shared/MobileTimePicker'
import WheelTimePicker from '@/components/ui/wheel-time-picker'

const DAYS = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
]

const defaultSlots = () => Object.fromEntries(
  DAYS.map(d => [d.value, { enabled: false, start: '09:00', end: '18:00' }])
)

export default function AvailabilityDrawer({ isOpen, onClose }) {
  const dragControls = useDragControls()
  const [slots, setSlots] = useState(defaultSlots())
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [activePicker, setActivePicker] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const fetch = async () => {
        setFetching(true)
        try {
          const { data } = await client.get('/availability')
          const updated = defaultSlots()
          data.forEach(({ day_of_week, start_time, end_time }) => {
            updated[day_of_week] = {
              enabled: true,
              start: start_time.slice(0, 5),
              end: end_time.slice(0, 5),
            }
          })
          setSlots(updated)
        } catch {
          toast.error('Error al cargar la disponibilidad')
        } finally {
          setFetching(false)
        }
      }
      fetch()
    }
  }, [isOpen])

  const toggle = (day) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }))
  }

  const handleTime = (day, field, value) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      for (const day of DAYS) {
        const slot = slots[day.value]
        if (slot.enabled) {
          await client.post('/availability', {
            day_of_week: day.value,
            start_time: slot.start,
            end_time: slot.end,
          })
        } else {
          await client.delete(`/availability/${day.value}`).catch(() => {})
        }
      }
      toast.success('Disponibilidad guardada')
      onClose()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />
          
          {/* Drawer from Right */}
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            drag="x"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={{ left: 0, right: 0.1 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 100 || info.velocity.x > 300) {
                onClose()
              }
            }}
            className="fixed inset-y-0 right-0 z-[120] w-[90vw] max-w-[450px] bg-slate-50 rounded-l-[32px] flex flex-col lg:hidden shadow-[-8px_0_30px_rgb(0,0,0,0.12)] overflow-hidden"
          >
            {/* Handle Area para Drag */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="absolute left-0 inset-y-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-50"
            >
              <div className="w-1.5 h-16 bg-slate-300/80 rounded-full" />
            </div>

            {/* Header Fijo */}
            <div className="pl-10 pr-6 py-6 bg-white flex items-center justify-between border-b border-slate-100 shrink-0 shadow-sm z-10 relative">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Horarios</h3>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-transform shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido (Scrollable) */}
            <div className="flex-1 overflow-y-auto pl-10 pr-6 pt-6 pb-[120px] space-y-4">
              {fetching ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600" />
                </div>
              ) : (
                DAYS.map((day) => (
                  <div
                    key={day.value}
                    className={cn(
                      "flex flex-col gap-4 p-5 rounded-3xl border-2 transition-all duration-300",
                      slots[day.value].enabled
                        ? "border-blue-100 bg-white shadow-xl shadow-blue-900/5"
                        : "border-slate-100 bg-slate-100/50"
                    )}
                  >
                    {/* Header del Día */}
                    <div className="flex items-center justify-between gap-4">
                      <span className={cn(
                        "text-2xl flex-1 font-black tracking-tighter transition-colors",
                        slots[day.value].enabled ? "text-slate-900" : "text-slate-400"
                      )}>
                        {day.label}
                      </span>

                      {/* Switch Gigante (Mobile Friendly) */}
                      <button
                        onClick={() => toggle(day.value)}
                        className={cn(
                          "w-16 h-9 rounded-full transition-all duration-300 flex-shrink-0 relative",
                          slots[day.value].enabled ? "bg-[#34C759]" : "bg-slate-300"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md transition-transform duration-300",
                            slots[day.value].enabled ? "translate-x-7" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Controles de Tiempo */}
                    <AnimatePresence>
                      {slots[day.value].enabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex items-center gap-4 pt-2 overflow-hidden"
                        >
                          <div className="flex-1 w-full overflow-hidden">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 block pl-2">Abre</span>
                            <PickerButton
                              icon={Clock}
                              placeholder="09:00"
                              value={slots[day.value].start}
                              onClick={() => setActivePicker({ day: day.value, field: 'start' })}
                              className="w-full h-14 text-xl font-black bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-2xl px-2 hover:bg-slate-100 transition-colors shrink-0"
                            />
                          </div>
                          <span className="text-xl font-black text-slate-300 mt-5 shrink-0">-</span>
                          <div className="flex-1 w-full overflow-hidden">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 block pl-2">Cierra</span>
                            <PickerButton
                              icon={Clock}
                              placeholder="18:00"
                              value={slots[day.value].end}
                              onClick={() => setActivePicker({ day: day.value, field: 'end' })}
                              className="w-full h-14 text-xl font-black bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-2xl px-2 hover:bg-slate-100 transition-colors shrink-0"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>

            {/* Footer Fijo con Botón Guardar */}
            <div className="absolute bottom-0 left-0 right-0 pl-10 pr-6 pb-6 pt-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
              <button
                onClick={handleSave}
                disabled={loading || fetching}
                className="w-full h-16 bg-slate-900 hover:bg-blue-600 active:scale-[0.98] transition-all rounded-[24px] flex items-center justify-center gap-3 text-white shadow-2xl shadow-slate-900/30 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                ) : (
                  <>
                    <CheckCircle2 className="w-7 h-7" />
                    <span className="text-2xl font-black tracking-tighter">Guardar</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <MobileTimePicker
            isOpen={activePicker !== null}
            onClose={() => setActivePicker(null)}
            value={activePicker ? slots[activePicker.day][activePicker.field] : '09:00'}
            onChange={(time) => {
              if (activePicker) {
                handleTime(activePicker.day, activePicker.field, time)
              }
            }}
            title={activePicker?.field === 'start' ? "Hora de Apertura" : "Hora de Cierre"}
          >
            <div className="p-4 bg-slate-50 rounded-2xl mt-4">
              <WheelTimePicker 
                value={activePicker ? slots[activePicker.day][activePicker.field] : '09:00'}
                onChange={(time) => {
                  if (activePicker) {
                    handleTime(activePicker.day, activePicker.field, time)
                  }
                }}
              />
            </div>
          </MobileTimePicker>
        </>
      )}
    </AnimatePresence>
  )
}
