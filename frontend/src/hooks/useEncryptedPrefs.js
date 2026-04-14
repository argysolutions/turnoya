import CryptoJS from 'crypto-js'
import { useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Hook para preferencias UX cifradas con AES-256.
 *
 * ALCANCE: Solo para preferencias estéticas (privacy_mode, collapsed sidebar, etc.).
 * Los datos financieros NUNCA se persisten localmente — siempre vienen del servidor.
 *
 * Derivación de clave:
 *   - Password: últimos 32 chars del token (la firma JWT cambia en cada login)
 *   - Salt: business_id como string
 *   - PBKDF2: 10.000 iteraciones, 256 bits
 *
 * Si el token cambia (nuevo login) → clave diferente → prefs anteriores
 * devuelven null → se resetean al default. Esto es intencional por diseño.
 */

const PBKDF2_ITERATIONS = 10_000
const KEY_SIZE_WORDS = 8 // 256 bits = 8 words de 32 bits

function deriveKey(token, businessId) {
  if (!token || !businessId) return null
  // Usar los últimos 32 chars del token (firma) como password
  const password = token.slice(-32)
  const salt = String(businessId)
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE_WORDS,
    iterations: PBKDF2_ITERATIONS,
  }).toString()
}

const PREFIX = 'enc_pref_'

export function useEncryptedPrefs() {
  const { token, businessId, isAuthenticated } = useAuth()

  const encKey = useMemo(
    () => (isAuthenticated ? deriveKey(token, businessId) : null),
    // Solo recalcular si el token o businessId cambian (nuevo login)
    [token, businessId, isAuthenticated]
  )

  const getItem = useCallback(
    (key) => {
      if (!encKey) return null
      const raw = localStorage.getItem(`${PREFIX}${key}`)
      if (!raw) return null
      try {
        const bytes = CryptoJS.AES.decrypt(raw, encKey)
        const plaintext = bytes.toString(CryptoJS.enc.Utf8)
        if (!plaintext) return null
        return JSON.parse(plaintext)
      } catch {
        // Si falla el decrypt (clave distinta por token nuevo) → devuelve null = default
        return null
      }
    },
    [encKey]
  )

  const setItem = useCallback(
    (key, value) => {
      if (!encKey) return
      const plaintext = JSON.stringify(value)
      const encrypted = CryptoJS.AES.encrypt(plaintext, encKey).toString()
      localStorage.setItem(`${PREFIX}${key}`, encrypted)
    },
    [encKey]
  )

  const removeItem = useCallback(
    (key) => localStorage.removeItem(`${PREFIX}${key}`),
    []
  )

  return { getItem, setItem, removeItem, isReady: !!encKey }
}
