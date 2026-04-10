import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Settings, HelpCircle, Share2, LogOut, User, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import { toast } from 'sonner'

const navItems = [
  { label: 'Agenda', path: '/dashboard' },
  { label: 'Servicios', path: '/servicios' },
  { label: 'Disponibilidad', path: '/disponibilidad' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('business')
    navigate('/login')
  }

  const [business, setBusiness] = useState(() => JSON.parse(localStorage.getItem('business') || '{}'))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [googleLinked, setGoogleLinked] = useState(false)

  // Listen for the popup message from the Google Auth callback
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data === 'GOOGLE_AUTH_SUCCESS') {
        const updatedBusiness = { ...business, google_linked: true }
        localStorage.setItem('business', JSON.stringify(updatedBusiness))
        setBusiness(updatedBusiness)
        setGoogleLinked(true)
        toast.success('¡Cuenta de Google vinculada con éxito!')
      } else if (event.data === 'GOOGLE_AUTH_ERROR') {
        toast.error('Hubo un error al vincular tu cuenta de Google')
      }
    }
    window.addEventListener('message', handleMessage)
    
    // Check initial state from business object
    if (business.google_refresh_token || business.google_linked) {
      setGoogleLinked(true)
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [business])

  const handleLinkGoogle = async () => {
    try {
      const res = await client.get('/admin/auth/google/url')
      if (res.data.url) {
        window.open(res.data.url, 'GoogleAuth', 'width=500,height=600')
      } else {
        toast.error('No se pudo establecer conexión con Google')
      }
    } catch {
      toast.error('Error al intentar abrir autenticación de Google')
    }
  }

  const handleUnlinkGoogle = async () => {
    try {
      const res = await client.delete('/admin/auth/google')
      if (res.status === 200 || res.status === 204) {
        const updatedBusiness = { ...business, google_linked: false, google_refresh_token: null }
        localStorage.setItem('business', JSON.stringify(updatedBusiness))
        setBusiness(updatedBusiness)
        setGoogleLinked(false)
        toast.success('Google Contacts se ha desvinculado.')
      }
    } catch {
      toast.error('Error al intentar desvincular la cuenta.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900 text-sm">TurnoYa</span>
            <Separator orientation="vertical" className="h-4" />
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    location.pathname === item.path
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center border border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-0">
                  <User className="h-5 w-5 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1 shadow-sm rounded-xl">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-slate-900">{business.name || 'Mi Negocio'}</p>
                  <p className="text-xs leading-none text-slate-500">
                    Administrador
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Ajustes del negocio</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2">
                  <Share2 className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Redes</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-2">
                  <HelpCircle className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Ayuda</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustes del negocio</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-3 border border-slate-100 bg-slate-50 p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Sincronización de Agenda Libreta</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Conectá tu cuenta de Google para agendar a todos los pacientes automáticamente en los contactos de tu celular en tiempo real, sin escribir sus números a mano.
                </p>
              </div>
              
              <div className="pt-2">
                {!googleLinked ? (
                  <Button 
                    className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-sm flex items-center justify-center gap-2 h-11 transition-all" 
                    onClick={handleLinkGoogle}
                  >
                    <div className="bg-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-[#4285F4] font-bold text-xs">G</div>
                    Vincular Google Contacts
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold text-sm">Cuenta de Google Vinculada</span>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 self-start" onClick={handleUnlinkGoogle}>
                      Desvincular cuenta
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {/* Espacio para mas configuraciones a futuro como horarios y limites de cancelacion */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}