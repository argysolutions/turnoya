import { useEffect } from 'react'
import { useIncidencias } from '@/hooks/useIncidencias'
import { useAuth } from '@/context/AuthContext'
import IncidenciasList from '@/components/Incidencias/IncidenciasList'
import IncidenciasForm from '@/components/Incidencias/IncidenciasForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

  useEffect(() => {
    // Solo el dueño puede listar, empleados solo reportan
    if (isOwner) {
      fetchIncidencias()
    }
  }, [isOwner, fetchIncidencias])

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col gap-2">
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
            <Alert className="bg-amber-50 border-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 font-bold">Acceso Restringido</AlertTitle>
              <AlertDescription className="text-amber-800 text-xs">
                Como miembro del staff, puedes enviar reportes pero el historial de incidencias es de acceso exclusivo para la administración.
              </AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </Layout>
  )
}
