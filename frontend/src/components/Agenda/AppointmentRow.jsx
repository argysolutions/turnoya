import React from 'react'
import { format } from 'date-fns'
import { Scissors, Phone, ChevronRight, User } from 'lucide-react'
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

/**
 * AppointmentRow
 * Individual appointment representation.
 * Updated to match the high-contrast, minimal design system.
 */
const AppointmentRow = ({ appointment, onClick }) => {
  const { start_at, client_name, service_name, status, client_phone } = appointment
  
  // Safe time formatting
  const startTime = start_at ? format(new Date(start_at), 'HH:mm') : '--:--'

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white hover:bg-slate-50/80 transition-all cursor-pointer border-b border-slate-50 last:border-0"
    >
      <div className="flex items-center gap-5 sm:gap-8">
        {/* Time - High contrast */}
        <div className="flex flex-col items-center min-w-[45px]">
          <span className="text-base font-black text-slate-900 tracking-tight">{startTime}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Inicio</span>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 tracking-tight">{client_name}</span>
            {appointment.client_history_count > 1 && (
              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                Frecuente 🔥
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3 h-3 text-slate-300" />
              <span>{service_name}</span>
            </div>
            {client_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-300" />
                <span className="tabular-nums">{client_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Badge & Action */}
      <div className="flex items-center justify-between sm:justify-end gap-4 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-50">
        <div className="flex items-center gap-2 bg-slate-50/50 px-3 py-1.5 rounded-xl border border-slate-100">
          <div className={cn("w-2 h-2 rounded-full", statusColors[status] || 'bg-slate-300')} />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">
            {statusLabels[status] || status}
          </span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all hidden sm:block" />
        <div className="sm:hidden text-[9px] font-bold text-slate-400 flex items-center gap-1">
          Ver detalle <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

export default AppointmentRow
