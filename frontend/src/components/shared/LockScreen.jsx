import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { verifyPin } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { ShieldCheck, Loader2 } from 'lucide-react'

/**
 * LockScreen simplificado:
 * - Dueño: muestra un input de PIN genérico para desbloquear
 * - Empleado: se bypassea automáticamente (ya autenticado por staff-login)
 */
export default function LockScreen({ onUnlock }) {
  const { role, setActiveProfile, businessId, staffId } = useAuth()
  const [verifying, setVerifying] = useState(false)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const pinRefs = useRef([])

  const isEmployee = role === 'employee'

  // Empleados: bypass automático del LockScreen
  useEffect(() => {
    if (isEmployee) {
      const profile = {
        id: `staff-${staffId}`,
        name: 'Empleado',
        role: 'employee',
        staff_id: staffId,
        professional_name: null,
      }
      setActiveProfile(profile)
      onUnlock?.(profile)
    }
  }, [isEmployee, staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus primer input al montar (solo para dueño)
  useEffect(() => {
    if (!isEmployee) {
      setTimeout(() => pinRefs.current[0]?.focus(), 300)
    }
  }, [isEmployee])

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

  const [isSuccess, setIsSuccess] = useState(false)

  const handleVerify = async (pin) => {
    setVerifying(true)
    setError('')
    try {
      const { data } = await verifyPin({ profile_id: 'owner', pin })
      if (data.valid) {
        setIsSuccess(true)
        const profile = {
          id: 'owner',
          name: data.name,
          role: 'owner',
          staff_id: null,
          professional_name: data.name,
        }
        
        // Efecto visual antes de entrar
        setTimeout(() => {
          setActiveProfile(profile)
          onUnlock?.(profile)
          toast.success(`Bienvenido, ${data.name}`)
        }, 800)
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

  // Si es empleado, no renderizar nada (bypass automático)
  if (isEmployee) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    )
  }

  // Dueño: modal con PIN directo
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-white/60 backdrop-blur-[4px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="relative z-10 w-full max-w-sm bg-white rounded-[3rem] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden"
      >
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-emerald-600 font-black uppercase tracking-widest text-xs"
              >
                Acceso Concedido
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-slate-900/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Acceso a Caja</h1>
          <p className="text-sm font-medium text-slate-400 mt-2">Ingresá tu PIN de Dueño para desbloquear</p>
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
                  autoFocus={idx === 0}
                  value={digit}
                  onChange={e => handlePinChange(e.target.value, idx)}
                  onKeyDown={e => handlePinKeyDown(e, idx)}
                  disabled={verifying || isSuccess}
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

        {verifying && !isSuccess ? (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Verificando...</span>
          </div>
        ) : !isSuccess ? (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => toast.info('Podés cambiar tu PIN en Configuración → Gestión de Staff.')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-colors"
            >
              ¿Olvidaste tu PIN?
            </button>
          </div>
        ) : <div className="h-6" />}

        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-10">
          TurnoYa Secure Access
        </p>
      </motion.div>
    </div>
  )
}
