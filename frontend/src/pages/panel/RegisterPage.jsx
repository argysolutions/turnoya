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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">TurnoYa</h1>
          <p className="text-sm text-slate-500 mt-1">Registrá tu negocio</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del negocio *</Label>
              <Input id="name" name="name" placeholder="Peluquería Demo" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="tu@negocio.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña *</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" placeholder="3491234567" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" placeholder="Av. San Martín 123" value={form.address} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" name="description" placeholder="Breve descripción de tu negocio" value={form.description} onChange={handleChange} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar negocio'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-slate-900 font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>

      </div>
    </div>
  )
}