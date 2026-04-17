import { useState, useEffect } from 'react'
import Layout from '@/components/shared/Layout'
import { searchClientes, updateClientNotes } from '@/api/clientes'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  Users, 
  Search, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  BookOpen, 
  Save, 
  X,
  Loader2,
  Lock
} from 'lucide-react'

export default function ClientesPage() {
  const { role } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  
  const isOwner = role === 'owner'

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async (query = '') => {
    setLoading(true)
    try {
      const { data } = await searchClientes(query)
      setClientes(data)
    } catch {
      toast.error('Error al cargar la lista de clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    const value = e.target.value
    setSearch(value)
    // Debounce simple para no saturar la API
    const timeoutId = setTimeout(() => {
      fetchClientes(value)
    }, 400)
    return () => clearTimeout(timeoutId)
  }

  const openNotes = (client) => {
    setSelectedClient(client)
    setNotes(client.internal_notes || '')
  }

  const handleSaveNotes = async () => {
    if (!selectedClient) return
    setSaving(true)
    try {
      await updateClientNotes(selectedClient.id, notes)
      toast.success('Notas actualizadas correctamente')
      // Actualizar la lista local sin re-fetch completo
      setClientes(prev => prev.map(c => 
        c.id === selectedClient.id ? { ...c, internal_notes: notes } : c
      ))
      setSelectedClient(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar las notas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestión de Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Listado de clientes con interacciones en tu negocio.</p>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          className="pl-10 h-11 border-slate-200 shadow-sm"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Lista de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No se encontraron clientes</p>
            <p className="text-slate-400 text-sm">Probá buscando con otros términos.</p>
          </div>
        ) : (
          clientes.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-md transition-all duration-300 group border-slate-200 overflow-hidden relative">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                    {cliente.name.charAt(0).toUpperCase()}
                  </div>
                  {cliente.internal_notes && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 gap-1 px-2 py-0.5">
                      <BookOpen className="h-3 w-3" /> Notas
                    </Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="font-bold text-slate-900 truncate">{cliente.name}</h3>
                  <div className="flex items-center text-sm text-slate-500 gap-2">
                    <Phone className="h-3.5 w-3.5" /> {cliente.phone}
                  </div>
                  {cliente.email && (
                    <div className="flex items-center text-sm text-slate-500 gap-2">
                      <Mail className="h-3.5 w-3.5" /> {cliente.email}
                    </div>
                  )}
                  <div className="flex items-center text-xs text-slate-400 gap-2 pt-1">
                    <Calendar className="h-3 w-3" /> Registrado: {new Date(cliente.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  {isOwner ? (
                    <Button 
                      variant="outline" 
                      className="w-full text-slate-700 border-slate-200 h-9 text-xs font-semibold gap-2"
                      onClick={() => openNotes(cliente)}
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Ver Notas Internas
                    </Button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-slate-400 bg-slate-50 rounded-lg uppercase tracking-wider font-bold">
                      <Lock className="h-3 w-3" /> Notas Privadas (Solo Dueño)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal / Drawer de Notas (Hecho con CSS puro/Tailwind, sin Framer Motion) */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop con fade-in */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out opacity-100" 
            onClick={() => !saving && setSelectedClient(null)} 
          />
          
          {/* Modal Content con escala y fade-in */}
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden transition-all duration-300 ease-out transform scale-100 opacity-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Notas de {selectedClient.name}</h2>
                    <p className="text-xs text-slate-500">Estas notas solo son visibles para vos.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <textarea
                  className="w-full min-h-[200px] p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-700 text-sm leading-relaxed"
                  placeholder="Escribí aquí detalles importantes del cliente (preferencias, observaciones, historial relevante)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
                
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold gap-2"
                    onClick={handleSaveNotes}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Notas
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-12 rounded-xl text-slate-500 px-6"
                    onClick={() => setSelectedClient(null)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
