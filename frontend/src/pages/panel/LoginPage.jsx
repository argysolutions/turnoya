import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
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
      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight transition-all">TurnoYa</h1>
          {savedAccount ? (
            <p className="text-indigo-600 mt-2 font-medium">Hola de nuevo, <span className="font-bold text-indigo-700">{savedAccount.name}</span></p>
          ) : (
            <p className="text-slate-500 mt-2 font-medium">Gestioná tu agenda con facilidad</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center"
              >
                <div
                  className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200"
                >
                  <Check className="w-10 h-10 text-white" />
                </div>
                <p
                  className="mt-4 text-emerald-600 font-black uppercase tracking-widest text-xs"
                >
                  ¡Bienvenido!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                {savedAccount && (
                  <button type="button" onClick={handleClearAccount} className="text-xs text-indigo-600 font-medium hover:text-indigo-700">Cambiar cuenta</button>
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
                className={`h-12 rounded-xl transition-all shadow-sm ${savedAccount ? 'bg-slate-100 text-slate-500 border-transparent focus:ring-0 cursor-not-allowed' : 'bg-slate-50/50 border-slate-200 focus:bg-white'}`}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Contraseña</Label>
                <Link to="/recovery" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">¿Olvidaste tu clave?</Link>
              </div>
              <Input
                ref={passwordInputRef}
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="bg-slate-50/50 border-slate-200 h-12 rounded-xl focus:bg-white transition-all shadow-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-slate-900 font-bold hover:underline underline-offset-4 decoration-indigo-500">
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