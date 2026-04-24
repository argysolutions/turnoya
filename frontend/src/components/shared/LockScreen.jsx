import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { verifyPin } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Smartphone, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * LockScreen simplificado:
 * - Dueño: muestra un input de PIN genérico para desbloquear
 * - Empleado: se bypassea automáticamente (ya autenticado por staff-login)
 */
export default function LockScreen({ onUnlock }) {
  const { role, setActiveProfile, businessId, staffId } = useAuth()
  const [verifying, setVerifying] = useState(false)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [showPin, setShowPin] = useState(false)
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

  const handleVerify = async (pin) => {
    setVerifying(true)
    setError('')
    try {
      const { data } = await verifyPin({ profile_id: 'owner', pin })
      if (data.valid) {
        const profile = {
          id: 'owner',
          name: data.name,
          role: 'owner',
          staff_id: null,
          professional_name: data.name,
        }
        setActiveProfile(profile)

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
      {/* Overlay translúcido */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="relative z-10 w-full max-w-[440px] bg-white rounded-[4rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-100"
      >
        <div className="text-center mb-12">
          <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-900/20">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-tight">Acceso a Caja</h1>
          <p className="text-lg font-bold text-slate-500 mt-3 leading-snug">Ingresá tu PIN de Dueño para desbloquear</p>
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
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={idx === 0}
                  value={digit}
                  onChange={e => handlePinChange(e.target.value, idx)}
                  onKeyDown={e => handlePinKeyDown(e, idx)}
                  disabled={verifying}
                  autoComplete="off"
                  style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' }}
                  className={cn(
                    "w-20 h-24 sm:w-24 sm:h-28 text-center text-5xl font-black rounded-3xl border-2 transition-all outline-none",
                    error 
                        ? "border-rose-200 bg-rose-50 text-rose-600" 
                        : "border-slate-100 bg-slate-50 focus:border-slate-900 focus:bg-white text-slate-900",
                    digit && !error ? "border-slate-900 bg-white" : ""
                  )}
                />
            ))}
          </motion.div>
          <button
            type="button"
            onClick={() => setShowPin(s => !s)}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 mx-auto mb-10 transition-colors"
          >
            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            {showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
          </button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-rose-500 text-sm font-black uppercase tracking-wider mb-8"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {verifying ? (
          <div className="flex items-center justify-center gap-3 text-slate-400 py-4">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-black uppercase tracking-widest">Verificando...</span>
          </div>
        ) : (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => toast.info('Podés cambiar tu PIN en Configuración → Gestión de Staff.')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-600 transition-colors"
            >
              ¿Olvidaste tu PIN?
            </button>
          </div>
        )}

        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-10">
          TurnoYa Secure Access
        </p>
      </motion.div>
    </div>
  )
}
