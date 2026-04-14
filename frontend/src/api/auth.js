import client from './client'

export const login = (data) => client.post('/auth/login', data)
export const register = (data) => client.post('/auth/register', data)

/**
 * Login de staff por PIN.
 * @param {{ business_id: number, pin: string }} data
 */
export const staffLogin = (data) => client.post('/auth/staff-login', data)