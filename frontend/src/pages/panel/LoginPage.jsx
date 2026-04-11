import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '@/api/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await login(form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('business', JSON.stringify(data.business))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ingresar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight transition-all">TurnoYa</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestioná tu agenda con facilidad</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold ml-1">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@negocio.com"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-slate-50/50 border-slate-200 h-12 rounded-xl focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" title="password" className="text-slate-700 font-semibold">Contraseña</Label>
                <Link to="/recovery" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">¿Olvidaste tu clave?</Link>
              </div>
              <Input
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
            <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98]" disabled={loading}>
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
      </div>
    </div>
  )
}