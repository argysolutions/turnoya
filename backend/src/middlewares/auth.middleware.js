import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'

/**
 * Verifica el JWT y adjunta el payload decodificado a req.business.
 * Compatible con tokens de dueño { business_id, role: 'dueño', staff_id: null }
 * y de staff { business_id, role: 'empleado', staff_id }.
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
    // Normalizar: los controllers usan req.business.id
    req.business = {
      ...decoded,
      id: decoded.business_id ?? decoded.id, // retrocompatibilidad
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
 * @param {string} requiredRole - 'dueño' | 'empleado'
 */
export const requireRole = (requiredRole) => async (req, reply) => {
  if (!req.business) {
    // verifyToken no se ejecutó antes — configuración incorrecta
    return reply.status(401).send({ error: 'Token requerido' })
  }

  const actualRole = req.business.role ?? 'dueño' // Retrocompatibilidad para tokens viejos

  if (actualRole !== requiredRole) {
    return reply.status(403).send({
      error: 'Acceso denegado',
      code: 'FORBIDDEN',
      required_role: requiredRole,
      current_role: actualRole,
    })
  }
}