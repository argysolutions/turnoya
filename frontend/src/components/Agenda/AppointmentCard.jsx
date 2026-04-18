import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, User, Scissors, info as InfoIcon } from 'lucide-react'
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
  const { start_at, end_at, client_name, service_name, status, notes } = appointment
  
  const startTime = format(new Date(start_at), 'HH:mm')
  const endTime = format(new Date(end_at), 'HH:mm')

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={cn(
        "group relative flex flex-col md:flex-row md:items-center justify-between p-4 mb-3 border rounded-xl transition-all cursor-pointer hover:shadow-md",
        statusStyles[status] || 'bg-white border-gray-200'
      )}
    >
      <div className="flex items-start md:items-center space-x-4">
        <div className="flex flex-col items-center justify-center min-w-[60px] py-1 bg-white/50 rounded-lg border border-current/10">
          <span className="text-xs font-bold uppercase tracking-tighter opacity-70">Inicio</span>
          <span className="text-lg font-black">{startTime}</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 opacity-70" />
            <h4 className="font-bold leading-none">{client_name}</h4>
          </div>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Scissors className="w-3.5 h-3.5" />
            <span>{service_name}</span>
            <span className="mx-1">•</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{endTime} fin</span>
          </div>
        </div>
      </div>

      <div className="mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/60">
          {statusLabels[status] || status}
        </span>
        {notes && (
          <div className="text-xs italic opacity-60 flex items-center gap-1 max-w-[150px] truncate">
            <InfoIcon className="w-3 h-3" />
            {notes}
          </div>
        )}
      </div>
    </div>
  )
}

export default AppointmentCard
