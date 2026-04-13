import { 
  getGoogleAuthUrlHandler, 
  googleCallbackHandler, 
  removeGoogleAuthHandler,
  getGoogleStatusHandler 
} from '../controllers/google.controller.js'
import { verifyToken } from '../middlewares/auth.middleware.js'

export const googleRoutes = async (app) => {
  // Solo los dueños de negocio autenticados deberían poder solicitar el enlace de login Oauth
  app.get('/admin/auth/google/url', { preHandler: [verifyToken] }, getGoogleAuthUrlHandler)
  
  // Desvincular Google
  app.delete('/admin/auth/google', { preHandler: [verifyToken] }, removeGoogleAuthHandler)

  // El callback es consumido por los servidores de Google al redirigir al navegador
  app.get('/admin/auth/google/callback', googleCallbackHandler)

  // Obtener estado de conexión
  app.get('/admin/auth/google/status', { preHandler: [verifyToken] }, getGoogleStatusHandler)
}
