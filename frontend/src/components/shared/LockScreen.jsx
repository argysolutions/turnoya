import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProfiles, verifyPin } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Lock, ShieldCheck, User, ArrowLeft, Loader2 } from 'lucide-react'

const ROLE_COLORS = {
  dueño: 'from-indigo-500 to-violet-600',
  empleado: 'from-emerald-500 to-teal-600',
}

const ROLE_LABELS = {
  dueño: 'Administrador',
  empleado: 'Empleado',
}

export default function LockScreen({ onUnlock }) {
  const { setActiveProfile } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [shake, setShake] = useState(false)
  const pinRefs = useRef([])

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getProfiles()
        setProfiles(data.profiles || [])
      } catch (err) {
        console.error('Error cargando perfiles:', err)
        toast.error('Error al cargar perfiles')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSelectProfile = (profile) => {
    if (!profile.has_pin) {
      toast.error('Este perfil no tiene PIN configurado. Configuralo en Ajustes.')
      return
    }
    setSelected(profile)
    setPinDigits(['', '', '', ''])
    setTimeout(() => pinRefs.current[0]?.focus(), 150)
  }

  const handlePinChange = (value, idx) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...pinDigits]
    next[idx] = digit
    setPinDigits(next)

    if (digit && idx < 3) {
      pinRefs.current[idx + 1]?.focus()
    }

    // Auto-submit cuando se completan 4 dígitos
    if (digit && idx === 3) {
      const fullPin = next.join('')
      if (fullPin.length === 4) {
        handleVerify(fullPin)
      }
    }
  }

  const handlePinKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = async (pin) => {
    if (!selected) return
    setVerifying(true)
    try {
      const { data } = await verifyPin({ profile_id: selected.id, pin })
      if (data.valid) {
        const profile = {
          id: selected.id,
          name: data.name,
          role: data.role,
          staff_id: data.staff_id,
          professional_name: data.professional_name || data.name,
        }
        setActiveProfile(profile)
        toast.success(`Bienvenido, ${data.name}`)
        onUnlock?.(profile)
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'PIN incorrecto'
      toast.error(msg)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPinDigits(['', '', '', ''])
      setTimeout(() => pinRefs.current[0]?.focus(), 100)
    } finally {
      setVerifying(false)
    }
  }

  const handleBack = () => {
    setSelected(null)
    setPinDigits(['', '', '', ''])
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {!selected ? (
          /* ── Selección de Perfil ──────────────────────────────────── */
          <motion.div
            key="profiles"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">¿Quién opera la caja?</h1>
              <p className="text-sm text-slate-400 mt-1">Seleccioná tu perfil para continuar</p>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <motion.button
                  key={profile.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectProfile(profile)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_COLORS[profile.role] || 'from-slate-500 to-slate-600'} flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="text-white font-black text-lg">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold text-sm">{profile.name}</p>
                    <p className="text-slate-400 text-xs font-medium">{ROLE_LABELS[profile.role] || profile.role}</p>
                  </div>

                  {/* Indicador */}
                  {!profile.has_pin ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">Sin PIN</span>
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Input de PIN ─────────────────────────────────────────── */
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver
            </button>

            <div className="text-center mb-8">
              {/* Avatar grande */}
              <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${ROLE_COLORS[selected.role] || 'from-slate-500 to-slate-600'} flex items-center justify-center mx-auto mb-4 shadow-2xl`}>
                <span className="text-white font-black text-3xl">
                  {selected.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{selected.name}</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Ingresá tu PIN de 4 dígitos</p>
            </div>

            {/* PIN Inputs */}
            <motion.div
              animate={shake ? { x: [0, -12, 12, -12, 12, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4 justify-center mb-8"
            >
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => pinRefs.current[idx] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handlePinChange(e.target.value, idx)}
                  onKeyDown={e => handlePinKeyDown(e, idx)}
                  disabled={verifying}
                  className="w-14 h-16 rounded-2xl bg-white/10 border border-white/20 text-center text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600 disabled:opacity-50"
                  placeholder="•"
                />
              ))}
            </motion.div>

            {verifying && (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
