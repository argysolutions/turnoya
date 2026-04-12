import client from './client'

export const getSales = (date) => client.get(`/sales${date ? `?date=${date}` : ''}`)
