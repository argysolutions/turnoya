import { useState, useEffect, useMemo, useCallback } from 'react'
import Layout from '@/components/shared/Layout'
import {
  getSales, postExpense, deleteExpense, getFinancesSummary, getExpenses,
  getCashSession, openCashSession, closeCashSession,
} from '@/api/sales'
import { getSettings } from '@/api/business'
import { getAppointment } from '@/api/appointments'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"
import DateStrip from '@/components/ui/date-strip'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Printer, TrendingUp, TrendingDown,
  CreditCard, Wallet, ArrowLeftRight, HelpCircle, Eye, EyeOff,
  PlusCircle, Trash2, X, User, Lock, Unlock,
  Share2, ChevronDown, ChevronUp, Scissors, Phone, Clock,
  AlertTriangle, CheckCircle2, Info, Cloud, CalendarDays as CalendarIcon,
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

const METHOD_ICON = {
  Efectivo:      <Wallet className="w-3.5 h-3.5" />,
  Transferencia: <ArrowLeftRight className="w-3.5 h-3.5" />,
  Tarjeta:       <CreditCard className="w-3.5 h-3.5" />,
  Otro:          <HelpCircle className="w-3.5 h-3.5" />,
}
const METHOD_STYLE = {
  Efectivo:      'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  Transferencia: 'bg-blue-50 text-blue-700 border-blue-100/50',
  Tarjeta:       'bg-purple-50 text-purple-700 border-purple-100/50',
  Otro:          'bg-slate-50 text-slate-600 border-slate-100/50',
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

function ExpenseModal({ onClose, onSaved, sessionLocked, categories: CUSTOM_CATEGORIES }) {
  const categories = CUSTOM_CATEGORIES?.length > 0 ? CUSTOM_CATEGORIES : EXPENSE_CATEGORIES
  const [form, setForm] = useState({ description: '', amount: '', category: categories[0] || 'General', created_at: today() })
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
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
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

function SummaryCard({ label, amount, color, icon: Icon, display, subtitle, onClick }) {
  const colors = {
    green:    { bg: 'bg-white', border: 'border-slate-100', text: 'text-emerald-600', icon: 'text-emerald-300', label: 'text-slate-400' },
    red:      { bg: 'bg-white', border: 'border-slate-100', text: 'text-red-500',     icon: 'text-red-300',     label: 'text-slate-400' },
    blue:     { bg: 'bg-white', border: 'border-slate-100', text: 'text-blue-600',    icon: 'text-blue-300',    label: 'text-slate-400' },
    amber:    { bg: 'bg-white', border: 'border-slate-100', text: 'text-amber-600',   icon: 'text-amber-300',   label: 'text-slate-400' },
    slate:    { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-400',   icon: 'text-slate-300',   label: 'text-slate-400' },
    purple:   { bg: 'bg-white', border: 'border-slate-100', text: 'text-purple-600',  icon: 'text-purple-300',  label: 'text-slate-400' },
    deepBlue: { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-900',   icon: 'text-slate-300',  label: 'text-slate-400' },
  }
  const c = colors[color] || colors.slate
  return (
    <motion.button
      whileHover={{ scale: 0.995, borderColor: '#e2e8f0' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl border ${c.bg} ${c.border} p-5 flex flex-col gap-1 transition-all group overflow-hidden`}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${c.label} mb-1`}>{label}</span>
          <div className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 leading-none">
            {display(amount)}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full border border-slate-50 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      {subtitle && <div className="text-[10px] text-slate-400 font-bold leading-none mt-3 opacity-60 uppercase tracking-widest">{subtitle}</div>}
      
      {/* Ghost Detail Indicator */}
      <div className="absolute bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 text-[8px] font-black text-slate-300 uppercase tracking-tighter">
          Ver Detalle <ChevronRight className="w-2.5 h-2.5" />
        </div>
      </div>
    </motion.button>
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
    return <p className="py-4 text-xs text-slate-400 text-center">Sin egresos registrados para este período.</p>

  return (
    <div className="divide-y divide-slate-50">
      {expenses.map(exp => (
        <div key={exp.id} className="py-3 flex items-center gap-3 group hover:bg-slate-50/60 transition-colors">
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
  const [hidden, setHidden]           = useState(() => {
    return localStorage.getItem('turno_ya_privacy_mode') === 'true'
  })

  // Persistir estado de privacidad
  useEffect(() => {
    localStorage.setItem('turno_ya_privacy_mode', hidden)
  }, [hidden])

  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCierreModal, setShowCierreModal]   = useState(false)
  const [drawerSale, setDrawerSale]   = useState(null)
  const [deletingId, setDeletingId]   = useState(null)
  const [filterProfessional, setFilterProfessional] = useState('all')

  const [session, setSession]         = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [calendarDate, setCalendarDate]   = useState(new Date())
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)

  // States para Revelación Progresiva
  const [showSalesDrawer, setShowSalesDrawer]       = useState(false)
  const [showExpensesDrawer, setShowExpensesDrawer] = useState(false)
  const [showStaffDrawer, setShowStaffDrawer]       = useState(false)
  const [showSessionDrawer, setShowSessionDrawer]   = useState(false)

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

  const handleDateSelect = (d) => {
    if (!d) return
    const dStr = d.toISOString().split('T')[0]
    setCalendarDate(d)
    setDate(dStr)
    setIsCalendarExpanded(false)
  }

  // ── Fetch datos financieros ──────────────────────────────────────────────
  const [businessSettings, setBusinessSettings] = useState(null)

  const fetchAll = useCallback(async (d) => {
    setLoading(true)
    try {
      const [salesRes, summaryRes, expRes, settingsRes] = await Promise.all([
        getSales(d),
        getFinancesSummary({ date: d }),
        getExpenses({ date: d }),
        getSettings()
      ])
      setSales(salesRes.data.sales || [])
      setTotal(salesRes.data.total || 0)
      setCount(salesRes.data.count || 0)
      setSummary(summaryRes.data)
      setExpenses(expRes.data.expenses || [])
      setBusinessSettings(settingsRes.data)
    } catch (err) { 
      // Falla silenciosa con fallback a 0.00 como pidió el usuario
      console.warn('API Error (Silent Fallback):', err.message)
      setSales([])
      setTotal(0)
      setCount(0)
      setSummary({ totalIncome: 0, totalExpenses: 0, netBalance: 0, byMethod: {} })
      setExpenses([])
      setBusinessSettings({ commission_rate: 0, expense_categories: EXPENSE_CATEGORIES })
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll(date) }, [date, fetchAll])

  // Re-fetch al recuperar el foco
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
      return session.expected_cash ?? 0
    }
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

  const display = (amount, customClass = '') => (
    <span className={`${hidden ? 'blur-md select-none opacity-50' : ''} ${customClass} transition-all duration-300`}>
      {fmt(amount)}
    </span>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-2 sm:py-4 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
        
        {/* ── COMPACT HEADER (Ghost Style) ── */}
        <div className="mb-6 shrink-0 flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">Resumen</h1>
            
            <div className="flex items-center bg-slate-50/50 rounded-xl px-1.5 py-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => handleDateSelect(new Date(addDays(date, -1)))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <button 
                onClick={() => setIsCalendarExpanded(true)}
                className="px-2 text-[11px] font-black text-slate-600 uppercase tracking-wider hover:text-blue-600 transition-colors"
              >
                {isToday ? 'Hoy' : fmtDateShort(date)}
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => handleDateSelect(new Date(addDays(date, 1)))} disabled={isToday}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              onClick={() => printReport({
                sales, summary, byMethod: (summary?.byMethod || {}),
                date, businessName: business.name, session, expenses,
                professionals, commissionRate: businessSettings?.commission_rate || 0,
              })}
            >
              <Printer className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              onClick={handleShareWhatsApp}
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-slate-100 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-xl transition-all ${hidden ? 'text-blue-500 bg-blue-50/50' : 'text-slate-400 hover:bg-slate-50'}`}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* ── PROGRESSIVE DASHBOARD GRID ── */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full pb-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SummaryCard
              label="Ingresos (Ventas)"
              amount={summary?.totalIncome || 0}
              color="green"
              icon={TrendingUp}
              display={display}
              subtitle="Ver historial de cobros"
              onClick={() => setShowSalesDrawer(true)}
            />
            <SummaryCard
              label="Egresos (Gastos)"
              amount={summary?.totalExpenses || 0}
              color="red"
              icon={TrendingDown}
              display={display}
              subtitle="Ver detalle de gastos"
              onClick={() => setShowExpensesDrawer(true)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ scale: 0.995, borderColor: '#e2e8f0' }}
              whileTap={{ scale: 0.98 }}
              className="relative group overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 flex flex-col transition-all cursor-pointer ring-offset-background hover:border-slate-200 shadow-sm"
              onClick={() => setShowSessionDrawer(true)}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Balance Neto Real</p>
              <h3 className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter leading-none mb-6">
                {display(displayNetBalance)}
              </h3>
              <div className="mt-auto flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none transition-transform group-hover:translate-x-1">
                   Gestionar Sesión <ChevronRight className="w-3 h-3 text-slate-200" />
                </p>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${session?.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                   <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{session?.status || 'Sin iniciar'}</span>
                </div>
              </div>
            </motion.div>

            <SummaryCard
              label="Staff & Comisiones"
              amount={summary?.commissionTotal || 0}
              color="deepBlue"
              icon={User}
              display={display}
              subtitle="Rendición por profesional"
              onClick={() => setShowStaffDrawer(true)}
            />
          </div>

          {/* Minimal Status Indicator */}
          <div className="mt-12 text-center flex flex-col items-center gap-3">
             <div className="w-px h-8 bg-gradient-to-b from-slate-100 to-transparent" />
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] opacity-60 flex items-center gap-2">
               <Cloud className="w-3 h-3" /> Progressive Revelation Sync
             </p>
          </div>
        </div>

        {/* ── DRAWERS (REVELATION LAYER) ── */}

        {/* Sales Detail Drawer */}
        <AnimatePresence>
          {showSalesDrawer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSalesDrawer(false)}
                          className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white border-l border-slate-100 flex flex-col p-6 shadow-2xl shadow-slate-100">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase">Historial de Ventas</h2>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">{fmtDate(date)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowSalesDrawer(false)} className="rounded-xl"><X className="w-5 h-5" /></Button>
                </div>
                
                <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-24 scrollbar-hide">
                  {filteredSales.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <TrendingUp className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">Sin ventas para<br/>esta fecha</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSales.map(sale => (
                        <button key={sale.id} onClick={() => setDrawerSale(sale)} className="w-full p-4 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                          <div className="text-left">
                            <p className="text-sm font-black text-slate-900">{sale.client_name || 'Sin nombre'}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fmtTime(sale.created_at)} hs · {sale.payment_method}</span>
                          </div>
                          <span className="text-lg font-black text-slate-900 tracking-tight">{display(sale.amount)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 left-6 right-6 p-5 rounded-3xl bg-slate-900 text-white flex justify-between items-center shadow-xl shadow-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Cierre de Ventas</span>
                  <span className="text-xl font-black tracking-tighter">{display(filteredTotal)}</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Expenses Drawer */}
        <AnimatePresence>
          {showExpensesDrawer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpensesDrawer(false)}
                          className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white border-l border-slate-100 flex flex-col p-6 shadow-2xl shadow-slate-100">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-red-600 uppercase">Egresos & Gastos</h2>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">{fmtDate(date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowExpenseModal(true)} className="text-red-500 hover:bg-red-50 rounded-xl"><PlusCircle className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowExpensesDrawer(false)} className="rounded-xl"><X className="w-5 h-5" /></Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
                  <ExpensesList date={date} hidden={hidden} display={display} onDelete={handleDeleteExpense} deletingId={deletingId} sessionLocked={sessionLocked} />
                </div>

                <div className="absolute bottom-6 left-6 right-6 p-5 rounded-3xl bg-red-600 text-white flex justify-between items-center shadow-xl shadow-red-100">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Egresado</span>
                  <span className="text-xl font-black tracking-tighter">-{display(summary?.totalExpenses || 0)}</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Session Drawer */}
        <AnimatePresence>
          {showSessionDrawer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSessionDrawer(false)}
                          className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm bg-white border-l border-slate-100 flex flex-col p-8 shadow-2xl shadow-slate-100">
                <div className="mb-10 text-center">
                  <h2 className="text-xl font-black text-slate-900 uppercase">Control de Sesión</h2>
                  <p className="text-xs text-slate-400 font-medium tracking-wider">Arqueo y cierre de jornada</p>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
                  {isToday && !session && !sessionLoading && <AperturaBanner onOpen={handleOpenCaja} loading={sessionLoading} />}
                  <ArqueoBanner session={session} />
                  
                  <div className="space-y-3">
                    {session?.status === 'open' ? (
                      <Button onClick={() => setShowCierreModal(true)} className="w-full h-14 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] gap-2 shadow-xl hover:bg-slate-800 transition-all">
                        <Lock className="w-4 h-4" /> Finalizar Jornada
                      </Button>
                    ) : isToday && (
                      <Button onClick={() => setShowCierreModal(true)} className="w-full h-14 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] gap-2 shadow-xl hover:bg-emerald-700 transition-all">
                        <Unlock className="w-4 h-4" /> Iniciar Apertura
                      </Button>
                    )}
                  </div>
                  
                  <div className="pt-10 flex flex-col items-center gap-4 border-t border-slate-50 mt-10">
                    <Cloud className="w-6 h-6 text-slate-100" />
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] leading-relaxed mx-10 text-center">
                      Todos los arqueos se sincronizan periódicamente con el historial contable del negocio.
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="mt-8 w-full text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] hover:text-slate-600" onClick={() => setShowSessionDrawer(false)}>Cerrar Panel</Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Staff Drawer */}
        <AnimatePresence>
          {showStaffDrawer && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStaffDrawer(false)}
                          className="fixed inset-0 z-[60] bg-white/60 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                          className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white border-l border-slate-100 flex flex-col p-6 shadow-2xl shadow-slate-100">
                <div className="flex items-center justify-between mb-8 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-blue-600 uppercase">Comisiones Staff</h2>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">Rendición total por profesional · {businessSettings?.commission_rate}%</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowStaffDrawer(false)} className="rounded-xl"><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pb-10 scrollbar-hide">
                    {professionals.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                        <User className="w-12 h-12 text-slate-200" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin ventas asignadas</p>
                      </div>
                    ) : professionals.map(p => {
                      const rate = businessSettings?.commission_rate || 0
                      const commission = p.total * rate / 100
                      return (
                        <div key={p.name} className="p-5 rounded-[1.5rem] border border-slate-50 bg-slate-50/20 group hover:border-blue-100 transition-all">
                          <div className="flex items-baseline justify-between mb-4">
                            <span className="text-sm font-black text-slate-800">{p.name}</span>
                            <span className="text-xs font-bold text-slate-400 tracking-tight">{display(p.total)} Bruto</span>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Neto Profesional</span>
                            <span className="text-lg font-black text-blue-600 leading-none tracking-tighter">{display(commission)}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Calendar Picker (Minimal) */}
        <Dialog open={isCalendarExpanded} onOpenChange={setIsCalendarExpanded}>
          <DialogContent className="sm:max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-slate-900 text-white">
              <DialogTitle className="text-center font-black uppercase tracking-widest text-xs">Selector de Fecha</DialogTitle>
            </DialogHeader>
            <div className="p-4 bg-white">
              <ShadcnCalendar
                mode="single"
                locale={es}
                selected={calendarDate}
                onSelect={handleDateSelect}
                className="rounded-2xl border-none"
                disabled={(date) => date > new Date()}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Shared Detail Overlays */}
        <AnimatePresence>
          {drawerSale && <SaleDetailDrawer sale={drawerSale} onClose={() => setDrawerSale(null)} />}
          {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} categories={businessSettings?.expense_categories} onSaved={() => setDate(d => d)} sessionLocked={sessionLocked} />}
          {showCierreModal && <CierreCajaModal session={session} onClose={() => setShowCierreModal(false)} onClosed={s => { setSession(s); setDate(d => d) }} />}
        </AnimatePresence>

      </div>
      
      {/* ── FOOTER (Absolute Minimal) ── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 opacity-60">
        TurnoYa Cloud Session Active
      </div>
    </Layout>
  )
}
