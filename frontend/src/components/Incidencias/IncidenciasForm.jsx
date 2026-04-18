import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, PlusCircle } from 'lucide-react'

export default function IncidenciasForm({ onSubmit }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sintoma: '',
    causa_raiz: '',
    solucion: '',
    accion_preventiva: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return // Prevención redundante
    
    setLoading(true)
    const success = await onSubmit(formData)
    
    if (success) {
      setFormData({
        sintoma: '',
        causa_raiz: '',
        solucion: '',
        accion_preventiva: ''
      })
    }
    setLoading(false)
  }

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 line-tight">Nuevo Reporte Técnico</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sintoma">Sintoma / Error</Label>
              <Input
                id="sintoma"
                placeholder="Ej: Error 500 al cobrar"
                value={formData.sintoma}
                onChange={(e) => setFormData(prev => ({ ...prev, sintoma: e.target.value }))}
                required
                className="focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="causa_raiz">Causa Raíz</Label>
              <Input
                id="causa_raiz"
                placeholder="Ej: Timeout en base de datos"
                value={formData.causa_raiz}
                onChange={(e) => setFormData(prev => ({ ...prev, causa_raiz: e.target.value }))}
                required
                className="focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="solucion">Solución Aplicada</Label>
            <textarea
              id="solucion"
              placeholder="Describe cómo se solucionó..."
              value={formData.solucion}
              onChange={(e) => setFormData(prev => ({ ...prev, solucion: e.target.value }))}
              required
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none focus-visible:ring-indigo-500"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accion_preventiva">Acción Preventiva</Label>
            <textarea
              id="accion_preventiva"
              placeholder="¿Qué haremos para que no vuelva a pasar?"
              value={formData.accion_preventiva}
              onChange={(e) => setFormData(prev => ({ ...prev, accion_preventiva: e.target.value }))}
              required
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none focus-visible:ring-indigo-500"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full font-bold h-12 rounded-xl transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando reporte...
              </>
            ) : (
              'Guardar Incidencia'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
