import crypto from 'crypto'
import { ENV } from '../config/env.js'

/**
 * Utility for AES-256-CBC encryption of sensitive tokens
 */

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

const getSecretKey = () => {
  const key = ENV.ENCRYPTION_KEY || 'default-secret-key-32-chars-long-xxx'
  // Ensure it's exactly 32 bytes for aes-256
  return crypto.createHash('sha256').update(String(key)).digest()
}

export const encrypt = (text) => {
  if (!text) return null
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export const decrypt = (text) => {
  if (!text) return null
  try {
    const [ivHex, encryptedText] = text.split(':')
    if (!ivHex || !encryptedText) return null
    
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Decryption failed:', err.message)
    return null
  }
}
