import { getGoogleAuthUrl, handleGoogleCallback } from '../services/google.service.js'
import { findConnection, removeConnection } from '../db/connections.queries.js'

export const getGoogleAuthUrlHandler = async (req, reply) => {
  if (!req.business || !req.business.id) {
    return reply.status(401).send({ error: 'No autorizado' })
  }

  const url = getGoogleAuthUrl(req.business.id)
  reply.send({ url })
}

export const googleCallbackHandler = async (req, reply) => {
  const { code, state } = req.query

  if (!code || !state) {
    return reply.status(400).send({ error: 'Faltan parámetros' })
  }

  const businessId = parseInt(state)

  try {
    await handleGoogleCallback(code, businessId)
    
    // HTML de éxito para cerrar el popup
    const html = `
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
          <script>
            if (window.opener) {
              window.opener.postMessage('GOOGLE_AUTH_SUCCESS', '*');
              window.close();
            } else {
              window.location.href = '/dashboard/settings?google_auth=success';
            }
          </script>
          <div style="text-align: center;">
            <p style="color: #0f172a; font-weight: bold;">Autenticación completada con éxito.</p>
            <p style="color: #64748b; font-size: 14px;">Cerrando esta ventana...</p>
          </div>
        </body>
      </html>
    `
    reply.type('text/html').send(html)
  } catch (error) {
    console.error('Error Google Callback:', error)
    const errorHtml = `
      <html>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fff1f2;">
          <script>
            if (window.opener) {
              window.opener.postMessage('GOOGLE_AUTH_ERROR', '*');
              window.close();
            }
          </script>
          <p style="color: #be123c; font-weight: bold;">Hubo un error al vincular tu cuenta.</p>
        </body>
      </html>
    `
    reply.type('text/html').send(errorHtml)
  }
}

/**
 * Devuelve el estado de la conexión Google para el negocio
 */
export const getGoogleStatusHandler = async (req, reply) => {
  if (!req.business || !req.business.id) {
    return reply.status(401).send({ error: 'No autorizado' })
  }

  try {
    const connection = await findConnection(req.business.id, 'google')
    reply.send({
      linked: !!(connection && connection.refresh_token),
      updated_at: connection?.updated_at || null
    })
  } catch (err) {
    reply.status(500).send({ error: 'Error al obtener estado de Google' })
  }
}

export const removeGoogleAuthHandler = async (req, reply) => {
  if (!req.business || !req.business.id) {
    return reply.status(401).send({ error: 'No autorizado' })
  }
  
  try {
    await removeConnection(req.business.id, 'google')
    reply.send({ success: true, message: 'Google desvinculado exitosamente' })
  } catch (err) {
    reply.status(500).send({ error: 'Error al desvincular la cuenta' })
  }
}
