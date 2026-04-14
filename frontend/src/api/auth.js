import client from './client'

export const login = (data) => client.post('/auth/login', data)
export const register = (data) => client.post('/auth/register', data)

/**
 * Login de staff por PIN.
 * @param {{ business_id: number, pin: string }} data
 */
export const staffLogin = (data) => client.post('/auth/staff-login', data)

// ── Kiosco ──────────────────────────────────────────────────────────────────

/** Lista perfiles disponibles (dueño + staff) para el Lock Screen */
export const getProfiles = () => client.get('/auth/profiles')

/** Verifica PIN sin emitir nuevo JWT */
export const verifyPin = (data) => client.post('/auth/verify-pin', data)