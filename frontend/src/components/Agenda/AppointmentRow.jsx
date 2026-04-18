import React from 'react'
import { format } from 'date-fns'
import { Scissors, Clock, User, Phone, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusColors = {
  pending: 'bg-amber-400',
  pending_block: 'bg-amber-400',
  confirmed: 'bg-emerald-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-rose-400',
  cancelled_occupied: 'bg-rose-400',
  cancelled_timeout: 'bg-rose-300',
  no_show: 'bg-red-600'
}

const statusLabels = {
  pending: 'Pendiente',
  pending_block: 'Bloqueo Pendiente',
  confirmed: 'Confirmado',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
  cancelled_occupied: 'Ocupado',
  cancelled_timeout: 'Expirado',
  no_show: 'Ausente'
}

const AppointmentRow = ({ appointment, onClick }) => {
  const { start_at, client_name, service_name, status, client_phone } = appointment
  
  // Formateo de hora seguro
  const startTime = start_at ? format(new Date(start_at), 'HH:mm') : '--:--'

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className="group flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-all cursor-pointer border-b border-slate-50 last:border-0"
    >
      <div className="flex items-center gap-8">
        {/* Time Container */}
        <div className="flex flex-col items-center">
          <span className="text-base font-black text-slate-900 tracking-tight">{startTime}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inicio</span>
        </div>

        {/* Content Container */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 tracking-tight">{client_name}</span>
            {appointment.client_history_count > 1 && (
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tighter">
                Frecuente 🔥
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Scissors className="w-3 h-3 text-slate-300" />
              <span>{service_name}</span>
            </div>
            {client_phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-300" />
                <span>{client_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
          <div className={cn("w-2 h-2 rounded-full shadow-sm", statusColors[status] || 'bg-slate-300')} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {statusLabels[status] || status}
          </span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  )
}

export default AppointmentRow
