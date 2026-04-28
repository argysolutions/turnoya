import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * La verificación real ocurre en cada request al servidor.
 * Devuelve null si el token es inválido o está expirado (por tiempo local).
 */
function decodeJWT(token) {
  try {
    // Bypass para el token de desarrollo (mock)
    if (token.startsWith('mock.')) {
      return { id: 1, business_id: 1, role: 'owner', name: 'Color Craft Mock', exp: 9999999999 }
    }

    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    
    // Normalizar roles robustamente eliminando cualquier espacio o carácter extraño
    const rawRole = String(decoded.role || '').toLowerCase().trim()
    
    if (rawRole.includes('dueño') || rawRole.includes('owner') || rawRole.includes('admin')) {
      decoded.role = 'owner'
    } else if (rawRole.includes('empleado') || rawRole.includes('employee') || rawRole.includes('staff')) {
      decoded.role = 'employee'
    } else if (rawRole === '') {
      decoded.role = 'owner' // fallback legacy
    }
    
    console.log('[Auth] Final state for role:', decoded.role)
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

  // ── Perfil activo del Kiosco (no persiste, en memoria) ──────────────────
  const [activeProfile, setActiveProfile] = useState(null)

  /**
   * Persiste el token y actualiza el estado en memoria.
   * Solo guarda el token en localStorage — el payload vive solo en React state.
   */
  const setToken = useCallback((token) => {
    if (!token) {
      localStorage.removeItem('token')
      setAuth(null)
      setActiveProfile(null)
      return
    }
    const payload = decodeJWT(token)
    if (!payload) {
      localStorage.removeItem('token')
      setAuth(null)
      setActiveProfile(null)
      return
    }
    localStorage.setItem('token', token)
    setAuth({ token, payload })
  }, [])

  /**
   * Cierra sesión: limpia token, payload en memoria y cualquier pref cifrada.
   */
  const logout = useCallback((forgetIdentity = false) => {
    // Limpiar auth state inmediatamente
    setAuth(null)
    setActiveProfile(null)

    // Token base
    localStorage.removeItem('token')
    localStorage.removeItem('business')

    // Si pide olvidar, barremos TODO lo que huela a identidad o negocio
    if (forgetIdentity) {
      const keysToRemove = [
        'turno_ya_last_business',
        'turno_ya_last_staff',
        'turno_ya_last_staff_business_id',
        'turno_ya_last_staff_name',
        'staff_identity',
        'last_login_v2'
      ]
      
      keysToRemove.forEach(k => localStorage.removeItem(k))

      // También barremos por prefijo por si acaso
      Object.keys(localStorage).forEach(key => {
        if (key.includes('turno_ya') || key.includes('last_business') || key.includes('staff')) {
          localStorage.removeItem(key)
        }
      })
    }

    // Limpiar preferencias cifradas
    Object.keys(localStorage)
      .filter(k => k.startsWith('enc_pref_'))
      .forEach(k => localStorage.removeItem(k))

    console.log('[Auth] Logout complete. Forget identity:', forgetIdentity)
  }, [])

  /**
   * Limpia el perfil activo del kiosco (vuelve al lock screen).
   */
  const clearActiveProfile = useCallback(() => {
    setActiveProfile(null)
  }, [])

  // Si el token expira mientras la app está abierta, limpiar automáticamente
  useEffect(() => {
    if (!auth?.payload?.exp) return
    const msUntilExpiry = auth.payload.exp * 1000 - Date.now()
    if (msUntilExpiry <= 0) { logout(); return }
    const timer = setTimeout(logout, msUntilExpiry)
    return () => clearTimeout(timer)
  }, [auth?.payload?.exp, logout])

  // El rol efectivo depende del perfil activo del kiosco
  const effectiveRole = activeProfile?.role ?? auth?.payload?.role ?? (auth?.payload ? 'owner' : null)

  const value = {
    // Estado
    isAuthenticated: !!auth,
    token: auth?.token ?? null,
    role: effectiveRole,
    businessId: auth?.payload?.business_id ?? null,
    staffId: activeProfile?.staff_id ?? auth?.payload?.staff_id ?? null,
    professionalName: activeProfile?.professional_name ?? auth?.payload?.professional_name ?? null,
    staffName: activeProfile?.name ?? auth?.payload?.name ?? null,
    // Shortcuts
    isOwner: effectiveRole === 'owner',
    isEmployee: effectiveRole === 'employee',
    // Backward compat
    loading: false,
    // Kiosco
    activeProfile,
    setActiveProfile,
    clearActiveProfile,
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
