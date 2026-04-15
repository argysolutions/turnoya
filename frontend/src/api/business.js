import client from './client'

/**
 * Obtiene la configuración del negocio (políticas, comisiones, categorías).
 */
export const getSettings = () => client.get('/settings')

/**
 * Actualiza la configuración del negocio.
 * @param {Object} data - Datos a actualizar
 */
export const updateSettings = (data) => client.put('/settings', data)

/**
 * Actualiza el PIN de acceso del staff/empleado (legacy).
 * @param {string} pin - El PIN de 4 dígitos.
 */
export const updateStaffPin = (pin) => client.put('/settings/staff/pin', { pin })

/**
 * Actualiza el PIN del dueño para el kiosco (legacy).
 * @param {string} pin - El PIN de 4 dígitos.
 */
export const updateOwnerPin = (pin) => client.put('/settings/owner-pin', { pin })

// ─── Staff Management CRUD ──────────────────────────────────────────────────

export const listStaff = () => client.get('/staff')
export const addStaff = (data) => client.post('/staff', data)
export const editStaff = (id, data) => client.put(`/staff/${id}`, data)
export const updateMemberPin = (id, pin) => client.put(`/staff/${id}/pin`, { pin })
export const removeStaff = (id) => client.delete(`/staff/${id}`)

