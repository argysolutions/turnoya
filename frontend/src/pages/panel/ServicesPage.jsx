import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getServices, createService, updateService, deleteService } from '@/api/services'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const emptyForm = { name: '', duration: '', price: '', description: '' }

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
    <Layout 
      maxWidth="max-w-7xl"
      hideMobileHeader={true}
      mobileMenuState={[isMenuOpen, setIsMenuOpen]}
    >
      {/* 1. MASTER HEADER MÓVIL (Pattern AgendaPage) */}
      <div className="lg:hidden sticky top-0 z-[70] bg-white border-b border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] w-screen -ml-4 px-4 h-16 flex items-center justify-between relative mb-6">
        {/* Left: Menu Icon */}
        <div className="min-w-[48px]">
          <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-black">
            <Menu className="w-8 h-8" />
          </button>
        </div>

        {/* Center: Title */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-black tracking-tighter">Servicios</span>
        </div>

        {/* Right: Actions (Empty for now or add a Plus icon) */}
        <div className="min-w-[48px]" />
      </div>

      <div className="hidden lg:block mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Servicios</h1>
        <p className="text-sm font-normal text-slate-500 mt-0.5">Administrá los servicios que ofrecés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl md:text-base font-black tracking-tighter text-slate-900">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-3">
                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="name" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Nombre *</Label>
                  <Input id="name" name="name" placeholder="Corte de pelo" value={form.name} onChange={handleChange} required className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>
                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="duration" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Duración (min) *</Label>
                  <Input id="duration" name="duration" type="number" placeholder="30" value={form.duration} onChange={handleChange} required className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>
                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="price" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Precio</Label>
                  <Input id="price" name="price" type="number" placeholder="2500" value={form.price} onChange={handleChange} className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>
                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="description" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Descripción</Label>
                  <Input id="description" name="description" placeholder="Opcional" value={form.description} onChange={handleChange} className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>
                <div className="flex gap-2 pt-2 md:pt-1">
                  <Button type="submit" className="flex-1 h-14 md:h-10 text-xl md:text-sm font-black md:font-medium rounded-2xl md:rounded-md">
                    {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
                  </Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={handleCancel} className="h-14 md:h-10 text-xl md:text-sm font-black md:font-medium rounded-2xl md:rounded-md text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border-red-100">
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
              <CardTitle className="text-2xl md:text-base font-black tracking-tighter text-slate-900">
                Mis servicios
                <span className="ml-2 text-slate-400 font-bold md:font-normal text-xl md:text-sm">({services.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-lg md:text-sm text-slate-400 py-8 text-center font-bold md:font-normal">
                  No tenés servicios todavía. Creá el primero.
                </p>
              ) : (
                <div className="space-y-3 md:space-y-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-3 p-5 md:p-3 rounded-2xl md:rounded-lg border border-slate-200 md:border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-3 md:gap-2">
                          <p className="text-2xl md:text-sm font-black tracking-tighter md:tracking-normal md:font-medium text-slate-900">{s.name}</p>
                          {!s.active && <Badge variant="outline" className="text-base md:text-xs font-bold md:font-normal uppercase tracking-wider">inactivo</Badge>}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-4 md:gap-x-3 gap-y-1 mt-2 md:mt-1">
                          <span className="text-lg md:text-xs font-bold md:font-normal text-slate-500">{s.duration} min</span>
                          {s.price && <span className="text-lg md:text-xs font-black tracking-tighter md:tracking-normal md:font-medium text-blue-600 md:text-slate-600">${Number(s.price).toLocaleString('es-AR')}</span>}
                          {s.description && <span className="text-lg md:text-xs font-bold md:font-normal text-slate-400 truncate w-full sm:w-auto">{s.description}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto flex-shrink-0 mt-2 sm:mt-0">
                        <Button className="flex-1 sm:flex-none h-12 md:h-9 text-lg md:text-sm font-black md:font-medium rounded-xl md:rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => handleEdit(s)}>
                          Editar
                        </Button>
                        <Button className="flex-1 sm:flex-none h-12 md:h-9 text-lg md:text-sm font-black md:font-medium rounded-xl md:rounded-md text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700" onClick={() => handleDelete(s.id)}>
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