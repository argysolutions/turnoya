import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const MobileCalendarPicker = ({ isOpen, onClose, value, onSelect, title = "Seleccionar Fecha" }) => {
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
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[160] flex flex-col bg-white rounded-t-[32px] lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
          >
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-2 shrink-0" />

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Content */}
            <div className="p-4 flex flex-col items-center">
              <Calendar
                mode="single"
                selected={value ? new Date(value + 'T12:00:00') : new Date()}
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear()
                    const month = (date.getMonth() + 1).toString().padStart(2, '0')
                    const day = date.getDate().toString().padStart(2, '0')
                    onSelect(`${year}-${month}-${day}`)
                    onClose()
                  }
                }}
                className="rounded-2xl border-none p-4"
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
