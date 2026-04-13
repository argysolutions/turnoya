import { useState, useEffect, useMemo, useCallback } from 'react'
import Layout from '@/components/shared/Layout'
import {
  getSales, postExpense, deleteExpense, getFinancesSummary, getExpenses,
  getCashSession, openCashSession, closeCashSession,
} from '@/api/sales'
import { getAppointment } from '@/api/appointments'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, Printer, TrendingUp, TrendingDown,
  CreditCard, Wallet, ArrowLeftRight, HelpCircle, Eye, EyeOff,
  PlusCircle, Trash2, X, DollarSign, User, Lock, Unlock,
  Share2, ChevronDown, ChevronUp, Scissors, Phone, Clock,
  AlertTriangle, CheckCircle2, Info, Cloud,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const fmt = (amount) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount ?? 0)

const fmtDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

const fmtTime = (isoString) =>
  new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const fmtDateShort = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// Comisiones siguen siendo preferencias de UI (no datos financieros)
const COMMISSION_RATE_KEY = (name) => `commission_rate_${name}`

const METHOD_ICON = {
  Efectivo:      <Wallet className="w-3.5 h-3.5" />,
  Transferencia: <ArrowLeftRight className="w-3.5 h-3.5" />,
  Tarjeta:       <CreditCard className="w-3.5 h-3.5" />,
  Otro:          <HelpCircle className="w-3.5 h-3.5" />,
}
const METHOD_STYLE = {
  Efectivo:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  Transferencia: 'bg-blue-50 text-blue-700 border-blue-100',
  Tarjeta:       'bg-purple-50 text-purple-700 border-purple-100',
  Otro:          'bg-slate-50 text-slate-600 border-slate-100',
}
const METHOD_CARD_STYLE = {
  Efectivo:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'text-emerald-500' },
  Transferencia: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    icon: 'text-blue-400'    },
  Tarjeta:       { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100',  icon: 'text-purple-400'  },
  Otro:          { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-100',   icon: 'text-slate-400'   },
}
const EXPENSE_CATEGORIES = ['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro']

// ─── WhatsApp Export ─────────────────────────────────────────────────────────

const generateWhatsAppText = ({ date, summary, byMethod, session, expenses }) => {
  const dateLabel = date === today() ? 'Hoy' : fmtDateShort(date)
  const efectivo = byMethod['Efectivo']?.total ?? 0
  const transferencia = byMethod['Transferencia']?.total ?? 0
  const tarjeta = byMethod['Tarjeta']?.total ?? 0
  const digital = transferencia + tarjeta
  const gastos = summary?.totalExpenses ?? 0
  const neto = (summary?.totalIncome ?? 0) - gastos

  let arqueoLine = ''
  if (session?.status === 'closed' && session?.difference != null) {
    const diff = session.difference
    const sign = diff >= 0 ? '🟢 Sobrante' : '🔴 Faltante'
    arqueoLine = `\n📋 *Arqueo*: ${sign} ${fmt(Math.abs(diff))}`
  }

  return [
    `📊 *Cierre de Caja — ${dateLabel}*`,
    ``,
    `💰 Ingresos: ${fmt(summary?.totalIncome ?? 0)}`,
    `💸 Gastos:   ${fmt(gastos)}`,
    `✅ Neto Real: ${fmt(neto)}`,
    ``,
    `💵 Efectivo disponible: ${fmt(efectivo)}`,
    `💳 Total digital: ${fmt(digital)}`,
    transferencia ? `  ↳ Transferencia: ${fmt(transferencia)}` : null,
    tarjeta       ? `  ↳ Tarjeta: ${fmt(tarjeta)}` : null,
    arqueoLine || null,
    ``,
    `_Generado con TurnoYa · ${new Date().toLocaleString('es-AR')}_`,
  ].filter(l => l !== null).join('\n')
}

// ─── Print Report ────────────────────────────────────────────────────────────

const printReport = ({ sales, summary, byMethod, date, businessName, session, expenses, professionals, commissionRate }) => {
  const dateLabel = date === today() ? 'Hoy' : fmtDate(date)
  const efectivoTotal   = byMethod['Efectivo']?.total ?? 0
  const transTotal      = byMethod['Transferencia']?.total ?? 0
  const tarjetaTotal    = byMethod['Tarjeta']?.total ?? 0
  const digitalTotal    = transTotal + tarjetaTotal
  const expectedCash    = session?.expected_cash ?? (session?.initial_amount ?? 0)

  const salesRows = sales.map(s => `
    <tr>
      <td>${fmtTime(s.created_at)}</td>
      <td>${s.client_name || '—'}</td>
      <td>${s.professional_name || '—'}</td>
      <td>${s.payment_method}</td>
      <td style="text-align:right;font-weight:600">${fmt(s.amount)}</td>
    </tr>`).join('')

  const profRows = professionals.map(p => `
    <tr>
      <td>${p.name}</td>
      <td style="text-align:right">${fmt(p.total)}</td>
      <td style="text-align:right">${commissionRate}%</td>
      <td style="text-align:right;font-weight:600;color:#1d4ed8">${fmt(p.total * commissionRate / 100)}</td>
    </tr>`).join('')

  let arqueoHtml = ''
  if (session?.status === 'closed' && session?.difference != null) {
    const diff = session.difference
    const diffColor = diff >= 0 ? '#059669' : '#dc2626'
    const diffLabel = diff >= 0 ? 'Sobrante' : 'Faltante'
    arqueoHtml = `
      <h2 style="margin:24px 0 8px">Arqueo de Caja</h2>
      <table>
        <tr><td>Monto Inicial</td><td style="text-align:right">${fmt(session.initial_amount)}</td></tr>
        <tr><td>+ Ventas Efectivo</td><td style="text-align:right">${fmt(session.cash_sales ?? efectivoTotal)}</td></tr>
        <tr><td>− Gastos Efectivo</td><td style="text-align:right">${fmt(session.cash_expenses ?? 0)}</td></tr>
        <tr style="font-weight:700"><td>Efectivo Esperado</td><td style="text-align:right">${fmt(expectedCash)}</td></tr>
        <tr><td>Efectivo Contado</td><td style="text-align:right">${fmt(session.counted_amount)}</td></tr>
        <tr style="font-weight:700;color:${diffColor}"><td>${diffLabel}</td><td style="text-align:right">${fmt(Math.abs(diff))}</td></tr>
      </table>`
  }

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
    <title>Reporte de Caja — ${dateLabel}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0 }
      body { font-family:system-ui,sans-serif; color:#111; padding:32px; font-size:13px }
      h1 { font-size:20px; margin-bottom:4px } h2 { font-size:15px; color:#444 }
      .sub { color:#555; margin-bottom:20px; font-size:12px }
      .summary { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap }
      .card { flex:1; min-width:120px; border:1px solid #eee; border-radius:8px; padding:12px }
      .card-label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#777; margin-bottom:4px }
      .card-amount { font-size:17px; font-weight:700 }
      .green { color:#059669 } .red { color:#dc2626 } .blue { color:#1d4ed8 }
      table { width:100%; border-collapse:collapse; margin-bottom:20px }
      th { text-align:left; padding:8px 10px; border-bottom:2px solid #ddd; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#666 }
      td { padding:8px 10px; border-bottom:1px solid #eee }
      tr:last-child td { border-bottom:none }
      .footer { margin-top:32px; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:12px }
      @media print { button { display:none } }
    </style></head><body>
    <h1>${businessName || 'TurnoYa'} — Reporte de Caja</h1>
    <p class="sub">Período: ${dateLabel} &nbsp;·&nbsp; Generado: ${new Date().toLocaleString('es-AR')}</p>
    <div class="summary">
      <div class="card"><div class="card-label">Ingresos</div><div class="card-amount green">${fmt(summary?.totalIncome || 0)}</div></div>
      <div class="card"><div class="card-label">Gastos</div><div class="card-amount red">${fmt(summary?.totalExpenses || 0)}</div></div>
      <div class="card"><div class="card-label">Neto Real</div><div class="card-amount">${fmt(summary?.netBalance || 0)}</div></div>
      <div class="card"><div class="card-label">Efectivo Cajón</div><div class="card-amount">${fmt(efectivoTotal)}</div></div>
      <div class="card"><div class="card-label">Total Digital</div><div class="card-amount blue">${fmt(digitalTotal)}</div></div>
    </div>
    ${arqueoHtml}
    <h2 style="margin:24px 0 8px">Ventas del día</h2>
    <table>
      <thead><tr><th>Hora</th><th>Cliente</th><th>Profesional</th><th>Método</th><th style="text-align:right">Monto</th></tr></thead>
      <tbody>${salesRows || '<tr><td colspan="5" style="color:#999;text-align:center;padding:16px">Sin ventas</td></tr>'}</tbody>
    </table>
    ${professionals.length > 0 ? `
    <h2 style="margin:24px 0 8px">Comisiones estimadas (${commissionRate}%)</h2>
    <table>
      <thead><tr><th>Profesional</th><th style="text-align:right">Facturado</th><th style="text-align:right">%</th><th style="text-align:right">Comisión</th></tr></thead>
      <tbody>${profRows}</tbody>
    </table>` : ''}
    <div class="footer">TurnoYa · Reporte generado automáticamente · ${new Date().toLocaleDateString('es-AR')}</div>
    </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// ─── Apertura de Caja ────────────────────────────────────────────────────────

function AperturaBanner({ onOpen, loading: parentLoading }) {
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleOpen = async () => {
    const v = parseFloat(amount)
    if (isNaN(v) || v < 0) return toast.error('Ingresá un monto válido (puede ser 0)')
    setSaving(true)
    try {
      await onOpen(v)
      setOpen(false)
      setAmount('')
    } catch {
      // error ya manejado por padre
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/30 p-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Unlock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Caja cerrada hoy</p>
            <p className="text-xs text-amber-600/70 capitalize">Iniciá el fondo de apertura para comenzar el arqueo automático.</p>
          </div>
        </div>
        {open ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 text-xs font-bold">$</span>
              <input
                type="number"
                placeholder="Fondo inicial"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-32 h-9 rounded-lg border border-amber-200 bg-white pl-6 pr-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <Button onClick={handleOpen} disabled={saving} className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold">
              {saving ? '...' : 'Abrir'}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-400" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="h-9 px-4 rounded-lg border-amber-200 text-amber-600 bg-white font-bold text-xs"
          >
            Configurar Apertura
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Cierre de Caja Modal ────────────────────────────────────────────────────

function CierreCajaModal({ session, onClose, onClosed }) {
  const expectedCash   = session?.expected_cash   ?? 0
  const initialAmount  = session?.initial_amount  ?? 0
  const cashSales      = session?.cash_sales      ?? 0
  const cashExpenses   = session?.cash_expenses   ?? 0

  const [counted, setCounted] = useState('')
  const [preview, setPreview] = useState(null)
  const [saving, setSaving]   = useState(false)

  // Preview local (antes de confirmar)
  const calcularPreview = () => {
    const v = parseFloat(counted)
    if (isNaN(v) || v < 0) return toast.error('Ingresá un monto válido')
    setPreview({ counted: v, difference: v - expectedCash })
  }

  const confirmar = async () => {
    if (!preview) return
    setSaving(true)
    try {
      const { data } = await closeCashSession(preview.counted)
      toast.success('Caja cerrada correctamente')
      onClosed(data.session)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al cerrar la caja')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Cerrar Caja</h2>
          </div>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Cálculo esperado (calculado en el servidor) */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-slate-500">Monto Inicial</span>
              <span className="font-semibold text-slate-800">{fmt(initialAmount)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-slate-500">+ Ventas en Efectivo</span>
              <span className="font-semibold text-emerald-700">{fmt(cashSales)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-slate-500">− Gastos en Efectivo</span>
              <span className="font-semibold text-red-600">{fmt(cashExpenses)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 bg-slate-100 rounded-b-xl">
              <span className="font-bold text-slate-900">Efectivo Esperado</span>
              <span className="font-extrabold text-slate-900 text-base">{fmt(expectedCash)}</span>
            </div>
          </div>

          {/* Nota de precisión */}
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 -mt-1">
            <Cloud className="w-3 h-3 shrink-0" />
            Calculado desde la apertura · {fmtTime(session?.opened_at)} hs
          </p>

          {/* Input conteo */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Efectivo contado en caja
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="0,00"
                value={counted}
                onChange={e => { setCounted(e.target.value); setPreview(null) }}
                onKeyDown={e => e.key === 'Enter' && !saving && calcularPreview()}
                autoFocus
                disabled={saving}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Resultado */}
          {preview && (
            <div className={`rounded-xl border-2 p-4 flex items-center gap-3 ${preview.difference >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              {preview.difference >= 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              }
              <div>
                <p className={`text-sm font-bold ${preview.difference >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                  {preview.difference >= 0 ? 'Sobrante' : 'Faltante'}:{' '}
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Math.abs(preview.difference))}
                </p>
                <p className={`text-xs mt-0.5 ${preview.difference >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {preview.difference === 0 ? 'Caja cuadrada perfectamente.' :
                    preview.difference > 0 ? 'Hay más dinero del esperado.' : 'Falta dinero respecto al esperado.'}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            {!preview ? (
              <>
                <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600" onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button className="flex-1 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={calcularPreview} disabled={saving}>Calcular</Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600" onClick={() => setPreview(null)} disabled={saving}>Recalcular</Button>
                <Button className="flex-1 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={confirmar} disabled={saving}>
                  {saving ? 'Cerrando…' : 'Confirmar Cierre'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sesión Cerrada — Banner de Arqueo ────────────────────────────────────────

function ArqueoBanner({ session }) {
  if (!session || session.status !== 'closed' || session.difference == null) return null

  const diff = session.difference
  const isPositive = diff >= 0
  const fmtDiff = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Math.abs(diff))

  return (
    <div className={`mb-6 rounded-2xl border ${isPositive ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'} p-4 animate-in zoom-in-95 duration-500`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-sm font-bold ${isPositive ? 'text-emerald-900' : 'text-red-900'}`}>Arqueo de Caja Finalizado</p>
            <p className="text-xs text-slate-500">Sesión cerrada a las {fmtTime(session.closed_at)} hs</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Esperado</p>
             <p className="text-sm font-bold text-slate-700">{fmt(session.expected_cash)}</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Contado</p>
             <p className="text-sm font-bold text-slate-700">{fmt(session.counted_amount)}</p>
           </div>
           <div className={`px-3 py-1.5 rounded-xl border ${isPositive ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-600 text-white border-red-700'}`}>
             <p className="text-[9px] uppercase font-black tracking-widest opacity-80 leading-none mb-0.5">{isPositive ? 'Sobrante' : 'Faltante'}</p>
             <p className="text-sm font-black tabular-nums leading-none">{isPositive ? '+' : '-'}{fmtDiff}</p>
           </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sale Detail Drawer ───────────────────────────────────────────────────────

function SaleDetailDrawer({ sale, onClose }) {
  const [appt, setAppt] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sale?.appointment_id) return
    setLoading(true)
    getAppointment(sale.appointment_id)
      .then(res => setAppt(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sale?.appointment_id])

  if (!sale) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-sm font-bold text-white">
              {(sale.client_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{sale.client_name || 'Cliente'}</p>
              <p className="text-xs text-slate-400">{fmtTime(sale.created_at)} hs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cobro */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Cobro registrado</p>
            <p className="text-3xl font-extrabold text-white tabular-nums">{fmt(sale.amount)}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge className={`text-[10px] font-semibold border px-2 py-0.5 flex items-center gap-1 ${METHOD_STYLE[sale.payment_method] || METHOD_STYLE['Otro']}`} variant="outline">
                {METHOD_ICON[sale.payment_method] || METHOD_ICON['Otro']}
                {sale.payment_method}
              </Badge>
              {sale.professional_name && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" />{sale.professional_name}
                </span>
              )}
            </div>
          </div>

          {/* Turno asociado */}
          {sale.appointment_id && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Turno asociado</p>
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : appt ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                  {appt.service_name && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Servicio</p>
                        <p className="text-sm font-semibold text-slate-800">{appt.service_name}</p>
                      </div>
                    </div>
                  )}
                  {(appt.client_name || appt.client_phone) && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Cliente</p>
                        <p className="text-sm font-semibold text-slate-800">{appt.client_name || appt.client_phone}</p>
                      </div>
                    </div>
                  )}
                  {appt.client_phone && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Teléfono</p>
                        <a
                          href={`https://wa.me/${appt.client_phone.replace(/\D/g, '')}`}
                          target="_blank" rel="noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {appt.client_phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {(appt.start_time || appt.date) && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Horario</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {appt.date ? fmtDateShort(appt.date) : ''} {appt.start_time ? `· ${appt.start_time.slice(0,5)} hs` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  {appt.notes && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-400">Notas</p>
                        <p className="text-sm text-slate-700">{appt.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4 rounded-xl bg-slate-50 border border-slate-100">
                  No se pudo cargar el detalle del turno.
                </p>
              )}
            </div>
          )}

          {!sale.appointment_id && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-xs text-slate-400 text-center">
              Esta venta no tiene un turno vinculado.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Expense Modal ────────────────────────────────────────────────────────────

function ExpenseModal({ onClose, onSaved, sessionLocked }) {
  const [form, setForm] = useState({ description: '', amount: '', category: 'General', created_at: today() })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!form.description.trim()) return toast.error('Ingresá una descripción')
    if (isNaN(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0')
    setSaving(true)
    try {
      await postExpense({ description: form.description.trim(), amount: amt, category: form.category, created_at: form.created_at ? form.created_at + 'T12:00:00' : undefined })
      toast.success('Gasto registrado')
      onSaved(); onClose()
    } catch { toast.error('Error al registrar el gasto') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Registrar Gasto</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sessionLocked && (
          <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            La caja está cerrada. El gasto se registrará fuera del período de la sesión.
          </div>
        )}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descripción *</label>
            <input type="text" placeholder="Ej: Compra de insumos…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                <input type="number" min="0" step="0.01" placeholder="0,00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-7 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha</label>
              <input type="date" max={today()} value={form.created_at}
                onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              {saving ? 'Guardando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({ label, amount, color, icon: Icon, hidden, subtitle }) {
  const colors = {
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500', label: 'text-emerald-600' },
    red:    { bg: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-700',     icon: 'text-red-400',     label: 'text-red-500'   },
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-100',    text: 'text-blue-700',    icon: 'text-blue-400',    label: 'text-blue-600'  },
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   icon: 'text-amber-500',   label: 'text-amber-600' },
    slate:  { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-800',   icon: 'text-slate-400',   label: 'text-slate-500' },
    purple: { bg: 'bg-purple-50',  border: 'border-purple-100',  text: 'text-purple-700',  icon: 'text-purple-400',  label: 'text-purple-600'},
    deepBlue: { bg: 'bg-white', border: 'border-slate-200', text: 'text-[#1e3a8a]', icon: 'text-[#1e1b4b]', label: 'text-slate-500' },
  }
  const c = colors[color] || colors.slate
  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${c.label}`}>{label}</span>
      </div>
      <span className={`text-xl font-extrabold tabular-nums transition-all ${c.text} ${hidden ? 'blur-sm select-none' : ''}`}>
        {hidden ? '$ •••••' : fmt(amount)}
      </span>
      {subtitle && <span className="text-[11px] text-slate-400 mt-0.5">{subtitle}</span>}
    </div>
  )
}

// ─── Profesionales + Comisiones ──────────────────────────────────────────────

function ProfesionalesSection({ professionals, hidden, defaultRate }) {
  const [collapsed, setCollapsed] = useState(false)
  const [rates, setRates] = useState(() => {
    const r = {}
    professionals.forEach(p => {
      const stored = localStorage.getItem(COMMISSION_RATE_KEY(p.name))
      r[p.name] = stored !== null ? parseFloat(stored) : defaultRate
    })
    return r
  })

  const updateRate = (name, val) => {
    const v = Math.min(100, Math.max(0, parseFloat(val) || 0))
    setRates(r => ({ ...r, [name]: v }))
    localStorage.setItem(COMMISSION_RATE_KEY(name), v)
  }

  if (professionals.length === 0) return null

  return (
    <Card className="shadow-sm border-slate-100 mt-4">
      <CardHeader className="pb-2 border-b border-slate-100">
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setCollapsed(c => !c)}
        >
          <CardTitle className="text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Resumen por profesional · Comisiones
          </CardTitle>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-3 pb-4">
          <div className="space-y-3">
            {professionals.map(p => {
              const rate = rates[p.name] ?? defaultRate
              const commission = p.total * rate / 100
              return (
                <div key={p.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400">({p.count} cobro{p.count !== 1 ? 's' : ''})</span>
                    </div>
                    <span className={`text-sm font-bold text-slate-900 ${hidden ? 'blur-sm select-none' : ''}`}>
                      {hidden ? '•••' : fmt(p.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 shrink-0">Comisión</span>
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="range" min="0" max="100" step="5"
                        value={rate}
                        onChange={e => updateRate(p.name, e.target.value)}
                        className="flex-1 accent-slate-900 h-1.5"
                      />
                      <span className="text-xs font-bold text-slate-700 w-8 text-right">{rate}%</span>
                    </div>
                    <span className={`text-sm font-bold text-blue-700 w-20 text-right tabular-nums ${hidden ? 'blur-sm select-none' : ''}`}>
                      {hidden ? '•••' : fmt(commission)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1">
            <Info className="w-3 h-3" />
            Preview estimativo — configurable en Ajustes en una próxima versión
          </p>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Expenses List ────────────────────────────────────────────────────────────

function ExpensesList({ date, hidden, display, onDelete, deletingId, sessionLocked }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExp = async () => {
      setLoading(true)
      try {
        const { data } = await getExpenses({ date })
        setExpenses(data.expenses || [])
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchExp()
  }, [date])

  if (loading) return <div className="py-4 animate-pulse h-10 bg-slate-50 rounded-xl" />
  if (expenses.length === 0)
    return <p className="py-4 text-xs text-slate-400 text-center">Los totales se muestran en las tarjetas de resumen.</p>

  return (
    <div className="divide-y divide-slate-50">
      {expenses.map(exp => (
        <div key={exp.id} className="py-3 flex items-center gap-3 group hover:bg-slate-50/60 -mx-6 px-6 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{exp.description}</p>
            <p className="text-xs text-slate-400">{exp.category} · {new Date(exp.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</p>
          </div>
          <span className={`text-sm font-bold text-red-600 tabular-nums ${hidden ? 'blur-sm select-none' : ''}`}>
            -{display(exp.amount)}
          </span>
          {!sessionLocked && (
            <button onClick={() => onDelete(exp.id)} disabled={deletingId === exp.id}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {sessionLocked && (
            <Lock className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function CajaPage() {
  const [date, setDate]               = useState(today())
  const [sales, setSales]             = useState([])
  const [total, setTotal]             = useState(0)
  const [count, setCount]             = useState(0)
  const [summary, setSummary]         = useState(null)
  const [expenses, setExpenses]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [hidden, setHidden]           = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCierreModal, setShowCierreModal]   = useState(false)
  const [drawerSale, setDrawerSale]   = useState(null)
  const [deletingId, setDeletingId]   = useState(null)
  const [filterProfessional, setFilterProfessional] = useState('all')

  // ── Sesión de caja (desde DB) ────────────────────────────────────────────
  const [session, setSession]         = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const business = useMemo(() => JSON.parse(localStorage.getItem('business') || '{}'), [])

  const isToday = date === today()

  // ── Fetch sesión ─────────────────────────────────────────────────────────
  const fetchSession = useCallback(async (forDate) => {
    setSessionLoading(true)
    try {
      const { data } = await getCashSession(forDate)
      setSession(data.session)
    } catch {
      setSession(null)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  // Al cambiar de fecha, recargar sesión
  useEffect(() => {
    fetchSession(date)
  }, [date, fetchSession])

  // ── Handlers de sesión ───────────────────────────────────────────────────
  const handleOpenCaja = useCallback(async (initialAmount) => {
    try {
      const { data } = await openCashSession(initialAmount)
      setSession(data.session)
      toast.success('¡Caja abierta!')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al abrir la caja'
      toast.error(msg)
      throw err
    }
  }, [])

  const handleClosed = useCallback((newSession) => {
    setSession(newSession)
  }, [])

  // ── Fetch datos financieros ──────────────────────────────────────────────
  const fetchAll = useCallback(async (d) => {
    setLoading(true)
    try {
      const [salesRes, summaryRes, expRes] = await Promise.all([
        getSales(d),
        getFinancesSummary({ date: d }),
        getExpenses({ date: d }),
      ])
      setSales(salesRes.data.sales || [])
      setTotal(salesRes.data.total || 0)
      setCount(salesRes.data.count || 0)
      setSummary(summaryRes.data)
      setExpenses(expRes.data.expenses || [])
    } catch { toast.error('Error al cargar los datos de caja') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll(date) }, [date, fetchAll])

  // Re-fetch al recuperar el foco (para "Actualización Instantánea" al volver de otras páginas/pestañas)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading && !sessionLoading) {
        fetchAll(date)
        fetchSession(date)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [date, fetchAll, fetchSession, loading, sessionLoading])

  // ── Derivados ─────────────────────────────────────────────────────────────

  const professionals = useMemo(() => {
    const map = {}
    sales.forEach(s => {
      if (!s.professional_name) return
      if (!map[s.professional_name]) map[s.professional_name] = { name: s.professional_name, total: 0, count: 0 }
      map[s.professional_name].total += parseFloat(s.amount || 0)
      map[s.professional_name].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [sales])

  const filteredSales = useMemo(() =>
    filterProfessional === 'all' ? sales : sales.filter(s => s.professional_name === filterProfessional),
    [sales, filterProfessional])

  const filteredTotal = useMemo(
    () => filteredSales.reduce((acc, s) => acc + parseFloat(s.amount || 0), 0),
    [filteredSales])

  const filteredCount = filteredSales.length

  const byMethodFiltered = useMemo(() => {
    const acc = {}
    filteredSales.forEach(s => {
      const m = s.payment_method || 'Otro'
      if (!acc[m]) acc[m] = { count: 0, total: 0 }
      acc[m].count++
      acc[m].total += parseFloat(s.amount || 0)
    })
    return acc
  }, [filteredSales])

  // Efectivo disponible: usa datos del servidor si hay sesión activa
  const efectivoDisponible = useMemo(() => {
    if (session?.status === 'open') {
      // Usa stats calculadas en tiempo real por el servidor
      return session.expected_cash ?? 0
    }
    // Fallback: cálculo local por día
    const ventasEfectivo = byMethodFiltered['Efectivo']?.total ?? 0
    const gastosEfectivo = expenses.reduce((a, e) => a + parseFloat(e.amount || 0), 0)
    return ventasEfectivo - gastosEfectivo
  }, [session, byMethodFiltered, expenses])

  const totalDigital = useMemo(() =>
    (byMethodFiltered['Transferencia']?.total ?? 0) + (byMethodFiltered['Tarjeta']?.total ?? 0),
    [byMethodFiltered])

  const displayNetBalance = useMemo(() => {
    if (filterProfessional === 'all') return summary?.netBalance ?? 0
    return filteredTotal - (summary?.totalExpenses ?? 0)
  }, [filterProfessional, filteredTotal, summary])

  const netColor = displayNetBalance >= 0 ? 'green' : 'red'

  // La sesión está cerrada y bloquea edición
  const sessionLocked = session?.status === 'closed'

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDeleteExpense = async (id) => {
    if (sessionLocked) return toast.error('La caja está cerrada. No se pueden eliminar gastos del período.')
    if (!window.confirm('¿Eliminar este gasto?')) return
    setDeletingId(id)
    try {
      await deleteExpense(id)
      toast.success('Gasto eliminado')
      await fetchAll(date)
    } catch { toast.error('Error al eliminar el gasto') }
    finally { setDeletingId(null) }
  }

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppText({
      date, summary, byMethod: byMethodFiltered, session, expenses,
    })
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Resumen copiado al portapapeles'))
      .catch(() => toast.error('No se pudo copiar el resumen'))
  }

  const display = (amount) => hidden ? '$ •••••' : fmt(amount)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* ── MODALES ── */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSaved={async () => {
             await fetchAll(date)
             if (isToday) await fetchSession(date)
          }}
          sessionLocked={sessionLocked}
        />
      )}
      {showCierreModal && session && (
        <CierreCajaModal
          session={session}
          onClose={() => setShowCierreModal(false)}
          onClosed={handleClosed}
        />
      )}
      {drawerSale && (
        <SaleDetailDrawer sale={drawerSale} onClose={() => setDrawerSale(null)} />
      )}

      {/* ── HEADER ── */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isToday ? 'Gestión financiera del día' : fmtDate(date)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cierre de caja — solo si hay sesión abierta */}
            {session?.status === 'open' && (
              <Button
                onClick={() => setShowCierreModal(true)}
                className="h-10 gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </Button>
            )}
            <Button
              onClick={() => setShowExpenseModal(true)}
              className="h-10 gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm"
            >
              <TrendingDown className="w-4 h-4" />
              Gasto
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-xl"
              onClick={handleShareWhatsApp}
              title="Copiar resumen para WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-xl"
              onClick={() => printReport({
                sales: filteredSales, summary, byMethod: byMethodFiltered,
                date, businessName: business.name, session, expenses,
                professionals, commissionRate: 30,
              })}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── APERTURA DE CAJA (si no hay sesión hoy y no está cargando) ── */}
      {isToday && !session && !sessionLoading && !loading && (
        <AperturaBanner onOpen={handleOpenCaja} loading={sessionLoading} />
      )}

      {/* ── SESIÓN ABIERTA INFO ── */}
      {session?.status === 'open' && (
        <div className="mb-4 rounded-2xl bg-white border border-slate-100 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
               <Unlock className="w-5 h-5 text-emerald-600" />
             </div>
             <div>
               <p className="text-sm font-bold text-slate-800">Caja abierta multidispositivo</p>
               <p className="text-xs text-slate-500">
                 Apertura: {fmtTime(session.opened_at)} hs · Fondo: <strong>{fmt(session.initial_amount)}</strong>
               </p>
             </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Respaldo en la Nube Activado ☁️</span>
          </div>
        </div>
      )}

      {/* ── ARQUEO DE CAJA — Banner de sesión cerrada ── */}
      <ArqueoBanner session={session} />

      {/* ── SECCIÓN DE FONDOS (TOP) ── */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <SummaryCard
            label="Efectivo en Cajón"
            amount={efectivoDisponible}
            color="amber" icon={Wallet} hidden={hidden}
            subtitle={session?.status === 'open' ? "Calculado vs. Inicial" : "Arqueo esperado"}
          />
          <SummaryCard
            label="Total Digital"
            amount={totalDigital}
            color="purple" icon={CreditCard} hidden={hidden}
            subtitle="Banco / MP / Tarjeta"
          />
        </div>
      )}

      {/* ── TOTALIZADOR PRINCIPAL (CLEAN WHITE) ── */}
      {!loading && (
        <Card className="mb-6 shadow-sm border-slate-100 overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Balance Neto del Período</p>
              <div className="flex items-center gap-4">
                <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-[#1e3a8a] ${hidden ? 'blur-md select-none opacity-20' : ''}`}>
                  {display(displayNetBalance)}
                </span>
                <button
                  onClick={() => setHidden(h => !h)}
                  className="text-slate-300 hover:text-slate-500 transition-colors p-1"
                >
                  {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className={displayNetBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {displayNetBalance >= 0 ? '+' : ''}{display(displayNetBalance)} final
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">{filteredCount} transacciones</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {Object.entries(byMethodFiltered).map(([method, { total: t }]) => (
                <div key={method} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-slate-400">{METHOD_ICON[method] || METHOD_ICON['Otro']}</span>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{method}</p>
                    <p className={`text-xs font-bold text-slate-700 leading-tight ${hidden ? 'blur-sm' : ''}`}>{hidden ? '•••' : fmt(t)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── NAVEGACIÓN MINIMALISTA (DATE PILL) ── */}
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="bg-white border border-slate-200 rounded-full px-2 py-1.5 flex items-center gap-1 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50"
            onClick={() => setDate(d => addDays(d, -1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <div className="px-2 relative">
             <input type="date" value={date} max={today()}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer w-full" />
             <span className="text-xs font-bold text-slate-700 pointer-events-none flex items-center gap-2">
               {isToday ? 'Hoy' : fmtDateShort(date)}
               <ChevronDown className="w-3 h-3 text-slate-400" />
             </span>
          </div>
          <Button variant="ghost" size="icon" disabled={isToday}
            className="h-8 w-8 rounded-full hover:bg-slate-50 disabled:opacity-20"
            onClick={() => setDate(d => addDays(d, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {professionals.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 h-10">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select value={filterProfessional} onChange={e => setFilterProfessional(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer">
              <option value="all">Todos los profesionales</option>
              {professionals.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── SALES LIST ── */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {filterProfessional !== 'all'
              ? `Cobros de ${filterProfessional} — ${isToday ? 'hoy' : fmtDate(date)}`
              : isToday ? 'Ventas de hoy' : `Ventas del ${fmtDate(date)}`
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-0">
          {loading ? (
            <div className="space-y-3 py-3">
              {[1,2,3].map(i => (
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
          ) : filteredSales.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <TrendingUp className="w-8 h-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                {filterProfessional !== 'all'
                  ? `${filterProfessional} no tiene cobros para esta fecha`
                  : isToday ? 'Todavía no registraste cobros hoy' : 'Sin ventas para esta fecha'
                }
              </p>
              {isToday && filterProfessional === 'all' && (
                <p className="text-xs text-slate-400">Finalizá un turno para que aparezca acá.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredSales.map(sale => (
                <button
                  key={sale.id}
                  onClick={() => setDrawerSale(sale)}
                  className="w-full py-3.5 flex items-center gap-4 group hover:bg-slate-50/80 -mx-6 px-6 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0 shadow-sm">
                    {(sale.client_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{sale.client_name || 'Cliente'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">{fmtTime(sale.created_at)} hs</span>
                      {sale.professional_name && <span className="text-xs text-slate-400">· {sale.professional_name}</span>}
                      {sale.phone && <span className="text-xs text-slate-400 truncate">· {sale.phone}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-sm font-bold text-slate-900 tabular-nums transition-all ${hidden ? 'blur-sm select-none' : ''}`}>
                      {display(sale.amount)}
                    </span>
                    <Badge
                      className={`text-[10px] font-semibold border px-2 py-0.5 flex items-center gap-1 ${METHOD_STYLE[sale.payment_method] || METHOD_STYLE['Otro']}`}
                      variant="outline"
                    >
                      {METHOD_ICON[sale.payment_method] || METHOD_ICON['Otro']}
                      {sale.payment_method}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && filteredSales.length > 0 && (
            <div className="flex justify-between items-center py-4 mt-1 border-t border-slate-100 bg-slate-50/50 -mx-6 px-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {filterProfessional !== 'all' ? `Total — ${filterProfessional}` : 'Total del período'}
              </span>
              <span className={`text-lg font-extrabold text-slate-900 tabular-nums ${hidden ? 'blur-sm select-none' : ''}`}>
                {display(filteredTotal)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── GASTOS DEL DÍA ── */}
      {!loading && summary && summary.expensesCount > 0 && (
        <Card className="shadow-sm border-slate-100 mt-4">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm uppercase tracking-wide text-slate-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Gastos del día
              {sessionLocked && <Lock className="w-3.5 h-3.5 text-slate-300 ml-auto" title="Período cerrado — solo lectura" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-0">
            <ExpensesList
              date={date}
              hidden={hidden}
              display={display}
              onDelete={handleDeleteExpense}
              deletingId={deletingId}
              sessionLocked={sessionLocked}
            />
          </CardContent>
        </Card>
      )}

      {/* ── CTA primero gasto ── */}
      {!loading && summary && summary.expensesCount === 0 && (
        <button
          onClick={() => setShowExpenseModal(true)}
          className="mt-3 w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Registrar el primer gasto del día
        </button>
      )}

      {/* ── COMISIONES POR PROFESIONAL ── */}
      {!loading && (
        <ProfesionalesSection
          professionals={professionals}
          hidden={hidden}
          defaultRate={30}
        />
      )}

      {/* ── FOOTER ── */}
      <div className="mt-6 mb-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Cloud className="w-3 h-3" />
        Sesión de caja sincronizada en la nube · multidispositivo
      </div>
    </Layout>
  )
}
