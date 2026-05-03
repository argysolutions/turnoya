import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getServices, createService, updateService, deleteService } from '@/api/services'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Scissors, 
  Flower2, 
  Sparkles, 
  Wrench, 
  Trash2, 
  Stethoscope, 
  Gavel, 
  Briefcase, 
  Dumbbell, 
  Dog, 
  Utensils, 
  Camera, 
  Music, 
  Car,
  Palette,
  Droplets,
  Waves,
  Zap,
  Hammer,
  GraduationCap,
  Calculator,
  Scale,
  Home,
  ShoppingBag,
  Bone,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconOptions = [
  { id: 'scissors', Icon: Scissors },
  { id: 'nails', Icon: Flower2 },
  { id: 'estetica', Icon: Sparkles },
  { id: 'wrench', Icon: Wrench },
  { id: 'zap', Icon: Zap },
  { id: 'cleaning', Icon: Trash2 },
  { id: 'health', Icon: Stethoscope },
  { id: 'legal', Icon: Gavel },
  { id: 'briefcase', Icon: Briefcase },
  { id: 'fitness', Icon: Dumbbell },
  { id: 'pets', Icon: Dog },
  { id: 'food', Icon: Utensils },
  { id: 'photo', Icon: Camera },
  { id: 'music', Icon: Music },
  { id: 'car', Icon: Car },
  { id: 'home', Icon: Home },
  { id: 'shopping', Icon: ShoppingBag },
  { id: 'education', Icon: GraduationCap }
]

const colorOptions = [
  { id: 'bg-blue-600', color: '#2563eb' },
  { id: 'bg-emerald-600', color: '#10b981' },
  { id: 'bg-amber-500', color: '#f59e0b' },
  { id: 'bg-rose-600', color: '#e11d48' },
  { id: 'bg-indigo-600', color: '#4f46e5' },
  { id: 'bg-violet-600', color: '#7c3aed' },
  { id: 'bg-slate-900', color: '#0f172a' },
  { id: 'bg-pink-500', color: '#ec4899' }
]

const emptyForm = { name: '', duration: '', price: '', description: '', service_icon: 'scissors', service_color: 'bg-blue-600' }

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const [durationUnit, setDurationUnit] = useState('min')

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

    const { name, duration } = form
    if (!name?.trim()) {
      toast.error('Por favor, ingresá un nombre para el servicio')
      setLoading(false)
      return
    }
    if (!duration || Number(duration) <= 0) {
      toast.error('Por favor, ingresá una duración válida')
      setLoading(false)
      return
    }
    if (form.price === '' || form.price === undefined) {
      toast.error('Por favor, ingresá un precio para el servicio')
      setLoading(false)
      return
    }

    // Convert duration to minutes if unit is 'hs'
    const finalDuration = durationUnit === 'hs' ? Number(duration) * 60 : Number(duration)
    const finalForm = { ...form, duration: finalDuration }

    try {
      if (editing) {
        await updateService(editing, finalForm)
        toast.success('Servicio actualizado')
        setEditing(null)
      } else {
        await createService(finalForm)
        toast.success('Servicio creado')
      }
      setForm({ ...emptyForm, service_icon: form.service_icon, service_color: form.service_color })
      setDurationUnit('min')
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service) => {
    setEditing(service.id)
    
    // Logic to decide if we show as hs or min
    let displayDuration = service.duration
    let unit = 'min'
    if (service.duration >= 60 && service.duration % 60 === 0) {
      displayDuration = service.duration / 60
      unit = 'hs'
    }

    setForm({
      name: service.name,
      duration: displayDuration,
      price: service.price,
      description: service.description || '',
      service_icon: service.service_icon || 'scissors',
      service_color: service.service_color || 'bg-blue-600'
    })
    setDurationUnit(unit)
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
    setDurationUnit('min')
  }

  const SelectedIcon = iconOptions.find(i => i.id === form.service_icon)?.Icon || Scissors
  const selectedColor = colorOptions.find(c => c.id === form.service_color)?.color || '#2563eb'

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

        {/* Right: Actions */}
        <div className="min-w-[48px]" />
      </div>

      <div className="hidden lg:block mb-6 lg:mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Servicios</h1>
        <p className="text-sm font-normal text-slate-500 mt-0.5">Administrá los servicios que ofrecés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-1">
          <Card className="overflow-visible">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl md:text-base font-black tracking-tighter text-slate-900">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-3">
                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="name" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Nombre</Label>
                  <Input id="name" name="name" placeholder="" value={form.name} onChange={handleChange} required className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>

                {/* Icon & Color Dropdowns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Icono</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowIconPicker(!showIconPicker)
                        setShowColorPicker(false)
                      }}
                      className="w-full h-14 md:h-10 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-lg flex items-center justify-between px-4 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <SelectedIcon className="w-5 h-5 text-slate-700" />
                        <span className="text-sm font-bold text-slate-700 capitalize">{form.service_icon}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showIconPicker && "rotate-180")} />
                    </button>
                    
                    {showIconPicker && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[80] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2">
                        {iconOptions.map(({ id, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, service_icon: id })
                              setShowIconPicker(false)
                            }}
                            className={cn(
                              "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                              form.service_icon === id 
                                ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Color</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorPicker(!showColorPicker)
                        setShowIconPicker(false)
                      }}
                      className="w-full h-14 md:h-10 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-lg flex items-center justify-between px-4 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: selectedColor }} />
                        <span className="text-sm font-bold text-slate-700">Tono</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showColorPicker && "rotate-180")} />
                    </button>

                    {showColorPicker && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[80] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2">
                        {colorOptions.map(({ id, color }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, service_color: id })
                              setShowColorPicker(false)
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full transition-all border-2",
                              form.service_color === id 
                                ? "border-slate-900 scale-110 shadow-sm" 
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="duration" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Duración</Label>
                    <div className="relative">
                      <Input id="duration" name="duration" type="number" placeholder="" value={form.duration} onChange={handleChange} required className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal pl-4 md:pl-3 pr-24 md:pr-20" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-white md:bg-slate-50 p-1 rounded-xl md:rounded-lg border border-slate-100">
                        {['min', 'hs'].map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setDurationUnit(u)}
                            className={cn(
                              "px-2 py-1 md:py-0.5 text-[10px] font-black uppercase rounded-lg transition-all",
                              durationUnit === u ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100"
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Precio</Label>
                    <div className="relative">
                      <span className="absolute left-5 md:left-4 top-1/2 -translate-y-1/2 text-lg md:text-sm font-bold text-slate-400">$</span>
                      <Input id="price" name="price" type="number" placeholder="" value={form.price} onChange={handleChange} required className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal pl-12 md:pl-10 pr-4 md:pr-3" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-1.5">
                  <Label htmlFor="description" className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Descripción <span className="text-slate-400 font-medium md:font-normal">(Opcional)</span></Label>
                  <Input id="description" name="description" placeholder="" value={form.description} onChange={handleChange} className="h-14 md:h-10 text-lg md:text-sm rounded-2xl md:rounded-md font-bold md:font-normal px-4 md:px-3" />
                </div>
                <div className="flex gap-2 pt-2 md:pt-1">
                  <Button type="submit" className="flex-1 h-14 md:h-10 text-xl md:text-sm font-black md:font-medium rounded-2xl md:rounded-md bg-slate-900 hover:bg-blue-600 transition-all">
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
                      <div className={cn(
                        "w-12 h-12 md:w-10 md:h-10 flex items-center justify-center rounded-2xl md:rounded-xl shrink-0 text-white shadow-sm",
                        s.service_color || "bg-slate-100"
                      )}>
                        {(() => {
                          const IconObj = iconOptions.find(i => i.id === s.service_icon)?.Icon || Scissors;
                          return <IconObj className="w-6 h-6 md:w-5 md:h-5" />;
                        })()}
                      </div>
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