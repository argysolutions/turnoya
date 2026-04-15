import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, Bell, Check, Trash2, Calendar, DollarSign, ShieldCheck, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getAppointments, updateStatus } from '@/api/appointments'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export default function NotificationTray() {
  const { isOwner } = useAuth()
  const [notifications, setNotifications] = useState([
    {
      id: 'mock-1',
      title: 'Sistema Activo',
      description: 'La bandeja de notificaciones ha sido configurada.',
      time: 'Ahora',
      type: 'system',
      unread: true
    }
  ])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRequests = useCallback(async () => {
    if (!isOwner) return
    try {
      const { data } = await getAppointments()
      const pendingBlocks = data.filter(a => a.status === 'pending_block')
      setRequests(pendingBlocks)
    } catch {
      console.error('Error al cargar solicitudes en bandeja')
    }
  }, [isOwner])

  useEffect(() => {
    fetchRequests()
    // Polling opcional cada 1 minuto
    const interval = setInterval(fetchRequests, 60000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const unreadCount = notifications.filter(n => n.unread).length + requests.length

  const handleRequest = async (id, status) => {
    setLoading(true)
    try {
      await updateStatus(id, status)
      toast.success(status === 'cancelled_occupied' ? 'Bloqueo aprobado' : 'Solicitud rechazada')
      fetchRequests()
    } catch {
      toast.error('Error al procesar solicitud')
    } finally {
      setLoading(false)
    }
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
  }

  const removeNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const getIcon = (type) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-500" />
      case 'finance': return <DollarSign className="w-4 h-4 text-emerald-500" />
      default: return <Bell className="w-4 h-4 text-slate-500" />
    }
  }

  const getRequestedByName = (notesStr) => {
    try {
      const data = JSON.parse(notesStr || '{}')
      return data.requested_by_name || 'Empleado'
    } catch { return 'Empleado' }
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && fetchRequests()}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200 group"
        >
          <Bell className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                {unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[320px] sm:w-[380px] p-0 shadow-2xl rounded-2xl border-slate-200 mt-1 overflow-hidden">
        <div className="bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-slate-900" />
              <h3 className="font-bold text-slate-900">Bandeja</h3>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-[11px] font-bold uppercase tracking-tight text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-7"
              >
                Limpiar todo
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
            <AnimatePresence initial={false}>
              {/* Sección de Solicitudes (Solo Dueño) */}
              {isOwner && requests.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border-b border-amber-50 bg-amber-50/30 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-0.5">Autorización Requerida</p>
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {getRequestedByName(r.notes)} solicitó un bloqueo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {new Date(r.date).toLocaleDateString()} - {r.start_time.slice(0,5)} hs
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      disabled={loading}
                      onClick={() => handleRequest(r.id, 'cancelled_occupied')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest h-9 rounded-xl"
                    >
                      Aprobar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      disabled={loading}
                      onClick={() => handleRequest(r.id, 'cancelled')}
                      className="flex-1 border border-amber-100 text-amber-700 hover:bg-amber-100 font-bold text-[10px] uppercase tracking-widest h-9 rounded-xl"
                    >
                      Rechazar
                    </Button>
                  </div>
                </motion.div>
              ))}

              {/* Notificaciones Normales */}
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 border-b border-slate-50 flex items-start gap-3 hover:bg-slate-50 transition-colors relative group ${n.unread ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      n.unread ? 'bg-white border border-indigo-100' : 'bg-slate-100'
                    }`}>
                      {getIcon(n.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm font-bold truncate ${n.unread ? 'text-slate-900' : 'text-slate-600'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                        {n.description}
                      </p>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeNotification(n.id)}
                      className="absolute right-2 top-11 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>

                    {n.unread && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    )}
                  </motion.div>
                ))
              ) : requests.length === 0 && (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">¡Todo al día!</p>
                  <p className="text-xs text-slate-400 mt-1">No tienes notificaciones pendientes.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {(notifications.length > 0 || requests.length > 0) && (
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
              <Button variant="ghost" className="w-full text-xs text-slate-500 font-bold hover:text-slate-900 h-8">
                Ver historial completo
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
