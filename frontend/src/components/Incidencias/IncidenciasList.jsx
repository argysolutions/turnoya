import { Trash2, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'

export default function IncidenciasList({ 
  incidencias, 
  isLoading, 
  isError, 
  onDelete,
  onRefresh 
}) {
  const { isOwner } = useAuth()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(n => (
          <div key={n} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-red-50 rounded-2xl border border-red-100 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-900 mb-2">Error de Conexión</h3>
        <p className="text-sm text-red-700 mb-6">No pudimos sincronizar los reportes técnicos.</p>
        <Button onClick={onRefresh} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
          Reintentar
        </Button>
      </div>
    )
  }

  if (incidencias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Bitácora Vacía</h3>
        <p className="text-sm text-slate-500 max-w-[240px]">Todo parece estar bajo control. No hay reportes técnicos hoy.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {incidencias.map((item) => (
        <Card key={item.id} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <Badge variant="outline" className="w-fit mb-2 text-[10px] py-0 border-slate-200 text-slate-500">
                  ID: #{item.id}
                </Badge>
                <h4 className="text-base font-bold text-slate-900 leading-tight">
                  {item.sintoma}
                </h4>
              </div>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item.id)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <section>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Impacto & Causa</span>
                <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-indigo-100 pl-3">
                  {item.causa_raiz}
                </p>
              </section>

              <section>
                <span className="text-[11px] font-black uppercase tracking-wider text-green-500 block mb-1">Resolución</span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {item.solucion}
                </p>
              </section>

              <section className="pt-2">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">💡 Acción Preventiva</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.accion_preventiva}
                  </p>
                </div>
              </section>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <span className="text-[10px] text-slate-400 font-medium tracking-tight flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
