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
import { Clock, User, Scissors, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const AppointmentDetailDialog = ({ appointment, isOpen, onClose, onUpdateStatus, onDelete }) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={appointment.status === 'confirmed' ? 'success' : 'secondary'}>
              {appointment.status.toUpperCase()}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-black">{appointment.client_name}</DialogTitle>
          <DialogDescription>
            Detalles del turno agendado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-slate-700">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-bold">
                  {format(new Date(appointment.start_at), "EEEE d MMMM", { locale: es })}
                </p>
                <p className="text-xs opacity-70">
                  {format(new Date(appointment.start_at), 'HH:mm')} - {format(new Date(appointment.end_at), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Scissors className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-bold">{appointment.service_name}</p>
                <p className="text-xs opacity-70">${appointment.price} • {appointment.duration} min</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 border-t pt-3 mt-1">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-bold">{appointment.client_phone}</p>
                <p className="text-xs opacity-70">Contacto del cliente</p>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Notas</p>
              <p className="text-sm text-slate-600 bg-white border p-3 rounded-xl italic">
                "{appointment.notes}"
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 gap-2">
            {appointment.status !== 'confirmed' && (
              <Button 
                variant="outline" 
                className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleAction(onUpdateStatus, appointment.id, 'confirmed')}
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleAction(onUpdateStatus, appointment.id, 'cancelled')}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-red-600"
            onClick={() => handleAction(onDelete, appointment.id)}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AppointmentDetailDialog
