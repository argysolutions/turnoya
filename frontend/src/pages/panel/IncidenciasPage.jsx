import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { useIncidencias } from '@/hooks/useIncidencias'
import { useAuth } from '@/context/AuthContext'
import IncidenciasList from '@/components/Incidencias/IncidenciasList'
import IncidenciasForm from '@/components/Incidencias/IncidenciasForm'
import { Terminal, ShieldAlert } from 'lucide-react'
import Layout from '@/components/shared/Layout'

export default function IncidenciasPage() {
  const { isOwner } = useAuth()
  const { 
    incidencias, 
    isLoading, 
    isError, 
    fetchIncidencias, 
    createIncidencia, 
    deleteIncidencia 
  } = useIncidencias()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    // Solo el dueño puede listar, empleados solo reportan
    if (isOwner) {
      fetchIncidencias()
    }
  }, [isOwner, fetchIncidencias])

  return (
    <Layout 
      maxWidth="max-w-7xl"
      hideMobileHeader={true}
      mobileMenuState={[isMenuOpen, setIsMenuOpen]}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. MASTER HEADER MÓVIL */}
        <div className="lg:hidden sticky top-0 z-[70] bg-white border-b border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] w-screen -ml-4 px-4 h-16 flex items-center justify-between relative mb-6">
          {/* Left: Menu Icon */}
          <div className="min-w-[48px]">
            <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-black">
              <Menu className="w-8 h-8" />
            </button>
          </div>

          {/* Center: Title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-black tracking-tighter">Bitácora</span>
          </div>

          {/* Right: Actions */}
          <div className="min-w-[48px]" />
        </div>

        <header className="hidden lg:flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-slate-900" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora Técnica</h1>
          </div>
          <p className="text-sm text-slate-500 max-w-lg">
            Registro de incidencias, errores de sistema y acciones preventivas para la mejora continua de la plataforma.
          </p>
        </header>

        {/* Formulario de Reporte: Siempre visible para todos */}
        <section>
          <IncidenciasForm onSubmit={createIncidencia} />
        </section>

        {/* Lista de Incidencias: Solo el dueño la ve */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Historial de Reportes</h2>
          </div>

          {isOwner ? (
            <IncidenciasList 
              incidencias={incidencias}
              isLoading={isLoading}
              isError={isError}
              onDelete={deleteIncidencia}
              onRefresh={fetchIncidencias}
            />
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 leading-none mb-1">Control de Calidad y Resolución</h3>
                <p className="text-xs text-amber-800">
                  Como <strong>Dueño</strong>, podés visualizar todas las incidencias y eliminarlas una vez resueltas. 
                  Los empleados solo pueden reportar nuevos casos.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
