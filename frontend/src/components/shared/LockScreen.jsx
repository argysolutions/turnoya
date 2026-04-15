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
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
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
    setError('')
    setSelected(profile)
    setPinDigits(['', '', '', ''])
    setTimeout(() => pinRefs.current[0]?.focus(), 150)
  }

  const handlePinChange = (value, idx) => {
    if (error) setError('')
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
    setError('')
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
      setError(msg)
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
    setError('')
    setPinDigits(['', '', '', ''])
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      {/* Overlay translúcido */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
      />

      <AnimatePresence mode="wait">
        {!selected ? (
          /* ── Selección de Perfil ──────────────────────────────────── */
          <motion.div
            key="profiles"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative z-10 w-full max-w-[400px] bg-white rounded-[3rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100"
          >
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-slate-900/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Acceso a Caja</h1>
              <p className="text-sm font-medium text-slate-400 mt-2">Seleccioná tu perfil para operar</p>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectProfile(profile)}
                  className="w-full flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group"
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_COLORS[profile.role] || 'from-slate-500 to-slate-600'} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <span className="text-white font-black text-lg">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-slate-800 tracking-tight">{profile.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{ROLE_LABELS[profile.role] || profile.role}</p>
                  </div>

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-100 text-slate-300 group-hover:text-slate-900 group-hover:border-slate-300 transition-colors">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-10">
              TurnoYa Secure Access
            </p>
          </motion.div>
        ) : (
          /* ── Input de PIN ─────────────────────────────────────────── */
          <motion.div
            key="pin"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative z-10 w-full max-w-sm bg-white rounded-[3rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100"
          >
            <button
              onClick={handleBack}
              className="absolute left-8 top-8 w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="text-center mb-10 pt-4">
              {/* Avatar circular */}
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${ROLE_COLORS[selected.role] || 'from-slate-500 to-slate-600'} flex items-center justify-center mx-auto mb-5 shadow-2xl p-1 bg-white ring-4 ring-slate-50`}>
                <div className="w-full h-full rounded-full bg-inherit flex items-center justify-center">
                  <span className="text-white font-black text-3xl">
                    {selected.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{selected.name}</h2>
              <p className="text-sm font-medium text-slate-400 mt-1">Ingresá tu PIN de 4 dígitos</p>
            </div>

            {/* PIN Inputs */}
            <div className="relative">
              <motion.div
                animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                className="flex gap-3 justify-center mb-6"
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
                    className={`w-14 h-16 rounded-2xl bg-slate-50 border-2 ${error ? 'border-red-200' : 'border-slate-100'} text-center text-2xl font-black text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all disabled:opacity-50`}
                    placeholder="•"
                  />
                ))}
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-red-500 text-[11px] font-black uppercase tracking-wider mb-6 px-4"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {verifying ? (
              <div className="flex items-center justify-center gap-2 text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Verificando...</span>
              </div>
            ) : (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => toast.info('Contactate con el administrador para resetear tu PIN.')}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-colors"
                >
                  ¿Olvidaste tu PIN?
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
