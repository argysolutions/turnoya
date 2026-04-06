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