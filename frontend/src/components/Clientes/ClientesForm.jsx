import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus, Save } from 'lucide-react'

export default function ClientesForm({ onSubmit, initialData = null }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    notas_internas: ''
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre || '',
        telefono: initialData.telefono || '',
        email: initialData.email || '',
        notas_internas: initialData.notas_internas || ''
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    
    setLoading(true)
    try {
      await onSubmit(formData)
      if (!initialData) {
        setFormData({
          nombre: '',
          telefono: '',
          email: '',
          notas_internas: ''
        })
      }
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {initialData ? (
              <Save className="w-5 h-5 text-indigo-600" />
            ) : (
              <UserPlus className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="text-lg font-bold text-slate-900 line-tight">
              {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                placeholder="Ej: Juan Pérez"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                required
                className="focus-visible:ring-indigo-500 rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="Ej: +54 9 11 1234-5678"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                required
                className="focus-visible:ring-indigo-500 rounded-xl h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Opcional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej: cliente@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="focus-visible:ring-indigo-500 rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas_internas">Notas Internas</Label>
            <textarea
              id="notas_internas"
              placeholder="Información privada, preferencias, alergias, etc..."
              value={formData.notas_internas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas_internas: e.target.value }))}
              className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none focus-visible:ring-indigo-500"
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
                Guardando...
              </>
            ) : (
              initialData ? 'Guardar Cambios' : 'Registrar Cliente'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
