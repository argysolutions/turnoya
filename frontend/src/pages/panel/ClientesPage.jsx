import { useState, useEffect } from 'react'
import { useClientes } from '@/hooks/useClientes'
import { useAuth } from '@/context/AuthContext'
import ClientesForm from '@/components/Clientes/ClientesForm'
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  Trash2, 
  Edit2, 
  Plus, 
  User,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Layout from '@/components/shared/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function ClientesPage() {
  const { isOwner } = useAuth()
  const { 
    clientes, 
    isLoading, 
    isError, 
    fetchClientes, 
    addCliente, 
    updateCliente, 
    deleteCliente 
  } = useClientes()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  const handleCreateOrUpdate = async (data) => {
    try {
      if (editingClient) {
        await updateCliente(editingClient.id, data)
        toast.success('Cliente actualizado correctamente')
      } else {
        await addCliente(data)
        toast.success('Cliente registrado con éxito')
      }
      setShowForm(false)
      setEditingClient(null)
    } catch (err) {
      toast.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) return
    try {
      await deleteCliente(id)
      toast.success('Cliente eliminado')
    } catch (err) {
      toast.error(err)
    }
  }

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-slate-900" />
              <h1 className="text-3xl md:text-2xl font-black text-slate-900 tracking-tight">Gestión de Clientes</h1>
            </div>
            <p className="text-lg md:text-sm font-bold md:font-normal text-slate-500 leading-tight">
              Administrá la base de datos de tus clientes y sus notas personalizadas.
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="h-14 md:h-10 text-xl md:text-sm font-black md:font-bold rounded-2xl md:rounded-xl gap-2 w-full sm:w-auto mt-2 sm:mt-0"
          >
            {showForm ? <Plus className="w-4 h-4 rotate-45 transition-transform" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cerrar' : 'Nuevo Cliente'}
          </Button>
        </header>

        {showForm && (
          <section className="animate-in ease-out duration-300 slide-in-from-top-4">
            <ClientesForm 
              onSubmit={handleCreateOrUpdate} 
              initialData={editingClient}
            />
          </section>
        )}

        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre, teléfono o email..."
              className="pl-12 md:pl-10 h-14 md:h-11 text-lg md:text-sm font-bold md:font-normal border-slate-200 shadow-sm rounded-2xl md:rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading && !clientes.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse h-40 bg-slate-50 border-none rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 bg-red-50 rounded-2xl border-2 border-dashed border-red-100 italic text-red-500">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Error: {isError}</p>
            </div>
          ) : !filteredClientes.length ? (
            <div className="text-center py-20 bg-slate-50 rounded-[2rem] md:rounded-2xl border-2 border-dashed border-slate-200 italic text-slate-400 px-4">
              <Users className="h-14 w-14 md:h-10 md:w-10 mx-auto mb-4 md:mb-2 opacity-20" />
              <p className="text-xl md:text-base font-black md:font-normal text-slate-400">No se encontraron clientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClientes.map((cliente) => (
                <Card key={cliente.id} className="group hover:shadow-lg transition-all border-slate-100 rounded-2xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4 md:gap-3">
                        <div className="w-14 h-14 md:w-10 md:h-10 bg-indigo-50 rounded-2xl md:rounded-xl flex items-center justify-center text-indigo-600 text-xl md:text-base font-black md:font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shrink-0">
                          {cliente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-2xl md:text-base font-black md:font-bold text-slate-900 truncate">{cliente.nombre}</h3>
                          <div className="flex items-center text-sm md:text-xs font-bold md:font-normal text-slate-400 gap-1.5 mt-0.5">
                            <Calendar className="h-4 w-4 md:h-3 md:w-3" /> {new Date(cliente.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 md:gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 md:h-8 md:w-8 rounded-xl md:rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                          onClick={() => {
                            setEditingClient(cliente)
                            setShowForm(true)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          <Edit2 className="h-5 w-5 md:h-4 md:w-4" />
                        </Button>
                        {isOwner && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 md:h-8 md:w-8 rounded-xl md:rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => handleDelete(cliente.id)}
                          >
                            <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 md:mt-4 space-y-3 md:space-y-2">
                      <div className="flex items-center text-lg md:text-sm font-bold md:font-normal text-slate-600 gap-3 md:gap-2">
                        <Phone className="h-5 w-5 md:h-3.5 md:w-3.5 text-slate-400" /> {cliente.telefono}
                      </div>
                      {cliente.email && (
                        <div className="flex items-center text-lg md:text-sm font-bold md:font-normal text-slate-600 gap-3 md:gap-2">
                          <Mail className="h-5 w-5 md:h-3.5 md:w-3.5 text-slate-400" /> {cliente.email}
                        </div>
                      )}
                    </div>

                    {cliente.notas_internas && (
                      <div className="mt-5 md:mt-4 p-4 md:p-3 bg-amber-50 rounded-2xl md:rounded-xl border border-amber-100">
                        <p className="text-sm md:text-[11px] font-black md:font-bold text-amber-600 uppercase tracking-tighter md:tracking-tight mb-1">Notas Internas</p>
                        <p className="text-base md:text-xs font-bold md:font-normal text-amber-800 line-clamp-3">{cliente.notas_internas}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
