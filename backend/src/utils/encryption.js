import crypto from 'crypto'
import { ENV } from '../config/env.js'
import { logger } from '../config/logger.js'

const ALGORITHM = 'aes-256-cbc'
const KEY = crypto.scryptSync(ENV.ENCRYPTION_KEY || 'default-secret-key', 'salt', 32)
const IV_LENGTH = 16

export const encrypt = (text) => {
  if (!text) return null
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
  } catch (err) {
    logger.error(err, 'Error crypto encrypt')
    throw new Error('Encryption failed')
  }
}

export const decrypt = (text) => {
  if (!text) return null
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (err) {
    logger.error(err, 'Error crypto decrypt')
    throw new Error('Decryption failed')
  }
}
