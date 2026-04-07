import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicBusiness } from '@/api/services'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function BusinessPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getPublicBusiness(slug)
        setData(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [slug])

  const handleContinue = () => {
    navigate(`/p/${slug}/reservar`, { state: { service: selected, business: data.business } })
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Cargando...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Negocio no encontrado</p>
    </div>
  )

  const { business, services } = data

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full border border-slate-100 translate-x-12 -translate-y-12 pointer-events-none" />
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full border border-slate-100 translate-x-6 -translate-y-6 pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0">
              {business.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{business.name}</h1>
              <p className="text-sm text-slate-500">{business.address}</p>
              {business.phone && (
                <p className="text-sm text-slate-500">{business.phone}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-500">disponible</span>
            </div>
          </div>
          {business.description && (
            <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
              {business.description}
            </p>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
            Elegí un servicio
          </h2>
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selected?.id === s.id
                    ? 'border-slate-900 bg-white shadow-sm scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">{s.duration} min</Badge>
                    {s.price && (
                      <span className="text-sm font-semibold text-slate-900">
                        ${Number(s.price).toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>
                </div>
                {selected?.id === s.id && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">✓ Seleccionado</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!selected}
          onClick={handleContinue}
        >
          {selected ? `Continuar con ${selected.name} →` : 'Seleccioná un servicio'}
        </Button>

      </div>
    </div>
  )
}