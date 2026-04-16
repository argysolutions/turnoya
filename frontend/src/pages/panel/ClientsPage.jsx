import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getClients, updateClientNotes } from '@/api/clients'
import Layout from '@/components/shared/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  StickyNote, 
  Save, 
  Users,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data } = await getClients()
      setClients(data)
    } catch {
      toast.error('Error al cargar el listado de clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  const handleSelectClient = (client) => {
    setSelectedClient(client)
    setNotes(client.internal_notes || '')
  }

  const handleSaveNotes = async () => {
    if (!selectedClient) return
    setSaving(true)
    try {
      await updateClientNotes(selectedClient.id, notes)
      toast.success('Notas actualizadas correctamente')
      // Actualizar localmente
      setClients(clients.map(c => 
        c.id === selectedClient.id ? { ...c, internal_notes: notes } : c
      ))
    } catch {
      toast.error('Error al guardar las notas')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin registros'
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* HEADER & STATS */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                 <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Clientes</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">Base de datos de personas que han visitado tu negocio</p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-2 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Clientes</span>
                <span className="text-lg font-black text-slate-800">{clients.length}</span>
             </div>
             <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-2 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Frecuentes</span>
                <span className="text-lg font-black text-indigo-600">
                  {clients.filter(c => c.total_visits > 2).length}
                </span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LIST SIDEBAR */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre o celular..." 
                className="pl-10 h-12 bg-white border-slate-100 shadow-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 no-scrollbar">
              {loading ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl w-full" />
                ))
              ) : filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <motion.div
                    key={client.id}
                    layoutId={`client-${client.id}`}
                    onClick={() => handleSelectClient(client)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      selectedClient?.id === client.id 
                        ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-white border-slate-100 hover:border-indigo-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${
                        selectedClient?.id === client.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-base sm:text-sm font-bold ${selectedClient?.id === client.id ? 'text-white' : 'text-slate-900'}`}>
                          {client.name}
                        </span>
                        <span className={`text-sm sm:text-xs ${selectedClient?.id === client.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {client.phone}
                        </span>
                      </div>
                    </div>
                    {client.total_visits > 2 && (
                       <Badge className={selectedClient?.id === client.id ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600 border-none'}>
                         Top 🔥
                       </Badge>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 opacity-50">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No se encontraron clientes</p>
                </div>
              )}
            </div>
          </div>

          {/* DETAIL VIEW / EDITOR */}
          <div className="lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait">
              {selectedClient ? (
                <motion.div
                  key={selectedClient.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                       <div className="absolute -bottom-8 left-8">
                          <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-lg">
                             <div className="w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-600">
                                {selectedClient.name.charAt(0).toUpperCase()}
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <CardContent className="pt-12 pb-8 px-8">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                             <h2 className="text-2xl font-black text-slate-900">{selectedClient.name}</h2>
                             <div className="flex items-center gap-3 mt-2 text-slate-500">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                   <Phone className="w-3.5 h-3.5" /> {selectedClient.phone}
                                </span>
                                {selectedClient.email && (
                                   <>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                         <Mail className="w-3.5 h-3.5" /> {selectedClient.email}
                                      </span>
                                   </>
                                )}
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                                <History className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-slate-400 uppercase">Visitas</span>
                             </div>
                             <span className="text-2xl font-black text-slate-800">{selectedClient.total_visits}</span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Última</span>
                             </div>
                             <span className="text-sm font-bold text-slate-700">{formatDate(selectedClient.last_visit)}</span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Frecuencia</span>
                             </div>
                             <span className="text-sm font-bold text-slate-700">
                                {selectedClient.total_visits > 5 ? 'Muy Alta' : selectedClient.total_visits > 2 ? 'Media' : 'Baja'}
                             </span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Ingreso</span>
                             </div>
                             <span className="text-sm font-bold text-slate-700">{formatDate(selectedClient.created_at)}</span>
                          </div>
                       </div>

                       <div className="mt-8 space-y-4">
                          <div className="flex items-center justify-between">
                             <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-wide uppercase">
                                <StickyNote className="w-4 h-4 text-amber-500" />
                                Anotaciones Internas (Staff Only)
                             </h3>
                             {selectedClient.internal_notes !== notes && (
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                   Cambios sin guardar
                                </motion.span>
                             )}
                          </div>
                          
                          <div className="relative group">
                            <textarea
                              value={notes}
                              onChange={e => setNotes(e.target.value)}
                              placeholder="Escribe aquí detalles relevantes: alergias, preferencias, comportamiento, etc..."
                              className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-base sm:text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none shadow-inner"
                            />
                            <Button 
                              onClick={handleSaveNotes}
                              disabled={saving || selectedClient.internal_notes === notes}
                              className={`absolute bottom-4 right-4 h-11 px-6 rounded-xl font-bold transition-all shadow-lg ${
                                selectedClient.internal_notes === notes 
                                  ? 'bg-slate-200 text-slate-400' 
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                              }`}
                            >
                              {saving ? 'Guardando...' : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Guardar Nota
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-400 italic text-center">
                             Estas notas son privadas y solo visibles para el personal del negocio.
                          </p>
                       </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="h-full min-h-[500px] flex items-center justify-center bg-white border border-dashed border-slate-200 rounded-[40px] opacity-40">
                   <div className="text-center group">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                         <ChevronRight className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="text-lg font-bold text-slate-400">Seleccioná un cliente para ver su perfil</p>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  )
}
