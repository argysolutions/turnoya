import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

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

  const business = JSON.parse(localStorage.getItem('business') || '{}')

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
            <span className="text-sm text-slate-500">{business.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}