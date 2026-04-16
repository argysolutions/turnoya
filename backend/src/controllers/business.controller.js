import bcrypt from 'bcrypt'
import { findBusinessById, updateBusinessSettings, updateOwnerPinHash } from '../db/business.queries.js'
import { getStaffByBusiness, createStaff, updateStaffPinHash } from '../db/staff.queries.js'

export const getSettings = async (req, reply) => {
  try {
    const businessId = req.business.id
    const business = await findBusinessById(businessId)
    if (!business) return reply.status(404).send({ error: 'Business no encontrado' })

    reply.send({
      cancellation_policy: business.cancellation_policy || '',
      anticipation_margin: business.anticipation_margin || 0,
      buffer_time: business.buffer_time || 0,
      whatsapp_enabled: business.whatsapp_enabled || false,
      commission_rate: parseFloat(business.commission_rate || 0),
      expense_categories: business.expense_categories || ['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro'],
      staff_permissions: business.staff_permissions || {
        view_caja: true,
        manage_clients: true,
        manage_services: false,
        delete_appointments: false,
        view_analytics: false
      }
    })
  } catch (error) {
    reply.status(500).send({ error: 'Error al obtener la configuración' })
  }
}

export const updateSettings = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { 
      cancellation_policy, 
      anticipation_margin, 
      buffer_time, 
      whatsapp_enabled,
      commission_rate,
      expense_categories,
      staff_permissions
    } = req.body

    const updated = await updateBusinessSettings(businessId, {
      cancellation_policy, 
      anticipation_margin, 
      buffer_time, 
      whatsapp_enabled,
      commission_rate,
      expense_categories,
      staff_permissions
    })

    if (!updated) return reply.status(404).send({ error: 'Business no encontrado' })

    reply.send({
      cancellation_policy: updated.cancellation_policy || '',
      anticipation_margin: updated.anticipation_margin || 0,
      buffer_time: updated.buffer_time || 0,
      whatsapp_enabled: updated.whatsapp_enabled || false,
      commission_rate: parseFloat(updated.commission_rate || 0),
      expense_categories: updated.expense_categories || [],
      staff_permissions: updated.staff_permissions
    })
  } catch (error) {
    reply.status(500).send({ error: 'Error al actualizar la configuración' })
  }
}

export const updateStaffPin = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { pin } = req.body

    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return reply.status(400).send({ error: 'El PIN debe ser exactamente 4 dígitos numéricos' })
    }

    const pepperedPin = `${businessId}:${pin}`
    const hash = await bcrypt.hash(pepperedPin, 10)

    const staffList = await getStaffByBusiness(businessId)
    // Para simplificar, buscamos si ya existe el empleado por defecto, sino se crea
    let targetStaff = staffList.find(s => s.role === 'empleado')

    if (!targetStaff) {
      targetStaff = await createStaff(businessId, 'Empleado General', hash, 'empleado')
    } else {
      await updateStaffPinHash(targetStaff.id, hash)
    }

    reply.send({ message: 'PIN actualizado correctamente', staff_name: targetStaff.name || 'Empleado General' })
  } catch (error) {
    reply.status(500).send({ error: 'Error al actualizar el PIN de staff' })
  }
}
