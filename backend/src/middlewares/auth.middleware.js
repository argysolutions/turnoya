import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'

export const verifyToken = async (req, reply) => {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET)
    req.business = decoded
  } catch (err) {
    return reply.status(401).send({ error: 'Token inválido o expirado' })
  }
}

/**
 * Middleware factory para validar rol del usuario.
 * Uso: { preHandler: [verifyToken, requireRole('dueño')] }
 */
export const requireRole = (...allowedRoles) => {
  return async (req, reply) => {
    if (!req.business || !req.business.role) {
      return reply.status(403).send({ error: 'Sin rol asignado' })
    }
    if (!allowedRoles.includes(req.business.role)) {
      return reply.status(403).send({ error: 'No tenés permisos para esta acción' })
    }
  }
}