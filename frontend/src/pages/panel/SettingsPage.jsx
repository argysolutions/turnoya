import { useState, useEffect } from 'react'
import Layout from '@/components/shared/Layout'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getSettings, updateSettings, updateStaffPin, updateOwnerPin } from '@/api/business'
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
  Trash2
} from 'lucide-react'

export default function SettingsPage() {
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
  const [staffPin, setStaffPin] = useState('')
  const [ownerPin, setOwnerPin] = useState('')
  const [updatingPin, setUpdatingPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const { role, loading: authLoading } = useAuth()
  const isRestricted = !authLoading && role !== 'dueño'

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return
      try {
        const [settingsRes, googleRes] = await Promise.all([
          getSettings(),
          getGoogleStatus()
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
      } catch {
        toast.error('Error al cargar la configuración')
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

  const handleSavePin = async () => {
    if (!staffPin || staffPin.length !== 4 || isNaN(staffPin)) {
      return toast.error('El PIN debe ser exactamente 4 dígitos numéricos')
    }
    setUpdatingPin(true)
    try {
      await updateStaffPin(staffPin)
      toast.success('PIN de personal actualizado')
      setStaffPin('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar PIN')
    } finally {
      setUpdatingPin(false)
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
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
              <p className="text-sm text-slate-500 mt-1">Gestioná las reglas de tu negocio e integraciones.</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto shadow-md">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>

          <Tabs defaultValue="reglas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-xl h-12">
              <TabsTrigger value="reglas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings2 className="w-4 h-4 mr-2" /> Reglas de Negocio
              </TabsTrigger>
              <TabsTrigger value="integraciones" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Share2 className="w-4 h-4 mr-2" /> Integraciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reglas" className="animate-in fade-in slide-in-from-bottom-2">
              {/* ... (existing content) ... */}
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

                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Seguridad Kiosco (POS)</CardTitle>
                    <CardDescription>Configurá los PINs de acceso para la Caja.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-slate-700 font-bold">PIN de Dueño (Tu PIN)</Label>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                          <TooltipContent>Tu PIN personal para operar la caja sin usar tu contraseña.</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          inputMode="numeric"
                          maxLength={4}
                          value={ownerPin}
                          onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 0000"
                          className="flex h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                        />
                        <Button 
                          type="button" 
                          onClick={handleSaveOwnerPin}
                          disabled={updatingPin || ownerPin.length !== 4}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                        >
                          {updatingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Establecer'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-500">Este PIN se usará junto con los demás perfiles en el Lock Screen.</p>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-slate-700">PIN de Empleados</Label>
                        <Tooltip>
                          <TooltipTrigger><Info className="h-4 w-4 text-slate-400" /></TooltipTrigger>
                          <TooltipContent>PIN compartido para que tus empleados operen la caja.</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          inputMode="numeric"
                          maxLength={4}
                          value={staffPin}
                          onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 1234"
                          className="flex h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" 
                        />
                        <Button 
                          type="button" 
                          onClick={handleSavePin}
                          disabled={updatingPin || staffPin.length !== 4}
                          className="bg-slate-900 text-white min-w-[100px]"
                        >
                          {updatingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Establecer'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-500">Este PIN funciona para todos los empleados de la sucursal.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="integraciones" className="animate-in fade-in slide-in-from-bottom-2">
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </Layout>
  )
}
