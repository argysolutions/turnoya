import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

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
  const roleString = String(effectiveRole || '').toLowerCase()

  // ── Inactividad Global Sincronizada (1 minuto) ──────────────────────────
  useEffect(() => {
    // Solo auditamos inactividad para dueños que tienen un perfil activo (sesión desbloqueada)
    if (effectiveRole !== 'owner' || !activeProfile) return

    const ACTIVITY_KEY = 'turnoya_last_activity'
    const IDLE_LIMIT = 60 * 1000 // 1 minuto

    const updateActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
    }

    const checkInactivity = () => {
      const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0')
      if (!lastActivity) return
      
      const now = Date.now()
      if (now - lastActivity >= IDLE_LIMIT) {
        clearActiveProfile()
        toast.info('Sesión cerrada por inactividad')
      }
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => updateActivity()
    
    events.forEach(e => document.addEventListener(e, handleActivity))
    const interval = setInterval(checkInactivity, 5000)
    
    // Marca inicial
    updateActivity()

    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity))
      clearInterval(interval)
    }
  }, [effectiveRole, activeProfile, clearActiveProfile])

  const value = {
    // Estado
    isAuthenticated: !!auth,
    token: auth?.token ?? null,
    role: roleString,
    businessId: auth?.payload?.business_id ?? null,
    staffId: activeProfile?.staff_id ?? auth?.payload?.staff_id ?? null,
    professionalName: activeProfile?.professional_name ?? auth?.payload?.professional_name ?? null,
    staffName: activeProfile?.name ?? auth?.payload?.name ?? null,
    // Shortcuts
    isOwner: roleString === 'owner',
    isEmployee: roleString === 'employee',
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
