import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({})

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('business')
    setUser(null)
    setRole(null)
    window.location.href = '/login'
  }

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = decodeJwt(token)
        if (payload) {
          // Debug exigido por el usuario
          console.log('JWT Role Decoded:', payload.role)
          
          if (payload.exp && Date.now() / 1000 > payload.exp) {
            logout()
          } else {
            setUser(payload)
            setRole(payload.role)
          }
        } else {
          logout()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
