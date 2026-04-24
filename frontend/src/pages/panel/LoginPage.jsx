import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [savedAccount, setSavedAccount] = useState(null)
  
  const passwordInputRef = useRef(null)

  useEffect(() => {
    const raw = localStorage.getItem('turno_ya_last_business')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.email) {
          setForm(f => ({ ...f, email: parsed.email }))
          setSavedAccount(parsed)
          // Autofocus the password input since email is filled
          setTimeout(() => passwordInputRef.current?.focus(), 100)
        }
      } catch {
        // Ignorar
      }
    }
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await login(form)
      setIsSuccess(true)
      setToken(data.token)
      // Save identity payload for next time
      localStorage.setItem('turno_ya_last_business', JSON.stringify({ email: form.email, name: data.business.name }))
      setTimeout(() => {
        navigate('/dashboard')
      }, 800)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ingresar')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAccount = () => {
    setSavedAccount(null)
    setForm(f => ({ ...f, email: '', password: '' }))
  }

  return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter transition-all leading-tight">TurnoYa</h1>
          {savedAccount ? (
            <p className="text-xl text-blue-600 mt-3 font-bold">Hola de nuevo, <span className="text-blue-700 uppercase tracking-tighter">{savedAccount.name}</span></p>
          ) : (
            <p className="text-lg text-slate-500 mt-3 font-bold">Gestioná tu negocio con facilidad</p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-[4rem] p-10 sm:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center"
              >
                <div
                  className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200"
                >
                  <Check className="w-12 h-12 text-white" />
                </div>
                <p
                  className="mt-6 text-emerald-600 font-black uppercase tracking-widest text-sm"
                >
                  ¡Bienvenido!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-2">
                <Label htmlFor="email" className="text-slate-500 font-black uppercase text-[11px] tracking-widest">Email</Label>
                {savedAccount && (
                  <button type="button" onClick={handleClearAccount} className="text-xs text-blue-600 font-black uppercase tracking-tighter hover:text-blue-800">Cambiar cuenta</button>
                )}
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@negocio.com"
                autoFocus={!savedAccount}
                value={form.email}
                onChange={handleChange}
                required
                readOnly={!!savedAccount}
                className={`h-16 rounded-2xl transition-all shadow-sm text-xl font-bold px-6 ${savedAccount ? 'bg-slate-50 text-slate-400 border-transparent focus:ring-0 cursor-not-allowed' : 'bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-50'}`}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-2">
                <Label htmlFor="password" className="text-slate-500 font-black uppercase text-[11px] tracking-widest">Contraseña</Label>
                <Link to="/recovery" className="text-xs text-blue-600 hover:text-blue-800 font-black uppercase tracking-tighter">¿Olvidaste tu clave?</Link>
              </div>
              <div className="relative group">
                <Input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="bg-slate-50/50 border-slate-100 h-16 rounded-2xl focus:bg-white transition-all shadow-sm text-2xl font-black px-6 pr-14 focus:ring-4 focus:ring-blue-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-18 py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] text-lg"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-blue-900 font-bold hover:underline underline-offset-4 decoration-blue-500">
            Registrá tu negocio
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link
            to="/staff-login"
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
          >
            Acceso de empleado →
          </Link>
        </p>
      </div>
    </div>
  )
}