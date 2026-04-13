import { useState, useEffect, useMemo, useCallback } from 'react'
import Layout from '@/components/shared/Layout'
import {
  getSales, postExpense, deleteExpense, getFinancesSummary, getExpenses,
  getCashSession, openCashSession, closeCashSession,
} from '@/api/sales'
import { getSettings } from '@/api/business'
import { getAppointment } from '@/api/appointments'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  subDays, isSameDay, startOfDay, addDays as fnsAddDays
} from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts'
import {
  ChevronLeft, ChevronRight, Printer, TrendingUp, TrendingDown,
  CreditCard, Wallet, ArrowLeftRight, HelpCircle, Eye, EyeOff,
  PlusCircle, Trash2, X, User, Lock, Unlock,
  Share2, ChevronDown, ChevronUp, Scissors, Phone, Clock,
  AlertTriangle, CheckCircle2, Info, Cloud, CalendarDays as CalendarIcon,
  BarChart3, Activity, Zap
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

function SessionBanner({ session, onOpen, onOpenCierre, loading }) {
  if (loading) return null
  
  if (!session || session.status === 'closed') {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Unlock className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Caja Cerrada</span>
        </div>
        <Button onClick={onOpen} variant="ghost" className="h-7 px-3 text-[9px] font-black uppercase bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg">Abrir Sesión</Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Sesión Abierta</span>
        </div>
        <div className="h-3 w-px bg-emerald-100 hidden sm:block" />
        <span className="text-[10px] font-bold text-emerald-600 hidden sm:block">Inicio: {fmt(session.initial_amount)}</span>
      </div>
      <Button 
        onClick={onOpenCierre} 
        variant="ghost" 
        className="h-7 px-3 text-[9px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
      >
        Cerrar Caja
      </Button>
    </div>
  )
}

function AperturaBanner({ onOpen }) {
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleOpen = async () => {
    const v = parseFloat(amount)
    if (isNaN(v) || v < 0) return toast.error('Monto inicial inválido')
    setSaving(true)
    try {
      await onOpen(v)
      setOpen(false)
      setAmount('')
    } finally {
      setSaving(false)
    }
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
        
        {!open ? (
          <Button onClick={() => setOpen(true)} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl">Configurar Apertura</Button>
        ) : (
          <div className="flex flex-col w-full gap-2">
            <input 
              type="number" 
              placeholder="0.00" 
              className="w-full h-12 rounded-2xl border border-amber-200 bg-white px-4 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
            <div className="flex gap-2">
              <Button onClick={() => setOpen(false)} variant="ghost" className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleOpen} disabled={saving} className="flex-[2] h-10 bg-amber-900 text-white font-black uppercase text-[10px] rounded-xl tracking-widest">Confirmar</Button>
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
    const v = parseFloat(counted)
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
            <input type="number" value={counted} onChange={e => setCounted(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none" placeholder="0,00" />
          </div>
          <Button onClick={handleClose} disabled={saving} className="w-full h-12 bg-slate-900 text-white uppercase font-black text-xs tracking-widest rounded-2xl">{saving ? 'Cerrando...' : 'Confirmar Cierre y Guardar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function HeroBalanceCard({ summary, hidden, onOpenSales, onOpenExpenses }) {
  const byMethod = summary?.byMethod || {}
  const efectivo = byMethod['Efectivo']?.total ?? 0
  const digital = (byMethod['Transferencia']?.total ?? 0) + (byMethod['Tarjeta']?.total ?? 0)

  const fmtValue = (val) => (
    <span className={hidden ? 'blur-lg select-none opacity-40' : ''}>{fmt(val)}</span>
  )

  return (
    <div className="w-full bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 opacity-20" />
      
      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Balance Neto Estimado</span>
      
      <div className="relative mb-6">
        <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter transition-all">
          {fmtValue(summary?.netBalance)}
        </h1>
      </div>

      <div className="flex items-center gap-3 text-[11px] sm:text-xs font-bold text-slate-400">
        <div className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer" onClick={onOpenSales}>
          <Wallet className="w-3.5 h-3.5" />
          <span>Efectivo: {fmtValue(efectivo)}</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-200" />
        <div className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer" onClick={onOpenSales}>
          <CreditCard className="w-3.5 h-3.5" />
          <span>Digital: {fmtValue(digital)}</span>
        </div>
      </div>
      
      <div className="mt-8 flex gap-4">
        <button onClick={onOpenSales} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Ventas</button>
        <button onClick={onOpenExpenses} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Egresos</button>
      </div>
    </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const [date, setDate] = useState(today())
  const [viewRange, setViewRange] = useState('daily')
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(() => localStorage.getItem('turno_ya_privacy_mode') === 'true')
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  const [businessSettings, setBusinessSettings] = useState(null)

  const [showSalesDrawer, setShowSalesDrawer] = useState(false)
  const [showExpensesDrawer, setShowExpensesDrawer] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showSessionDrawer, setShowSessionDrawer] = useState(false)
  const [showStaffDrawer, setShowStaffDrawer] = useState(false)
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [drawerSale, setDrawerSale] = useState(null)
  const [isTrendExpanded, setIsTrendExpanded] = useState(false)

  useEffect(() => { localStorage.setItem('turno_ya_privacy_mode', hidden) }, [hidden])

  const rangeDates = useMemo(() => {
    const d = new Date(date + 'T12:00:00')
    switch (viewRange) {
      case 'weekly':    return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) }
      case 'monthly':   return { start: startOfMonth(d), end: endOfMonth(d) }
      case 'quarterly': return { start: startOfQuarter(d), end: endOfQuarter(d) }
      case 'yearly':    return { start: startOfYear(d), end: endOfYear(d) }
      default:          return { start: d, end: d }
    }
  }, [viewRange, date])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const isDaily = viewRange === 'daily'
      const startStr = rangeDates.start.toISOString().split('T')[0]
      const endStr = rangeDates.end.toISOString().split('T')[0]

      const [summaryRes, salesRes, sessionRes, settingsRes] = await Promise.all([
        getFinancesSummary({ 
          date: isDaily ? date : null,
          startDate: isDaily ? null : startStr,
          endDate: isDaily ? null : endStr,
          includeTrend: true
        }),
        getSales(isDaily ? date : null),
        getCashSession(date),
        getSettings()
      ])

      setSummary(summaryRes.data)
      setTrendData(summaryRes.data.trend || [])
      setSales(salesRes.data.sales || [])
      setSession(sessionRes.data.session)
      setBusinessSettings(settingsRes.data)
    } finally { setLoading(false); setSessionLoading(false) }
  }, [date, viewRange, rangeDates])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOpenCaja = async (amt) => {
    const { data } = await openCashSession(amt)
    setSession(data.session); toast.success('Caja abierta')
  }

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
    <span className={hidden ? 'blur-md select-none opacity-50' : ''}>{fmt(amount)}</span>
  )

  const isToday = date === today()

  return (
    <Layout>
      <TooltipProvider>
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 h-full overflow-y-auto scrollbar-hide">
          
          {/* Operative Header & Filters */}
          <div className="flex flex-col gap-4 sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md -mx-4 px-4 pb-2 pt-1 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Caja</h1>
                <Tabs value={viewRange} onValueChange={setViewRange} className="bg-slate-100/50 p-1 rounded-xl">
                  <TabsList className="bg-transparent gap-0">
                    <TabsTrigger value="daily" className="text-[9px] px-3 py-1 uppercase font-black tracking-tighter h-6">Día</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-[9px] px-3 py-1 uppercase font-black tracking-tighter h-6">Sem</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-[9px] px-3 py-1 uppercase font-black tracking-tighter h-6">Mes</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-100 rounded-lg p-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDate(fnsAddDays(new Date(date + 'T12:00:00'), -1))}><ChevronLeft className="w-3 h-3" /></Button>
                  <button onClick={() => setIsCalendarExpanded(true)} className="px-2 text-[9px] font-black uppercase tracking-tight">{isToday ? 'Hoy' : fmtDateShort(date)}</button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDate(fnsAddDays(new Date(date + 'T12:00:00'), 1))} disabled={isToday}><ChevronRight className="w-3 h-3" /></Button>
                </div>
                <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${hidden ? 'text-blue-500 bg-blue-50' : 'text-slate-400'}`} onClick={() => setHidden(!hidden)}>
                  {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <SessionBanner 
              session={session} 
              onOpen={() => setShowSessionDrawer(true)} 
              onOpenCierre={() => setShowCierreModal(true)} 
              loading={sessionLoading} 
            />
          </div>

          {/* Main Operative View */}
          <div className="flex flex-col gap-6">
            <HeroBalanceCard 
              summary={summary} 
              hidden={hidden} 
              onOpenSales={() => setShowSalesDrawer(true)} 
              onOpenExpenses={() => setShowExpensesDrawer(true)} 
            />

            {/* Quick Actions Strip */}
            <div className="flex items-center justify-center gap-6 py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setShowExpenseModal(true)} className="w-12 h-12 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white text-[10px] uppercase font-black px-3 py-1 rounded-xl">Registrar Gasto</TooltipContent>
              </Tooltip>

              {businessSettings?.showCommissions && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowStaffDrawer(true)} className="w-12 h-12 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm">
                      <Scissors className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-[10px] uppercase font-black px-3 py-1">Ver Comisiones</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="w-12 h-12 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm">
                    <Share2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white text-[10px] uppercase font-black px-3 py-1">Exportar Reporte</TooltipContent>
              </Tooltip>
            </div>
            
            {/* Trend Analysis Accordion */}
            <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white/30">
              <button 
                onClick={() => setIsTrendExpanded(!isTrendExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Análisis de Tendencia</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isTrendExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isTrendExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2">
                       <div className="h-[200px] w-full">
                          {loading ? (
                            <div className="w-full h-full flex items-center justify-center"><Activity className="w-6 h-6 text-slate-200 animate-spin" /></div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide /> <YAxis hide domain={['auto', 'auto']} />
                                <RechartsTooltip content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-slate-900 p-2 rounded-xl shadow-xl">
                                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{payload[0].payload.date}</p>
                                        <p className="text-[10px] font-black text-emerald-400">+{fmt(payload[0].value)}</p>
                                        <p className="text-[10px] font-black text-red-400">-{fmt(payload[1].value)}</p>
                                      </div>
                                    )
                                  }
                                  return null
                                }} />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInc)" />
                                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                       </div>
                       <div className="mt-4 flex justify-between items-center text-[8px] font-black uppercase text-slate-400 tracking-wider">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ingresos</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Egresos</span>
                          </div>
                          <span>Proyectado al cierre del periodo</span>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Global Overlays */}
          <AnimatePresence>
          {showSalesDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSalesDrawer(false)} className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="relative bg-white w-full sm:w-96 p-6 border-l border-slate-100 flex flex-col gap-6 shadow-2xl h-full">
                <div className="flex justify-between items-center shrink-0">
                   <h2 className="text-sm font-black uppercase tracking-widest">Historial de Ventas</h2>
                   <Button variant="ghost" size="icon" onClick={() => setShowSalesDrawer(false)}><X className="w-5 h-5"/></Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                  {sales.length === 0 ? (
                    <p className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest">Sin ventas registradas</p>
                  ) : sales.map(s => (
                    <button key={s.id} onClick={() => setDrawerSale(s)} className="w-full text-left p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 flex justify-between items-center group">
                      <div><p className="text-sm font-black text-slate-800">{s.client_name || 'Sin nombre'}</p><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fmtTime(s.created_at)} hs · {s.payment_method}</span></div>
                      <span className="text-lg font-black text-slate-900 tracking-tighter">{display(s.amount)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {showExpensesDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExpensesDrawer(false)} className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
               <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="relative bg-white w-full sm:w-96 p-6 border-l border-slate-100 flex flex-col gap-6 shadow-2xl h-full">
                  <div className="flex justify-between items-center">
                     <h2 className="text-sm font-black uppercase tracking-widest">Auditoría de Egresos</h2>
                     <Button variant="ghost" size="icon" onClick={() => setShowExpensesDrawer(false)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                    {summary?.totalExpenses === 0 ? (
                      <p className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest">Sin gastos registrados</p>
                    ) : (
                      <p className="text-xs text-slate-400 text-center italic">Para gestionar gastos individuales, usá el buscador de la Agenda o contactá soporte.</p>
                    )}
                  </div>
               </motion.div>
            </div>
          )}

          {showStaffDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStaffDrawer(false)} className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
               <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="relative bg-white w-full sm:w-96 p-6 border-l border-slate-100 flex flex-col gap-6 shadow-2xl h-full">
                  <div className="flex justify-between items-center">
                     <h2 className="text-sm font-black uppercase tracking-widest text-blue-600">Comisiones Staff</h2>
                     <Button variant="ghost" size="icon" onClick={() => setShowStaffDrawer(false)}><X className="w-5 h-5"/></Button>
                  </div>
                  <div className="space-y-4">
                     {professionals.map(p => {
                        const rate = businessSettings?.commission_rate || 0
                        return (
                          <div key={p.name} className="p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                             <div className="flex justify-between items-baseline mb-4"><span className="text-sm font-black text-slate-800 uppercase">{p.name}</span><span className="text-xs text-slate-400">{fmt(p.total)} Bruto</span></div>
                             <div className="flex justify-between items-center p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] font-black uppercase text-slate-400">Neto Prof.</span>
                                <span className="text-2xl font-black text-blue-600 tracking-tighter">{display(p.total * rate / 100)}</span>
                             </div>
                          </div>
                        )
                     })}
                  </div>
               </motion.div>
            </div>
          )}

          {showSessionDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSessionDrawer(false)} className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
               <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="relative bg-white w-full sm:w-80 p-8 border-l border-slate-100 flex flex-col gap-10 shadow-2xl h-full">
                  <div className="text-center shrink-0"><h2 className="text-xl font-black uppercase tracking-tighter">Sesión de Caja</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control físico de efectivo</p></div>
                  <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                     {isToday && !session && !sessionLoading && <AperturaBanner onOpen={handleOpenCaja} loading={sessionLoading} />}
                     {session && (
                       <div className="space-y-6">
                         <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] text-center shadow-xl">
                            <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Efectivo Esperado</p>
                            <p className="text-4xl font-black">{fmt(session.expected_cash)}</p>
                         </div>
                         {session.status === 'open' ? (
                            <Button onClick={() => setShowCierreModal(true)} className="w-full h-14 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em]">Finalizar Caja</Button>
                         ) : (
                            <div className="p-5 rounded-3xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase text-center border border-emerald-100 flex flex-col gap-1">
                               <span>Caja Cerrada Exitosamente</span>
                               <span className="text-sm">Diff: {fmt(session.difference)}</span>
                            </div>
                         )}
                       </div>
                     )}
                  </div>
                  <Button variant="ghost" className="shrink-0 uppercase font-black text-[10px] tracking-widest text-slate-300" onClick={() => setShowSessionDrawer(false)}>Cerrar Panel</Button>
               </motion.div>
            </div>
          )}

          {drawerSale && <SaleDetailDrawer sale={drawerSale} onClose={() => setDrawerSale(null)} />}
          {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} onSaved={fetchData} sessionLocked={session?.status === 'closed'} categories={businessSettings?.expense_categories} />}
          {showCierreModal && <CierreCajaModal session={session} summary={summary} onClose={() => setShowCierreModal(false)} onClosed={s => { setSession(s); fetchData() }} />}
          </AnimatePresence>

          <Dialog open={isCalendarExpanded} onOpenChange={setIsCalendarExpanded}>
            <DialogContent className="sm:max-w-sm rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-6 bg-slate-900 text-white"><DialogTitle className="text-center font-black uppercase tracking-widest text-xs">Fijar Fecha Base</DialogTitle></DialogHeader>
              <div className="p-4">
                <ShadcnCalendar 
                  mode="single" locale={es} selected={new Date(date + 'T12:00:00')} 
                  onSelect={d => { if(d){ setDate(d.toISOString().split('T')[0]); setIsCalendarExpanded(false) } }} 
                  className="rounded-2xl border-none" disabled={d => d > new Date()} 
                />
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </Layout>
  )
}

function ExpenseModal({ onClose, onSaved, sessionLocked, categories }) {
  const cats = categories?.length > 0 ? categories : EXPENSE_CATEGORIES
  const [form, setForm] = useState({ description: '', amount: '', category: cats[0], created_at: today() })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description || !form.amount) return toast.error('Completá los campos')
    setSaving(true)
    try {
      await postExpense({ ...form, amount: parseFloat(form.amount) })
      toast.success('Gasto guardado'); onSaved(); onClose()
    } catch { toast.error('Error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <h3 className="text-xs font-black uppercase tracking-widest">Registrar Gasto</h3>
             <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <form className="p-8 space-y-5" onSubmit={handleSubmit}>
             <input placeholder="Descripción..." className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50 px-4 text-sm" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
             <input type="number" placeholder="Monto" className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50 px-4 text-sm" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
             <select className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50 px-4 text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <Button type="submit" disabled={saving} className="w-full h-12 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Guardar Gasto</Button>
          </form>
       </div>
    </div>
  )
}
