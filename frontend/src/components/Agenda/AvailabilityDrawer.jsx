import React from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, Clock } from 'lucide-react'

export default function AvailabilityDrawer({ isOpen, onClose }) {
  const dragControls = useDragControls()

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
            className="fixed inset-y-0 right-0 z-[120] w-[85vw] max-w-[400px] bg-white rounded-l-[32px] flex flex-col lg:hidden shadow-[-8px_0_30px_rgb(0,0,0,0.12)]"
          >
            {/* Handle Area para Drag (Borde Izquierdo) */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="absolute left-0 inset-y-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <div className="w-1.5 h-12 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="pl-10 pr-6 py-6 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Disponibilidad</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-black active:scale-90 transition-transform shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pl-10 pr-6 py-6 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-xl font-black text-slate-600 tracking-tighter">Gestión de Horarios</p>
                <p className="text-sm font-bold text-slate-400 mt-2">Próximamente podrás editar tus días y horas laborables desde aquí.</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
