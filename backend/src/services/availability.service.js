export const timeToMinutes = (time) => {
  const [h, m] = time.toString().split(':').map(Number)
  return h * 60 + m
}

export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * generateAvailableSlots calculates slots for a specific day, enforcing business rules
 * 
 * @param {string} date - Date to request (YYYY-MM-DD)
 * @param {object} business - Business data including rules (min_advance_hours, max_future_days)
 * @param {object} service - Service data including (duration, buffer_time)
 * @param {object} availability - Availability time bounds for the requested day {start_time, end_time}
 * @param {Array} occupiedSlots - Array of existing appointments [{start_time, end_time}]
 * @returns {Array} List of available slots [{ start, end }]
 */
export const generateAvailableSlots = ({ date, business, service, availability, occupiedSlots }) => {
  // Ajuste para tomar correctamente la hora actual en zona horaria de Argentina
  const nowArgentinaString = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  const now = new Date(nowArgentinaString)
  
  // Regla: Límite Futuro (max_future_days)
  const reqDate = new Date(date + 'T00:00:00')
  reqDate.setHours(0,0,0,0)
  
  const futureLimit = new Date(nowArgentinaString)
  futureLimit.setDate(futureLimit.getDate() + (business.max_future_days ?? 30))
  futureLimit.setHours(23, 59, 59, 999)

  if (reqDate > futureLimit) {
    return [] // Se supera el límite futuro permitido
  }

  // Regla: Margen de Anticipación (min_advance_hours)
  const advanceHours = business.min_advance_hours ?? 2
  const cutoffTime = new Date(now.getTime() + advanceHours * 60 * 60 * 1000)

  const start = timeToMinutes(availability.start_time)
  const end = timeToMinutes(availability.end_time)
  
  const duration = service.duration || 0
  const bufferTime = service.buffer_time || 0
  const totalSlotTime = duration + bufferTime

  const slots = []

  for (let time = start; time + totalSlotTime <= end; time += totalSlotTime) {
    const slotStart = minutesToTime(time)
    
    // Determinando el end visual que verá el cliente (el turno finaliza luego de la "duration")
    // El "buffer" servirá internamente para espaciar los inicios (en el iterador time += totalSlotTime)
    const slotEnd = minutesToTime(time + duration) 
    
    // Validar anticipación estricta
    const [year, month, day] = date.split('-').map(Number)
    const [h, m] = slotStart.split(':').map(Number)
    const slotDateObj = new Date(year, month - 1, day, h, m, 0)

    if (slotDateObj <= cutoffTime) {
      continue // El margen es inferior al permitido por la anticipación (min_advance_hours)
    }

    const isOccupied = occupiedSlots.some(occupied => {
      const occStart = timeToMinutes(occupied.start_time)
      const occEnd = timeToMinutes(occupied.end_time)
      
      // Existe superposición si el slot a solicitar interseca a algún turno ocupado existente
      // Note que el slot propuesto se extiende por duration + bufferTime (totalSlotTime)
      return time < occEnd && time + totalSlotTime > occStart
    })

    if (!isOccupied) {
      slots.push({ start: slotStart, end: slotEnd })
    }
  }

  return slots
}
