import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'
import { findBusinessByEmail, findBusinessBySlug, createBusiness, findBusinessById } from '../db/business.queries.js'
import { findStaffByBusinessAndPin, getStaffByBusiness } from '../db/staff.queries.js'
import { pool } from '../config/db.js'

const generateSlug = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const TOKEN_OPTIONS = {
  httpOnly: true,
  secure: true, // Forzado por directiva del usuario
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
}

const signTokens = (payload) => {
  const accessToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign(payload, ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

// ─── Dueño: Register ─────────────────────────────────────────────────────────

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
  const business = await createBusiness({ name, slug, email, password: hashed, phone, address, description })

  const { accessToken, refreshToken } = signTokens({ id: business.id, business_id: business.id, role: 'owner' })
  
  reply.setCookie('refreshToken', refreshToken, TOKEN_OPTIONS)
  
  const { password: _, ...businessData } = business
  reply.send({ token: accessToken, business: businessData })
}

// ─── Dueño: Login ────────────────────────────────────────────────────────────

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

  const { accessToken, refreshToken } = signTokens({ id: business.id, business_id: business.id, role: 'owner' })
  
  reply.setCookie('refreshToken', refreshToken, TOKEN_OPTIONS)

  const { password: _, ...businessData } = business
  reply.send({ token: accessToken, business: businessData })
}

// ─── Staff: Login por PIN ─────────────────────────────────────────────────────

/**
 * POST /api/auth/staff-login
 * Body: { business_id: number, pin: string }
 */
export const staffLogin = async (req, reply) => {
  const { business_id, pin } = req.body

  if (!business_id || !pin) {
    return reply.status(400).send({ error: 'business_id y pin son requeridos' })
  }
  if (!/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser de 4 dígitos numéricos' })
  }

  const business = await findBusinessById(business_id)
  if (!business) {
    return reply.status(401).send({ error: 'Negocio no encontrado' })
  }

  const staffList = await findStaffByBusinessAndPin(business_id, pin)
  const pepperedPin = `${business_id}:${pin}`

  let matchedStaff = null
  for (const member of staffList) {
    const matches = await bcrypt.compare(pepperedPin, member.pin_hash)
    if (matches) {
      matchedStaff = member
      break
    }
  }

  if (!matchedStaff) {
    return reply.status(401).send({ error: 'PIN incorrecto' })
  }

  const r = String(matchedStaff.role || '').toLowerCase()
  const normalizedRole = (r === 'dueño' || r === 'owner' || r === 'administrador') ? 'owner' : 'employee'

  const { accessToken, refreshToken } = signTokens({
    id: matchedStaff.id,
    business_id: matchedStaff.business_id,
    role: normalizedRole,
    name: matchedStaff.name,
    professional_name: matchedStaff.professional_name || matchedStaff.name,
  })

  reply.setCookie('refreshToken', refreshToken, TOKEN_OPTIONS)

  reply.send({ token: accessToken, staff: { name: matchedStaff.name } })
}

// ─── Kiosco: Perfiles disponibles ─────────────────────────────────────────

export const getProfiles = async (req, reply) => {
  const businessId = req.user.business_id

  try {
    const business = await findBusinessById(businessId)
    if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' })

    const staffList = await getStaffByBusiness(businessId)

    const profiles = [
      {
        id: 'owner',
        name: business.name,
        role: 'owner',
        staff_id: null,
        has_pin: !!business.owner_pin_hash,
      },
      ...staffList
        .filter(s => s.is_active)
        .map(s => ({
          id: `staff-${s.id}`,
          name: s.name,
          role: s.role === 'dueño' || s.role === 'owner' ? 'owner' : 'employee',
          staff_id: s.id,
          has_pin: true,
        })),
    ]

    reply.send({ profiles })
  } catch (err) {
    reply.log.error(err, 'Error getProfiles')
    reply.status(500).send({ error: 'Error al obtener perfiles' })
  }
}

// ─── Kiosco: Verificar PIN ────────────────────────────────────────────────

export const verifyPin = async (req, reply) => {
  const businessId = req.user.business_id
  const { profile_id, pin } = req.body

  if (!profile_id || !pin) {
    return reply.status(400).send({ error: 'profile_id y pin son requeridos' })
  }

  if (!/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser de 4 dígitos' })
  }

  try {
    if (profile_id === 'owner') {
      const business = await findBusinessById(businessId)
      if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' })

      if (!business.owner_pin_hash) {
        return reply.status(400).send({ error: 'El dueño no tiene PIN configurado.' })
      }

      const pepperedPin = `owner:${businessId}:${pin}`
      const valid = await bcrypt.compare(pepperedPin, business.owner_pin_hash)

      if (!valid) return reply.status(403).send({ error: 'PIN incorrecto' })

      return reply.send({
        valid: true,
        role: 'owner',
        staff_id: null,
        name: business.name,
        profile_id: 'owner',
      })
    }

    const staffIdMatch = profile_id.match(/^staff-(\d+)$/)
    if (!staffIdMatch) {
      return reply.status(400).send({ error: 'profile_id inválido' })
    }

    const staffId = parseInt(staffIdMatch[1], 10)
    const staffList = await findStaffByBusinessAndPin(businessId, pin)
    const member = staffList.find(s => s.id === staffId)

    if (!member) {
      return reply.status(403).send({ error: 'Empleado no encontrado o PIN incorrecto' })
    }

    const pepperedPin = `${businessId}:${pin}`
    const valid = await bcrypt.compare(pepperedPin, member.pin_hash)

    if (!valid) return reply.status(403).send({ error: 'PIN incorrecto' })

    return reply.send({
      valid: true,
      role: member.role === 'dueño' || member.role === 'owner' ? 'owner' : 'employee',
      staff_id: member.id,
      name: member.name,
      professional_name: member.professional_name,
      profile_id,
    })
  } catch (err) {
    reply.log.error(err, 'Error verifyPin')
    reply.status(500).send({ error: 'Error al verificar PIN' })
  }
}

// ─── Dueño: Configurar Owner PIN ──────────────────────────────────────────

export const updateOwnerPin = async (req, reply) => {
  const businessId = req.user.business_id
  const { pin } = req.body

  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser exactamente 4 dígitos numéricos' })
  }

  try {
    const pepperedPin = `owner:${businessId}:${pin}`
    const hash = await bcrypt.hash(pepperedPin, 10)

    await pool.query(
      'UPDATE businesses SET owner_pin_hash = $1 WHERE id = $2',
      [hash, businessId]
    )

    reply.send({ message: 'PIN de dueño actualizado correctamente' })
  } catch (err) {
    reply.log.error(err, 'Error updateOwnerPin')
    reply.status(500).send({ error: 'Error al actualizar el PIN' })
  }
}

// ── Rutas de Refresh y Logout ─────────────────────────────────────────────

/**
 * POST /api/auth/refresh
 * Lee el refreshToken de la cookie, lo valida y emite un nuevo par de tokens.
 * Implementa rotación de refresh token.
 */
export const refresh = async (req, reply) => {
  const oldRefreshToken = req.cookies.refreshToken
  if (!oldRefreshToken) return reply.status(401).send({ error: 'Sesión expirada' })

  try {
    const decoded = jwt.verify(oldRefreshToken, ENV.JWT_REFRESH_SECRET)
    
    // Rotación del Refresh Token
    const { accessToken, refreshToken } = signTokens({
      id: decoded.id,
      business_id: decoded.business_id,
      role: decoded.role,
      name: decoded.name,
      professional_name: decoded.professional_name,
    })

    reply.setCookie('refreshToken', refreshToken, TOKEN_OPTIONS)
    return { token: accessToken }
  } catch (err) {
    reply.log.warn({ err: err.message }, 'Refresh token inválido')
    return reply.status(401).send({ error: 'Sesión inválida o expirada' })
  }
}

/**
 * POST /api/auth/logout
 * Limpia la cookie del refresh token.
 */
export const logout = async (req, reply) => {
  reply.clearCookie('refreshToken', { path: '/' })
  return { success: true }
}