import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import client from '@/api/client'

const DAYS = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
]

const defaultSlots = () => Object.fromEntries(
  DAYS.map(d => [d.value, { enabled: false, start: '09:00', end: '18:00' }])
)

export default function AvailabilityPage() {
  const [slots, setSlots] = useState(defaultSlots())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await client.get('/availability')
        const updated = defaultSlots()
        data.forEach(({ day_of_week, start_time, end_time }) => {
          updated[day_of_week] = {
            enabled: true,
            start: start_time.slice(0, 5),
            end: end_time.slice(0, 5),
          }
        })
        setSlots(updated)
      } catch {
        toast.error('Error al cargar la disponibilidad')
      }
    }
    fetch()
  }, [])

  const toggle = (day) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }))
  }

  const handleTime = (day, field, value) => {
    setSlots(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      for (const day of DAYS) {
        const slot = slots[day.value]
        if (slot.enabled) {
          await client.post('/availability', {
            day_of_week: day.value,
            start_time: slot.start,
            end_time: slot.end,
          })
        } else {
          await client.delete(`/availability/${day.value}`).catch(() => {})
        }
      }
      toast.success('Disponibilidad guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Disponibilidad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configurá qué días y horarios atendés</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Horarios por día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS.map((day) => (
              <div
                key={day.value}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                  slots[day.value].enabled
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <button
                  onClick={() => toggle(day.value)}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                    slots[day.value].enabled ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      slots[day.value].enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                <span className={`text-sm w-24 flex-shrink-0 ${
                  slots[day.value].enabled ? 'text-slate-900 font-medium' : 'text-slate-400'
                }`}>
                  {day.label}
                </span>

                {slots[day.value].enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={slots[day.value].start}
                      onChange={(e) => handleTime(day.value, 'start', e.target.value)}
                      className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <span className="text-slate-400 text-sm">a</span>
                    <input
                      type="time"
                      value={slots[day.value].end}
                      onChange={(e) => handleTime(day.value, 'end', e.target.value)}
                      className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No disponible</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}