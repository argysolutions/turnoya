import axios from 'axios'
import { ENV } from '../config/env.js'

/**
 * Limpia el número de teléfono para que sea compatible con Green API.
 * Elimina espacios, guiones, y cualquier caracter que no sea un número.
 * Le agrega el subfijo @c.us necesario para mandar mensajes de WhatsApp.
 */
const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '') // Solo deja números
  return `${cleaned}@c.us`
}

/**
 * Formatea una fecha YYYY-MM-DD al formato local argentino DD/MM/YYYY
 */
const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Función principal para enviar confirmación de turno.
 */
export const sendConfirmation = async (clientPhone, appointmentData) => {
  const { businessName, serviceName, date, startTime } = appointmentData

  // Si no están configuradas las credenciales, no intentamos enviar (e.g. en entorno de desarrollo rápido)
  if (!ENV.GREEN_API.INSTANCE_ID || !ENV.GREEN_API.TOKEN) {
    console.warn('⚠️ Green API no configurado. Mensaje de WhatsApp simulado:', clientPhone)
    return false
  }

  const chatId = formatPhoneNumber(clientPhone)
  const formattedDate = formatDate(date)

  // Mensaje profesional y amigable
  const message = `¡Hola! 👋 Te escribimos de *${businessName}*.

Queríamos confirmarte tu turno para *${serviceName}*.
📅 Fecha: ${formattedDate}
⏰ Hora: ${startTime.slice(0, 5)}hs

¡Te esperamos! Cualquier consulta, no dudes en respondernos a este número.`

  const url = `https://api.green-api.com/waInstance${ENV.GREEN_API.INSTANCE_ID}/sendMessage/${ENV.GREEN_API.TOKEN}`

  try {
    const response = await axios.post(url, {
      chatId,
      message,
    })
    
    console.log(`✅ WhatsApp de confirmación enviado a ${chatId}`)
    return response.data
  } catch (error) {
    console.error('❌ Error enviando WhatsApp por Green API:', error.response?.data || error.message)
    // No lanzamos excepcion acá para no frenar el flujo completo de la DB
    return false
  }
}
