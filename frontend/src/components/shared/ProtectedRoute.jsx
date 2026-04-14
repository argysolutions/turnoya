import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { role, loading } = useAuth()

  // Mientras el contexto decodifica el token, mostramos un estado neutro
  if (loading) return null

  // Sin rol/token → login
  if (!role) return <Navigate to="/login" replace />

  // Si se exige un rol específico y no coincide → redirigir al dashboard (no destruir sesión)
  if (requiredRole) {
    const currentRole = role.toLowerCase().trim()
    const targetRole = requiredRole.toLowerCase().trim()

    if (currentRole !== targetRole) {
      console.warn(`Acceso denegado: se requiere "${targetRole}", se tiene "${currentRole}". Redirigiendo.`)
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}