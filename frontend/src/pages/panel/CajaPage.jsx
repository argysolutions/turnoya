import { useState, useEffect } from 'react'
import Layout from '@/components/shared/Layout'
import { getSales } from '@/api/sales'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Printer, TrendingUp, CreditCard, Wallet, ArrowLeftRight, HelpCircle, Eye, EyeOff } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const fmt = (amount) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount ?? 0)

const masked = () => '$ •••••'

const fmtDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

const fmtTime = (isoString) =>
  new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const METHOD_ICON = {
  Efectivo:      <Wallet className="w-3.5 h-3.5" />,
  Transferencia: <ArrowLeftRight className="w-3.5 h-3.5" />,
  Tarjeta:       <CreditCard className="w-3.5 h-3.5" />,
  Otro:          <HelpCircle className="w-3.5 h-3.5" />,
}

const METHOD_STYLE = {
  Efectivo:      'bg-emerald-50  text-emerald-700  border-emerald-100',
  Transferencia: 'bg-blue-50     text-blue-700     border-blue-100',
  Tarjeta:       'bg-purple-50   text-purple-700   border-purple-100',
  Otro:          'bg-slate-50    text-slate-600    border-slate-100',
}

const summarize = (sales) => {
  const acc = {}
  sales.forEach((s) => {
    const m = s.payment_method || 'Otro'
    if (!acc[m]) acc[m] = { count: 0, total: 0 }
    acc[m].count++
    acc[m].total += parseFloat(s.amount || 0)
  })
  return acc
}

// ─── Print / Export PDF ─────────────────────────────────────────────────────

const printReport = (sales, total, date, businessName) => {
  const dateLabel = date === today() ? 'Hoy' : fmtDate(date)
  const rows = sales
    .map(
      (s) => `
        <tr>
          <td>${fmtTime(s.created_at)}</td>
          <td>${s.client_name || '—'}</td>
          <td>${s.phone || '—'}</td>
          <td>${s.payment_method}</td>
          <td style="text-align:right; font-weight:600">${fmt(s.amount)}</td>
        </tr>`
    )
    .join('')

  const win = window.open('', '_blank')
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Reporte de Caja — ${dateLabel}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0 }
        body { font-family: system-ui, sans-serif; color: #111; padding: 32px; font-size: 13px }
        h1  { font-size: 20px; margin-bottom: 4px }
        .sub { color: #555; margin-bottom: 24px; font-size: 12px }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px }
        th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #666 }
        td { padding: 8px 10px; border-bottom: 1px solid #eee }
        tr:last-child td { border-bottom: none }
        .total-row { display: flex; justify-content: flex-end; gap: 16px; align-items: center; border-top: 2px solid #111; padding-top: 12px; margin-top: 8px }
        .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #555 }
        .total-amount { font-size: 22px; font-weight: 700 }
        .footer { margin-top: 32px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px }
        @media print { button { display: none } }
      </style>
    </head>
    <body>
      <h1>${businessName || 'TurnoYa'} — Reporte de Caja</h1>
      <p class="sub">Período: ${dateLabel} &nbsp;·&nbsp; Generado: ${new Date().toLocaleString('es-AR')}</p>
      <table>
        <thead><tr>
          <th>Hora</th><th>Cliente</th><th>Teléfono</th><th>Método</th><th style="text-align:right">Monto</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="color:#999;text-align:center;padding:16px">Sin ventas para esta fecha</td></tr>'}</tbody>
      </table>
      <div class="total-row">
        <span class="total-label">Total del período</span>
        <span class="total-amount">${fmt(total)}</span>
      </div>
      <div class="footer">TurnoYa · Reporte generado automáticamente · ${new Date().toLocaleDateString('es-AR')}</div>
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [date, setDate] = useState(today())
  const [sales, setSales] = useState([])
  const [total, setTotal] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  // Toggle de privacidad: oculta los montos con asteriscos
  const [hidden, setHidden] = useState(false)

  const business = JSON.parse(localStorage.getItem('business') || '{}')

  const fetchSales = async (d) => {
    setLoading(true)
    try {
      const { data } = await getSales(d)
      setSales(data.sales || [])
      setTotal(data.total || 0)
      setCount(data.count || 0)
    } catch {
      toast.error('Error al cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSales(date) }, [date])

  const isToday = date === today()
  const summary = summarize(sales)
  const display = (amount) => hidden ? masked() : fmt(amount)

  return (
    <Layout>
      {/* ── HEADER TOP BAR ── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
            <p className="text-sm text-slate-500 mt-0.5">Historial de cobros registrados por turno.</p>
          </div>
          <Button
            variant="outline"
            className="h-10 gap-2 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 w-full sm:w-auto"
            onClick={() => printReport(sales, total, date, business.name)}
          >
            <Printer className="w-4 h-4" />
            Imprimir / Exportar PDF
          </Button>
        </div>
      </div>

      {/* ── HERO TOTAL CARD ── */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-xl overflow-hidden relative">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
          {isToday ? 'Caja de hoy' : fmtDate(date)}
        </p>

        {/* Total + toggle de privacidad */}
        <div className="flex items-center gap-3 flex-wrap">
          {loading ? (
            <div className="h-10 w-40 bg-white/10 animate-pulse rounded-xl" />
          ) : (
            <span className={`text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight transition-all ${hidden ? 'text-white/40 blur-sm select-none' : 'text-white'}`}>
              {hidden ? '$ •••••' : fmt(total)}
            </span>
          )}

          {/* Botón ojo — sin fondo, como emoji funcional */}
          <button
            onClick={() => setHidden(h => !h)}
            title={hidden ? 'Mostrar montos' : 'Ocultar montos'}
            className="text-white/50 hover:text-white/90 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 shrink-0"
          >
            {hidden
              ? <EyeOff className="w-5 h-5" />
              : <Eye className="w-5 h-5" />
            }
          </button>

          {!loading && (
            <span className="text-slate-400 text-sm mt-1 w-full sm:w-auto sm:mt-0">
              {count} {count === 1 ? 'cobro' : 'cobros'}
            </span>
          )}
        </div>

        {/* Resumen por método de pago */}
        {!loading && Object.keys(summary).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(summary).map(([method, { count: c, total: t }]) => (
              <div key={method} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs text-white/80">
                {METHOD_ICON[method] || METHOD_ICON['Otro']}
                <span className="font-medium">{method}</span>
                <span className="opacity-60">·</span>
                <span className={hidden ? 'blur-sm select-none' : ''}>{hidden ? '•••' : fmt(t)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DATE NAVIGATOR ── */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl border border-slate-100 hover:bg-slate-100 shrink-0"
          onClick={() => setDate(d => addDays(d, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 transition-all"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={isToday}
          className="h-10 w-10 rounded-xl border border-slate-100 hover:bg-slate-100 shrink-0 disabled:opacity-30"
          onClick={() => setDate(d => addDays(d, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-xs font-bold border-slate-200 hidden sm:flex"
            onClick={() => setDate(today())}
          >
            Hoy
          </Button>
        )}
      </div>

      {/* ── SALES LIST ── */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {isToday ? 'Ventas de hoy' : `Ventas del ${fmtDate(date)}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-0">
          {loading ? (
            <div className="space-y-3 py-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-8 w-8 bg-slate-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <span className="text-3xl">🧾</span>
              <p className="text-sm font-medium text-slate-500">
                {isToday ? 'Todavía no registraste cobros hoy' : 'Sin ventas para esta fecha'}
              </p>
              <p className="text-xs text-slate-400">
                {isToday ? 'Finalizá un turno para que aparezca acá.' : 'Podés navegar a otra fecha con las flechas.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sales.map((sale) => (
                <div key={sale.id} className="py-3.5 flex items-center gap-4 group hover:bg-slate-50/60 -mx-6 px-6 transition-colors">
                  {/* Avatar inicial */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0 shadow-sm">
                    {(sale.client_name || '?').charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {sale.client_name || 'Cliente'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">
                        {fmtTime(sale.created_at)} hs
                      </span>
                      {sale.phone && (
                        <span className="text-xs text-slate-400 truncate">
                          · {sale.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Método + Monto */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-sm font-bold text-slate-900 tabular-nums transition-all ${hidden ? 'blur-sm select-none' : ''}`}>
                      {display(sale.amount)}
                    </span>
                    <Badge
                      className={`text-[10px] font-semibold border px-2 py-0.5 flex items-center gap-1 ${
                        METHOD_STYLE[sale.payment_method] || METHOD_STYLE['Otro']
                      }`}
                      variant="outline"
                    >
                      {METHOD_ICON[sale.payment_method] || METHOD_ICON['Otro']}
                      {sale.payment_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer total */}
          {!loading && sales.length > 0 && (
            <div className="flex justify-between items-center py-4 mt-1 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total del período
              </span>
              <span className={`text-lg font-extrabold text-slate-900 tabular-nums transition-all ${hidden ? 'blur-sm select-none' : ''}`}>
                {display(total)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}
