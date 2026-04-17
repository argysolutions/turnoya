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
 * Verifica el JWT y adjunta el payload decodificado a req.user.
 * Compatible con tokens legacy { role: 'dueño' | 'empleado' }
 * y tokens nuevos { role: 'owner' | 'employee' }.
 */
export const verifyToken = async (req, reply) => {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET)
    
    // Unificación Total: req.user
    // id: ID único del sujeto (Owner o Staff)
    // business_id: ID único del Negocio (SaaS Tenant)
    req.user = {
      ...decoded,
      id: decoded.id, 
      business_id: decoded.business_id,
      role: normalizeRole(decoded.role),
    }

  } catch (err) {
    return reply.status(401).send({ error: 'Token inválido o expirado' })
  }
}

/**
 * Middleware de autorización por rol.
 * Devuelve 403 Forbidden (no 401) cuando el usuario está autenticado
 * pero su rol es insuficiente.
 *
 * @param {...string} allowedRoles - 'owner' | 'employee'
 */
export const requireRole = (...allowedRoles) => async (req, reply) => {
  if (!req.user) {
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const actualRole = req.user.role // ya normalizado por verifyToken

  if (!allowedRoles.includes(actualRole)) {
    return reply.status(403).send({
      error: 'Acceso denegado',
      code: 'FORBIDDEN',
      required_role: allowedRoles,
      current_role: actualRole,
    })
  }
}