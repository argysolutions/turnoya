import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, Scissors, Info as InfoIcon, Star, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusStyles = {
  pending: 'bg-amber-50 border-amber-200 text-amber-700',
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  completed: 'bg-blue-50 border-blue-200 text-blue-700',
  cancelled: 'bg-rose-50 border-rose-200 text-rose-700',
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

const getCardColors = (status) => {
  switch (status) {
    case 'pending':
    case 'pending_block': 
      return 'bg-amber-50/70 border-amber-200/60 text-amber-900';
    case 'confirmed': 
      return 'bg-emerald-50/70 border-emerald-200/60 text-emerald-900';
    case 'completed': 
      return 'bg-blue-50/70 border-blue-200/60 text-blue-900';
    case 'cancelled':
    case 'cancelled_occupied':
    case 'cancelled_timeout':
    case 'no_show': 
      return 'bg-rose-50/70 border-rose-200/60 text-rose-900';
    default: 
      return 'bg-white border-slate-200 text-slate-900';
  }
};

export const AppointmentCard = ({ appointment, onClick }) => {
  const { start_at, client_name, service_name, status, phone, is_frequent } = appointment
  const startTime = format(new Date(start_at), 'HH:mm')

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={cn(
        "group relative flex items-center p-5 md:p-3 border rounded-[2rem] md:rounded-2xl transition-all cursor-pointer hover:shadow-xl active:scale-[0.98] shadow-sm",
        getCardColors(status)
      )}
    >
      <div className="flex items-center gap-4 md:gap-3 w-full">
        {/* TIME PILL */}
        <div className="flex flex-col items-center justify-center min-w-[4rem] md:min-w-[3.5rem] bg-white/50 backdrop-blur-sm rounded-2xl md:rounded-xl py-2 md:py-1 border border-current/5 shadow-inner">
          <span className="text-xl md:text-lg font-black text-slate-900 leading-none">{startTime}</span>
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter hidden md:block">Inicio</span>
        </div>

        {/* CONTENT BLOCK */}
        <div className="flex flex-col border-l-2 md:border-l border-slate-200/50 pl-4 md:pl-3 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base md:text-sm font-black text-slate-900 truncate">
                {client_name || 'Sin nombre'}
              </span>
              {is_frequent && (
                <div className="bg-amber-100 p-1 rounded-full shrink-0">
                  <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                </div>
              )}
            </div>
            {/* Status Indicator Dot (Mobile) */}
            <div className={cn(
              "md:hidden w-2.5 h-2.5 rounded-full",
              statusStyles[status]?.split(' ')[0] || 'bg-slate-400'
            )} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 md:mt-1 text-[13px] md:text-[11px] text-slate-500 font-bold truncate">
            <div className="flex items-center gap-1.5 min-w-0">
              <Scissors className="w-3.5 h-3.5 md:w-3 md:h-3 text-slate-400 shrink-0" /> 
              <span className="truncate">{service_name || 'Servicio'}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <span className="hidden md:inline opacity-30">•</span>
                <span className="truncate">{phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Indicator (Desktop Only) */}
        <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </div>
      </div>
      
      {/* Visual background texture/gradient for Wallet feel */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/10 to-transparent pointer-events-none rounded-b-[2rem]" />
    </div>
  )
}

export default AppointmentCard
