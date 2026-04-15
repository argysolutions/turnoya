import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Share2, Search, FileText, Download,
  Menu, Banknote, Smartphone, Lock, ArrowRight, ShieldOff,
} from 'lucide-react'
import { useEncryptedPrefs } from '@/hooks/useEncryptedPrefs'

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

function SessionBanner({ session, onOpen, onOpenCierre, loading, isOwner }) {
  if (loading) return null

  if (session?.status === 'open') {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Sesión Abierta</span>
          </div>
          <div className="h-3 w-px bg-emerald-200 hidden sm:block" />
          <span className="text-[10px] font-bold text-emerald-600 hidden sm:block">Inicio: {fmt(session.initial_amount)}</span>
        </div>
        {isOwner && (
          <Button
            onClick={onOpenCierre}
            variant="ghost"
            className="h-7 px-3 text-[9px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
          >
            Cerrar Caja
          </Button>
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

  return <AperturaBanner inline onOpen={onOpen} />
}

function AperturaBanner({ onOpen, inline = false }) {
  const [amount, setAmount] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

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
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Caja Cerrada</span>
          </div>
          {!formOpen && (
            <Button
              onClick={() => setFormOpen(true)}
              variant="ghost"
              className="h-7 px-3 text-[9px] font-black uppercase bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg"
            >
              Abrir Sesión
            </Button>
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
                  className="h-9 px-4 bg-amber-600 text-white font-black text-xs rounded-xl hover:bg-amber-700"
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
          <Button onClick={() => setFormOpen(true)} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl">Configurar Apertura</Button>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="w-full h-12 rounded-2xl border border-amber-200 bg-white px-4 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              value={amount}
              onChange={e => setAmount(fmtNumericInput(e.target.value))}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={() => setFormOpen(false)} variant="ghost" className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleOpen} disabled={saving} className="flex-[2] h-10 bg-amber-900 text-white font-black uppercase text-[10px] rounded-xl tracking-widest">{saving ? 'Abriendo...' : 'Confirmar'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cierre de Caja Modal ────────────────────────────────────────────────────
function CierreCajaModal({ session, summary, onClose, onClosed }) {
  const [counted, setCounted] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = async () => {
    const v = parseFormattedNumber(counted)
    if (isNaN(v) || v < 0) return toast.error('Monto inválido')
    setSaving(true)
    try {
      const { data } = await closeCashSession(v)
      toast.success('Caja cerrada')
      onClosed(data.session)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-[2.5rem]">
        <DialogHeader><DialogTitle className="uppercase tracking-widest text-[10px] font-black text-slate-400">Resumen de Cierre</DialogTitle></DialogHeader>
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[8px] font-black uppercase text-emerald-600 block mb-1">Ventas Brutas</span>
              <span className="text-sm font-black text-emerald-900">{fmt(summary?.totalIncome)}</span>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
              <span className="text-[8px] font-black uppercase text-red-600 block mb-1">Egresos Totales</span>
              <span className="text-sm font-black text-red-900">{fmt(summary?.totalExpenses)}</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Efectivo Esperado</p>
              <p className="text-xl font-black">{fmt(session?.expected_cash)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Cant. Cobros</p>
              <p className="text-xl font-black">{summary?.salesCount || 0}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-slate-400 px-1">Efectivo contado físico</label>
            <input
              type="text"
              inputMode="numeric"
              value={counted}
              onChange={e => setCounted(fmtNumericInput(e.target.value))}
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
              placeholder="0"
            />
          </div>
          <Button onClick={handleClose} disabled={saving} className="w-full h-12 bg-slate-900 text-white uppercase font-black text-xs tracking-widest rounded-2xl">
            {saving ? 'Cerrando...' : 'Confirmar Cierre y Guardar'}
          </Button>
        </div>
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
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Monto total</p>
          <p className="text-4xl font-black">{fmt(sale.amount)}</p>
          <div className="mt-4 flex gap-2">
            <Badge className="bg-white/10 text-white border-none">{sale.payment_method}</Badge>
            {sale.professional_name && <Badge variant="outline" className="border-white/20 text-white">{sale.professional_name}</Badge>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex justify-between text-xs"><span className="text-slate-400">Cliente</span><span className="font-bold">{sale.client_name || '—'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Fecha/Hora</span><span className="font-bold">{fmtTime(sale.created_at)} hs</span></div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const Item = ({ icon: IconComponent, label, onClick, accent }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-slate-50 text-slate-700"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
      accent === 'red' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'
    }`}>
      <IconComponent className="w-4 h-4" />
    </div>
    <span className="text-sm font-semibold">{label}</span>
  </button>
)

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
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 mb-1">Operaciones</p>
          <div className="space-y-0.5">
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
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">Arqueo de Caja</p>
          <div className="mx-1 p-4 rounded-2xl bg-slate-900 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Esperado</p>
                <p className="text-base font-black">{fmt(session.expected_cash)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase font-black text-slate-500 mb-0.5">Inicial</p>
                <p className="text-base font-black">{fmt(session.initial_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comisiones Staff */}
      {professionals.length > 0 && commissionRate > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">Comisiones Staff ({commissionRate}%)</p>
          <div className="mx-1 space-y-2">
            {professionals.map(p => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">{p.name}</p>
                  <p className="text-[10px] text-slate-400">Bruto: {fmt(p.total)}</p>
                </div>
                <p className="text-sm font-black text-blue-600">{display(p.total * commissionRate / 100)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exportación */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 mb-1">Exportar Cierre</p>
        <div className="space-y-0.5">
          <Item icon={Share2} label="Enviar por WhatsApp" onClick={handleWhatsAppExport} />
          <Item icon={FileText} label="Descargar TXT" onClick={handleTXTDownload} />
          <Item icon={Download} label="Descargar XML" onClick={handleXMLDownload} />
        </div>
      </div>
    </div>
  )
}

// ─── Management Drawer (Mobile) ───────────────────────────────────────────────
function ManagementDrawer({ onClose, ...contentProps }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative bg-white w-[85vw] max-w-sm border-l border-slate-100 shadow-2xl h-full flex flex-col"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.x > 80) onClose() }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle visual */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-slate-200 rounded-full -ml-0.5 opacity-60" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Gestión y Reportes</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <ManagementContent {...contentProps} />
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="ghost" className="w-full uppercase font-black text-[10px] tracking-widest text-slate-300" onClick={onClose}>Cerrar Panel</Button>
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
  const { isOwner, activeProfile, clearActiveProfile, loading: authLoading } = useAuth()
  const prefs = useEncryptedPrefs()

  // Limpiar perfil activo al desmontar (pide PIN cada vez que se entra a Caja)
  useEffect(() => {
    return () => clearActiveProfile()
  }, [clearActiveProfile])

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

  // UI States
  const [showManagementDrawer, setShowManagementDrawer] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [drawerSale, setDrawerSale] = useState(null)
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState('')

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
      const [summaryRes, salesRes, sessionRes, settingsRes, expensesRes] = await Promise.all([
        getFinancesSummary({ date, includeTrend: false }),
        getSales(date),
        getCashSession(date),
        getSettings(),
        getExpenses({ date })
      ])
      setSummary(summaryRes.data)

      // Empleados solo ven sus propios cobros (filtrado por staffId en el futuro
      // o por professional_name). Por ahora el servidor devuelve todo y
      // el frontend filtra para la vista del empleado.
      const allSales = salesRes.data.sales || []
      setSales(allSales)

      setSession(sessionRes.data.session)
      setBusinessSettings(settingsRes.data)
      setExpenses(expensesRes.data.expenses || [])
    } finally { setLoading(false); setSessionLoading(false) }
  }, [date, authLoading])

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

  const ledgerEntries = useMemo(() => {
    // Si es empleado, filtrar para ver solo sus movimientos
    const filteredSales = isOwner 
      ? sales 
      : sales.filter(s => s.professional_name === activeProfile?.professional_name)
    
    const filteredExpenses = isOwner ? expenses : [] // Empleados no suelen ver gastos generales

    const entries = [
      ...filteredSales.map(s => ({
        type: 'income', id: `s-${s.id}`,
        description: s.client_name || 'Venta',
        amount: parseFloat(s.amount),
        method: s.payment_method,
        time: s.created_at,
        raw: s,
      })),
      ...filteredExpenses.map(e => ({
        type: 'expense', id: `e-${e.id}`,
        description: e.description || 'Gasto',
        amount: parseFloat(e.amount),
        category: e.category,
        time: e.created_at,
      }))
    ]
    // Orden cronológico ascendente (más antiguo primero, como un ledger real)
    entries.sort((a, b) => new Date(a.time) - new Date(b.time))
    if (ledgerFilter.trim()) {
      const q = ledgerFilter.toLowerCase()
      return entries.filter(e => e.description?.toLowerCase().includes(q))
    }
    return entries
  }, [sales, expenses, ledgerFilter, isOwner, activeProfile])

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

  return (
    <Layout>
      <div className={`transition-all duration-700 ${!activeProfile ? 'blur-3xl grayscale-[0.2] brightness-95 opacity-80 pointer-events-none select-none' : ''}`}>
        <TooltipProvider>
          {/*
            ── Outer container: full-bleed ledger layout ──
            En desktop: w-3/4 Ledger + w-1/4 Sidebar fijo.
            En mobile: columna única.
          */}
          <div className="flex min-h-full gap-0 lg:gap-6 max-w-7xl mx-auto">


          {/* ═══════════════════════════════════════════
              COLUMNA LEDGER (3/4 desktop, full mobile)
          ══════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 pb-10">

            {/* ── HEADER ─────────────────────────────── */}
            <div className="flex items-center gap-3 sticky top-14 z-40 bg-slate-50 -mx-4 px-4 py-3 border-b border-slate-100/80">

              {/* Título CAJA + Privacy Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col">
                  <h1 className="text-xl font-semibold text-slate-900">Caja</h1>
                  <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Control de ventas y gastos</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      id="privacy-toggle"
                      onClick={() => setHidden(!hidden)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        hidden
                          ? 'bg-blue-50 text-blue-500 ring-1 ring-blue-100'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-white'
                      }`}
                    >
                      {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    {hidden ? 'Mostrar montos' : 'Ocultar montos'}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Selector de fecha centrado */}
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-0.5 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                    onClick={() => changeDate(-1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <button
                    id="date-picker-trigger"
                    onClick={() => setIsCalendarExpanded(true)}
                    className="px-3 text-[10px] font-black uppercase tracking-tight text-slate-700 min-w-[64px] text-center hover:text-slate-900 transition-colors"
                  >
                    {isToday ? 'HOY' : fmtDateShort(date)}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                    onClick={() => changeDate(1)}
                    disabled={isToday}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Hamburger (solo en mobile, solo para dueño que tiene el panel de gestión) */}
              {isOwner ? (
                <button
                  id="management-drawer-trigger"
                  onClick={() => setShowManagementDrawer(true)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-100 transition-all lg:hidden shrink-0"
                >
                  <Menu className="w-4.5 h-4.5" />
                </button>
              ) : (
                <div className="w-9 h-9 shrink-0 lg:hidden" />
              )}

              {/* Spacer invisible para desktop (mantiene la fecha centrada) */}
              <div className="hidden lg:block w-[36px] shrink-0" />
            </div>

            {/* ── SESSION BANNER ─────────────────────── */}
            <SessionBanner
              session={session}
              onOpen={handleOpenCaja}
              onOpenCierre={() => setShowCierreModal(true)}
              loading={sessionLoading}
              isOwner={isOwner}
            />

            {/* ── DOS TARJETAS PRINCIPALES (Solo Dueño) ───────────── */}
            {isOwner && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Disponible Digital */}
                <div className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Disponible Digital</span>
                  </div>
                  <p className="text-[2rem] font-semibold text-slate-900 tracking-tight leading-none mb-3">
                    {display(digitalTotal)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                    {(byMethod['Transferencia']?.total ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        {display(byMethod['Transferencia'].total)}
                      </span>
                    )}
                    {(byMethod['Tarjeta']?.total ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-2.5 h-2.5" />
                        {display(byMethod['Tarjeta'].total)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Efectivo en Cajón */}
                <div className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Efectivo en Cajón</span>
                  </div>
                  <p className="text-[2rem] font-semibold text-slate-900 tracking-tight leading-none mb-3">
                    {display(efectivoTotal)}
                  </p>
                  {session?.status === 'open' && (
                    <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Esperado: {display(session.expected_cash)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── VER DETALLE (Solo Dueño) ────────────────────────── */}
            {isOwner && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  id="detail-expand-toggle"
                  onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                  className="w-full px-5 py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50/60 transition-colors"
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
                          <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Balance Neto</p>
                          <p className="text-lg font-semibold text-slate-900 leading-tight">{display(summary?.netBalance)}</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/40 mt-4">
                          <p className="text-[9px] font-black uppercase text-emerald-600 mb-1.5">Ventas Brutas</p>
                          <p className="text-lg font-semibold text-emerald-900 leading-tight">{display(summary?.totalIncome)}</p>
                          <p className="text-[9px] font-bold text-emerald-400 mt-1">{summary?.salesCount || 0} cobros</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-red-50/50 border border-red-100/30 mt-4">
                          <p className="text-[9px] font-black uppercase text-red-500 mb-1.5">Gastos Totales</p>
                          <p className="text-lg font-semibold text-red-900 leading-tight">{display(summary?.totalExpenses)}</p>
                          <p className="text-[9px] font-bold text-red-400 mt-1">{summary?.expensesCount || 0} egresos</p>
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

                {/* Buscador como header del ledger */}
                <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-3 bg-white sticky top-0">
                  <Search className="w-4 h-4 text-slate-300 shrink-0" />
                  <input
                    id="ledger-search"
                    type="text"
                    placeholder="Buscar por cliente..."
                    value={ledgerFilter}
                    onChange={e => setLedgerFilter(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-slate-300 placeholder:font-normal text-slate-700"
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
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Sin movimientos</p>
                    <p className="text-[11px] text-slate-400">Finalizá turnos o agregá gastos para verlos aquí.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {ledgerEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => entry.type === 'income' && entry.raw ? setDrawerSale(entry.raw) : null}
                        className={`w-full text-left px-4 py-3.5 flex items-center justify-between transition-colors group ${
                          entry.type === 'income'
                            ? 'hover:bg-slate-50/80 cursor-pointer'
                            : 'cursor-default'
                        }`}
                      >
                        {/* Left: dot + info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colored dot */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            entry.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'
                          }`} />

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
                              {entry.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mt-0.5">
                              <span>{fmtTime(entry.time)}</span>
                              {entry.method && (
                                <>
                                  <span className="text-slate-200">·</span>
                                  <span className="flex items-center gap-0.5">
                                    {METHOD_ICON[entry.method]}
                                    {entry.method}
                                  </span>
                                </>
                              )}
                              {entry.category && (
                                <>
                                  <span className="text-slate-200">·</span>
                                  <span>{entry.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: amount */}
                        <span className={`text-sm font-black tabular-nums shrink-0 ml-4 ${
                          entry.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          <span className={hidden ? 'blur-md select-none' : ''}>
                            {entry.type === 'expense' ? '−' : '+'} {fmt(entry.amount)}
                          </span>
                        </span>
                      </button>
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
            <aside className="hidden lg:flex flex-col w-[260px] xl:w-[280px] shrink-0">
              <div className="sticky top-16 bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-slate-50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gestión y Reportes</p>
                </div>
                <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-hide">
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
      {!activeProfile && <LockScreen onUnlock={() => {}} />}
    </Layout>
  )
}

// ─── Expense Modal ────────────────────────────────────────────────────────────
function ExpenseModal({ onClose, onSaved, categories }) {
  const cats = categories?.length > 0 ? categories : EXPENSE_CATEGORIES
  const [form, setForm] = useState({ description: '', amount: '', category: cats[0], created_at: today() })
  const [saving, setSaving] = useState(false)

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
            className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Monto"
            className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: fmtNumericInput(e.target.value) })}
          />
          <select
            className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm focus:outline-none"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button type="submit" disabled={saving} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">
            {saving ? 'Guardando...' : 'Guardar Gasto'}
          </Button>
        </form>
      </div>
    </div>
  )
}
