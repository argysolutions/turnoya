import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'

/**
 * Normaliza roles legacy (dueño/empleado) a ASCII-safe (owner/employee).
 * Esto evita fallos de comparación por encoding UTF-8 en servidores Linux.
 */
const normalizeRole = (role) => {
  if (!role) return 'owner'
  if (role === 'dueño' || role === 'owner') return 'owner'
  if (role === 'empleado' || role === 'employee') return 'employee'
  return role
}

/**
 * Verifica el JWT y adjunta el payload decodificado a req.business.
 * Compatible con tokens legacy { role: 'dueño' | 'empleado' }
 * y tokens nuevos { role: 'owner' | 'employee' }.
 *
 * Normaliza req.business.id = req.business.business_id para retrocompatibilidad
 * con controllers que usen req.business.id.
 */
export const verifyToken = async (req, reply) => {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET)
    req.business = {
      ...decoded,
      id: decoded.business_id ?? decoded.id,
      role: normalizeRole(decoded.role), // siempre normalizado a ASCII
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Token inválido o expirado' })
  }
}

/**
 * Middleware de autorización por rol.
 * Devuelve 403 Forbidden (no 401) cuando el usuario está autenticado
 * pero su rol es insuficiente. El frontend distingue:
 *   401 → no autenticado → logout
 *   403 → autenticado pero sin permisos → mostrar "sin acceso" sin desloguear
 *
 * @param {...string} allowedRoles - 'owner' | 'employee' (acepta múltiples)
 */
export const requireRole = (...allowedRoles) => async (req, reply) => {
  if (!req.business) {
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const actualRole = req.business.role // ya normalizado por verifyToken

  if (!allowedRoles.includes(actualRole)) {
    return reply.status(403).send({
      error: 'Acceso denegado',
      code: 'FORBIDDEN',
      required_role: allowedRoles,
      current_role: actualRole,
    })
  }
}