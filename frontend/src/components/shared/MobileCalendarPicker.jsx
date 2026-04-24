import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addMonths, isSameDay } from 'date-fns'

export const MobileCalendarPicker = ({ isOpen, onClose, value, onSelect, title = "Calendario" }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  // Swipe sensitivity
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
    if (isRightSwipe) {
      setCurrentMonth(addMonths(currentMonth, -1))
    }
  }

  const selectedDate = value ? new Date(value + 'T12:00:00') : new Date()

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
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />

          {/* Floating Modal / Bottom Sheet */}
          <div className="fixed inset-0 z-[160] flex items-end justify-center p-4 pb-10 pointer-events-none lg:hidden">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 100 }}
              layout
              className="relative w-full max-w-[480px] bg-white rounded-[3rem] flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-white">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h3>
                  <p className="text-lg text-slate-500 font-bold mt-2">Seleccioná una fecha para agendar.</p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-slate-100 rounded-full text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Calendar Content */}
              <div 
                className="px-4 py-2 flex flex-col items-center"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear()
                      const month = (date.getMonth() + 1).toString().padStart(2, '0')
                      const day = date.getDate().toString().padStart(2, '0')
                      onSelect(`${year}-${month}-${day}`)
                      onClose()
                    }
                  }}
                  fixedWeeks
                  className="w-full p-2"
                />
              </div>

              <AnimatePresence mode="popLayout">
                {!isSameDay(selectedDate, new Date()) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, y: 20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: 20 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-10 pt-4 bg-white border-t border-slate-50">
                      <button 
                        onClick={() => {
                          const today = new Date()
                          const year = today.getFullYear()
                          const month = (today.getMonth() + 1).toString().padStart(2, '0')
                          const day = today.getDate().toString().padStart(2, '0')
                          onSelect(`${year}-${month}-${day}`)
                          onClose()
                        }}
                        className="w-full h-14 rounded-2xl bg-blue-600 text-white text-sm font-black uppercase tracking-tight shadow-xl shadow-blue-100 active:scale-90 transition-all"
                      >
                        Volver a Hoy
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

