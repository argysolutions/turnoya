import { google } from 'googleapis'
import { ENV } from '../config/env.js'
import { findBusinessById, updateGoogleRefreshToken } from '../db/business.queries.js'

// Inicializador del cliente base Oauth2
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    ENV.GOOGLE.CLIENT_ID,
    ENV.GOOGLE.CLIENT_SECRET,
    ENV.GOOGLE.REDIRECT_URI
  )
}

/**
 * 1. Genera la URL para iniciar el flujo de consertimiento
 * Se manda el businessId como state param para identificar a la vuelta
 */
export const getGoogleAuthUrl = (businessId) => {
  const oauth2Client = createOAuth2Client()

  // Definimos de qué alcances (scopes) necesitamos permiso.
  // Usamos el de Contacts API (People API)
  const scopes = [
    'https://www.googleapis.com/auth/contacts'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Importante para que devuelva un refresh_token
    prompt: 'consent',      // Forza la pantalla de consent para asegurar el refresh_token
    scope: scopes,
    state: businessId.toString()
  })
}

/**
 * 2. Recibe el callback, intercambia el token temporal por uno definitivo 
 * y almacena el refresh_token en la DB.
 */
export const handleGoogleCallback = async (code, businessId) => {
  const oauth2Client = createOAuth2Client()
  
  const { tokens } = await oauth2Client.getToken(code)
  
  // Guardamos el refresh_token (si Google lo envió)
  if (tokens.refresh_token) {
    await updateGoogleRefreshToken(businessId, tokens.refresh_token)
  }

  return tokens
}

/**
 * 3. Recrea un cliente Google configurado para la cuenta específica de un negocio
 * listo para interactuar con la People API en su nombre.
 */
export const getGoogleClientForBusiness = async (businessId) => {
  const business = await findBusinessById(businessId)

  if (!business || !business.google_refresh_token) {
    throw new Error('El negocio no tiene Google vinculado.')
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: business.google_refresh_token })
  
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

  // Paso 1: Intentar buscarlo (People API lo hace a través de searchContacts si le das 'readMask')
  // Nota metodológica: Para buscar en "My Contacts", Google permite hacer query por email o número
  try {
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
    // Construimos el payload siguiendo el standard de People API Contact Mutation
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
    throw new Error('No se pudo interactuar con la libreta de contactos de Google')
  }
}
