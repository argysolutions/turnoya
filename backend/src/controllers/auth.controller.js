import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'
import { findBusinessByEmail, findBusinessBySlug, createBusiness } from '../db/business.queries.js'

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const register = async (req, reply) => {
  const { name, email, password, phone, address, description } = req.body

  if (!name || !email || !password) {
    return reply.status(400).send({ error: 'Nombre, email y contraseña son obligatorios' })
  }

  const existing = await findBusinessByEmail(email)
  if (existing) {
    return reply.status(409).send({ error: 'Ya existe un negocio con ese email' })
  }

  let slug = generateSlug(name)
  const slugExists = await findBusinessBySlug(slug)
  if (slugExists) slug = `${slug}-${Date.now()}`

  const hashed = await bcrypt.hash(password, 10)

  const business = await createBusiness({
    name, slug, email, password: hashed, phone, address, description
  })

  const token = jwt.sign(
    { id: business.id, role: 'dueño' },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const { password: _, ...businessData } = business

  reply.send({ token, business: businessData })
}

export const login = async (req, reply) => {
  const { email, password } = req.body

  if (!email || !password) {
    return reply.status(400).send({ error: 'Email y contraseña son obligatorios' })
  }

  const business = await findBusinessByEmail(email)
  if (!business) {
    return reply.status(401).send({ error: 'Credenciales inválidas' })
  }

  const valid = await bcrypt.compare(password, business.password)
  if (!valid) {
    return reply.status(401).send({ error: 'Credenciales inválidas' })
  }

  const token = jwt.sign(
    { id: business.id, role: 'dueño' },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const { password: _, ...businessData } = business
  reply.send({ token, business: businessData })
}