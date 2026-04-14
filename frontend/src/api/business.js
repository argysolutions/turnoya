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
 * Actualiza el PIN de acceso del staff/empleado.
 * @param {string} pin - El PIN de 4 dígitos.
 */
export const updateStaffPin = (pin) => client.put('/settings/staff/pin', { pin })
