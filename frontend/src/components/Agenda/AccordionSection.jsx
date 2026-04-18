import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * AccordionSection
 * Componentized section for grouping appointments by status.
 * Re-designed to follow the 'rounded-2xl' Design System.
 */
const AccordionSection = ({ title, count, color, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md mb-4 last:mb-0">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
            {title}
          </h3>
          <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-200/40">
            {count}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'backOut' }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-white border-t border-slate-50">
              {count > 0 ? (
                children
              ) : (
                <div className="py-12 text-center bg-slate-50/20">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sin turnos registrados</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AccordionSection
