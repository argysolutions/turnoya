import pg from 'pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

async function run() {
  try {
    const res = await pool.query("SELECT id, name FROM businesses WHERE email = 'pruebas@gmail.com'")
    if (res.rows.length === 0) { 
      console.log('Business not found')
      return
    }
    const b = res.rows[0]
    console.log('Negocio encontrado:', b)
    
    const pin = '1234'
    const pepperedPin = b.id + ':' + pin
    const hash = await bcrypt.hash(pepperedPin, 10)
    
    // Check if staff exists
    const staffRes = await pool.query('SELECT * FROM staff WHERE business_id = $1 LIMIT 1', [b.id])
    if (staffRes.rows.length === 0) {
      await pool.query('INSERT INTO staff (business_id, name, pin_hash, role) VALUES ($1, $2, $3, $4)', [b.id, 'Empleado de Pruebas', hash, 'empleado'])
      console.log('✅ Creado nuevo staff "Empleado de Pruebas" con PIN 1234. ID Negocio: ' + b.id)
    } else {
      await pool.query('UPDATE staff SET pin_hash = $1 WHERE id = $2', [hash, staffRes.rows[0].id])
      console.log('✅ Actualizado el staff existente "' + staffRes.rows[0].name + '" con PIN 1234. ID Negocio: ' + b.id)
    }
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

run()
