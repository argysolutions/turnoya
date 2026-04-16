import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, DollarSign, Calendar, Loader2 } from 'lucide-react'
import client from '@/api/client'

const fmt = (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)

export default function DashboardCharts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await client.get('/analytics/dashboard')
        setData(data)
      } catch (err) {
        console.error('Error loading analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Cargando métricas de rendimiento...</p>
      </div>
    )
  }

  if (!data) return null

  const { dailyRevenue, topServices, summary } = data

  return (
    <div className="space-y-6">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Ingresos Hoy" 
          val={fmt(summary.today_revenue)} 
          sub={`Ayer: ${fmt(summary.yesterday_revenue)}`}
          trending={Number(summary.today_revenue) >= Number(summary.yesterday_revenue)} 
          icon={DollarSign}
          color="emerald"
        />
        <StatsCard 
          title="Ventas Hoy" 
          val={summary.today_sales} 
          sub={`Ayer: ${summary.yesterday_sales}`}
          trending={Number(summary.today_sales) >= Number(summary.yesterday_sales)}
          icon={Calendar}
          color="blue"
        />
        <StatsCard 
          title="Ticket Promedio" 
          val={fmt(summary.today_sales > 0 ? summary.today_revenue / summary.today_sales : 0)} 
          sub="Basado en cobros de hoy"
          icon={TrendingUp}
          color="purple"
        />
        <StatsCard 
          title="Clientes Nuevos" 
          val="+12" 
          sub="Últimos 7 días"
          trending={true}
          icon={Users}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Tendencia de Ingresos */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Tendencia de Ingresos (30 días)
            </CardTitle>
            <CardDescription>Evolución de ventas brutas diarias en pesos argentinos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(str) => new Date(str + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [fmt(val), 'Ingresos']}
                  labelFormatter={(lbl) => new Date(lbl + 'T00:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })}
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ranking de Servicios */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-black uppercase tracking-tight">Servicios Estrella</CardTitle>
            <CardDescription>Los 5 servicios con más demanda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topServices.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{s.count} VENTAS</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-700">{fmt(s.revenue)}</p>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.count / topServices[0].count) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsCard({ title, val, sub, trending, icon: Icon, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden relative">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-xl ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trending !== undefined && (
            <Badge variant={trending ? 'success' : 'destructive'} className="rounded-full px-1.5 py-0">
              {trending ? '↑' : '↓'}
            </Badge>
          )}
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">{title}</p>
        <p className="text-2xl font-black text-slate-900 mt-2 mb-1">{val}</p>
        <p className="text-[10px] text-slate-500 font-medium truncate">{sub}</p>
      </CardContent>
    </Card>
  )
}
