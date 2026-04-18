import bcrypt from 'bcrypt'
import {
  getStaffByBusiness,
  createStaff,
  updateStaff,
  updateStaffPinHash,
  deactivateStaff,
  findStaffById,
} from '../db/staff.queries.js'

/**
 * GET /api/staff — Lista todos los miembros del staff del negocio.
 */
export const listStaff = async (req, reply) => {
  try {
    const staff = await getStaffByBusiness(req.user.business_id)
    reply.send({
      staff: staff.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        professional_name: s.professional_name,
        is_active: s.is_active,
        has_pin: !!s.pin_hash, // No exponer el hash, solo si tiene PIN
        created_at: s.created_at,
      }))
    })
  } catch (err) {
    reply.log.error(err, 'Error listStaff')
    reply.status(500).send({ error: 'Error al listar el staff' })
  }
}

/**
 * POST /api/staff — Crea un nuevo miembro del staff.
 * Body: { name, pin, role?, professional_name? }
 */
export const addStaff = async (req, reply) => {
  const businessId = req.user.business_id
  const { name, pin, role = 'employee', professional_name = null } = req.body

  if (!name || !name.trim()) {
    return reply.status(400).send({ error: 'El nombre es obligatorio' })
  }
  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser exactamente 4 dígitos' })
  }
  if (!['employee', 'owner'].includes(role)) {
    return reply.status(400).send({ error: 'Rol inválido' })
  }

  try {
    const pepper = role === 'owner' ? `owner:${businessId}:${pin}` : `${businessId}:${pin}`
    const pinHash = await bcrypt.hash(pepper, 10)
    const member = await createStaff(businessId, name.trim(), pinHash, role, professional_name?.trim() || null)

    reply.status(201).send({
      staff: {
        id: member.id,
        name: member.name,
        role: member.role,
        professional_name: member.professional_name,
        is_active: member.is_active,
        has_pin: true,
        created_at: member.created_at,
      }
    })
  } catch (err) {
    reply.log.error(err, 'Error addStaff')
    reply.status(500).send({ error: 'Error al crear miembro del staff' })
  }
}

/**
 * PUT /api/staff/:id — Actualiza un miembro del staff.
 * Body: { name?, role?, professional_name? }
 */
export const editStaff = async (req, reply) => {
  const { id } = req.params
  const businessId = req.user.business_id

  try {
    const existing = await findStaffById(id)
    if (!existing || existing.business_id !== businessId) {
      return reply.status(404).send({ error: 'Miembro no encontrado' })
    }

    const { name, role, professional_name } = req.body
    const updated = await updateStaff(id, {
      name: (name?.trim()) || existing.name,
      role: role || existing.role,
      professionalName: professional_name?.trim() ?? existing.professional_name,
    })

    reply.send({
      staff: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
        professional_name: updated.professional_name,
        is_active: updated.is_active,
        created_at: updated.created_at,
      }
    })
  } catch (err) {
    reply.log.error(err, 'Error editStaff')
    reply.status(500).send({ error: 'Error al actualizar miembro' })
  }
}

/**
 * PUT /api/staff/:id/pin — Actualiza el PIN de un miembro.
 * Body: { pin }
 */
export const updateMemberPin = async (req, reply) => {
  const { id } = req.params
  const businessId = req.user.business_id
  const { pin } = req.body

  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return reply.status(400).send({ error: 'El PIN debe ser exactamente 4 dígitos' })
  }

  try {
    const existing = await findStaffById(id)
    if (!existing || existing.business_id !== businessId) {
      return reply.status(404).send({ error: 'Miembro no encontrado' })
    }

    const pepper = existing.role === 'owner' ? `owner:${businessId}:${pin}` : `${businessId}:${pin}`
    const hash = await bcrypt.hash(pepper, 10)
    await updateStaffPinHash(id, hash)

    reply.send({ message: 'PIN actualizado correctamente' })
  } catch (err) {
    reply.log.error(err, 'Error updateMemberPin')
    reply.status(500).send({ error: 'Error al actualizar PIN' })
  }
}

/**
 * DELETE /api/staff/:id — Desactiva un miembro del staff (soft delete).
 */
export const removeStaff = async (req, reply) => {
  const { id } = req.params
  const businessId = req.user.business_id

  try {
    const existing = await findStaffById(id)
    if (!existing || existing.business_id !== businessId) {
      return reply.status(404).send({ error: 'Miembro no encontrado' })
    }

    await deactivateStaff(id)
    reply.send({ message: 'Miembro desactivado correctamente' })
  } catch (err) {
    reply.log.error(err, 'Error removeStaff')
    reply.status(500).send({ error: 'Error al desactivar miembro' })
  }
}
