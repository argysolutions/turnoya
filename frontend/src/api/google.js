import client from './client'

export const getGoogleAuthUrl = () => client.get('/admin/auth/google/url')
export const getGoogleStatus = () => client.get('/admin/auth/google/status')
export const unlinkGoogle = () => client.delete('/admin/auth/google')
