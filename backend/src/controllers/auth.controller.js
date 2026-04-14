import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env.js'
import { findBusinessByEmail, findBusinessBySlug, createBusiness, findBusinessById } from '../db/business.queries.js'
import { findStaffByBusinessAndPin } from '../db/staff.queries.js'
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
    { business_id: business.id, role: 'dueño', staff_id: null },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  )

  reply.send({ token, business })
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
    { business_id: business.id, role: 'dueño', staff_id: null },
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
  const token = jwt.sign(
    {
      business_id: matchedStaff.business_id,
      role: matchedStaff.role,
      staff_id: matchedStaff.id,
    },
    ENV.JWT_SECRET,
    { expiresIn: '12h' } // sesión más corta para staff
  )

  reply.send({ token, staff: { name: matchedStaff.name } })
}

// ─── Temp Dev ─────────────────────────────────────────────────────────────

export const fixStaffPin = async (req, reply) => {
  try {
    const res = await pool.query("SELECT id, name FROM businesses WHERE email = 'pruebas@gmail.com'")
    if (res.rows.length === 0) {
      return reply.send({ error: 'Business not found' })
    }
    const b = res.rows[0]
    const pin = '1234'
    const pepperedPin = b.id + ':' + pin
    const hash = await bcrypt.hash(pepperedPin, 10)
    
    const staffRes = await pool.query('SELECT * FROM staff WHERE business_id = $1 LIMIT 1', [b.id])
    if (staffRes.rows.length === 0) {
      await pool.query('INSERT INTO staff (business_id, name, pin_hash, role) VALUES ($1, $2, $3, $4)', [b.id, 'Empleado de Pruebas', hash, 'empleado'])
      reply.send({ success: true, message: 'Created new staff Empleado de Pruebas with PIN 1234', business_id: b.id })
    } else {
      await pool.query('UPDATE staff SET pin_hash = $1 WHERE id = $2', [hash, staffRes.rows[0].id])
      reply.send({ success: true, message: 'Updated existing staff ' + staffRes.rows[0].name + ' to have PIN 1234', business_id: b.id })
    }
  } catch (error) {
    reply.status(500).send({ error: error.message })
  }
}