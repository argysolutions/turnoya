import { google } from 'googleapis'
import { ENV } from '../config/env.js'
import { createOrUpdateConnection, findConnection } from '../db/connections.queries.js'
import { encrypt, decrypt } from '../utils/encryption.js'

/**
 * Google Pack Service
 * Handles OAuth2 flow with encryption and multi-scope access.
 */

const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    ENV.GOOGLE.CLIENT_ID,
    ENV.GOOGLE.CLIENT_SECRET,
    ENV.GOOGLE.REDIRECT_URI
  )
}

/**
 * 1. Generar URL de consentimiento con scopes expandidos
 */
export const getGoogleAuthUrl = (businessId) => {
  const oauth2Client = createOAuth2Client()

  const scopes = [
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/gmail.send'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    prompt: 'consent',     
    scope: scopes,
    state: businessId.toString()
  })
}

/**
 * 2. Intercambio de tokens y persistencia encriptada
 */
export const handleGoogleCallback = async (code, businessId) => {
  const oauth2Client = createOAuth2Client()
  
  const { tokens } = await oauth2Client.getToken(code)
  
  // Encriptamos tokens antes de guardar
  const encryptedTokens = {
    access_token:  encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token), // Solo viene la primera vez o con prompt=consent
    expires_at:    tokens.expiry_date ? new Date(tokens.expiry_date) : null
  }

  await createOrUpdateConnection(businessId, 'google', encryptedTokens)

  return tokens
}

/**
 * 3. Obtener cliente autenticado para un negocio
 * Maneja el refresco automático si es necesario.
 */
export const getGoogleClientForBusiness = async (businessId) => {
  const connection = await findConnection(businessId, 'google')

  if (!connection || !connection.refresh_token) {
    throw new Error('El negocio no tiene Google vinculado.')
  }

  const oauth2Client = createOAuth2Client()
  
  // Desencriptamos para usar en el cliente
  const accessToken  = decrypt(connection.access_token)
  const refreshToken = decrypt(connection.refresh_token)

  oauth2Client.setCredentials({
    access_token:  accessToken,
    refresh_token: refreshToken,
    expiry_date:   connection.expires_at ? new Date(connection.expires_at).getTime() : null
  })

  // Escuchamos el evento de refresh para actualizar la DB automáticamente
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      console.log('🔄 Google Access Token refrescado para business:', businessId)
      await createOrUpdateConnection(businessId, 'google', {
        access_token:  encrypt(tokens.access_token),
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expires_at:    tokens.expiry_date ? new Date(tokens.expiry_date) : null
      })
    }
  })

  return oauth2Client
}

/**
 * Ejemplo de uso: People API (Lectura)
 */
export const searchGoogleContacts = async (businessId, query) => {
  const auth = await getGoogleClientForBusiness(businessId)
  const service = google.people({ version: 'v1', auth })

  try {
    const res = await service.people.searchContacts({
      query: query,
      readMask: 'names,emailAddresses,phoneNumbers'
    })
    return res.data.results || []
  } catch (error) {
    console.error("Error buscando contactos:", error.message)
    throw error
  }
}
