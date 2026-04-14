import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * La verificación real ocurre en cada request al servidor.
 * Devuelve null si el token es inválido o está expirado (por tiempo local).
 */
function decodeJWT(token) {
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    // Verificar expiración local (el servidor también lo verifica)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = decodeJWT(token)
    if (!payload) {
      localStorage.removeItem('token')
      return null
    }
    return { token, payload }
  })

  /**
   * Persiste el token y actualiza el estado en memoria.
   * Solo guarda el token en localStorage — el payload vive solo en React state.
   */
  const setToken = useCallback((token) => {
    if (!token) {
      localStorage.removeItem('token')
      setAuth(null)
      return
    }
    const payload = decodeJWT(token)
    if (!payload) {
      localStorage.removeItem('token')
      setAuth(null)
      return
    }
    localStorage.setItem('token', token)
    setAuth({ token, payload })
  }, [])

  /**
   * Cierra sesión: limpia token, payload en memoria y cualquier pref cifrada.
   * Las prefs cifradas quedan inaccesibles automáticamente (clave derivada del token).
   * @param {boolean} forgetIdentity - Si es true, olvida tambíen la última cuenta iniciada.
   */
  const logout = useCallback((forgetIdentity = false) => {
    localStorage.removeItem('token')
    // Limpiar también las prefs cifradas al salir
    Object.keys(localStorage)
      .filter(k => k.startsWith('enc_pref_'))
      .forEach(k => localStorage.removeItem(k))

    if (forgetIdentity) {
      localStorage.removeItem('turno_ya_last_business')
      localStorage.removeItem('turno_ya_last_staff')
    }

    setAuth(null)
  }, [])

  // Si el token expira mientras la app está abierta, limpiar automáticamente
  useEffect(() => {
    if (!auth?.payload?.exp) return
    const msUntilExpiry = auth.payload.exp * 1000 - Date.now()
    if (msUntilExpiry <= 0) { logout(); return }
    const timer = setTimeout(logout, msUntilExpiry)
    return () => clearTimeout(timer)
  }, [auth?.payload?.exp, logout])

  const value = {
    // Estado
    isAuthenticated: !!auth,
    token: auth?.token ?? null,
    // Compatibilidad para tokens antiguos que no tenían rol (solo existían dueños)
    role: auth?.payload?.role ?? (auth?.payload ? 'dueño' : null),
    businessId: auth?.payload?.business_id ?? null,
    staffId: auth?.payload?.staff_id ?? null,
    // Shortcuts
    isOwner: (auth?.payload?.role ?? 'dueño') === 'dueño',
    isEmployee: auth?.payload?.role === 'empleado',
    // Actions
    setToken,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
