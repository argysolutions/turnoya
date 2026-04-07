import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getServices, createService, updateService, deleteService } from '@/api/services'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const emptyForm = { name: '', duration: '', price: '', description: '' }

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchServices = async () => {
    try {
      const { data } = await getServices()
      setServices(data)
    } catch {
      toast.error('Error al cargar los servicios')
    }
  }

  useEffect(() => { fetchServices() }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        await updateService(editing, form)
        toast.success('Servicio actualizado')
        setEditing(null)
      } else {
        await createService(form)
        toast.success('Servicio creado')
      }
      setForm(emptyForm)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service) => {
    setEditing(service.id)
    setForm({
      name: service.name,
      duration: service.duration,
      price: service.price,
      description: service.description || ''
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return
    try {
      await deleteService(id)
      toast.success('Servicio eliminado')
      fetchServices()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Servicios</h1>
        <p className="text-sm text-slate-500 mt-0.5">Administrá los servicios que ofrecés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input id="name" name="name" placeholder="Corte de pelo" value={form.name} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Duración (min) *</Label>
                  <Input id="duration" name="duration" type="number" placeholder="30" value={form.duration} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Precio</Label>
                  <Input id="price" name="price" type="number" placeholder="2500" value={form.price} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descripción</Label>
                  <Input id="description" name="description" placeholder="Opcional" value={form.description} onChange={handleChange} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Mis servicios
                <span className="ml-2 text-slate-400 font-normal text-sm">({services.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  No tenés servicios todavía. Creá el primero.
                </p>
              ) : (
                <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{s.name}</p>
                          {!s.active && <Badge variant="outline" className="text-xs">inactivo</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400">{s.duration} min</span>
                          {s.price && <span className="text-xs text-slate-600 font-medium">${Number(s.price).toLocaleString('es-AR')}</span>}
                          {s.description && <span className="text-xs text-slate-400 truncate">{s.description}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(s.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  )
}