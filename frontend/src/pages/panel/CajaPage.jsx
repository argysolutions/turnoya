import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from '@/components/shared/Layout'
import LockScreen from '@/components/shared/LockScreen'
import { useAuth } from '@/context/AuthContext'
import {
  getSales, postExpense, getFinancesSummary, getExpenses,
  getCashSession, openCashSession, closeCashSession,
} from '@/api/sales'
import { getSettings } from '@/api/business'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"
import { es } from 'date-fns/locale'
import { addDays as fnsAddDays } from 'date-fns'
import {
  ChevronLeft, ChevronRight, CreditCard, Wallet, ArrowLeftRight,
  HelpCircle, Eye, EyeOff, PlusCircle, X, Unlock,
  Share2, Search, FileText, Download, CalendarDays,
  Menu, Banknote, Smartphone, Lock, ArrowRight, ShieldOff, Key,
  Clock, ShieldCheck
} from 'lucide-react'
import { useEncryptedPrefs } from '@/hooks/useEncryptedPrefs'
import { cn } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]

const fmt = (amount) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount ?? 0)

const fmtNumericInput = (raw) => {
  const cleaned = raw.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  return new Intl.NumberFormat('es-AR').format(parseInt(cleaned, 10))
}

const parseFormattedNumber = (formatted) => {
  if (!formatted) return 0
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
}

const fmtTime = (isoString) =>
  new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const fmtDateShort = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

const METHOD_ICON = {
  Efectivo:      <Wallet className="w-3 h-3" />,
  Transferencia: <ArrowLeftRight className="w-3 h-3" />,
  Tarjeta:       <CreditCard className="w-3 h-3" />,
  Otro:          <HelpCircle className="w-3 h-3" />,
}

const EXPENSE_CATEGORIES = ['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro']

// ─── WhatsApp Export ─────────────────────────────────────────────────────────
const generateWhatsAppText = ({ dateLabel, summary, byMethod, session }) => {
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

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function SessionBanner({ session, onOpen, onOpenCierre, onOpenManagement, loading, isOwner }) {
  if (loading) return null

  if (session?.status === 'open') {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">Sesión Abierta</span>
          </div>
          <div className="h-3 w-px bg-emerald-200 hidden sm:block" />
          <span className="text-[10px] font-bold text-emerald-600 hidden sm:block">Inicio: {fmt(session.initial_amount)}</span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenCierre}
              variant="ghost"
              className="h-9 px-3 text-xs font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
            >
              Cerrar Caja
            </Button>
            {/* Solo mostramos el MoreVertical en el banner si es desktop, en mobile ya está en la cabecera */}
            <button 
              onClick={onOpenManagement}
              className="hidden lg:flex h-9 w-9 items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl active:scale-90 transition-transform"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Caja cerrada: solo el dueño puede abrirla
  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 flex items-center gap-2">
        <ShieldOff className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-[10px] font-bold text-slate-400">Sesión en espera de apertura por el dueño</span>
      </div>
    )
  }

  return <AperturaBanner inline onOpen={onOpen} onOpenManagement={onOpenManagement} />
}

function AperturaBanner({ onOpen, onOpenManagement, inline = false }) {
  const [amount, setAmount] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showValue, setShowValue] = useState(false)

  const handleOpen = async () => {
    const v = parseFormattedNumber(amount)
    if (isNaN(v) || v < 0) return toast.error('Monto inicial inválido')
    setSaving(true)
    try {
      await onOpen(v)
      setFormOpen(false)
      setAmount('')
    } catch {
      toast.error('Error al abrir la caja')
    } finally {
      setSaving(false)
    }
  }

  if (inline) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Unlock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-black uppercase text-amber-900 tracking-wider">Caja Cerrada</span>
          </div>
          {!formOpen && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setFormOpen(true)}
                variant="ghost"
                className="h-9 px-4 text-xs font-black uppercase bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl"
              >
                Abrir Sesión
              </Button>
              <button 
                onClick={onOpenManagement}
                className="h-9 w-9 flex items-center justify-center bg-amber-100 text-amber-700 rounded-xl active:scale-90 transition-transform"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {formOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Fondo inicial"
                  className="flex-1 h-9 rounded-xl border border-amber-200 bg-white px-3 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  value={amount}
                  onChange={e => setAmount(fmtNumericInput(e.target.value))}
                  autoFocus
                />
                <Button
                  onClick={() => setFormOpen(false)}
                  variant="ghost"
                  className="h-9 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleOpen}
                  disabled={saving}
                  className="h-9 px-4 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 shadow-sm"
                >
                  {saving ? '...' : 'Confirmar'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Unlock className="w-6 h-6 text-amber-600" />
        </div>
        <div className="text-center">
          <p className="text-xs font-black uppercase text-amber-900 tracking-widest">Iniciar Sesión</p>
          <p className="text-[10px] text-amber-600 font-bold">Fijar fondo inicial de efectivo</p>
        </div>
        {!formOpen ? (
          <Button onClick={() => setFormOpen(true)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98]">Configurar Apertura</Button>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className={cn(
                    "w-full h-14 rounded-2xl border border-amber-200 bg-white pl-4 pr-12 text-xl font-black focus:ring-2 focus:ring-amber-500 focus:outline-none",
                    showValue ? "mask-none" : "mask-security"
                  )}
                  value={amount}
                  onChange={e => setAmount(fmtNumericInput(e.target.value))}
                  autoComplete="off"
                  autoFocus
                />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600 transition-colors"
              >
                                {showValue ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setFormOpen(false)} variant="ghost" className="flex-1 h-12 text-xs font-black uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleOpen} disabled={saving} className="flex-[2] h-12 bg-amber-900 text-white font-black uppercase text-xs rounded-xl tracking-widest">{saving ? 'Abriendo...' : 'Confirmar'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cierre de Caja Modal ────────────────────────────────────────────────────
function CierreCajaModal({ session, summary, onClose, onClosed }) {
  const [step, setStep] = useState(1) // 1: Select type, 2: Details & PIN
  const [closeType, setCloseType] = useState(null) // 'partial' or 'final'
  const [counted, setCounted] = useState('')
  const [pin, setPin] = useState('')
  const [showCounted, setShowCounted] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!pin) return toast.error('Debes ingresar el PIN')
    const v = parseFormattedNumber(counted)
    if (isNaN(v) || v < 0) return toast.error('Monto contado inválido')
    
    setSaving(true)
    try {
      // Por ahora llamamos a la misma función, pero indicando el tipo si el backend lo soporta
      const { data } = await closeCashSession(v, { type: closeType, pin })
      toast.success(closeType === 'final' ? 'Cierre Definitivo realizado' : 'Cierre parcial guardado')
      onClosed(data.session)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'PIN incorrecto o error al cerrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl z-[200]">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-[2.5rem] bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Cierre de Caja</h2>
                <p className="text-sm text-slate-500 font-medium px-4">Selecciona el tipo de cierre que deseas realizar para la sesión actual</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => { setCloseType('partial'); setStep(2) }}
                  className="group flex items-center justify-between p-6 rounded-[2rem] bg-white border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50/50 transition-all active:scale-95 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">Cierre</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Provisorio / Por turno</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>

                <button 
                  onClick={() => { setCloseType('final'); setStep(2) }}
                  className="group flex items-center justify-between p-6 rounded-[2rem] bg-slate-900 border-2 border-slate-900 hover:bg-black transition-all active:scale-95 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-white">Cierre Definitivo</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Final del día / Bloqueo</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                </button>
              </div>

              <Button variant="ghost" onClick={onClose} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400">Cancelar</Button>
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setStep(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-all"><ChevronLeft className="w-6 h-6" /></button>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter">Confirmar {closeType === 'final' ? 'Definitivo' : 'Parcial'}</h3>
              </div>

              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Efectivo Esperado</span>
                  <span className="text-xl font-black text-slate-900">{fmt(session?.expected_cash)}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 px-1">Efectivo Contado</label>
                    <div className="relative">
                      <input 
                        type="text" inputMode="numeric" value={counted} onChange={e => setCounted(fmtNumericInput(e.target.value))}
                        className={cn("w-full h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 text-xl font-black focus:border-blue-600 focus:outline-none", !showCounted && "mask-security")}
                        placeholder="0"
                      />
                      <button onClick={() => setShowCounted(!showCounted)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"><Eye className="w-5 h-5" /></button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-600 px-1">PIN de Seguridad</label>
                    <div className="relative">
                      <input 
                        type="text" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} maxLength={4}
                        className={cn("w-full h-14 rounded-2xl border-2 border-blue-100 bg-blue-50/30 px-4 text-xl font-black text-blue-600 focus:border-blue-600 focus:outline-none", !showPin && "mask-security")}
                        placeholder="PIN"
                      />
                      <button onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-600"><Eye className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="flex-1 h-16 rounded-[1.8rem] font-black uppercase text-xs tracking-widest text-slate-400">Cancelar</Button>
                <Button onClick={handleConfirm} disabled={saving} className="flex-[2] h-16 rounded-[1.8rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-sm tracking-widest shadow-lg shadow-blue-600/20">
                  {saving ? 'Cerrando...' : 'Confirmar'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sale Detail Drawer ───────────────────────────────────────────────────────
function SaleDetailDrawer({ sale, onClose }) {
  if (!sale) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative bg-white w-full sm:w-96 p-6 shadow-2xl flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest">Detalle de Cobro</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl"><X className="w-4 h-4" /></Button>
        </div>
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[11px] uppercase font-black text-slate-500 mb-1 tracking-tighter">Monto total</p>
          <p className="text-5xl font-black tracking-tighter leading-none mb-4">{fmt(sale.amount)}</p>
          <div className="flex gap-2">
            <Badge className="bg-white/10 text-white border-none font-bold">{sale.payment_method}</Badge>
            {sale.professional_name && <Badge variant="outline" className="border-white/20 text-white font-bold">{sale.professional_name}</Badge>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase font-black text-slate-400 tracking-tighter">Cliente</span>
              <span className="text-xl font-black text-slate-900">{sale.client_name || 'Venta Minorista'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase font-black text-slate-400 tracking-tighter">Fecha y Hora</span>
              <span className="text-xl font-black text-slate-900">{fmtTime(sale.created_at)} hs</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const Item = ({ icon: IconComponent, label, onClick, accent = 'blue' }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 md:gap-3 px-4 md:px-3 py-4 md:py-2.5 rounded-2xl md:rounded-xl text-left transition-colors hover:bg-slate-50 text-slate-700 active:scale-[0.98]"
    >
      <div className={`w-12 h-12 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 ${
        accent === 'red' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'
      }`}>
        <IconComponent className="w-6 h-6 md:w-4 md:h-4" />
      </div>
      <span className="text-lg md:text-sm font-bold md:font-semibold">{label}</span>
    </button>
  )
}

// ─── Management Content ───────────────────────────────────────────────────────
function ManagementContent({
  session, summary, professionals, businessSettings,
  onOpenExpenseModal, onOpenCierre, display,
  date, isOwner,
}) {
  const byMethod = summary?.byMethod || {}
  const isToday = date === today()
  const commissionRate = businessSettings?.commission_rate || 0

  const handleWhatsAppExport = () => {
    const text = generateWhatsAppText({ dateLabel: isToday ? 'Hoy' : fmtDateShort(date), summary, byMethod, session })
    navigator.clipboard?.writeText(text)
    toast.success('Resumen copiado')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleTXTDownload = () => {
    const text = generateWhatsAppText({ dateLabel: isToday ? 'Hoy' : fmtDateShort(date), summary, byMethod, session })
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cierre_caja_${date}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Archivo TXT descargado')
  }

  const handleXMLDownload = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cierre_caja fecha="${date}">
  <resumen>
    <ventas_brutas>${summary?.totalIncome ?? 0}</ventas_brutas>
    <gastos_totales>${summary?.totalExpenses ?? 0}</gastos_totales>
    <balance_neto>${summary?.netBalance ?? 0}</balance_neto>
    <cantidad_cobros>${summary?.salesCount ?? 0}</cantidad_cobros>
  </resumen>
  <metodos_pago>
    ${Object.entries(byMethod).map(([m, d]) => `<metodo nombre="${m}" total="${d.total}" cantidad="${d.count}" />`).join('\n    ')}
  </metodos_pago>
</cierre_caja>`
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cierre_caja_${date}.xml`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Archivo XML descargado')
  }

  return (
    <div className="space-y-5">
      {/* Operaciones — solo visibles para el dueño */}
      {isOwner && (
        <div>
          <p className="text-sm md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest text-slate-500 px-4 md:px-3 mb-4 md:mb-1">Operaciones</p>
          <div className="space-y-1 md:space-y-0.5">
            <Item icon={PlusCircle} label="Registrar Gasto" onClick={onOpenExpenseModal} />
            {session?.status === 'open' && (
              <Item icon={Lock} label="Cierre Definitivo" onClick={onOpenCierre} accent="red" />
            )}
          </div>
        </div>
      )}

      {/* Arqueo de Caja */}
      {session?.status === 'open' && (
        <div>
          <p className="text-sm md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest text-slate-500 px-4 md:px-3 mb-4 md:mb-2">Arqueo de Caja</p>
          <div className="mx-2 md:mx-1 p-5 md:p-4 rounded-3xl md:rounded-2xl bg-blue-950 text-white shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] md:text-[8px] uppercase font-black text-blue-400 mb-1 md:mb-0.5">Esperado</p>
                <p className="text-xl md:text-base font-black">{fmt(session.expected_cash)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] md:text-[8px] uppercase font-black text-blue-400 mb-1 md:mb-0.5">Inicial</p>
                <p className="text-xl md:text-base font-black">{fmt(session.initial_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comisiones Staff */}
      {professionals.length > 0 && commissionRate > 0 && (
        <div>
          <p className="text-sm md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest text-slate-500 px-4 md:px-3 mb-4 md:mb-2">Comisiones Staff ({commissionRate}%)</p>
          <div className="mx-2 md:mx-1 space-y-2 md:space-y-1">
            {professionals.map(p => (
              <div key={p.name} className="flex items-center justify-between p-4 md:p-2 rounded-2xl md:rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm md:text-[11px] font-bold text-slate-800">{p.name}</p>
                  <p className="text-[11px] md:text-[9px] text-slate-400 font-medium mt-0.5 md:mt-0">Bruto: {fmt(p.total)}</p>
                </div>
                <p className="text-base md:text-xs font-black text-blue-600">{display(p.total * commissionRate / 100)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exportación */}
      <div>
        <p className="text-sm md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest text-slate-500 px-4 md:px-3 mb-4 md:mb-1">Exportar Cierre</p>
        <div className="space-y-1 md:space-y-0.5">
          <Item icon={Share2} label="Enviar por WhatsApp" onClick={handleWhatsAppExport} />
          <Item icon={FileText} label="Descargar TXT" onClick={handleTXTDownload} />
          <Item icon={Download} label="Descargar XML" onClick={handleXMLDownload} />
        </div>
      </div>
    </div>
  )
}

// ─── Management Drawer (Mobile Bottom Sheet) ──────────────────────────────────
function ManagementDrawer({ onClose, ...contentProps }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-white w-full rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] h-[85vh] flex flex-col overflow-hidden"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.8 }}
        onDragEnd={(_, info) => { if (info.offset.y > 150) onClose() }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle visual */}
        <div className="flex justify-center p-4 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Gestión y Reportes</h2>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 scrollbar-hide">
          <ManagementContent {...contentProps} />
        </div>

        <div className="px-8 py-6 border-t border-slate-50 shrink-0 bg-white">
          <Button variant="ghost" className="w-full h-14 uppercase font-black text-xs tracking-widest text-slate-400 rounded-2xl" onClick={onClose}>Cerrar Panel</Button>
        </div>
      </motion.div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function CajaPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { isOwner, isEmployee, activeProfile, clearActiveProfile, setActiveProfile, staffId, professionalName, staffName, role, loading: authLoading } = useAuth()
  const prefs = useEncryptedPrefs()

  // Empleados: auto-activar perfil (ya autenticados por staff-login, sin LockScreen)
  useEffect(() => {
    if (isEmployee && !activeProfile) {
      setActiveProfile({
        id: `staff-${staffId}`,
        name: staffName || 'Empleado',
        role: 'employee',
        staff_id: staffId,
        professional_name: professionalName,
      })
    }
  }, [isEmployee, staffId, staffName, professionalName, activeProfile, setActiveProfile])

  // Solo los dueños limpian perfil activo al salir (para pedir PIN cada vez)
  useEffect(() => {
    return () => {
      if (role === 'owner') {
        clearActiveProfile()
      }
    }
  }, [role, clearActiveProfile])

  // ── State ─────────────────────────────────────────────────────────────────
  const [date, setDate] = useState(today())
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  // privacy_mode persiste cifrado; inicializa desde prefs una vez que la clave está lista
  const [hidden, setHidden] = useState(false)
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [businessSettings, setBusinessSettings] = useState(null)
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeLedgerTab, setActiveLedgerTab] = useState('todos') // todos, ingresos, egresos
  const [showOpeningModal, setShowOpeningModal] = useState(false)
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(false)
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false)
  const [isNetExpanded, setIsNetExpanded] = useState(false)

  // Filtrado final de Ledger (Tabs + Search + Roles)
  const ledgerEntries = useMemo(() => {
    // Si es empleado, filtrar para ver solo sus movimientos
    const isActuallyEmployee = role === 'employee' || isEmployee
    const filteredSales = !isActuallyEmployee 
      ? sales 
      : sales.filter(s => s.professional_name === professionalName)
    
    const filteredExpenses = !isActuallyEmployee ? expenses : []

    let list = [
      ...filteredSales.map(s => ({
        id: `sale-${s.id}`,
        type: 'income',
        amount: s.total_amount || s.amount,
        description: s.client_name || 'Venta Minorista',
        time: s.created_at,
        method: s.payment_method,
        raw: s
      })),
      ...filteredExpenses.map(e => ({
        id: `expense-${e.id}`,
        type: 'expense',
        amount: e.amount,
        description: e.description,
        time: e.created_at,
        category: e.category,
        raw: e
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time))

    // Filtro por Tab (Mobile)
    if (activeLedgerTab === 'ingresos') list = list.filter(e => e.type === 'income')
    if (activeLedgerTab === 'egresos') list = list.filter(e => e.type === 'expense')

    // Filtro por Búsqueda
    if (ledgerFilter) {
      const q = ledgerFilter.toLowerCase()
      list = list.filter(e => 
        e.description.toLowerCase().includes(q) || 
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.method && e.method.toLowerCase().includes(q))
      )
    }

    return list
  }, [sales, expenses, ledgerFilter, activeLedgerTab, isEmployee, role, professionalName])

  // UI States
  const [showManagementDrawer, setShowManagementDrawer] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [drawerSale, setDrawerSale] = useState(null)

  // Recuperar privacy_mode desde prefs cifradas apenas la clave esté lista
  useEffect(() => {
    if (!prefs.isReady) return
    const saved = prefs.getItem('privacy_mode')
    if (saved !== null) setHidden(Boolean(saved))
  }, [prefs.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persistir privacy_mode cifrado cada vez que cambia
  useEffect(() => {
    if (!prefs.isReady) return
    prefs.setItem('privacy_mode', hidden)
  }, [hidden, prefs.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    if (authLoading) return
    setLoading(true)
    try {
      const isActuallyEmployee = role === 'employee' || isEmployee

      const [summaryRes, salesRes, sessionRes, settingsRes, expensesRes] = await Promise.all([
        getFinancesSummary({ date, includeTrend: false }).catch(() => ({ data: {} })),
        getSales(date).catch(() => ({ data: { sales: [] } })),
        getCashSession(date).catch(() => ({ data: { session: null } })),
        !isActuallyEmployee ? getSettings().catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
        getExpenses({ date }).catch(() => ({ data: { expenses: [] } }))
      ])
      setSummary(summaryRes.data)

      // Empleados solo ven sus propios cobros (filtrado por staffId en el futuro
      // o por professional_name). Por ahora el servidor devuelve todo y
      // el frontend filtra para la vista del empleado.
      const allSales = salesRes.data.sales || []
      setSales(allSales)

      setSession(sessionRes.data.session)
      // Si la sesión no está abierta, mostramos el modal de apertura
      if (sessionRes.data.session?.status !== 'open' && isOwner) {
        setShowOpeningModal(true)
      }
      setBusinessSettings(settingsRes.data)
      setExpenses(expensesRes.data.expenses || [])
    } finally { setLoading(false); setSessionLoading(false) }
  }, [date, authLoading, isEmployee, role, isOwner])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOpenCaja = useCallback(async (amt) => {
    try {
      const { data } = await openCashSession(amt)
      setSession(data.session)
      toast.success('¡Caja abierta correctamente!')
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al abrir la caja')
    }
  }, [fetchData])

  const professionals = useMemo(() => {
    const map = {}
    sales.forEach(s => {
      if (!s.professional_name) return
      if (!map[s.professional_name]) map[s.professional_name] = { name: s.professional_name, total: 0 }
      map[s.professional_name].total += parseFloat(s.amount || 0)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [sales])

  const display = (amount) => (
    <span className={hidden ? 'blur-md select-none' : ''}>{fmt(amount)}</span>
  )

  const isToday = date === today()



  const byMethod = summary?.byMethod || {}
  const digitalTotal = (byMethod['Transferencia']?.total ?? 0) + (byMethod['Tarjeta']?.total ?? 0)
  const efectivoTotal = byMethod['Efectivo']?.total ?? 0

  const managementProps = {
    session,
    summary,
    professionals,
    businessSettings,
    onOpenExpenseModal: () => setShowExpenseModal(true),
    onOpenCierre: () => setShowCierreModal(true),
    display,
    date,
    isOwner,
  }

  const changeDate = (delta) =>
    setDate(fnsAddDays(new Date(date + 'T12:00:00'), delta).toISOString().split('T')[0])

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // ... rest of logic
  return (
    <Layout 
      maxWidth="max-w-7xl"
      hideMobileHeader={true}
      mobileMenuState={[isMenuOpen, setIsMenuOpen]}
    >
      <div className={`transition-all duration-700 ${isOwner && !activeProfile ? 'blur-3xl grayscale-[0.2] brightness-95 opacity-80 pointer-events-none select-none' : ''}`}>
        <TooltipProvider>
          {/*
            ── Outer container: full-bleed ledger layout ──
            En desktop: w-3/4 Ledger + w-1/4 Sidebar fijo.
            En mobile: columna única.
          */}

          {/* 1. MASTER HEADER MÓVIL (Pattern AgendaPage) */}
          <div className="lg:hidden sticky top-0 z-[70] bg-white border-b border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] w-screen -ml-4 px-4 h-16 flex items-center justify-between relative">
            {/* Left: Menu Icon */}
            <div className="min-w-[48px]">
              <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center text-black">
                <Menu className="w-8 h-8" />
              </button>
            </div>

            {/* Center: Title */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-black tracking-tighter">Caja</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 min-w-[48px] justify-end">
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={cn(
                  "w-12 h-12 flex items-center justify-center transition-all",
                  isSearchOpen ? "text-blue-600" : "text-slate-400"
                )}
              >
                <Search className="w-7 h-7" />
              </button>

              {isOwner && (
                <button 
                  onClick={() => setShowManagementDrawer(true)}
                  className="w-12 h-12 flex items-center justify-center text-slate-400"
                >
                  <Key className="w-7 h-7" />
                </button>
              )}
            </div>
          </div>

          {/* 1.1 BARRA DE BÚSQUEDA (Pattern AgendaPage) */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="lg:hidden overflow-hidden bg-white border-b border-slate-100 px-4 pb-4"
              >
                <div className="bg-slate-100 rounded-2xl flex items-center px-4 py-3 shadow-inner mt-4">
                  <Search className="text-blue-600 w-5 h-5 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Buscar por cliente o concepto..." 
                    autoFocus 
                    className="bg-transparent border-none focus:ring-0 outline-none text-lg ml-3 w-full font-bold" 
                    value={ledgerFilter} 
                    onChange={(e) => setLedgerFilter(e.target.value)}
                  />
                  {ledgerFilter && (
                    <button onClick={() => setLedgerFilter('')} className="text-slate-400">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1.2 NAVEGACIÓN POR PILLS (Pattern AgendaPage) */}
          <div className="lg:hidden flex overflow-x-auto hide-scrollbar w-screen -ml-4 px-4 py-3 bg-white border-b border-slate-100 sticky top-16 z-[60]">
            <div className="flex gap-2">
              {[
                { id: 'todos', label: 'Todos', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
                { id: 'ingresos', label: 'Ingresos', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { id: 'egresos', label: 'Egresos', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-100' }
              ].map(tab => {
                const isActive = activeLedgerTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLedgerTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-6 py-2.5 rounded-full font-black uppercase text-sm tracking-tighter transition-all active:scale-95",
                      isActive ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "" : "opacity-40")} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-h-full gap-0 lg:gap-6 max-w-7xl mx-auto">
            {/* ═══════════════════════════════════════════
                COLUMNA LEDGER (3/4 desktop, full mobile)
            ══════════════════════════════════════════════ */}
            <div className="flex-1 min-w-0 flex flex-col gap-4 pb-10">

              {/* ── HEADER DESKTOP ─────────────────────── */}
              <div className="hidden lg:flex items-center gap-3 sticky top-14 z-40 bg-white -mx-4 px-4 pt-1 pb-2 border-b border-slate-100/80 mb-2">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col">
                    <h1 className="text-xl font-semibold text-slate-900">
                      {String(role).toLowerCase() === 'employee' ? 'Mis Ingresos' : 'Caja'}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {String(role).toLowerCase() === 'employee' ? 'Resumen de tus cobros' : 'Control de ventas y gastos'}
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-0.5 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400" onClick={() => changeDate(-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                    <button onClick={() => setIsCalendarExpanded(true)} className="px-3 text-[10px] font-black uppercase tracking-tight text-slate-700 min-w-[64px] text-center">
                      {isToday ? 'HOY' : fmtDateShort(date)}
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400" onClick={() => changeDate(1)} disabled={isToday}><ChevronRight className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <div className="w-[36px] shrink-0" />
              </div>

            {/* ── SESSION BANNER ───────────── */}
            {null}

            {/* ── DASHBOARD DE GESTIÓN SIMPLIFICADO (Pattern Premium) ── */}
            {isOwner && (
              <div className="space-y-4 mb-6">
                {/* 1. Arqueo y Disponible (Fila Principal) */}
                {session?.status === 'open' && (
                  <div className="bg-slate-950 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-blue-500/20 transition-colors duration-1000" />
                    
                    <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {/* Efectivo */}
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2.2rem] bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                          <Banknote className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Efectivo en Caja</p>
                          <div className="flex items-center gap-3">
                            <p className={cn("text-5xl font-black tracking-tighter text-white transition-all duration-500", hidden && "blur-xl select-none")}>
                              {display(session.expected_cash)}
                            </p>
                            <button onClick={() => setHidden(!hidden)} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                              {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Digital */}
                      <div className="flex items-center gap-6 sm:border-l border-white/10 sm:pl-8">
                        <div className="w-16 h-16 rounded-[2.2rem] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
                          <Smartphone className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Disponible Digital</p>
                          <p className={cn("text-5xl font-black tracking-tighter text-white transition-all duration-500", hidden && "blur-xl select-none")}>
                            {display(digitalTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Métricas de Resumen (Bruto, Gastos, Neto) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 bg-white rounded-[3rem] border border-slate-100 p-2 shadow-sm flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between p-4 gap-6">
                      {/* Ventas Brutas */}
                      <div 
                        className="flex-1 min-w-[120px] cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-colors group"
                        onClick={() => { setIsIncomeExpanded(!isIncomeExpanded); setIsExpensesExpanded(false); setIsNetExpanded(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ventas Brutas</p>
                          <ChevronRight className={cn("w-3 h-3 text-slate-300 transition-transform", isIncomeExpanded && "rotate-90")} />
                        </div>
                        <p className={cn("text-2xl font-black text-slate-900 tracking-tighter", hidden && "blur-md")}>
                          {display(summary?.totalIncome || 0)}
                        </p>
                      </div>
                      
                      {/* Gastos Totales */}
                      <div 
                        className="flex-1 min-w-[120px] px-6 border-l border-slate-100 cursor-pointer hover:bg-slate-50 p-2 rounded-2xl transition-colors group"
                        onClick={() => { setIsExpensesExpanded(!isExpensesExpanded); setIsIncomeExpanded(false); setIsNetExpanded(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Gastos Totales</p>
                          <ChevronRight className={cn("w-3 h-3 text-rose-300 transition-transform", isExpensesExpanded && "rotate-90")} />
                        </div>
                        <p className={cn("text-2xl font-black text-rose-600 tracking-tighter", hidden && "blur-md")}>
                          {display(summary?.totalExpenses || 0)}
                        </p>
                      </div>

                      {/* Balance Neto */}
                      <div 
                        className="flex-1 min-w-[120px] px-6 border-l border-slate-100 bg-slate-50/50 rounded-[2rem] py-3 cursor-pointer hover:bg-blue-50 transition-colors group"
                        onClick={() => { setIsNetExpanded(!isNetExpanded); setIsIncomeExpanded(false); setIsExpensesExpanded(false); }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Balance Neto</p>
                          <ChevronRight className={cn("w-3 h-3 text-blue-300 transition-transform", isNetExpanded && "rotate-90")} />
                        </div>
                        <p className={cn("text-3xl font-black text-blue-600 tracking-tighter", hidden && "blur-md")}>
                          {display(summary?.netBalance || 0)}
                        </p>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {isIncomeExpanded && (
                        <motion.div
                          key="income-breakdown"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-50"
                        >
                          <div className="p-4 grid grid-cols-3 gap-3">
                            {['Efectivo', 'Transferencia', 'Tarjeta'].map(method => {
                              const data = byMethod[method] || { total: 0 };
                              return (
                                <div key={method} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 text-center">
                                  <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5 tracking-tighter">{method}</p>
                                  <p className={cn("text-sm font-black text-slate-700", hidden && "blur-sm")}>{display(data.total)}</p>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}

                      {isExpensesExpanded && (
                        <motion.div
                          key="expenses-breakdown"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-50"
                        >
                          <div className="p-4 flex flex-wrap gap-3">
                            {Object.entries(
                              expenses.reduce((acc, e) => {
                                acc[e.category] = (acc[e.category] || 0) + e.amount
                                return acc
                              }, {})
                            ).map(([cat, total]) => (
                              <div key={cat} className="flex-1 min-w-[100px] bg-rose-50/30 p-3 rounded-2xl border border-rose-100/30 text-center">
                                <p className="text-[9px] font-black uppercase text-rose-400 mb-0.5 tracking-tighter">{cat}</p>
                                <p className={cn("text-sm font-black text-rose-700", hidden && "blur-sm")}>{display(total)}</p>
                              </div>
                            ))}
                            {expenses.length === 0 && (
                              <p className="w-full text-center py-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin gastos registrados</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {isNetExpanded && (
                        <motion.div
                          key="net-breakdown"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-50"
                        >
                          <div className="p-6 flex items-center justify-around gap-4 bg-blue-50/20">
                            <div className="text-center">
                              <p className="text-[9px] font-black uppercase text-emerald-500 mb-1">Ingresos</p>
                              <p className={cn("text-xl font-black text-emerald-600", hidden && "blur-md")}>+ {display(summary?.totalIncome)}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">−</div>
                            <div className="text-center">
                              <p className="text-[9px] font-black uppercase text-rose-500 mb-1">Egresos</p>
                              <p className={cn("text-xl font-black text-rose-600", hidden && "blur-md")}>- {display(summary?.totalExpenses)}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">=</div>
                            <div className="text-center">
                              <p className="text-[9px] font-black uppercase text-blue-600 mb-1">Total Neto</p>
                              <p className={cn("text-xl font-black text-blue-700", hidden && "blur-md")}>{display(summary?.netBalance)}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Operaciones Rápidas */}
                  <div className="bg-slate-50 rounded-[3rem] p-3 flex gap-2">
                    <Button 
                      onClick={() => setIsCalendarExpanded(true)}
                      className="w-16 h-16 rounded-[2rem] bg-white border border-slate-200/50 text-blue-600 shadow-sm hover:bg-blue-50 transition-all active:scale-95 shrink-0"
                    >
                      <CalendarDays className="w-6 h-6" />
                    </Button>
                    <Button 
                      onClick={() => setShowExpenseModal(true)}
                      className="flex-1 h-16 rounded-[2rem] bg-white border border-slate-200/50 text-slate-900 font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Gasto
                    </Button>
                    <Button 
                      onClick={() => setShowCierreModal(true)}
                      disabled={session?.status !== 'open'}
                      className="flex-1 h-16 rounded-[2rem] bg-white border border-slate-200/50 text-rose-600 font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-rose-600 hover:text-white transition-all active:scale-95 disabled:opacity-30"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Cierre
                    </Button>
                  </div>
                </div>
              </div>
            )}


            {/* ── VER DETALLE (Solo Dueño) ────────────────────────── */}
            {isOwner && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  id="detail-expand-toggle"
                  onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                  className="w-full h-14 md:h-auto px-5 py-3 flex items-center justify-center gap-2 text-sm md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50/60 transition-colors"
                >
                  <span>Ver detalle</span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isDetailExpanded ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {isDetailExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 grid grid-cols-3 gap-3 border-t border-slate-50">
                        <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100/60 mt-4">
                          <p className="text-[10px] md:text-[9px] font-black uppercase text-slate-400 mb-1.5">Balance Neto</p>
                          <p className="text-3xl md:text-lg font-black md:font-semibold text-slate-900 leading-tight">{display(summary?.netBalance)}</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/40 mt-4">
                          <p className="text-[10px] md:text-[9px] font-black uppercase text-emerald-600 mb-1.5">Ventas Brutas</p>
                          <p className="text-3xl md:text-lg font-black md:font-semibold text-emerald-900 leading-tight">{display(summary?.totalIncome)}</p>
                          <p className="text-xs md:text-[9px] font-bold text-emerald-400 mt-1">{summary?.salesCount || 0} cobros</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-red-50/50 border border-red-100/30 mt-4">
                          <p className="text-[10px] md:text-[9px] font-black uppercase text-red-500 mb-1.5">Gastos Totales</p>
                          <p className="text-3xl md:text-lg font-black md:font-semibold text-red-900 leading-tight">{display(summary?.totalExpenses)}</p>
                          <p className="text-xs md:text-[9px] font-bold text-red-400 mt-1">{summary?.expensesCount || 0} egresos</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ════════════════════════════════════════
                LIBRO MAYOR (LEDGER)
            ════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

                {/* Buscador (Solo Desktop) */}
                <div className="hidden lg:flex px-4 py-3 border-b border-slate-50 items-center gap-3 bg-white sticky top-0">
                  <Search className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    id="ledger-search"
                    type="text"
                    placeholder="Buscar por cliente..."
                    value={ledgerFilter}
                    onChange={e => setLedgerFilter(e.target.value)}
                    className="flex-1 bg-transparent h-12 md:h-auto text-lg md:text-sm font-bold md:font-medium focus:outline-none placeholder:text-slate-300 placeholder:font-normal text-slate-700"
                  />
                  {ledgerFilter && (
                    <button
                      onClick={() => setLedgerFilter('')}
                      className="text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Entries */}
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="w-5 h-5 border-2 border-slate-100 border-t-slate-400 rounded-full animate-spin mx-auto" />
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <div className="py-20 text-center px-6">
                    <p className="text-sm md:text-xs font-black text-slate-300 uppercase tracking-tighter mb-2">Sin movimientos</p>
                    <p className="text-[11px] text-slate-400">Finalizá turnos o agregá gastos para verlos aquí.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {ledgerEntries.map((entry) => (
                      <div key={entry.id} className="relative overflow-hidden rounded-[2.5rem]">
                        {/* Background Action (Reveal on drag) */}
                        <div className="absolute inset-0 bg-blue-600 flex items-center justify-end px-8 rounded-[2.5rem]">
                          <div className="flex flex-col items-center text-white">
                            <Eye className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-black uppercase">Ver</span>
                          </div>
                        </div>

                        <motion.button
                          drag="x"
                          dragConstraints={{ left: -100, right: 0 }}
                          dragElastic={0.1}
                          onDragEnd={(_, info) => {
                            if (info.offset.x < -60) {
                              if (entry.type === 'income' && entry.raw) setDrawerSale(entry.raw)
                            }
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => entry.type === 'income' && entry.raw ? setDrawerSale(entry.raw) : null}
                          className={cn(
                            "relative z-10 w-full text-left p-6 rounded-[2.5rem] flex items-center justify-between transition-all border border-slate-100",
                            entry.type === 'income' ? "bg-white shadow-sm" : "bg-slate-50/80 border-dashed"
                          )}
                        >
                          {/* Left: Info */}
                          <div className="flex items-center gap-5 min-w-0">
                            {/* Indicator */}
                            <div className={cn(
                              "w-2 h-14 rounded-full shrink-0",
                              entry.type === 'income' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                            )} />

                            <div className="min-w-0">
                              <p className="text-2xl font-black text-slate-900 truncate leading-tight mb-1.5 tracking-tighter">
                                {entry.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-black uppercase text-slate-400 tracking-tighter">{fmtTime(entry.time)}</span>
                                {entry.method && (
                                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center gap-1 uppercase tracking-tighter">
                                    {METHOD_ICON[entry.method]}
                                    {entry.method}
                                  </span>
                                )}
                                {isOwner && entry.raw?.professional_name && (
                                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] uppercase tracking-tighter">
                                    {entry.raw.professional_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Amount */}
                          <div className="text-right ml-4 shrink-0">
                            <p className={cn(
                              "text-3xl font-black tabular-nums tracking-tighter",
                              entry.type === 'income' ? "text-emerald-600" : "text-rose-600"
                            )}>
                              <span className={hidden ? 'blur-md select-none' : ''}>
                                {entry.type === 'expense' ? '−' : '+'} {fmt(entry.amount)}
                              </span>
                            </p>
                          </div>
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>{/* fin columna ledger */}

          {/* ═══════════════════════════════════════════
              SIDEBAR DERECHO (solo Desktop — 1/4, solo dueño)
          ══════════════════════════════════════════════ */}
          {isOwner && (
            <aside className="hidden lg:flex flex-col w-[280px] xl:w-[320px] shrink-0">
              <div className="sticky top-16 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-6 pt-6 pb-2 border-b border-slate-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gestión y Reportes</p>
                </div>
                <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-hide">
                  <ManagementContent {...managementProps} />
                </div>
              </div>
            </aside>
          )}

        </div>{/* fin outer flex */}

        {/* ── OVERLAYS — cada uno en su propio AnimatePresence para
            que el cierre de uno no afecte el estado de otro ── */}
        <AnimatePresence>
          {isOwner && showManagementDrawer && (
            <ManagementDrawer
              key="management-drawer"
              onClose={() => setShowManagementDrawer(false)}
              {...managementProps}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {drawerSale && (
            <SaleDetailDrawer
              key="sale-drawer"
              sale={drawerSale}
              onClose={() => setDrawerSale(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOwner && showExpenseModal && (
            <ExpenseModal
              key="expense-modal"
              onClose={() => setShowExpenseModal(false)}
              onSaved={fetchData}
              sessionLocked={session?.status === 'closed'}
              categories={businessSettings?.expense_categories}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOwner && showCierreModal && (
            <CierreCajaModal
              key="cierre-modal"
              session={session}
              summary={summary}
              onClose={() => setShowCierreModal(false)}
              onClosed={s => { setSession(s); fetchData() }}
            />
          )}
        </AnimatePresence>

        {/* ── MODAL APERTURA DE CAJA (Emergente) ────── */}
        <AnimatePresence>
          {showOpeningModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowOpeningModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-[420px] rounded-[3rem] p-10 shadow-2xl flex flex-col items-center text-center overflow-hidden"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setShowOpeningModal(false)}
                  className="absolute top-6 right-6 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="w-24 h-24 rounded-[2.5rem] bg-blue-50 flex items-center justify-center mb-8 shadow-inner">
                  <Lock className="w-12 h-12 text-blue-600" />
                </div>

                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-3 leading-tight">Caja Cerrada</h3>
                <p className="text-xl text-slate-500 font-bold mb-10 leading-snug">Para registrar ventas y gastos debés iniciar la sesión del día.</p>

                <Button 
                  onClick={() => {
                    handleOpenCaja();
                    setShowOpeningModal(false);
                  }} 
                  className="h-20 w-full rounded-[2rem] bg-blue-600 text-white text-xl font-black uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all"
                >
                  Iniciar Sesión
                </Button>

                <button 
                  onClick={() => setShowOpeningModal(false)}
                  className="mt-8 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Continuar sin iniciar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── CALENDAR PICKER ──────────────────────── */}
        <Dialog open={isCalendarExpanded} onOpenChange={setIsCalendarExpanded}>
          <DialogContent className="sm:max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-slate-900 text-white">
              <DialogTitle className="text-center font-black uppercase tracking-widest text-xs">Fijar Fecha Base</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <ShadcnCalendar
                mode="single" locale={es} selected={new Date(date + 'T12:00:00')}
                onSelect={d => { if (d) { setDate(d.toISOString().split('T')[0]); setIsCalendarExpanded(false) } }}
                className="rounded-2xl border-none" disabled={d => d > new Date()}
              />
            </div>
          </DialogContent>
        </Dialog>

        </TooltipProvider>
      </div>
      {/* LockScreen solo para dueños — empleados ya están autenticados */}
      {isOwner && !activeProfile && <LockScreen onUnlock={() => {}} />}
    </Layout>
  )
}

// ─── Expense Modal ────────────────────────────────────────────────────────────
function ExpenseModal({ onClose, onSaved, categories }) {
  const cats = categories?.length > 0 ? categories : EXPENSE_CATEGORIES
  const [form, setForm] = useState({ description: '', amount: '', category: cats[0], created_at: today() })
  const [saving, setSaving] = useState(false)
  const [showAmount, setShowAmount] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description || !form.amount) return toast.error('Completá los campos')
    setSaving(true)
    try {
      await postExpense({ ...form, amount: parseFormattedNumber(form.amount) })
      toast.success('Gasto guardado'); onSaved(); onClose()
    } catch { toast.error('Error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose() }} />
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest">Registrar Gasto</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form className="p-8 space-y-5" onSubmit={handleSubmit}>
          <input
            placeholder="Descripción..."
            autoFocus
            className="w-full h-14 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Monto"
              className={cn(
                "w-full h-14 rounded-2xl border border-slate-100 bg-slate-50 pl-4 pr-12 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-slate-200",
                showAmount ? "mask-none" : "mask-security"
              )}
              value={form.amount}
              onChange={e => setForm({ ...form, amount: fmtNumericInput(e.target.value) })}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowAmount(!showAmount)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
            >
              {showAmount ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
          <select
            className="w-full h-14 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-lg font-black focus:outline-none"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button type="submit" disabled={saving} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl active:scale-[0.98] transition-all">
            {saving ? 'Guardando...' : 'Guardar Gasto'}
          </Button>
        </form>
      </div>
    </div>
  )
}
