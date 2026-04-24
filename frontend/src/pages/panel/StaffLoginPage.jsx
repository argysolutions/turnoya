import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { staffLogin } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Lock, Building2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StaffLoginPage() {
  const { setToken } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ business_id: '', pin: '' })
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [savedStaff, setSavedStaff] = useState(null)

  useEffect(() => {
    const lastId = localStorage.getItem('turno_ya_last_staff_business_id')
    const lastName = localStorage.getItem('turno_ya_last_staff_name')
    if (lastId) {
      setForm(f => ({ ...f, business_id: lastId }))
      if (lastName) setSavedStaff(lastName)
      setTimeout(() => document.getElementById('pin-0')?.focus(), 100)
    }
  }, [])

  const handlePinChange = (value, idx) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...pinDigits]
    next[idx] = digit
    setPinDigits(next)
    setForm(f => ({ ...f, pin: next.join('') }))
    // Auto-foco al siguiente input
    if (digit && idx < 3) {
      document.getElementById(`pin-${idx + 1}`)?.focus()
    }
  }

  const handlePinKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      document.getElementById(`pin-${idx - 1}`)?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.business_id || form.pin.length !== 4) {
      return toast.error('Ingresá el ID del negocio y tu PIN de 4 dígitos')
    }
    setLoading(true)
    try {
      const { data } = await staffLogin({
        business_id: parseInt(form.business_id, 10),
        pin: form.pin,
      })
      setToken(data.token)
      localStorage.setItem('turno_ya_last_staff_business_id', form.business_id)
      if (data.staff?.name) localStorage.setItem('turno_ya_last_staff_name', data.staff.name)
      toast.success('Sesión iniciada')
      navigate('/dashboard/agenda', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.error || 'PIN incorrecto'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAccount = () => {
    setSavedStaff(null)
    setForm(f => ({ ...f, business_id: '', pin: '' }))
    setPinDigits(['', '', '', ''])
    localStorage.removeItem('turno_ya_last_staff_business_id')
    localStorage.removeItem('turno_ya_last_staff_name')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Acceso de Staff</h1>
          {savedStaff ? (
            <p className="text-sm text-indigo-600 mt-1 font-medium">Hola de nuevo, <span className="font-bold text-indigo-700">{savedStaff}</span></p>
          ) : (
            <p className="text-sm text-slate-400 mt-1 font-medium">Ingresá con el ID del negocio y tu PIN</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-6">

          {/* Business ID */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                ID del Negocio
              </label>
              {form.business_id && savedStaff && (
                <button type="button" onClick={handleClearAccount} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">Cambiar cuenta</button>
              )}
            </div>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 12"
                autoFocus={!savedStaff}
                readOnly={!!savedStaff}
                value={form.business_id}
                onChange={e => setForm(f => ({ ...f, business_id: e.target.value.replace(/\D/g, '') }))}
                className={`w-full h-12 rounded-2xl border transition-all pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 font-semibold ${
                  savedStaff ? 'bg-slate-100 border-transparent text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-100'
                }`}
              />
            </div>
          </div>

          {/* PIN — 4 dígitos separados */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tu PIN
            </label>
            <div className="flex gap-3 justify-center">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={savedStaff && idx === 0}
                  value={digit}
                  onChange={e => handlePinChange(e.target.value, idx)}
                  onKeyDown={e => handlePinKeyDown(e, idx)}
                  autoComplete="off"
                  style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' }}
                  className="w-12 h-14 rounded-2xl border border-slate-200 bg-slate-50 text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowPin(s => !s)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 mx-auto mt-1 transition-colors"
            >
              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
            </button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || form.pin.length !== 4 || !form.business_id}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[11px] tracking-[0.15em] rounded-2xl transition-all disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : 'Ingresar'}
          </Button>
        </form>

        {/* Link al login de dueño */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 mt-6 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Acceso de Dueño
        </Link>
      </div>
    </div>
  )
}
