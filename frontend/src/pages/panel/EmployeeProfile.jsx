import { useState } from 'react'
import Layout from '@/components/shared/Layout'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { User, Key, Loader2, ShieldCheck } from 'lucide-react'

export default function EmployeeProfile() {
  const { staffId, role, staffName, professionalName } = useAuth()
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)

  const handleUpdatePin = async () => {
    if (!pin || !/^\d{4}$/.test(pin)) {
      return toast.error('El PIN debe ser exactamente 4 dígitos numéricos')
    }
    setSaving(true)
    try {
      const { updateMyPin } = await import('@/api/business')
      await updateMyPin(pin)
      toast.success('PIN actualizado correctamente')
      setPin('')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al actualizar PIN')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Mi Perfil</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configuración personal</p>
        </div>

        {/* Info card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" /> Datos del Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg">
                {(staffName || 'E').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{staffName || 'Empleado'}</p>
                {professionalName && professionalName !== staffName && (
                  <p className="text-[11px] text-slate-400 font-medium">Nombre Profesional: {professionalName}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {role === 'owner' ? 'Administrador' : 'Empleado'}
                  </span>
                  <span className="text-xs text-slate-400">ID: #{staffId}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-500" /> Seguridad
            </CardTitle>
            <CardDescription>Actualizá tu PIN de acceso para el Kiosco POS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-500" />
                <Label className="text-slate-700 font-bold text-sm">Actualizar PIN de 4 dígitos</Label>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="flex h-10 w-28 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none text-center tracking-[0.3em] font-mono"
                />
                <Button
                  type="button"
                  onClick={handleUpdatePin}
                  disabled={saving || pin.length !== 4}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">Este PIN se usa para acceder al sistema desde la pantalla de inicio de sesión de empleados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
