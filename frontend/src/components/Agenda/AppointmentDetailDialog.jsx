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
import { Badge } from '@/components/ui/badge'
import { Clock, User, Scissors, Trash2, CheckCircle, XCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const AppointmentDetailDialog = ({ appointment, isOpen, onClose, onUpdateStatus, onDelete }) => {
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  const handleAction = async (actionFn, ...args) => {
    setLoading(true)
    try {
      await actionFn(...args)
      onClose()
    } catch (err) {
      // Error handled by hook
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-4 shrink-0" />
      
      <div className="flex flex-col p-6 md:p-8 pt-2 md:pt-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={appointment.status === 'confirmed' ? 'success' : 'secondary'} className="rounded-md px-2 py-0.5 text-[10px] uppercase font-black">
                {appointment.status.toUpperCase()}
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{appointment.client_name}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Detalles del turno agendado</p>
          </div>
          <button onClick={onClose} className="hidden md:flex p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex flex-col gap-4 bg-slate-50/50 p-6 rounded-[2.5rem] md:rounded-2xl border border-slate-100 shadow-inner">
            <div className="flex items-center gap-4 text-slate-700">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                <p className="font-black text-slate-900">{format(new Date(appointment.start_at), "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-slate-700">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Servicio</p>
                <p className="font-black text-slate-900">{appointment.service_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-700">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-600">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profesional</p>
                <p className="font-black text-slate-900">{appointment.staff_name || 'Sin asignar'}</p>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100/50">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 px-1">Notas del Profesional</p>
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-amber-100/30 text-amber-900 font-medium italic shadow-sm">
                "{appointment.notes}"
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 pb-8 md:pb-0">
            {appointment.status !== 'confirmed' && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <Button 
                onClick={() => handleAction(onUpdateStatus, appointment.id, 'confirmed')}
                disabled={loading}
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl h-14 shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                <CheckCircle className="w-5 h-5 mr-3" />
                Confirmar
              </Button>
            )}
            
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button 
                variant="outline"
                onClick={() => handleAction(onUpdateStatus, appointment.id, 'cancelled')}
                disabled={loading}
                className="w-full sm:flex-1 text-rose-600 border-rose-100 hover:bg-rose-50 font-black text-lg rounded-2xl h-14 active:scale-95 transition-all"
              >
                <XCircle className="w-5 h-5 mr-3" />
                Cancelar
              </Button>
            )}

            <Button 
              variant="ghost" 
              onClick={() => handleAction(onDelete, appointment.id)}
              disabled={loading}
              className="w-full sm:w-auto text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl h-14 px-6 active:scale-95 transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          {/* Modal/Drawer Container */}
          <motion.div
            initial={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
            animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag={window.innerWidth < 768 ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, info) => {
              if (window.innerWidth < 768 && info.offset.y > 100) onClose()
            }}
            className={cn(
              "relative w-full bg-white shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto hide-scrollbar",
              "rounded-t-[2.5rem] md:rounded-[2rem] md:max-w-[500px] md:mb-0"
            )}
          >
            {renderContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AppointmentDetailDialog
