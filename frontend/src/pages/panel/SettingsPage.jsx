import { useState, useEffect } from 'react'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import client from '@/api/client'
import { CheckCircle2, Info } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    cancellation_policy: '',
    anticipation_margin: 0,
    buffer_time: 0,
    whatsapp_enabled: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [business, setBusiness] = useState(() => JSON.parse(localStorage.getItem('business') || '{}'))
  const [googleLinked, setGoogleLinked] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await client.get('/settings')
        setSettings({
          cancellation_policy: data.cancellation_policy || '',
          anticipation_margin: data.anticipation_margin || 0,
          buffer_time: data.buffer_time || 0,
          whatsapp_enabled: data.whatsapp_enabled || false
        })
      } catch (error) {
        toast.error('Error al cargar la configuración')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data === 'GOOGLE_AUTH_SUCCESS') {
        const updatedBusiness = { ...business, google_linked: true }
        localStorage.setItem('business', JSON.stringify(updatedBusiness))
        setBusiness(updatedBusiness)
        setGoogleLinked(true)
        toast.success('¡Cuenta de Google vinculada con éxito!')
      } else if (event.data === 'GOOGLE_AUTH_ERROR') {
        toast.error('Hubo un error al vincular tu cuenta de Google')
      }
    }
    window.addEventListener('message', handleMessage)
    if (business.google_refresh_token || business.google_linked) {
      setGoogleLinked(true)
    }
    return () => window.removeEventListener('message', handleMessage)
  }, [business])

  const handleLinkGoogle = async () => {
    try {
      const res = await client.get('/admin/auth/google/url')
      if (res.data.url) {
        window.open(res.data.url, 'GoogleAuth', 'width=500,height=600')
      } else {
        toast.error('No se pudo establecer conexión con Google')
      }
    } catch {
      toast.error('Error al intentar abrir autenticación de Google')
    }
  }

  const handleUnlinkGoogle = async () => {
    try {
      const res = await client.delete('/admin/auth/google')
      if (res.status === 200 || res.status === 204) {
        const updatedBusiness = { ...business, google_linked: false, google_refresh_token: null }
        localStorage.setItem('business', JSON.stringify(updatedBusiness))
        setBusiness(updatedBusiness)
        setGoogleLinked(false)
        toast.success('Google Contacts se ha desvinculado.')
      }
    } catch {
      toast.error('Error al intentar desvincular la cuenta.')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await client.put('/settings', settings)
      setSettings({
        cancellation_policy: data.cancellation_policy || '',
        anticipation_margin: data.anticipation_margin || 0,
        buffer_time: data.buffer_time || 0,
        whatsapp_enabled: data.whatsapp_enabled || false
      })
      toast.success('Configuración guardada correctamente')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="sticky top-14 z-20 bg-slate-50 py-4 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ajustes del Negocio</h1>
          <p className="text-sm text-slate-500 mt-1">Configurá las reglas de reserva y tus integraciones.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto h-11 sm:h-10 shadow-md">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base">Reglas de Reserva</CardTitle>
            <CardDescription>Establecé los márgenes de tiempo permitidos</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Margen de anticipación (minutos)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cuántas horas antes el cliente puede reservar (ej: 2hs)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-slate-500">Cuánto tiempo antes como mínimo pueden sacar un turno.</p>
                  <input 
                    type="number" 
                    min="0"
                    value={settings.anticipation_margin}
                    onChange={(e) => setSettings({...settings, anticipation_margin: parseInt(e.target.value) || 0})}
                    className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Tiempo buffer (minutos)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tiempo de limpieza entre turnos (ej: 15 min)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-slate-500">Tiempo de margen luego de un turno antes de permitir otro.</p>
                  <input 
                    type="number" 
                    min="0"
                    value={settings.buffer_time}
                    onChange={(e) => setSettings({...settings, buffer_time: parseInt(e.target.value) || 0})}
                    className="flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Política de cancelación</Label>
                  <p className="text-xs text-slate-500">Texto que verá el cliente al momento de reservar.</p>
                  <textarea 
                    value={settings.cancellation_policy}
                    onChange={(e) => setSettings({...settings, cancellation_policy: e.target.value})}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 min-h-[44px] text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Ej: Solo es posible cancelar con 12 hs de anticipación."
                  />
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base">Sincronización de Agenda Libreta</CardTitle>
            <CardDescription>Conectá tu cuenta de Google Contacts</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Conectá tu cuenta de Google para agendar a todos los pacientes automáticamente en los contactos de tu celular en tiempo real, sin escribir sus números a mano.
            </p>
            
            {!googleLinked ? (
              <Button 
                className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-sm flex items-center justify-center gap-2 h-11 transition-all" 
                onClick={handleLinkGoogle}
              >
                <div className="bg-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-[#4285F4] font-bold text-xs">G</div>
                Vincular Google Contacts
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">Cuenta de Google Vinculada</span>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 self-start" onClick={handleUnlinkGoogle}>
                  Desvincular cuenta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base">Notificaciones</CardTitle>
            <CardDescription>Avisá automáticamente a tus clientes</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold text-slate-900">Recordatorios por WhatsApp</Label>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow-sm">PRÓXIMAMENTE</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Enviaremos un mensaje a tu cliente 1 día antes para recordarle el turno.
                  </p>
                </div>
                <Switch 
                  checked={settings.whatsapp_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, whatsapp_enabled: checked})}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
