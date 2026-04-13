import { findBusinessById, updateBusinessSettings } from '../db/business.queries.js'

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
      expense_categories: business.expense_categories || ['General', 'Insumos', 'Servicios', 'Alquiler', 'Personal', 'Marketing', 'Otro']
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
      expense_categories 
    } = req.body

    const updated = await updateBusinessSettings(businessId, {
      cancellation_policy: cancellation_policy || null,
      anticipation_margin: anticipation_margin || 0,
      buffer_time: buffer_time || 0,
      whatsapp_enabled: whatsapp_enabled || false,
      commission_rate: commission_rate || 0,
      expense_categories: expense_categories || []
    })

    if (!updated) return reply.status(404).send({ error: 'Business no encontrado' })

    reply.send({
      cancellation_policy: updated.cancellation_policy || '',
      anticipation_margin: updated.anticipation_margin || 0,
      buffer_time: updated.buffer_time || 0,
      whatsapp_enabled: updated.whatsapp_enabled || false,
      commission_rate: parseFloat(updated.commission_rate || 0),
      expense_categories: updated.expense_categories || []
    })
  } catch (error) {
    reply.status(500).send({ error: 'Error al actualizar la configuración' })
  }
}
