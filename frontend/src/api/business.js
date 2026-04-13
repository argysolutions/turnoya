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
