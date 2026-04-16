import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '@/components/shared/Layout'
import EmployeeProfile from '@/pages/panel/EmployeeProfile'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  getSettings, updateSettings, updateOwnerPin,
  listStaff, addStaff, editStaff, updateMemberPin, removeStaff,
} from '@/api/business'
import { getGoogleAuthUrl, getGoogleStatus, unlinkGoogle } from '@/api/google'
import { getServices, createService, updateService, deleteService } from '@/api/services'
import client from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import TimePickerModal from '@/components/ui/time-picker-modal'
import { 
  CheckCircle2, 
  Info, 
  Settings2, 
  Share2, 
  ShieldCheck, 
  Cloud, 
  Loader2,
  ExternalLink,
  Trash2,
  UserPlus,
  Users,
  Key,
  Pencil,
  X,
  Clock,
  Briefcase,
} from 'lucide-react'

const DAYS = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
]

const defaultSlots = () => Object.fromEntries(
  DAYS.map(d => [d.value, { enabled: false, start: '09:00', end: '18:00' }])
)

const emptyServiceForm = { name: '', duration: '', price: '', description: '' }

export default function SettingsPage() {
  const { role, isEmployee, loading } = useAuth()

  if (loading) return null

  // Bifurcación: empleados ven su perfil, dueños ven configuración completa
  const isActuallyEmployee = String(role).toLowerCase() === 'employee' || isEmployee

  if (isActuallyEmployee) {
    return <EmployeeProfile />
  }

  return <BusinessSettings />
}

function BusinessSettings() {
  const [googleStatus, setGoogleStatus] = useState({ linked: false, updated_at: null })
  const [settings, setSettings] = useState({
    cancellation_policy: '',
    anticipation_margin: 0,
    buffer_time: 0,
    whatsapp_enabled: false,
    commission_rate: 0,
    expense_categories: []
  })
  const [newCategory, setNewCategory] = useState('')
  const [ownerPin, setOwnerPin] = useState('')
  const [updatingPin, setUpdatingPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const { role, businessId, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('servicios')
  const isRestricted = !authLoading && role !== 'owner'

  // Staff Management
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', pin: '', role: 'employee', professional_name: '' })
  const [addingStaff, setAddingStaff] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [pinChangeId, setPinChangeId] = useState(null)
  const [newPinValue, setNewPinValue] = useState('')

  // Services State
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState(emptyServiceForm)
  const [editingService, setEditingService] = useState(null)
  const [loadingServices, setLoadingServices] = useState(false)

  // Availability State
  const [slots, setSlots] = useState(defaultSlots())
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return
      try {
        const [settingsRes, googleRes, staffRes, servicesRes, availabilityRes] = await Promise.all([
          getSettings(),
          getGoogleStatus(),
          listStaff().catch(() => ({ data: { staff: [] } })),
          getServices(),
          client.get('/availability')
        ])
        
        setSettings({
          cancellation_policy: settingsRes.data.cancellation_policy || '',
          anticipation_margin: settingsRes.data.anticipation_margin || 0,
          buffer_time: settingsRes.data.buffer_time || 0,
          whatsapp_enabled: settingsRes.data.whatsapp_enabled || false,
          commission_rate: settingsRes.data.commission_rate || 0,
          expense_categories: settingsRes.data.expense_categories || []
        })
        
        setGoogleStatus(googleRes.data)
        setStaffList(staffRes.data.staff || [])
        setServices(servicesRes.data)

        // Availability Parse
        const updatedSlots = defaultSlots()
        availabilityRes.data.forEach(({ day_of_week, start_time, end_time }) => {
          updatedSlots[day_of_week] = {
            enabled: true,
            start: start_time.slice(0, 5),
            end: end_time.slice(0, 5),
          }
        })
        setSlots(updatedSlots)
      } catch {
        toast.error('Error al cargar la configuración')
      } finally {
        setStaffLoading(false)
      }
    }
    fetchData()
  }, [authLoading])

  useEffect(() => {
    const handleFocus = async () => {
      // Re-verificar estado al volver a la pestaña (por si cerró el popup)
      if (linkingGoogle) {
        try {
          const { data } = await getGoogleStatus()
          setGoogleStatus(data)
          if (data.linked) {
            setLinkingGoogle(false)
            toast.success('¡Google vinculado!')
          }
        } catch {
          // ignore error
        }
      }
    }

    const handleMessage = (event) => {
      if (event.data === 'GOOGLE_AUTH_SUCCESS') {
        setGoogleStatus(prev => ({ ...prev, linked: true }))
        setLinkingGoogle(false)
        toast.success('¡Cuenta de Google vinculada con éxito!')
      } else if (event.data === 'GOOGLE_AUTH_ERROR') {
        setLinkingGoogle(false)
        toast.error('Hubo un error al vincular tu cuenta de Google')
      }
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [linkingGoogle])

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true)
    try {
      const { data } = await getGoogleAuthUrl()
      if (data.url) {
        window.open(data.url, 'GoogleAuth', 'width=500,height=600')
      } else {
        setLinkingGoogle(false)
        toast.error('No se pudo obtener la URL de conexión')
      }
    } catch {
      setLinkingGoogle(false)
      toast.error('Error al iniciar conexión con Google')
    }
  }

  const handleUnlinkGoogle = async () => {
    if (!window.confirm('¿Estás seguro de desvincular Google? Se perderá el acceso a contactos y backups.')) return
    try {
      await unlinkGoogle()
      setGoogleStatus({ linked: false, updated_at: null })
      toast.success('Cuenta desvinculada')
    } catch {
      toast.error('Error al desvincular')
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(settings)
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOwnerPin = async () => {
    if (!ownerPin || ownerPin.length !== 4 || isNaN(ownerPin)) {
      return toast.error('El PIN debe ser exactamente 4 dígitos numéricos')
    }
    setUpdatingPin(true)
    try {
      await updateOwnerPin(ownerPin)
      toast.success('PIN de dueño actualizado')
      setOwnerPin('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar PIN')
    } finally {
      setUpdatingPin(false)
    }
  }

  // ── Services Handlers ───────────────────────────────────────────────────
  const fetchServices = async () => {
    try {
      const { data } = await getServices()
      setServices(data)
    } catch {
      toast.error('Error al cargar servicios')
    }
  }

  const handleServiceSubmit = async (e) => {
    e.preventDefault()
    setLoadingServices(true)
    try {
      if (editingService) {
        await updateService(editingService, serviceForm)
        toast.success('Servicio actualizado')
        setEditingService(null)
      } else {
        await createService(serviceForm)
        toast.success('Servicio creado')
      }
      setServiceForm(emptyServiceForm)
      fetchServices()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar servicio')
    } finally {
      setLoadingServices(false)
    }
  }

  const handleEditService = (service) => {
    setEditingService(service.id)
    setServiceForm({
      name: service.name,
      duration: service.duration,
      price: service.price,
      description: service.description || ''
    })
  }

  const handleDeleteService = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return
    try {
      await deleteService(id)
      toast.success('Servicio eliminado')
      fetchServices()
    } catch {
      toast.error('Error al eliminar servicio')
    }
  }

  // ── Availability Handlers ────────────────────────────────────────────────
  const toggleDay = (day) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }))
  }

  const handleTime = (day, field, value) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSaveAvailability = async () => {
    setLoadingAvailability(true)
    try {
      for (const day of DAYS) {
        const slot = slots[day.value]
        if (slot.enabled) {
          await client.post('/availability', {
            day_of_week: day.value,
            start_time: slot.start,
            end_time: slot.end,
          })
        } else {
          await client.delete(`/availability/${day.value}`).catch(() => {})
        }
      }
      toast.success('Disponibilidad guardada')
    } catch {
      toast.error('Error al guardar disponibilidad')
    } finally {
      setLoadingAvailability(false)
    }
  }

  // ── Staff Management Handlers ──────────────────────────────────────────────
  const handleAddStaff = async () => {
    if (!newMember.name.trim()) return toast.error('El nombre es obligatorio')
    if (!newMember.pin || !/^\d{4}$/.test(newMember.pin)) return toast.error('El PIN debe ser 4 dígitos')
    setAddingStaff(true)
    try {
      const { data } = await addStaff(newMember)
      setStaffList(prev => [...prev, data.staff])
      setNewMember({ name: '', pin: '', role: 'employee', professional_name: '' })
      setShowAddForm(false)
      toast.success(`${data.staff.name} agregado al equipo`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar')
    } finally {
      setAddingStaff(false)
    }
  }

  const handleEditStaff = async (id) => {
    try {
      const { data } = await editStaff(id, editForm)
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...data.staff } : s))
      setEditingId(null)
      toast.success('Miembro actualizado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar')
    }
  }

  const handleUpdatePin = async (id) => {
    if (!newPinValue || !/^\d{4}$/.test(newPinValue)) return toast.error('PIN inválido')
    try {
      await updateMemberPin(id, newPinValue)
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, has_pin: true } : s))
      setPinChangeId(null)
      setNewPinValue('')
      toast.success('PIN actualizado')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar PIN')
    }
  }

  const handleRemoveStaff = async (id, name) => {
    if (!window.confirm(`¿Desactivar a "${name}"? Ya no podrá acceder al Kiosco.`)) return
    try {
      await removeStaff(id)
      setStaffList(prev => prev.filter(s => s.id !== id))
      toast.success(`${name} desactivado`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desactivar')
    }
  }

  return (
    <Layout>
      {isRestricted ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Acceso Restringido</h1>
          <p className="text-slate-500 max-w-xs">No tenés permisos de administrador para ver o modificar la configuración de este negocio.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-1">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Configuración</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestioná los servicios, horarios y reglas de tu negocio.</p>
            </div>
            <div id="settings-save-root"></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 bg-slate-100 p-1 rounded-xl h-auto md:h-12 gap-1 overflow-hidden">
              <TabsTrigger value="servicios" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                <Briefcase className="w-4 h-4 mr-2" /> Servicios
              </TabsTrigger>
              <TabsTrigger value="disponibilidad" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                <Clock className="w-4 h-4 mr-2" /> Disponibilidad
              </TabsTrigger>
              <TabsTrigger value="reglas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                <Settings2 className="w-4 h-4 mr-2" /> Reglas
              </TabsTrigger>
              <TabsTrigger value="integraciones" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                <Share2 className="w-4 h-4 mr-2" /> Integraciones
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {/* === SERVICIOS === */}
              <TabsContent key="servicios" value="servicios" className="focus-visible:outline-none border-none outline-none">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-50 mb-3">
                          <CardTitle className="text-base uppercase text-[11px] font-black tracking-widest text-slate-400">
                            {editingService ? 'Editar servicio' : 'Nuevo servicio'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleServiceSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="s-name">Nombre *</Label>
                              <Input id="s-name" name="name" placeholder="Corte de pelo" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="s-duration">Duración (min) *</Label>
                              <Input id="s-duration" name="duration" type="number" placeholder="30" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="s-price">Precio</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                <Input id="s-price" name="price" type="number" placeholder="2500" className="pl-7" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="s-desc">Descripción</Label>
                              <Input id="s-desc" name="description" placeholder="Opcional" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button type="submit" className="flex-1 bg-slate-900" disabled={loadingServices}>
                                {loadingServices ? '...' : editingService ? 'Actualizar' : 'Crear'}
                              </Button>
                              {editingService && (
                                <Button type="button" variant="ghost" onClick={() => { setEditingService(null); setServiceForm(emptyServiceForm) }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="lg:col-span-2">
                      <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-50 mb-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            Mis servicios
                            <Badge variant="secondary" className="font-normal">{services.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {services.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                              <Briefcase className="w-10 h-10 mx-auto opacity-20 mb-3" />
                              <p className="text-sm">No tenés servicios configurados.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {services.map((s) => (
                                <div key={s.id} className="flex flex-col p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-[11px] tracking-widest">{s.name}</p>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleEditService(s)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteService(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mt-auto">
                                    <Badge variant="outline" className="text-[10px] font-bold bg-white">{s.duration} MIN</Badge>
                                    {s.price && <span className="text-sm font-black text-slate-700">${Number(s.price).toLocaleString('es-AR')}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* === DISPONIBILIDAD (Diseño Original Restaurado) === */}
              <TabsContent key="disponibilidad" value="disponibilidad" className="focus-visible:outline-none border-none outline-none">
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="bg-white -mx-4 px-4 pt-1 pb-4 border-b border-slate-100/80 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Disponibilidad</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Configurá qué días y horarios atendés</p>
                    </div>
                    <Button onClick={handleSaveAvailability} disabled={loadingAvailability} className="w-full sm:w-auto h-11 sm:h-10 shadow-md">
                      {loadingAvailability ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>

                  <Card>
                    <CardHeader className="pb-3 border-b border-slate-50 mb-3">
                      <CardTitle className="text-base">Horarios por día</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {DAYS.map((day) => (
                          <div
                            key={day.value}
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border transition-colors ${
                              slots[day.value].enabled
                                ? 'border-slate-200 bg-white'
                                : 'border-slate-100 bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 w-full sm:w-auto min-w-[140px]">
                              <span className={`text-sm flex-1 font-bold ${
                                slots[day.value].enabled ? 'text-slate-900' : 'text-slate-400'
                              }`}>
                                {day.label}
                              </span>

                              <button
                                onClick={() => toggleDay(day.value)}
                                className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${
                                  slots[day.value].enabled ? 'bg-[#34C759]' : 'bg-slate-200'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                    slots[day.value].enabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {slots[day.value].enabled ? (
                              <div className="flex flex-row items-center gap-4 w-full sm:w-auto flex-1">
                                <div className="flex-1 w-full sm:w-32">
                                  {isMobile ? (
                                    <TimePickerModal
                                      label="Abre"
                                      value={slots[day.value].start}
                                      onChange={(val) => handleTime(day.value, 'start', val)}
                                    />
                                  ) : (
                                    <>
                                      <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Abre</Label>
                                      <input
                                        type="time"
                                        value={slots[day.value].start}
                                        onChange={(e) => handleTime(day.value, 'start', e.target.value)}
                                        className="w-full text-sm border border-slate-200 rounded-md px-2 h-10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                      />
                                    </>
                                  )}
                                </div>
                                <span className="text-slate-400 text-sm hidden sm:block mt-6">a</span>
                                <div className="flex-1 w-full sm:w-32">
                                  {isMobile ? (
                                    <TimePickerModal
                                      label="Cierra"
                                      value={slots[day.value].end}
                                      onChange={(val) => handleTime(day.value, 'end', val)}
                                    />
                                  ) : (
                                    <>
                                      <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Cierra</Label>
                                      <input
                                        type="time"
                                        value={slots[day.value].end}
                                        onChange={(e) => handleTime(day.value, 'end', e.target.value)}
                                        className="w-full text-sm border border-slate-200 rounded-md px-2 h-10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 hidden sm:inline-block">No disponible</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* === REGLAS / STAFF === */}
              <TabsContent key="reglas" value="reglas" className="focus-visible:outline-none border-none outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="flex justify-end mb-4">
                     <Button onClick={handleSave} disabled={saving} size="sm" className="shadow-sm bg-slate-900 text-white rounded-xl uppercase text-[10px] font-black tracking-widest px-6">
                       {saving ? 'Guardando...' : 'Guardar Cambios'}
                     </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg">Tiempos y Márgenes</CardTitle>
                        <CardDescription>Controlá cuándo pueden reservar tus clientes.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-slate-700">Margen de anticipación (minutos)</Label>
                            <Tooltip>
                              <TooltipTrigger><Info className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                              <TooltipContent>Mínimo tiempo antes del turno para reservar.</TooltipContent>
                            </Tooltip>
                          </div>
                          <input 
                            type="number" 
                            value={settings.anticipation_margin}
                            onChange={(e) => setSettings({...settings, anticipation_margin: parseInt(e.target.value) || 0})}
                            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-slate-700">Tiempo buffer (minutos)</Label>
                            <Tooltip>
                              <TooltipTrigger><Info className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                              <TooltipContent>Descanso/limpieza entre turnos.</TooltipContent>
                            </Tooltip>
                          </div>
                          <input 
                            type="number" 
                            value={settings.buffer_time}
                            onChange={(e) => setSettings({...settings, buffer_time: parseInt(e.target.value) || 0})}
                            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg">Finanzas</CardTitle>
                        <CardDescription>Configuración global del módulo de Caja y Comisiones.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-slate-700">Tasa de Comisión General (%)</Label>
                          <input 
                            type="number" 
                            value={settings.commission_rate}
                            onChange={(e) => setSettings({...settings, commission_rate: parseFloat(e.target.value) || 0})}
                            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-slate-700">Categorías de Gastos</Label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="Nueva categoría..."
                              className="flex h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                            />
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                if (newCategory.trim()) {
                                  setSettings({
                                    ...settings, 
                                    expense_categories: [...settings.expense_categories, newCategory.trim()]
                                  })
                                  setNewCategory('')
                                }
                              }}
                            >
                              Sumar
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {settings.expense_categories.map((cat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold group">
                                {cat}
                                <button 
                                  onClick={() => {
                                    setSettings({
                                      ...settings,
                                      expense_categories: settings.expense_categories.filter((_, i) => i !== idx)
                                    })
                                  }}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 md:col-span-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-slate-500" /> Gestión de Staff</CardTitle>
                            <CardDescription>Creá y administrá los perfiles de tu equipo para el Kiosco POS.</CardDescription>
                          </div>
                          <Button 
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-slate-900 text-white gap-2 rounded-xl font-bold px-4"
                            size="sm"
                          >
                            <UserPlus className="w-4 h-4" />
                            Agregar miembro
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-xs text-blue-700">Tu Business ID es: <span className="font-bold font-mono">{businessId}</span>. Compartilo con tus empleados para que se registren.</p>
                        </div>

                        {showAddForm && (
                          <div className="p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm font-bold text-slate-900 px-1 uppercase tracking-widest text-[10px]">Nuevo Miembro</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label>Nombre Completo</Label>
                                <Input value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} placeholder="Ej: Juan Pérez" className="bg-white" />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Nombre Profesional (Agenda)</Label>
                                <Input value={newMember.professional_name} onChange={(e) => setNewMember({...newMember, professional_name: e.target.value})} placeholder="Ej: Barbero Juan" className="bg-white" />
                              </div>
                              <div className="space-y-1.5">
                                <Label>PIN de Acceso (4 dígitos)</Label>
                                <Input value={newMember.pin} onChange={(e) => setNewMember({...newMember, pin: e.target.value})} placeholder="Ej: 1234" maxLength={4} className="bg-white" />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Rol</Label>
                                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={newMember.role} onChange={(e) => setNewMember({...newMember, role: e.target.value})}>
                                  <option value="employee">Empleado</option>
                                  <option value="owner">Admin</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                              <Button className="flex-1 bg-slate-900" onClick={handleAddStaff} disabled={addingStaff}>{addingStaff ? '...' : 'Crear Perfil'}</Button>
                            </div>
                          </div>
                        )}

                        {staffLoading ? (
                          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                        ) : staffList.length === 0 ? (
                          <p className="text-center py-8 text-sm text-slate-400">No hay otros miembros en este negocio.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {staffList.map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-all shadow-sm">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${member.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
                                    {member.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                                  </div>
                                  
                                  {editingId === member.id ? (
                                    <div className="flex-1 flex gap-2">
                                      <Input size="sm" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="h-8 text-xs" />
                                      <Button size="sm" variant="ghost" onClick={() => handleEditStaff(member.id)}><CheckCircle2 className="w-4 h-4 text-emerald-500" /></Button>
                                    </div>
                                  ) : pinChangeId === member.id ? (
                                    <div className="flex-1 flex gap-2">
                                      <Input size="sm" value={newPinValue} placeholder="Nuevo PIN" onChange={(e) => setNewPinValue(e.target.value)} className="h-8 text-xs" />
                                      <Button size="sm" variant="ghost" onClick={() => handleUpdatePin(member.id)}><CheckCircle2 className="w-4 h-4 text-emerald-500" /></Button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          member.role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {member.role === 'owner' ? 'Admin' : 'Empleado'}
                                        </span>
                                        {!member.has_pin && <span className="text-[10px] text-amber-600 font-bold">Sin PIN</span>}
                                      </div>
                                      {member.professional_name && (
                                        <p className="text-xs text-slate-400 truncate">{member.professional_name}</p>
                                      )}
                                    </div>
                                  )}

                                  {editingId !== member.id && pinChangeId !== member.id && (
                                    <div className="flex gap-1 shrink-0">
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => { setPinChangeId(member.id); setNewPinValue('') }}>
                                        <Key className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={() => { setEditingId(member.id); setEditForm({ name: member.name, professional_name: member.professional_name || '' }) }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => handleRemoveStaff(member.id, member.name)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>

              {/* === INTEGRACIONES === */}
              <TabsContent key="integraciones" value="integraciones" className="focus-visible:outline-none border-none outline-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="max-w-2xl">
                    <Card className="shadow-sm border-slate-200 overflow-hidden">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                              <Cloud className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">Google Pack Integration</CardTitle>
                              <CardDescription>Agenda, Backup y Notificaciones.</CardDescription>
                            </div>
                          </div>
                          {googleStatus.linked && (
                            <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              <ShieldCheck className="w-3.5 h-3.5" /> Encriptado & Seguro
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                            <Loader2 className="w-5 h-5 text-blue-500" />
                            <p className="text-xs font-bold">Contactos</p>
                            <p className="text-[10px] text-slate-500">Agendar pacientes automáticamente.</p>
                          </div>
                          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                            <Cloud className="w-5 h-5 text-emerald-500" />
                            <p className="text-xs font-bold">Drive Backup</p>
                            <p className="text-[10px] text-slate-500">Respaldos diarios de tu base selectiva.</p>
                          </div>
                          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                            <ExternalLink className="w-5 h-5 text-purple-500" />
                            <p className="text-xs font-bold">Gmail SMS</p>
                            <p className="text-[10px] text-slate-500">Notificaciones vía SMTP de Google.</p>
                          </div>
                        </div>

                        {!googleStatus.linked ? (
                          <Button 
                            variant="outline"
                            className="w-full h-12 border-slate-200 hover:bg-slate-50 gap-3 font-semibold text-slate-700"
                            onClick={handleLinkGoogle}
                            disabled={linkingGoogle}
                          >
                            {linkingGoogle ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            )}
                            {linkingGoogle ? 'Esperando confirmación...' : 'Vincular Google Workspace / Gmail'}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-emerald-900">Google Pack Vinculado</p>
                                <p className="text-xs text-emerald-600">Sincronización activa multidispositivo.</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-emerald-400 hover:text-red-500 hover:bg-red-50"
                              onClick={handleUnlinkGoogle}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </>
      )}
    </Layout>
  )
}
