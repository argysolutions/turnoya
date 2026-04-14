import { createExpense, deleteExpenseById } from '../db/expenses.queries.js'

export const addExpense = async (req, reply) => {
  try {
    const businessId = req.business.id
    const staffId    = req.business.staff_id ?? null // null para el dueño
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
      staffId
    )

    reply.status(201).send(expense)
  } catch (error) {
    console.error('Error creando gasto:', error)
    reply.status(500).send({ error: 'Error al registrar el gasto' })
  }
}

export const removeExpense = async (req, reply) => {
  try {
    const businessId = req.business.id
    const { id } = req.params

    const deleted = await deleteExpenseById(id, businessId)

    if (!deleted) {
      return reply.status(404).send({ error: 'Gasto no encontrado' })
    }

    reply.send({ message: 'Gasto eliminado', expense: deleted })
  } catch (error) {
    console.error('Error eliminando gasto:', error)
    reply.status(500).send({ error: 'Error al eliminar el gasto' })
  }
}
