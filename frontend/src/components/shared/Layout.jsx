import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/context/AuthContext'
import { 
  LogOut, 
  User, 
  Settings, 
  HelpCircle, 
  Share2, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  Bell, 
  CalendarDays, 
  Briefcase, 
  Clock, 
  Wallet, 
  Users, 
  Flag 
} from 'lucide-react'
import NotificationTray from './NotificationTray'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Agenda', path: '/dashboard/agenda', icon: CalendarDays },
  { label: 'Servicios', path: '/dashboard/servicios', icon: Briefcase },
  { label: 'Disponibilidad', path: '/dashboard/disponibilidad', icon: Clock },
  { label: 'Caja', path: '/dashboard/caja', icon: Wallet },
  { label: 'Clientes', path: '/dashboard/clientes', icon: Users },
  { label: 'Incidencias', path: '/dashboard/incidencias', icon: Flag },
  { label: 'Configuración', path: '/dashboard/configuracion', icon: Settings }
]

function NavScrollable() {
  const { isOwner, isEmployee, role } = useAuth()
  const scrollRef = useRef(null)
  
  // Filtrar pestañas por rol
  const visibleNavItems = navItems.filter(item => {
    const isActuallyEmployee = role === 'employee' || isEmployee
    if (isActuallyEmployee) {
      // Empleados solo ven Agenda, Caja, Clientes e Incidencias (solo reporte) y Configuración (su perfil)
      return ['Agenda', 'Caja', 'Clientes', 'Incidencias', 'Configuración'].includes(item.label)
    }
    return true // Dueño ve todo
  })

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  return (
    <div className="relative flex-1 min-w-0 hidden lg:block">
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-start z-10 pointer-events-none bg-gradient-to-r from-white to-transparent sm:hidden">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
        </div>
      )}

      <nav
        ref={scrollRef}
        className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar whitespace-nowrap"
      >
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `relative text-[13px] sm:text-sm px-2.5 sm:px-4 h-11 flex items-center justify-center shrink-0 transition-colors ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-slate-900 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right scroll indicator */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-end z-10 pointer-events-none bg-gradient-to-l from-white to-transparent sm:hidden">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>
      )}
    </div>
  )
}

export default function Layout({ children, maxWidth = "max-w-5xl" }) {
  const navigate = useNavigate()
  const location = useLocation()

  const { logout, activeProfile, clearActiveProfile, isEmployee, role } = useAuth()
  const isActuallyEmployee = role === 'employee' || isEmployee

  const handleLogout = (forget = false) => {
    const isEmp = isActuallyEmployee
    localStorage.removeItem('business') 
    logout(forget)
    
    // Si era empleado, lo mandamos directo al login de staff
    if (isEmp) {
      navigate('/staff-login', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  const handleChangeProfile = () => {
    clearActiveProfile()
    navigate('/dashboard/caja')
  }

  const [business] = useState(() => JSON.parse(localStorage.getItem('business') || '{}'))
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Filtrar links para el menú móvil (misma lógica que NavScrollable)
  const visibleNavItems = navItems.filter(item => {
    if (isActuallyEmployee) {
      return ['Agenda', 'Caja', 'Clientes', 'Incidencias', 'Configuración'].includes(item.label)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER ESCRITORIO (SOLO VISIBLE EN LG) */}
      <header className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-[60]">
        <div className={`${maxWidth} mx-auto px-4 h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-4 sm:gap-6 w-full overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-slate-900 text-sm">TurnoYa</span>
              {isActuallyEmployee && (
                <span className="bg-blue-600 text-[9px] text-white font-black uppercase px-1.5 py-0.5 rounded-md tracking-widest shrink-0 animate-pulse">Staff Mode</span>
              )}
            </div>
            <Separator orientation="vertical" className="h-4 shrink-0" />
            <NavScrollable />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Renderizar ESTO solo en móvil dentro del Layout principal */}
      <div className="flex lg:hidden items-center justify-between px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="text-2xl font-black text-slate-900 tracking-tighter">
          Turno<span className="text-blue-600">Ya</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-slate-900 p-1 active:scale-95 transition-transform"
        >
          <Menu className="w-8 h-8" />
        </button>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-[110] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex flex-col">
                  <span className="text-lg font-black text-slate-900">Menú</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Navegación</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-slate-100 rounded-full active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {visibleNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]",
                      isActive 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", "opacity-80")} />
                    <span className="font-black text-[15px]">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="p-6 border-t border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-6 p-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-slate-900 truncate">
                      {activeProfile ? activeProfile.name : (business.name || 'Mi Negocio')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {isActuallyEmployee ? 'Staff Mode' : 'Administrador'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => { handleLogout(false); setIsMobileMenuOpen(false); }}
                    className="w-full h-12 rounded-xl font-bold text-red-600 border-red-100 bg-red-50/30 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className={cn(maxWidth, "mx-auto px-4 pt-6 pb-24 lg:pb-12")}>
        {children}
      </main>
    </div>
  )
}

// Subcomponente para el menú de cuenta (Desktop)
function AccountMenu() {
  const navigate = useNavigate()
  const { logout, activeProfile, clearActiveProfile, isEmployee, role } = useAuth()
  const [business] = useState(() => JSON.parse(localStorage.getItem('business') || '{}'))
  const isActuallyEmployee = role === 'employee' || isEmployee

  const handleLogout = (forget = false) => {
    const isEmp = isActuallyEmployee
    localStorage.removeItem('business') 
    logout(forget)
    if (isEmp) navigate('/staff-login', { replace: true })
    else navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-11 w-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center border border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-0 transition-all duration-200 overflow-hidden">
        <User className="h-5 w-5 text-slate-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1 shadow-sm rounded-xl">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-bold leading-none text-slate-900 truncate max-w-full">
            {activeProfile ? activeProfile.name : (business.name || 'Mi Negocio')}
          </p>
          <p className="text-[10px] leading-none text-slate-500 font-medium uppercase tracking-wider mt-1">
            {activeProfile ? (activeProfile.role === 'owner' ? 'Administrador' : 'Staff') : 'Terminal'}
          </p>
        </div>
        <DropdownMenuSeparator />
        {activeProfile && (
          <DropdownMenuItem className="cursor-pointer py-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50" onClick={() => { clearActiveProfile(); navigate('/dashboard/caja'); }}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            <span className="font-bold">Cambiar de perfil</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer py-2" onClick={() => navigate('/dashboard/configuracion')}>
          <Settings className="mr-2 h-4 w-4 text-slate-500" />
          <span>Ajustes del negocio</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLogout(false)} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2 px-3">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}