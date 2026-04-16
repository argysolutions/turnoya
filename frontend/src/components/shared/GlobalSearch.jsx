import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  User, 
  Briefcase, 
  Settings, 
  Calendar, 
  Clock, 
  CreditCard,
  X,
  Command
} from 'lucide-react'
import client from '@/api/client'

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ pages: [], clients: [], services: [] })
  const navigate = useNavigate()

  const PAGES = [
    { label: 'Agenda / Dashboard', path: '/dashboard', icon: Calendar },
    { label: 'Directorio de Clientes', path: '/dashboard/clientes', icon: User },
    { label: 'Caja y Finanzas', path: '/dashboard/caja', icon: CreditCard },
    { label: 'Configuración de Negocio', path: '/dashboard/configuracion', icon: Settings },
  ]

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (!query) {
      setResults({ pages: PAGES, clients: [], services: [] })
      return
    }

    const timer = setTimeout(async () => {
      try {
        // Buscamos páginas localmente
        const filteredPages = PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
        
        // Buscamos clientes y servicios vía API (simulado o real si existen endpoints)
        // Por ahora simulamos búsqueda rápida
        const [clientsRes, servicesRes] = await Promise.all([
          client.get('/clients').catch(() => ({ data: [] })),
          client.get('/services').catch(() => ({ data: [] }))
        ])

        setResults({
          pages: filteredPages,
          clients: clientsRes.data.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5),
          services: servicesRes.data.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
        })
      } catch (err) {
        console.error('Search error:', err)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (path) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Botón disparador visible en Desktop */}
      <button 
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-slate-400 group"
      >
        <Search className="w-4 h-4" />
        <span className="text-xs font-medium">Buscar...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center px-4 py-3 border-b border-slate-100">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                  autoFocus
                  placeholder="Buscá clientes, servicios o secciones..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 text-sm"
                />
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
                {/* SECCIONES */}
                {results.pages.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">Navegación</h3>
                    {results.pages.map(p => (
                      <SearchItem key={p.path} icon={p.icon} label={p.label} onClick={() => handleSelect(p.path)} />
                    ))}
                  </div>
                )}

                {/* CLIENTES */}
                {results.clients.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">Clientes</h3>
                    {results.clients.map(c => (
                      <SearchItem key={c.id} icon={User} label={c.name} sub={c.phone} onClick={() => handleSelect('/dashboard/clientes')} />
                    ))}
                  </div>
                )}

                {/* SERVICIOS */}
                {results.services.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicios</h3>
                    {results.services.map(s => (
                      <SearchItem key={s.id} icon={Briefcase} label={s.name} sub={`$ ${s.price}`} onClick={() => handleSelect('/dashboard/configuracion')} />
                    ))}
                  </div>
                )}

                {query && results.pages.length === 0 && results.clients.length === 0 && results.services.length === 0 && (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Command className="w-8 h-8 mx-auto opacity-20" />
                    <p className="text-sm">No encontramos resultados para "{query}"</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded border bg-white text-[9px] font-bold text-slate-500">ESC</kbd>
                      <span className="text-[10px] text-slate-400 font-medium">Cerrar</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded border bg-white text-[9px] font-bold text-slate-500">↵</kbd>
                      <span className="text-[10px] text-slate-400 font-medium">Seleccionar</span>
                   </div>
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter italic">Search Engine Pro</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

function SearchItem({ icon: Icon, label, sub, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 font-medium">{sub}</p>}
      </div>
    </button>
  )
}
