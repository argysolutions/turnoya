import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * ProtectedRoute con control de rol.
 *
 * Comportamiento por status HTTP:
 *   - Sin token / token inválido → redirect /login (401)
 *   - Token válido pero rol insuficiente → redirect /sin-acceso (403)
 *     NO hace logout: el usuario está autenticado, solo no tiene permisos.
 *
 * @param {string|null} requiredRole - 'dueño' | 'empleado' | null (cualquier autenticado)
 */
export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && String(role).toLowerCase() !== String(requiredRole).toLowerCase()) {
    // 403: autenticado pero insuficiente rol — no desloguear
    return <Navigate to="/sin-acceso" replace />
  }

  return children
}