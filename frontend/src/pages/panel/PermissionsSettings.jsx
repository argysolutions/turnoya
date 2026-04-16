import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { getSettings, updateSettings } from '@/api/business'
import { toast } from 'sonner'
import { 
  Shield, 
  Eye, 
  Check, 
  Trash2, 
  TrendingUp, 
  Users, 
  Lock,
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const PERMISSION_METADATA = [
  { 
    key: 'view_caja', 
    label: 'Ver Totales de Caja', 
    desc: 'Permite visualizar ingresos y egresos totales del negocio.',
    icon: Shield
  },
  { 
    key: 'manage_clients', 
    label: 'Gestionar Clientes', 
    desc: 'Permite ver, crear y editar fichas de clientes.',
    icon: Users 
  },
  { 
    key: 'manage_services', 
    label: 'Administrar Servicios', 
    desc: 'Permite modificar precios y duraciones de servicios.',
    icon: Check 
  },
  { 
    key: 'delete_appointments', 
    label: 'Eliminar Turnos', 
    desc: 'Habilita al empleado a borrar turnos ya agendados.',
    icon: Trash2,
    warning: true
  },
  { 
    key: 'view_analytics', 
    label: 'Ver Estadísticas', 
    desc: 'Acceso a gráficos de rendimiento y KPIs históricos.',
    icon: TrendingUp 
  }
]

export default function PermissionsSettings() {
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getSettings()
        setPermissions(data.staff_permissions || {
          view_caja: true,
          manage_clients: true,
          manage_services: false,
          delete_appointments: false,
          view_analytics: false
        })
      } catch (err) {
        toast.error('Error al cargar permisos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({ staff_permissions: permissions })
      toast.success('Permisos actualizados correctamente')
    } catch (err) {
      toast.error('No se pudieron guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cargando privilegios...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-100/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Lock className="w-6 h-6 text-indigo-400" /> Control de Acceso
            </h2>
            <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed">
              Configurá qué funciones puede realizar tu equipo cuando operen el sistema. 
              Los cambios se aplican de forma instantánea a todo el staff.
            </p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[11px] tracking-[0.2em] h-12 px-8 rounded-2xl shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
          >
            {saving ? 'Guardando...' : 'Aplicar Cambios'}
          </Button>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-2xl" />
      </div>

      {/* Grid de Permisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERMISSION_METADATA.map((p) => {
          const isActive = permissions[p.key]
          const Icon = p.icon

          return (
            <motion.button
              key={p.key}
              whileHover={{ y: -2 }}
              onClick={() => handleToggle(p.key)}
              className={`flex items-start gap-4 p-5 rounded-3xl border transition-all text-left group ${
                isActive 
                  ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-500/5' 
                  : 'bg-slate-50/50 border-slate-100 opacity-70 grayscale-[0.5]'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                isActive ? 'bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50' : 'bg-slate-200 text-slate-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] font-black uppercase tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {p.label}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isActive ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'
                  }`}>
                    {isActive && <Check className="w-3 h-3 stroke-[4]" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-6">
                  {p.desc}
                </p>
                {p.warning && isActive && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg w-fit">
                    <Info className="w-3 h-3" /> Acción de Riesgo
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
          <ChevronRight className="w-5 h-5" />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Los permisos marcados se habilitan automáticamente en la interfaz del empleado. 
          Los dueños (Owners) siempre tienen acceso total independientemente de esta configuración.
        </p>
      </div>
    </div>
  )
}
