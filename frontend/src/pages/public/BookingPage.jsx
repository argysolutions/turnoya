import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { getAvailableSlots } from '@/api/services'
import { bookAppointment } from '@/api/appointments'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const today = () => new Date().toISOString().split('T')[0]

export default function BookingPage() {
  const { slug } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [date, setDate] = useState(today())
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slotsMsg, setSlotsMsg] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ client_name: '', client_phone: '', client_email: '' })
  const [loading, setLoading] = useState(false)

  const service = state?.service
  const business = state?.business

  useEffect(() => {
    if (!service) return
    const fetch = async () => {
      setLoadingSlots(true)
      setSelectedSlot(null)
      setSlotsMsg('')
      try {
        const { data } = await getAvailableSlots(slug, date, service.id)
        setSlots(data.slots || [])
        if (data.message) setSlotsMsg(data.message)
      } catch {
        toast.error('Error al cargar horarios')
      } finally {
        setLoadingSlots(false)
      }
    }
    fetch()
  }, [date, service, slug])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handlePhoneChange = (value) => setForm({ ...form, client_phone: value || '' })

  const validateForm = () => {
    // 1. Nombre completo mínimo 2 palabras
    const nameWords = form.client_name.trim().split(/\s+/)
    if (nameWords.length < 2) {
      toast.error('Por favor ingresá tanto tu nombre como tu apellido.')
      return false
    }

    // 2. Teléfono con Prefijo
    if (!form.client_phone || !isValidPhoneNumber(form.client_phone)) {
      toast.error('Número de celular WhatsApp inválido o incompleto.')
      return false
    }

    // 3. Email con Validacion de dominios (Obligatorio)
    const emailStr = form.client_email.trim().toLowerCase()
    if (!emailStr) {
      toast.error('El email es obligatorio.')
      return false
    }
    
    const allowedDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'yahoo.com.ar', 'outlook.com', 'live.com']
    if (!emailStr.includes('@')) {
      toast.error('Formato de email inválido.')
      return false
    }
    
    const domain = emailStr.split('@')[1]
    if (!allowedDomains.includes(domain)) {
      toast.error('Por favor usá un email real de gmail, hotmail, yahoo u outlook.')
      return false
    }

    return true
  }

  const handleBook = async () => {
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const { data } = await bookAppointment(slug, {
        service_id: service.id,
        date,
        start_time: selectedSlot.start,
        ...form,
      })
      navigate(`/turno/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al reservar')
    } finally {
      setLoading(false)
    }
  }

  if (!service) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Acceso inválido</p>
    </div>
  )

  const stepProgress = step === 1 ? '50%' : '90%'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-6 sticky top-0 bg-slate-50/80 backdrop-blur-sm z-20 py-2 -mx-4 px-4 sm:relative sm:bg-transparent sm:backdrop-blur-none sm:p-0">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-500"
              style={{ width: stepProgress }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">✓</div>
              <span className="text-sm font-medium text-slate-900 hidden sm:inline">Servicio</span>
            </div>
            <div className="flex-1 h-px bg-slate-900" />
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
              <span className="text-sm font-medium text-slate-900">Horario</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
              <span className={`text-sm ${step >= 2 ? 'font-medium text-slate-900' : 'text-slate-400'}`}>Confirmar</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Servicio</p>
            <p className="text-sm font-medium text-slate-900">{service.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{service.duration} min</Badge>
            {service.price && <span className="text-sm font-semibold">${Number(service.price).toLocaleString('es-AR')}</span>}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-900">Elegí una fecha</p>
                  <input
                    type="date"
                    value={date}
                    min={today()}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Horarios disponibles</p>
                  {loadingSlots ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Cargando horarios...</p>
                  ) : slotsMsg ? (
                    <p className="text-sm text-slate-400 py-4 text-center">{slotsMsg}</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No hay horarios disponibles para este día</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => setSelectedSlot(slot)}
                          className={`text-sm py-2 px-3 rounded-lg border transition-all h-12 flex items-center justify-center ${
                            selectedSlot?.start === slot.start
                              ? 'bg-slate-900 text-white border-slate-900 scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:scale-[1.02]'
                          }`}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-30 sm:relative sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:z-auto">
              <Button
                className="w-full h-12 sm:h-10 text-base sm:text-sm font-semibold"
                disabled={!selectedSlot}
                onClick={() => setStep(2)}
              >
                {selectedSlot ? `Continuar con ${selectedSlot.start} →` : 'Seleccioná un horario'}
              </Button>
              <div className="h-safe-bottom sm:hidden" /> {/* Para iPhones con Notch */}
            </div>
            
            {/* Espaciador para que el contenido no quede tapado por el botón sticky */}
            <div className="h-24 sm:hidden" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-medium text-slate-900 mb-1">Tus datos</p>
                <div className="space-y-1.5">
                  <Label htmlFor="client_name">Nombre y Apellido *</Label>
                  <Input id="client_name" name="client_name" placeholder="Ej: Juan Pérez" value={form.client_name} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client_phone">WhatsApp *</Label>
                  <PhoneInput
                    id="client_phone"
                    international
                    withCountryCallingCode
                    defaultCountry="AR"
                    placeholder="+54 11 2345 6789"
                    value={form.client_phone}
                    onChange={handlePhoneChange}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client_email">Email *</Label>
                  <Input id="client_email" name="client_email" type="email" placeholder="Ej: juan@gmail.com" value={form.client_email} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Resumen del turno</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Negocio</span>
                <span className="font-medium">{business?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Servicio</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fecha</span>
                <span className="font-medium">{new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Horario</span>
                <span className="font-medium">{selectedSlot?.start} — {selectedSlot?.end}</span>
              </div>
              {service.price && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Total</span>
                  <span className="font-semibold">${Number(service.price).toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-30 sm:relative sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none sm:z-auto">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 sm:h-10 text-base sm:text-sm">
                  ← Volver
                </Button>
                <Button onClick={handleBook} disabled={loading} className="flex-1 h-12 sm:h-10 text-base sm:text-sm font-semibold">
                  {loading ? 'Reservando...' : 'Confirmar turno'}
                </Button>
              </div>
              <div className="h-safe-bottom sm:hidden" />
            </div>

            {/* Espaciador para que el contenido no quede tapado por el botón sticky */}
            <div className="h-24 sm:hidden" />
          </div>
        )}

      </div>
    </div>
  )
}