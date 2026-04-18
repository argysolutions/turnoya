import { createExpense, deleteExpenseById } from '../db/expenses.queries.js'

export const addExpense = async (req, reply) => {
  try {
    const businessId = req.user.business_id
    const userId     = req.user.id
    const { description, amount, category, created_at, is_advance, professional_name } = req.body

    if (!description || !amount) {
      return reply.status(400).send({ error: 'description y amount son requeridos' })
    }

    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      return reply.status(400).send({ error: 'amount debe ser un número positivo' })
    }

    const expense = await createExpense(
      businessId,
      description.trim(),
      parsed,
      category || 'General',
      created_at || null,
      Boolean(is_advance),
      professional_name || null,
      userId
    )

    reply.status(201).send(expense)
  } catch (err) {
    reply.log.error(err, 'Error createExpense')
    reply.status(500).send({ error: 'Error al crear gasto' })
  }
}

export const removeExpense = async (req, reply) => {
  try {
    const businessId = req.user.business_id
    const { id } = req.params

    const deleted = await deleteExpenseById(id, businessId)

    if (!deleted) {
      return reply.status(404).send({ error: 'Gasto no encontrado' })
    }

    reply.send({ message: 'Gasto eliminado' })
  } catch (err) {
    reply.log.error(err, 'Error deleteExpense')
    reply.status(500).send({ error: 'Error al eliminar gasto' })
  }
}
