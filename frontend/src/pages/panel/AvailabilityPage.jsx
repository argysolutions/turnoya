import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Layout from '@/components/shared/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import WheelTimePicker from '@/components/ui/wheel-time-picker'
import { Label } from '@/components/ui/label'

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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      <div className="sticky top-14 z-20 bg-white -mx-4 px-4 pt-1 pb-4 border-b border-slate-100/80 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Disponibilidad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configurá qué días y horarios atendés</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto h-11 sm:h-10 shadow-md">
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
                className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border transition-colors ${
                  slots[day.value].enabled
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-4 w-full sm:w-auto min-w-[140px]">
                  <span className={`text-sm flex-1 font-bold ${
                    slots[day.value].enabled ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {day.label}
                  </span>

                  <button
                    onClick={() => toggle(day.value)}
                    className={`w-11 h-6 rounded-full transition-all flex-shrink-0 relative ${
                      slots[day.value].enabled ? 'bg-[#34C759]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        slots[day.value].enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {slots[day.value].enabled ? (
                  <div className="flex flex-row items-center gap-4 w-full sm:w-auto flex-1">
                    <div className="flex-1 w-full sm:w-32">
                      {isMobile ? (
                        <TimePickerModal
                          label="Abre"
                          value={slots[day.value].start}
                          onChange={(val) => handleTime(day.value, 'start', val)}
                        />
                      ) : (
                        <>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Abre</Label>
                          <input
                            type="time"
                            value={slots[day.value].start}
                            onChange={(e) => handleTime(day.value, 'start', e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-md px-2 h-10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        </>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm hidden sm:block mt-6">a</span>
                    <div className="flex-1 w-full sm:w-32">
                      {isMobile ? (
                        <TimePickerModal
                          label="Cierra"
                          value={slots[day.value].end}
                          onChange={(val) => handleTime(day.value, 'end', val)}
                        />
                      ) : (
                        <>
                          <Label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Cierra</Label>
                          <input
                            type="time"
                            value={slots[day.value].end}
                            onChange={(e) => handleTime(day.value, 'end', e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-md px-2 h-10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 hidden sm:inline-block">No disponible</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}