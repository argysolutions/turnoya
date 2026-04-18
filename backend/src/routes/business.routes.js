import { getSettings, updateSettings, updateStaffPin } from '../controllers/business.controller.js'
import { updateOwnerPin } from '../controllers/auth.controller.js'
import { listStaff, addStaff, editStaff, updateMemberPin, removeStaff } from '../controllers/staff.controller.js'
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js'
import bcrypt from 'bcrypt'
import { updateStaffPinHash, findStaffById } from '../db/staff.queries.js'

export const businessRoutes = async (app) => {
  app.get('/settings', { preHandler: [verifyToken, requireRole('owner')] }, getSettings)
  app.put('/settings', { preHandler: [verifyToken, requireRole('owner')] }, updateSettings)
  
  // Security — PINs (legacy endpoints)
  app.put('/settings/staff/pin', { preHandler: [verifyToken, requireRole('owner')] }, updateStaffPin)
  app.put('/settings/owner-pin', { preHandler: [verifyToken, requireRole('owner')] }, updateOwnerPin)

  // Staff Management CRUD (owner only)
  app.get('/staff', { preHandler: [verifyToken, requireRole('owner')] }, listStaff)
  app.post('/staff', { preHandler: [verifyToken, requireRole('owner')] }, addStaff)
  app.put('/staff/:id', { preHandler: [verifyToken, requireRole('owner')] }, editStaff)
  app.put('/staff/:id/pin', { preHandler: [verifyToken, requireRole('owner')] }, updateMemberPin)
  app.delete('/staff/:id', { preHandler: [verifyToken, requireRole('owner')] }, removeStaff)

  // Self-service: employee updates own PIN (any authenticated user with staff_id)
  app.put('/staff/me/pin', { preHandler: [verifyToken] }, async (req, reply) => {
    const staffId = req.user.id
    const businessId = req.user.business_id
    const { pin } = req.body

    if (!staffId) return reply.status(400).send({ error: 'No se encontró un perfil de staff asociado' })
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return reply.status(400).send({ error: 'El PIN debe ser exactamente 4 dígitos' })
    }

    try {
      const member = await findStaffById(staffId)
      if (!member || member.business_id !== businessId) {
        return reply.status(404).send({ error: 'Miembro no encontrado' })
      }

      const pepper = member.role === 'owner' ? `owner:${businessId}:${pin}` : `${businessId}:${pin}`
      const hash = await bcrypt.hash(pepper, 10)
      await updateStaffPinHash(staffId, hash)

      reply.send({ message: 'PIN actualizado correctamente' })
    } catch (err) {
      reply.log.error(err, 'Error self-update PIN')
      reply.status(500).send({ error: 'Error al actualizar PIN' })
    }
  })
}
