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

  // JWT minimalista: solo role + business_id (sin email ni nombres)
  const token = jwt.sign(
    { business_id: business.id, role: 'owner', staff_id: null },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const { password: _, ...businessData } = business

  reply.send({ token, business: businessData })
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

  // JWT minimalista: role + business_id + staff_id: null
  const token = jwt.sign(
    { business_id: business.id, role: 'owner', staff_id: null },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  )

  const { password: _, ...businessData } = business
  reply.send({ token, business: businessData })
}

// ─── Staff: Login por PIN ─────────────────────────────────────────────────────

/**
 * POST /api/auth/staff-login
 * Body: { business_id: number, pin: string }
 *
 * El PIN se pepa con el business_id antes de comparar con el hash almacenado.
 * Pepper: `${business_id}:${pin}` — previene rainbow tables sobre 0000-9999.
 *
 * JWT emitido: { business_id, role: 'empleado', staff_id } — minimalista.
 */
export const staffLogin = async (req, reply) => {
  const { business_id, pin } = req.body

  if (!business_id || !pin) {
    return reply.status(400).send({ error: 'business_id y pin son requeridos' })
  }
  if (!/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser de 4 dígitos numéricos' })
  }

  // Verificar que el negocio existe
  const business = await findBusinessById(business_id)
  if (!business) {
    return reply.status(401).send({ error: 'Negocio no encontrado' })
  }

  // Obtener todos los staff activos del negocio y comparar PIN pepado
  const staffList = await findStaffByBusinessAndPin(business_id, pin)
  const pepperedPin = `${business_id}:${pin}` // pepper dinámico con business_id

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

  // JWT minimalista: sin nombres ni emails
  // Normalizar rol a ASCII-safe antes de emitir el JWT
  const normalizedRole = matchedStaff.role === 'dueño' || matchedStaff.role === 'owner' ? 'owner' : 'employee'

  const token = jwt.sign(
    {
      business_id: matchedStaff.business_id,
      role: normalizedRole,
      staff_id: matchedStaff.id,
    },
    ENV.JWT_SECRET,
    { expiresIn: '12h' } // sesión más corta para staff
  )

  reply.send({ token, staff: { name: matchedStaff.name } })
}

// ─── Kiosco: Perfiles disponibles ─────────────────────────────────────────

/**
 * GET /api/auth/profiles (requiere verifyToken)
 * Devuelve la lista de perfiles (dueño + staff) para el Lock Screen.
 */
export const getProfiles = async (req, reply) => {
  const businessId = req.business.id

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
    console.error('Error getProfiles:', err)
    reply.status(500).send({ error: 'Error al obtener perfiles' })
  }
}

// ─── Kiosco: Verificar PIN ────────────────────────────────────────────────

/**
 * POST /api/auth/verify-pin (requiere verifyToken)
 * Body: { profile_id: 'owner' | 'staff-{id}', pin: '1234' }
 *
 * Valida el PIN sin emitir un nuevo JWT.
 * Devuelve: { valid: true, role, staff_id, name }
 */
export const verifyPin = async (req, reply) => {
  const businessId = req.business.id
  const { profile_id, pin } = req.body

  if (!profile_id || !pin) {
    return reply.status(400).send({ error: 'profile_id y pin son requeridos' })
  }

  if (!/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser de 4 dígitos' })
  }

  try {
    if (profile_id === 'owner') {
      // Verificar PIN del dueño
      const business = await findBusinessById(businessId)
      if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' })

      if (!business.owner_pin_hash) {
        return reply.status(400).send({ error: 'El dueño no tiene PIN configurado. Configuralo en Ajustes.' })
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

    // Staff PIN
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
    console.error('Error verifyPin:', err)
    reply.status(500).send({ error: 'Error al verificar PIN' })
  }
}

// ─── Dueño: Configurar Owner PIN ──────────────────────────────────────────

/**
 * PUT /api/settings/owner-pin (requiere verifyToken + requireRole('dueño'))
 * Body: { pin: '1234' }
 */
export const updateOwnerPin = async (req, reply) => {
  const businessId = req.business.id
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
    console.error('Error updateOwnerPin:', err)
    reply.status(500).send({ error: 'Error al actualizar el PIN' })
  }
}