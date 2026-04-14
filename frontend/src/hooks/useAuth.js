/**
 * useAuth — re-export conveniente del hook del AuthContext.
 *
 * Importar desde aquí en lugar del contexto directamente:
 *   import { useAuth } from '@/hooks/useAuth'
 *
 * Expone: { isAuthenticated, token, role, businessId, staffId,
 *            isOwner, isEmployee, setToken, logout }
 */
export { useAuth } from '@/context/AuthContext'
