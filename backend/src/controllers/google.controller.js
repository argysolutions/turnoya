import { getGoogleAuthUrl, handleGoogleCallback } from '../services/google.service.js'

export const getGoogleAuthUrlHandler = async (req, reply) => {
  // Verificamos que el usuario esté logueado como dueño del negocio (el middleware nos debió dejar req.business)
  if (!req.business || !req.business.id) {
    return reply.status(401).send({ error: 'No autorizado, debe iniciar sesión en el panel' })
  }

  const url = getGoogleAuthUrl(req.business.id)
  
  reply.send({ url })
}

export const googleCallbackHandler = async (req, reply) => {
  const { code, state } = req.query

  if (!code || !state) {
    return reply.status(400).send({ error: 'Faltan parámetros requeridos de Google' })
  }

  // El state enviamos el businessId
  const businessId = parseInt(state)

  try {
    await handleGoogleCallback(code, businessId)
    // Tras guardarlo exitosamente en la DB, enviamos un HTML que cierra la ventana
    // y notifica a la ventana principal, o redirige si no era un popup.
    const html = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage('GOOGLE_AUTH_SUCCESS', '*');
              window.close();
            } else {
              window.location.href = '/dashboard?google_auth=success';
            }
          </script>
          <p>Autenticación completada. Cerrando ventana...</p>
        </body>
      </html>
    `
    reply.type('text/html').send(html)
  } catch (error) {
    console.error('Error durante el callback de Google:', error)
    const errorHtml = `
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage('GOOGLE_AUTH_ERROR', '*');
              window.close();
            } else {
              window.location.href = '/dashboard?google_auth=error';
            }
          </script>
          <p>Hubo un error. Cerrando ventana...</p>
        </body>
      </html>
    `
    reply.type('text/html').send(errorHtml)
  }
}

export const removeGoogleAuthHandler = async (req, reply) => {
  if (!req.business || !req.business.id) {
    return reply.status(401).send({ error: 'No autorizado' })
  }
  
  // Borramos el token de la DB usando el update que ya existe pasándole null
  try {
    const { updateGoogleRefreshToken } = await import('../db/business.queries.js');
    await updateGoogleRefreshToken(req.business.id, null);
    reply.send({ success: true, message: 'Google desvinculado exitosamente' })
  } catch (err) {
    console.error(err)
    reply.status(500).send({ error: 'Error al desvincular la cuenta' })
  }
}
