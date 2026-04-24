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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                appointment.status === 'confirmed' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                appointment.status === 'pending' ? "bg-amber-50 border-amber-100 text-amber-600" :
                "bg-slate-100 border-slate-200 text-slate-500"
              )}>
                {appointment.status === 'confirmed' ? 'Confirmado' : 
                 appointment.status === 'pending' ? 'Pendiente' : 
                 appointment.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter truncate leading-tight">
              {appointment.client_name}
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">Detalles de la Cita</p>
          </div>
          <button onClick={onClose} className="hidden md:flex p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-3 bg-slate-50/50 p-6 rounded-[2.5rem] md:rounded-3xl border border-slate-100 shadow-inner">
            <div className="flex items-center gap-5 p-4 bg-white rounded-2xl shadow-sm border border-slate-100/50">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Fecha y Hora</p>
                <p className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                  {format(new Date(appointment.start_at), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-2xl font-black text-blue-600 tracking-tighter mt-1">
                  {format(new Date(appointment.start_at), "HH:mm' HS'", { locale: es })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-5 p-4 bg-white rounded-2xl shadow-sm border border-slate-100/50">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Scissors className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Servicio Prestado</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">{appointment.service_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-4 bg-white rounded-2xl shadow-sm border border-slate-100/50">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Profesional Asignado</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">{appointment.staff_name || 'Sin asignar'}</p>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100/50">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 px-1">Notas Internas</p>
              <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-amber-100/30 text-amber-900 font-bold italic shadow-sm text-lg leading-relaxed">
                "{appointment.notes}"
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 pb-10 md:pb-0">
            <div className="flex gap-3">
              {appointment.status !== 'confirmed' && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                <Button 
                  onClick={() => handleAction(onUpdateStatus, appointment.id, 'confirmed')}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl h-16 shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-tighter"
                >
                  <CheckCircle className="w-6 h-6 mr-3" />
                  Confirmar
                </Button>
              )}
              
              {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                <Button 
                  variant="outline"
                  onClick={() => handleAction(onUpdateStatus, appointment.id, 'cancelled')}
                  disabled={loading}
                  className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 font-black text-lg rounded-2xl h-16 active:scale-95 transition-all uppercase tracking-tighter"
                >
                  <XCircle className="w-6 h-6 mr-3" />
                  Cancelar
                </Button>
              )}
            </div>

            <Button 
              variant="ghost" 
              onClick={() => handleAction(onDelete, appointment.id)}
              disabled={loading}
              className="w-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-2xl h-14 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Permanentemente
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
