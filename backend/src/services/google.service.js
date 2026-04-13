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
  
  const { tokens } = await oauth2Client.getToken({
    code,
    redirect_uri: ENV.GOOGLE.REDIRECT_URI
  })
  
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
 * 4. Servicio Principal: ensureContactExists
 * Verifica si el cliente existe (mediante la People API) dentro de los contactos del usuario.
 * Si no está, lo crea de forma automática.
 */
export const ensureContactExists = async (businessId, clientData) => {
  const auth = await getGoogleClientForBusiness(businessId)
  const service = google.people({ version: 'v1', auth })

  try {
    // Paso 1: Intentar buscarlo
    const searchResponse = await service.people.searchContacts({
      query: clientData.phone || clientData.email || clientData.name,
      readMask: 'names,emailAddresses,phoneNumbers'
    })

    const foundContacts = searchResponse.data.results || []

    // Si ya existe un resultado razonable, simplemente devolvemos la conexión
    if (foundContacts.length > 0) {
      return foundContacts[0].person
    }

    // Paso 2: El contacto no existe. Lo creamos inyectándolo en su agenda.
    const createPayload = {
      names: [{ givenName: clientData.name }],
      phoneNumbers: [{ value: clientData.phone, type: 'mobile' }]
    }

    if (clientData.email) {
      createPayload.emailAddresses = [{ value: clientData.email, type: 'home' }]
    }

    const createResponse = await service.people.createContact({
      requestBody: createPayload
    })

    return createResponse.data

  } catch (error) {
    console.error("Error asegurando la existencia del contacto de Google:", error.message)
    // No lanzamos el error para no trabar el flujo principal de reserva
    return null
  }
}
