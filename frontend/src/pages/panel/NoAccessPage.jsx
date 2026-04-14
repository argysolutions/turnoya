import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ShieldOff, ArrowLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Página 403 — Acceso Denegado.
 *
 * Se muestra cuando el usuario está autenticado pero su rol
 * no alcanza para acceder a la ruta solicitada.
 *
 * Comportamiento:
 *  - No hace logout automático. El usuario puede volver atrás.
 *  - Si el usuario no está autenticado directamente → redirige a /login.
 */
export default function NoAccessPage() {
  const { isAuthenticated, role, logout } = useAuth()
  const navigate = useNavigate()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>

        {/* Copy */}
        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">Acceso Denegado</h1>
        <p className="text-sm text-slate-400 font-medium mb-1">
          Tu rol actual <span className="font-black text-slate-600">({role ?? 'desconocido'})</span> no tiene permisos para ver esta sección.
        </p>
        <p className="text-xs text-slate-300 mb-8">
          Código HTTP 403 — autenticado pero sin permiso suficiente.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate(-1)}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.15em]"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Volver
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full h-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl font-semibold text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
