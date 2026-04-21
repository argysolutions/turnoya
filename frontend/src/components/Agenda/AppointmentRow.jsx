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
const AppointmentRow = ({ appointment, onClick, isCompact = false }) => {
  const { start_at, client_name, service_name, status, client_phone } = appointment
  
  // Safe time formatting
  const startTime = start_at ? format(new Date(start_at), 'HH:mm') : '--:--'

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={cn(
        "group flex items-center justify-between bg-white hover:bg-slate-50 transition-all cursor-pointer border-b border-slate-50 last:border-0",
        isCompact ? "px-4 py-3 gap-4" : "p-5 gap-5 sm:gap-8"
      )}
    >
      <div className="flex items-center flex-1 min-w-0 gap-3 sm:gap-6">
        {/* Time */}
        <div className={cn("flex flex-col items-center shrink-0", isCompact ? "min-w-[45px]" : "min-w-[55px]")}>
          <span className={cn("font-bold text-slate-900 tracking-tighter", isCompact ? "text-lg" : "text-base")}>
            {startTime}
          </span>
          {!isCompact && (
            <span className="font-bold text-slate-400 !tracking-tight text-[10px] mt-0.5">
              Inicio
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 overflow-hidden space-y-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className={cn("font-bold text-slate-900 tracking-tight truncate", isCompact ? "text-sm" : "text-sm")}>
              {client_name}
            </span>
            {appointment.client_history_count > 1 && !isCompact && (
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 !tracking-tight">
                Frecuente 🔥
              </span>
            )}
          </div>
          <div className={cn("flex items-center gap-x-3 text-slate-500 font-medium truncate", isCompact ? "text-[10px]" : "text-xs")}>
            <div className="flex items-center gap-1.5 shrink-0">
              <Scissors className={cn("text-slate-300", isCompact ? "w-3 h-3" : "w-3 h-3")} />
              <span className={cn("truncate max-w-[150px]", isCompact ? "text-[11px]" : "")}>{service_name}</span>
            </div>
            {client_phone && !isCompact && (
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <Phone className="w-3 h-3 text-slate-300" />
                <span className="tabular-nums">{client_phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Badge (Hidden in Compact/Grid Mode) */}
      {!isCompact && (
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn(
            "flex items-center gap-1.5 bg-slate-50/50 rounded-lg border border-slate-100 px-3 py-1.5"
          )}>
            <div className={cn("rounded-full w-2 h-2", statusColors[status] || 'bg-slate-300')} />
            <span className={cn("font-bold !tracking-tight text-slate-600 text-[10px]")}>
              {statusLabels[status] || status}
            </span>
          </div>
          
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all hidden sm:block" />
        </div>
      )}
    </div>
  )
}

export default AppointmentRow
