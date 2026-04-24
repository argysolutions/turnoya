import React, { useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addMonths } from 'date-fns'

export const MobileCalendarPicker = ({ isOpen, onClose, value, onSelect, title = "Calendario" }) => {
  const dragControls = useDragControls()
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

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={{ top: 0, bottom: 0.1 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[160] flex flex-col bg-white rounded-t-[32px] lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
          >
            {/* Handle Bar Area */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="w-full py-4 cursor-grab active:cursor-grabbing shrink-0"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-black active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Content */}
            <div 
              className="p-1 flex flex-col items-center"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <Calendar
                mode="single"
                selected={value ? new Date(value + 'T12:00:00') : new Date()}
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

            {/* Bottom Safe Area Padding */}
            <div className="h-8 shrink-0" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
