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
import { cn } from '@/lib/utils'
import {
  getSettings, updateSettings, updateOwnerPin,
  listStaff, addStaff, editStaff, updateMemberPin, removeStaff,
} from '@/api/business'
import { getGoogleAuthUrl, getGoogleStatus, unlinkGoogle } from '@/api/google'
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
  Menu
} from 'lucide-react'

export default function SettingsPage() {
  const { role, isEmployee, loading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (loading) return null

  // Bifurcación: empleados ven su perfil, dueños ven configuración completa
  const isActuallyEmployee = String(role).toLowerCase() === 'employee' || isEmployee

  return (
    <Layout 
      maxWidth="max-w-7xl"
      hideMobileHeader={true}
      mobileMenuState={[isMenuOpen, setIsMenuOpen]}
    >
      <BusinessSettings isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
    </Layout>
  )
}

function BusinessSettings({ isMenuOpen, setIsMenuOpen }) {
  const [googleStatus, setGoogleStatus] = useState({ linked: false, updated_at: null })
  const [settings, setSettings] = useState({
    cancellation_policy: '',
    anticipation_margin: 0,
    buffer_time: 0,
    whatsapp_enabled: false,
    commission_rate: 0,
    expense_categories: []
  })
  const [initialSettings, setInitialSettings] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [ownerPin, setOwnerPin] = useState('')
  const [updatingPin, setUpdatingPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState('reglas')
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const { role, businessId, loading: authLoading } = useAuth()
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

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return
      try {
        const [settingsRes, googleRes, staffRes] = await Promise.all([
          getSettings(),
          getGoogleStatus(),
          listStaff().catch(() => ({ data: { staff: [] } })),
        ])
        
        const newSettings = {
          cancellation_policy: settingsRes.data.cancellation_policy || '',
          anticipation_margin: settingsRes.data.anticipation_margin || 0,
          buffer_time: settingsRes.data.buffer_time || 0,
          whatsapp_enabled: settingsRes.data.whatsapp_enabled || false,
          commission_rate: settingsRes.data.commission_rate || 0,
          expense_categories: settingsRes.data.expense_categories || []
        }
        setSettings(newSettings)
        setInitialSettings(newSettings)
        
        setGoogleStatus(googleRes.data)
        setStaffList(staffRes.data.staff || [])
      } catch {
        toast.error('Error al cargar la configuración')
      } finally {
        setStaffLoading(false)
      }
    }
    fetchData()
  }, [authLoading])

  const hasMargenesChanges = initialSettings && (
    settings.anticipation_margin !== initialSettings.anticipation_margin ||
    settings.buffer_time !== initialSettings.buffer_time
  )

  const hasFinanzasChanges = initialSettings && (
    settings.commission_rate !== initialSettings.commission_rate ||
    JSON.stringify(settings.expense_categories) !== JSON.stringify(initialSettings.expense_categories)
  )

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
      setInitialSettings(settings)
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
    <>
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
          {/* 1. MASTER HEADER MÓVIL (Pattern AgendaPage) */}
          <div className="lg:hidden sticky top-0 z-[70] bg-white border-b border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] -mx-4 px-4 h-16 flex items-center justify-between relative mb-6">
            {/* Left: Menu Icon */}
            <div className="min-w-[48px]">
              <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-black">
                <Menu className="w-8 h-8" />
              </button>
            </div>

            {/* Center: Title */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-black tracking-tighter">Configuración</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center min-w-[48px] justify-end">
            </div>
          </div>

          <div className="hidden lg:flex mb-6 flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-1">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestioná las reglas de tu negocio e integraciones.</p>
            </div>
          </div>

          <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-2xl md:rounded-xl h-14 md:h-12">
              <TabsTrigger value="reglas" className="rounded-xl md:rounded-lg text-lg md:text-sm font-black md:font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings2 className="w-5 h-5 md:w-4 md:h-4 mr-2" /> Reglas
              </TabsTrigger>
              <TabsTrigger value="integraciones" className="rounded-xl md:rounded-lg text-lg md:text-sm font-black md:font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Share2 className="w-5 h-5 md:w-4 md:h-4 mr-2" /> Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reglas" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              {/* ... (existing content) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-slate-200 rounded-[2.5rem] md:rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl md:text-lg font-black tracking-tighter text-slate-900">Tiempos y Márgenes</CardTitle>
                    <CardDescription className="text-base md:text-sm font-bold md:font-normal text-slate-500">Controlá cuándo pueden reservar tus clientes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Anticipación</Label>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-5 w-5 md:h-4 md:w-4 text-slate-400" /></TooltipTrigger>
                          <TooltipContent>Mínimo tiempo antes del turno para reservar.</TooltipContent>
                        </Tooltip>
                      </div>
                      <input 
                        type="number" 
                        value={settings.anticipation_margin === 0 ? '' : settings.anticipation_margin}
                        onChange={(e) => setSettings({...settings, anticipation_margin: parseInt(e.target.value) || 0})}
                        className="flex h-14 md:h-10 w-full rounded-2xl md:rounded-lg border border-slate-200 bg-white px-4 py-2 text-xl md:text-sm font-black md:font-normal focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Buffer</Label>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-5 w-5 md:h-4 md:w-4 text-slate-400" /></TooltipTrigger>
                          <TooltipContent>Descanso/limpieza entre turnos.</TooltipContent>
                        </Tooltip>
                      </div>
                      <input 
                        type="number" 
                        value={settings.buffer_time === 0 ? '' : settings.buffer_time}
                        onChange={(e) => setSettings({...settings, buffer_time: parseInt(e.target.value) || 0})}
                        className="flex h-14 md:h-10 w-full rounded-2xl md:rounded-lg border border-slate-200 bg-white px-4 py-2 text-xl md:text-sm font-black md:font-normal focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                      />
                    </div>

                    <AnimatePresence>
                      {hasMargenesChanges && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4"
                        >
                          <Button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full h-14 md:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl md:rounded-lg font-black md:font-bold uppercase tracking-widest text-lg md:text-sm"
                          >
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 rounded-[2.5rem] md:rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl md:text-lg font-black tracking-tighter text-slate-900">Finanzas</CardTitle>
                    <CardDescription className="text-base md:text-sm font-bold md:font-normal text-slate-500">Configuración global de Caja y Gastos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Comisión General</Label>
                      <input 
                        type="number" 
                        value={settings.commission_rate === 0 ? '' : settings.commission_rate}
                        onChange={(e) => setSettings({...settings, commission_rate: parseFloat(e.target.value) || 0})}
                        className="flex h-14 md:h-10 w-full rounded-2xl md:rounded-lg border border-slate-200 bg-white px-4 py-2 text-xl md:text-sm font-black md:font-normal focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-500 uppercase md:normal-case md:tracking-normal md:font-medium">Categorías de Gastos</Label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Nueva categoría..."
                          className="flex h-14 md:h-10 flex-1 rounded-2xl md:rounded-lg border border-slate-200 bg-white px-4 py-2 text-xl md:text-sm font-black md:font-normal focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                        />
                        <Button 
                          type="button" 
                          onClick={() => {
                            if (newCategory.trim()) {
                              setSettings({
                                ...settings, 
                                expense_categories: [...settings.expense_categories, newCategory.trim()]
                              })
                              setNewCategory('')
                            }
                          }}
                          className="h-14 md:h-10 px-6 rounded-2xl md:rounded-lg text-lg md:text-sm font-black md:font-medium bg-slate-900 text-white"
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

                    <AnimatePresence>
                      {hasFinanzasChanges && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4"
                        >
                          <Button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full h-14 md:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl md:rounded-lg font-black md:font-bold uppercase tracking-widest text-lg md:text-sm"
                          >
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 md:col-span-2 rounded-[2.5rem] md:rounded-xl">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl md:text-lg font-black tracking-tighter text-slate-900 flex items-center gap-2">
                          <Users className="w-6 h-6 md:w-5 md:h-5 text-slate-500" /> Gestión de Staff
                        </CardTitle>
                        <CardDescription className="text-base md:text-sm font-bold md:font-normal text-slate-500">Creá y administrá los perfiles de tu equipo.</CardDescription>
                      </div>
                      <Button 
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="h-14 md:h-10 bg-slate-900 text-white gap-2 rounded-2xl md:rounded-lg text-xl md:text-sm font-black md:font-medium"
                        size="sm"
                      >
                        <UserPlus className="w-5 h-5 md:w-4 md:h-4" />
                        Agregar Miembro
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Business ID banner */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Info className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-blue-700">ID de Negocio para acceso de empleados</p>
                        <p className="text-lg font-black text-blue-900 tabular-nums tracking-wide">#{businessId}</p>
                      </div>
                    </div>
                    {/* Owner PIN inline */}
                    <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-500" />
                        <Label className="text-xl md:text-sm font-black tracking-tighter text-slate-900 uppercase md:normal-case md:tracking-normal md:font-bold">Tu PIN de Dueño</Label>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-5 w-5 md:h-3.5 md:w-3.5 text-slate-400" /></TooltipTrigger>
                          <TooltipContent>Tu PIN personal para acceder como Administrador.</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-4">
                        <input 
                          type="password" 
                          inputMode="numeric"
                          maxLength={4}
                          value={ownerPin}
                          onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="flex h-14 md:h-9 w-32 md:w-24 rounded-2xl md:rounded-lg border border-indigo-200 bg-white px-3 py-2 text-2xl md:text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none text-center tracking-[0.3em] font-mono font-black md:font-normal" 
                        />
                        <Button 
                          type="button" 
                          onClick={handleSaveOwnerPin}
                          disabled={updatingPin || ownerPin.length !== 4}
                          className="h-14 md:h-9 flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl md:rounded-lg text-xl md:text-sm font-black md:font-medium"
                        >
                          {updatingPin ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar PIN'}
                        </Button>
                      </div>
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Nuevo Miembro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Nombre *</Label>
                            <input
                              value={newMember.name}
                              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                              placeholder="Ej: María López"
                              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Nombre Profesional</Label>
                            <input
                              value={newMember.professional_name}
                              onChange={e => setNewMember({ ...newMember, professional_name: e.target.value })}
                              placeholder="Ej: Dra. López (opcional)"
                              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">PIN de 4 dígitos *</Label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={newMember.pin}
                              onChange={e => setNewMember({ ...newMember, pin: e.target.value.replace(/\D/g, '') })}
                              placeholder="••••"
                              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none text-center tracking-[0.3em] font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Rol</Label>
                            <select
                              value={newMember.role}
                              onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            >
                              <option value="employee">Empleado</option>
                              <option value="owner">Administrador</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button type="button" onClick={handleAddStaff} disabled={addingStaff} className="bg-slate-900 text-white" size="sm">
                            {addingStaff ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                            Crear Miembro
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                        </div>
                      </div>
                    )}

                    {/* Staff list */}
                    {staffLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : staffList.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No hay miembros del equipo.</p>
                        <p className="text-xs text-slate-400">Creá el primer miembro para habilitar el acceso por PIN.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {staffList.filter(s => s.is_active).map((member) => (
                          <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
                              member.role === 'owner' ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            }`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            {editingId === member.id ? (
                              <div className="flex-1 flex flex-wrap gap-2">
                                <input
                                  value={editForm.name ?? member.name}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                  className="flex-1 min-w-[120px] h-8 rounded-md border border-slate-200 px-2 text-sm"
                                />
                                <input
                                  value={editForm.professional_name ?? member.professional_name ?? ''}
                                  onChange={e => setEditForm({ ...editForm, professional_name: e.target.value })}
                                  placeholder="Nombre profesional"
                                  className="flex-1 min-w-[120px] h-8 rounded-md border border-slate-200 px-2 text-sm"
                                />
                                <Button size="sm" className="h-8 text-xs" onClick={() => handleEditStaff(member.id)}>Guardar</Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>Cancelar</Button>
                              </div>
                            ) : pinChangeId === member.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">{member.name}</span>
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={newPinValue}
                                  onChange={e => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                                  placeholder="Nuevo PIN"
                                  className="w-20 h-8 rounded-md border border-slate-200 px-2 text-sm text-center tracking-widest font-mono"
                                  autoFocus
                                />
                                <Button size="sm" className="h-8 text-xs" onClick={() => handleUpdatePin(member.id)}>OK</Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setPinChangeId(null); setNewPinValue('') }}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
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

                            {/* Actions */}
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
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="integraciones" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="max-w-2xl">
                <Card className="shadow-sm border-slate-200 overflow-hidden rounded-[2.5rem] md:rounded-xl">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 md:p-6">
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  )
}
