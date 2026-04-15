import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { register } from '@/api/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', address: '', description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await register(form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('business', JSON.stringify(data.business))
      toast.success('¡Negocio registrado correctamente!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">TurnoYa</h1>
          <p className="text-slate-500 mt-2 font-medium">Empezá a potenciar tu negocio</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-700 font-semibold ml-1 text-xs uppercase tracking-wider">Nombre del negocio *</Label>
              <Input id="name" name="name" placeholder="Peluquería Demo" autoFocus value={form.name} onChange={handleChange} required className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:bg-white transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-semibold ml-1 text-xs uppercase tracking-wider">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="tu@negocio.com" value={form.email} onChange={handleChange} required className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:bg-white transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" title="password" className="text-slate-700 font-semibold ml-1 text-xs uppercase tracking-wider">Contraseña *</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:bg-white transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-slate-700 font-semibold ml-1 text-xs uppercase tracking-wider">Teléfono</Label>
              <Input id="phone" name="phone" placeholder="3491234567" value={form.phone} onChange={handleChange} className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:bg-white transition-all" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-slate-700 font-semibold ml-1 text-xs uppercase tracking-wider">Dirección</Label>
              <Input id="address" name="address" placeholder="Av. San Martín 123" value={form.address} onChange={handleChange} className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:bg-white transition-all" />
            </div>
            <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-[0.98] mt-4" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear mi cuenta'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-slate-900 font-bold hover:underline underline-offset-4 decoration-indigo-500">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}