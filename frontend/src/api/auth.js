import client from './client'

// MOCK DATA for offline development
const MOCK_TOKEN = 'mock.eyJyb2xlIjoib3duZXIiLCJleHAiOjk5OTk5OTk5OTl9.mock'
const MOCK_BUSINESS = { id: 1, name: 'Color Craft Mock', slug: 'color-craft-mock' }

export const login = async (data) => {
  // Si el usuario ingresa 'mock@turnoya.com' o si queremos forzar el bypass
  if (data.email === 'mock@turnoya.com' || data.password === 'mock') {
    return { data: { token: MOCK_TOKEN, business: MOCK_BUSINESS } }
  }
  return client.post('/auth/login', data)
}

export const register = (data) => client.post('/auth/register', data)

/**
 * Login de staff por PIN.
 * @param {{ business_id: number, pin: string }} data
 */
export const staffLogin = async (data) => {
  if (data.pin === '1234') {
    return { data: { token: MOCK_TOKEN, business: MOCK_BUSINESS, staff: { name: 'Juan Mock', role: 'employee' } } }
  }
  return client.post('/auth/staff-login', data)
}

// ── Kiosco ──────────────────────────────────────────────────────────────────

/** Lista perfiles disponibles (dueño + staff) para el Lock Screen */
export const getProfiles = async () => {
  try {
    return await client.get('/auth/profiles')
  } catch (e) {
    return { data: [
      { id: 'owner', name: 'Dueño (Mock)', role: 'owner' },
      { id: 1, name: 'Juan Perez (Mock)', role: 'employee' }
    ]}
  }
}

/** Verifica PIN sin emitir nuevo JWT */
export const verifyPin = async (data) => {
  if (data.pin === '0000' || data.pin === '1234' || data.pin === '1111') {
    return { data: { valid: true, success: true, name: 'Dueño Mock' } }
  }
  return client.post('/auth/verify-pin', data)
}