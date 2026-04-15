import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/context/AuthContext'
import { LogOut, User, Settings, HelpCircle, Share2, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'

const navItems = [
  { label: 'Agenda', path: '/dashboard' },
  { label: 'Servicios', path: '/servicios' },
  { label: 'Disponibilidad', path: '/disponibilidad' },
  { label: 'Caja', path: '/dashboard/caja' },
  { label: 'Configuración', path: '/dashboard/configuracion' }
]

function NavScrollable({ location }) {
  const scrollRef = useRef(null)
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
    <div className="relative flex-1 min-w-0">
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
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative text-[13px] sm:text-sm px-2.5 sm:px-4 h-11 flex items-center justify-center transition-all shrink-0 ${
              location.pathname === item.path
                ? 'text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {item.label}
            {location.pathname === item.path && (
              <motion.div
                layoutId="nav-underline"
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-slate-900 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
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

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const { logout, activeProfile, clearActiveProfile } = useAuth()

  const handleLogout = (forget = false) => {
    localStorage.removeItem('business') 
    logout(forget)
    navigate('/login')
  }

  const handleChangeProfile = () => {
    clearActiveProfile()
    navigate('/dashboard/caja')
  }

  const [business] = useState(() => JSON.parse(localStorage.getItem('business') || '{}'))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 w-full overflow-hidden">
            <span className="font-semibold text-slate-900 text-sm shrink-0">TurnoYa</span>
            <Separator orientation="vertical" className="h-4 shrink-0" />
            <NavScrollable location={location} />
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-11 w-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center border border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-0">
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
                  <DropdownMenuItem className="cursor-pointer py-2 text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50" onClick={handleChangeProfile}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    <span className="font-bold">Cambiar de perfil</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer py-2" onClick={() => navigate('/dashboard/configuracion')}>
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
                <DropdownMenuItem onClick={() => handleLogout(false)} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogout(true)} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión y olvidar cuenta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}