import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MobileTimePicker: A "Scroll Wheel" style time selector.
 * Professional wheel navigation with CSS scroll snap.
 */
export const MobileTimePicker = ({ isOpen, onClose, value, onChange, title = "Seleccionar Hora", children }) => {
  // Parse current value
  const initialHour = value ? value.split(':')[0] : '09'
  const initialMin = value ? value.split(':')[1] : '00'

  const [selHour, setSelHour] = useState(initialHour)
  const [selMin, setSelMin] = useState(initialMin)

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 / 15 }, (_, i) => (i * 15).toString().padStart(2, '0')) // 15 min steps

  const hourRef = useRef(null)
  const minRef = useRef(null)

  // Sync state with value prop
  useEffect(() => {
    if (isOpen) {
      setSelHour(initialHour)
      setSelMin(initialMin)
    }
  }, [isOpen, initialHour, initialMin])

  const handleConfirm = () => {
    onChange(`${selHour}:${selMin}`)
    onClose()
  }

  const Wheel = ({ items, selected, onSelect, label }) => (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</span>
      <div className="relative h-48 w-full overflow-hidden flex items-center justify-center">
        {/* Center Highlight */}
        <div className="absolute inset-x-4 h-12 border-y border-slate-100 bg-slate-50/50 rounded-lg pointer-events-none z-0" />
        
        {/* Scrollable Container */}
        <div 
          className="w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar z-10"
          onScroll={(e) => {
            const index = Math.round(e.target.scrollTop / 48)
            if (items[index] && items[index] !== selected) {
              onSelect(items[index])
            }
          }}
        >
          {/* Spacers for top/bottom focus */}
          <div className="h-[72px]" /> 
          {items.map((item) => (
            <div 
              key={item}
              className={cn(
                "h-12 flex items-center justify-center text-xl font-bold transition-all snap-center",
                selected === item ? "text-slate-900 scale-125" : "text-slate-300 scale-90"
              )}
            >
              {item}
            </div>
          ))}
          <div className="h-[72px]" />
        </div>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[160] flex flex-col bg-white rounded-t-[32px] lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex items-center justify-center gap-12">
              {children ? (
                children
              ) : (
                <>
                  <Wheel items={hours} selected={selHour} onSelect={setSelHour} label="HORA" />
                  <div className="text-3xl font-black text-slate-300 pt-6">:</div>
                  <Wheel items={minutes} selected={selMin} onSelect={setSelMin} label="MINUTOS" />
                </>
              )}
            </div>

            <div className="px-6 pb-10">
              <button 
                onClick={handleConfirm}
                className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-95 transition-all text-lg"
              >
                Confirmar Hora
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
