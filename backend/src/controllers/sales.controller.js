import { getSalesByBusiness } from '../db/sales.queries.js'

export const listSales = async (req, reply) => {
  try {
    const businessId = req.user.business_id
    const { date } = req.query

    const { sales, total, count } = await getSalesByBusiness(businessId, date || null)

    reply.send({ sales, total, count })
  } catch (error) {
    reply.log.error(error, 'Error listando ventas')
    reply.status(500).send({ error: 'Error al obtener las ventas' })
  }
}
