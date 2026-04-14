import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Hook de sincronización inteligente al reconectar.
 *
 * Al detectar navigator.onLine = true:
 *  1. Valida el token actual contra el servidor (GET /finances/session)
 *  2. Si 401 → token expirado → logout automático
 *  3. Si 403 → logueado pero sin permisos (no desloguear — solo notificar)
 *  4. Si 200 → reconexión OK → llama a onReconnect() para refrescar datos
 *
 * No sincroniza datos financieros locales → no hay datos financieros locales.
 */
export function useOnlineSync({ onReconnect, onExpired, onForbidden } = {}) {
  const { token, logout, isAuthenticated } = useAuth()
  const isValidatingRef = useRef(false)

  const validateToken = useCallback(async () => {
    if (!isAuthenticated || !token || isValidatingRef.current) return
    isValidatingRef.current = true

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finances/session`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
        }
      )

      if (response.status === 401) {
        // Token expirado o inválido → logout limpio
        logout()
        onExpired?.()
        return
      }

      if (response.status === 403) {
        // Autenticado pero sin permisos — no desloguear
        onForbidden?.()
        return
      }

      if (response.ok) {
        // Token válido → refrescar datos
        onReconnect?.()
      }
    } catch {
      // Timeout o error de red — lo ignoramos, el usuario sigue offline
    } finally {
      isValidatingRef.current = false
    }
  }, [token, isAuthenticated, logout, onReconnect, onExpired, onForbidden])

  useEffect(() => {
    const handleOnline = () => {
      validateToken()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [validateToken])
}
