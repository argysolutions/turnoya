import client from './client'

export const getGoogleAuthUrl = async () => {
  try {
    return await client.get('/admin/auth/google/url')
  } catch (e) {
    return { data: { url: null } }
  }
}

export const getGoogleStatus = async () => {
  try {
    return await client.get('/admin/auth/google/status')
  } catch (e) {
    return { data: { linked: false, updated_at: null } }
  }
}

export const unlinkGoogle = () => client.delete('/admin/auth/google')
