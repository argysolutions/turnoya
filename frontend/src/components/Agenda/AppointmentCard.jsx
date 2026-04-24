import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, Scissors, Info as InfoIcon, Star, ChevronRight, MessageCircle, Phone, History } from 'lucide-react'
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
    case 'rescheduled':
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

export const AppointmentCard = React.memo(({ appointment, onClick }) => {
  const { start_at, client_name, service_name, status, phone, is_frequent } = appointment
  const startTime = format(new Date(start_at), 'HH:mm')

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={cn(
        "group relative flex items-center p-5 md:p-3 border rounded-[2rem] md:rounded-2xl transition-all cursor-pointer hover:shadow-xl active:scale-[0.98] shadow-sm w-full h-[120px] md:h-auto select-none overflow-hidden",
        getCardColors(status)
      )}
    >
      {/* Status Indicator Dot (Mobile - Absolute to save space) */}
      <div className={cn(
        "md:hidden absolute top-6 right-6 w-3 h-3 rounded-full shadow-sm",
        statusStyles[status]?.split(' ')[0] || 'bg-slate-400'
      )} />

      <div className="flex items-center gap-4 md:gap-3 w-full h-full">
        {/* TIME PILL */}
        <div className="flex flex-col items-center justify-center min-w-[6.5rem] md:min-w-[3.5rem] h-full bg-white/50 backdrop-blur-sm rounded-2xl md:rounded-xl py-1 px-1 border border-current/5 shadow-inner shrink-0">
          <span className="text-3xl md:text-lg font-black text-slate-900 leading-none">{startTime}</span>
        </div>

        {/* CONTENT BLOCK */}
        <div className="flex flex-col border-l-2 md:border-l border-slate-200/50 pl-4 md:pl-3 flex-1 min-w-0 justify-center h-full">
          <div className="flex items-center pr-8 md:pr-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[22px] md:text-sm font-black text-slate-900 truncate block w-full">
                {client_name || 'Sin nombre'}
              </span>
              {is_frequent && (
                <div className="bg-amber-100 p-1 rounded-full shrink-0">
                  <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-x-3 mt-1 md:mt-1 text-lg md:text-[11px] text-slate-500 font-bold overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 max-w-[60%]">
              <Scissors className="w-5 h-5 md:w-3 md:h-3 text-slate-400 shrink-0" /> 
              <span className="truncate whitespace-nowrap">{service_name || 'Servicio'}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-1 ml-auto">
                <div className="flex items-center gap-1 ml-1">
                  {status === 'rescheduled' && (
                    <div className="flex items-center justify-center p-3 md:p-2 bg-blue-50 text-blue-600 rounded-xl md:rounded-lg mr-1 border border-blue-100 shadow-sm">
                      <History className="w-6 h-6 md:w-5 md:h-5" />
                    </div>
                  )}
                  <a 
                    href={`tel:${phone.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center p-3 md:p-2 bg-blue-100 text-blue-600 rounded-xl md:rounded-lg active:scale-90 transition-transform"
                  >
                    <Phone className="w-6 h-6 md:w-5 md:h-5 fill-blue-600/10" />
                  </a>
                  <a 
                    href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center p-3 md:p-2 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-lg active:scale-90 transition-transform"
                  >
                    <MessageCircle className="w-6 h-6 md:w-5 md:h-5 fill-emerald-600/10" />
                  </a>
                </div>
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
})

export default AppointmentCard
