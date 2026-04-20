import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, Scissors, info as InfoIcon, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusStyles = {
  pending: 'bg-amber-50 border-amber-200 text-amber-700',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  completed: 'bg-blue-50 border-blue-200 text-blue-700',
  cancelled: 'bg-slate-50 border-slate-200 text-slate-500 line-through',
  cancelled_occupied: 'bg-slate-100 border-slate-300 text-slate-400 italic',
  pending_block: 'bg-amber-100 border-amber-300 text-amber-800 border-dashed'
}

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  cancelled_occupied: 'Bloqueo/Receso',
  pending_block: 'Esperando Aprobación'
}

export const AppointmentCard = ({ appointment, onClick }) => {
  const { start_at, client_name, service_name, status, phone, is_frequent } = appointment
  const startTime = format(new Date(start_at), 'HH:mm')

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={cn(
        "group relative flex items-center p-3 border rounded-2xl transition-all cursor-pointer hover:shadow-lg active:scale-[0.98] bg-white",
        statusStyles[status] || 'border-slate-100 shadow-sm'
      )}
    >
      <div className="flex items-center gap-3 w-full">
        {/* TIME BLOCK */}
        <div className="flex flex-col items-center justify-center min-w-[3.5rem]">
          <span className="text-base font-bold text-slate-900 leading-none">{startTime}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Inicio</span>
        </div>

        {/* CONTENT BLOCK with vertical separator */}
        <div className="flex flex-col border-l border-slate-200 pl-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 truncate max-w-[140px]">
              {client_name || 'Sin nombre'}
            </span>
            {is_frequent && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {/* Quick status badge mini */}
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/50 border border-current/10">
              {statusLabels[status]?.split(' ')[0] || status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium truncate">
            <Scissors className="w-3 h-3 shrink-0" /> 
            <span className="truncate">{service_name || 'Servicio'}</span>
            {phone && (
              <>
                <span className="opacity-30">•</span>
                <span className="truncate">{phone}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppointmentCard
