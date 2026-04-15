import { pool } from '../config/db.js'

/**
 * Busca un staff member por business_id y verifica el PIN.
 * El PIN se pepa con el business_id antes de hashear: `${businessId}:${pin}`
 * para prevenir rainbow tables sobre el espacio de 4 dígitos (0000-9999).
 */
export const findStaffByBusinessAndPin = async (businessId, pin) => {
  const { rows } = await pool.query(
    `SELECT id, business_id, name, role, professional_name, pin_hash, is_active
     FROM staff
     WHERE business_id = $1 AND is_active = TRUE`,
    [businessId]
  )
  return rows // el caller itera y compara el hash
}

/**
 * Lista el staff activo de un negocio (sin exponer pin_hash).
 */
export const getStaffByBusiness = async (businessId) => {
  const { rows } = await pool.query(
    `SELECT id, name, role, professional_name, is_active, created_at
     FROM staff
     WHERE business_id = $1
     ORDER BY name ASC`,
    [businessId]
  )
  return rows
}

/**
 * Crea un nuevo miembro de staff.
 * @param {number} businessId
 * @param {string} name
 * @param {string} pinHash   - bcrypt hash de `${businessId}:${pin}`
 * @param {string} role      - 'employee' | 'owner'
 * @param {string|null} professionalName
 */
export const createStaff = async (businessId, name, pinHash, role = 'employee', professionalName = null) => {
  const { rows } = await pool.query(
    `INSERT INTO staff (business_id, name, pin_hash, role, professional_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, business_id, name, role, professional_name, is_active, created_at`,
    [businessId, name, pinHash, role, professionalName]
  )
  return rows[0]
}

/**
 * Actualiza el hash del PIN de un miembro del staff.
 */
export const updateStaffPinHash = async (id, pinHash) => {
  const { rows } = await pool.query(
    `UPDATE staff SET pin_hash = $1 WHERE id = $2 RETURNING id`,
    [pinHash, id]
  )
  return rows[0]
}
