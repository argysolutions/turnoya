import jwt from 'jsonwebtoken'
import { app } from '../src/server.js'
import { pool } from '../src/config/db.js'
import { ENV } from '../src/config/env.js'

async function runTest() {
  console.log('🚀 Iniciando Verificación Automatizada Extendida de Incidencias...')

  try {
    // 1. Obtener un business_id válido para la prueba
    const bizRes = await pool.query('SELECT id FROM businesses LIMIT 1')
    if (bizRes.rows.length === 0) throw new Error('No hay negocios en la base de datos para probar.')
    const businessId = bizRes.rows[0].id
    console.log(`✅ Usando business_id: ${businessId}`)

    // 2. Generar tokens JWT
    const secret = ENV.JWT_SECRET
    const employeeToken = jwt.sign({ id: 999, business_id: businessId, role: 'employee' }, secret)
    const ownerToken = jwt.sign({ id: 1, business_id: businessId, role: 'owner' }, secret)

    // 3. Test POST: Crear incidencia como Empleado (Debe dar 201)
    console.log('\n🔍 Probando POST como rol: employee (Esperado: 201)...')
    const resPostEmp = await app.inject({
      method: 'POST',
      url: '/api/incidencias',
      headers: { authorization: `Bearer ${employeeToken}` },
      payload: {
        sintoma: 'Error de carga en caja',
        causa_raiz: 'Timeout de API',
        solucion: 'Reintento manual',
        accion_preventiva: 'Aumentar timeout'
      }
    })
    console.log(`📡 Status Code: ${resPostEmp.statusCode}`)
    const createdId = JSON.parse(resPostEmp.payload).data?.id
    if (resPostEmp.statusCode === 201) {
      console.log('✅ ÉXITO 201: El empleado pudo crear la incidencia.')
    } else {
      console.log('❌ FALLO: El empleado no pudo crear la incidencia.')
    }

    // 4. Test GET: Listar incidencias como Empleado (Debe dar 403)
    console.log('\n🔍 Probando GET como rol: employee (Esperado: 403)...')
    const resGetEmp = await app.inject({
      method: 'GET',
      url: '/api/incidencias',
      headers: { authorization: `Bearer ${employeeToken}` }
    })
    console.log(`📡 Status Code: ${resGetEmp.statusCode}`)
    if (resGetEmp.statusCode === 403) {
      console.log('✅ ÉXITO 403: El acceso fue denegado al empleado correctamente.')
    } else {
      console.log('❌ FALLO: El servidor no bloqueó el acceso de lectura al empleado.')
    }

    // 5. Test GET: Listar incidencias como Owner (Debe dar 200)
    console.log('\n🔍 Probando GET como rol: owner (Esperado: 200)...')
    const resGetOwner = await app.inject({
      method: 'GET',
      url: '/api/incidencias',
      headers: { authorization: `Bearer ${ownerToken}` }
    })
    console.log(`📡 Status Code: ${resGetOwner.statusCode}`)
    if (resGetOwner.statusCode === 200) {
      console.log('✅ ÉXITO 200: El dueño pudo listar las incidencias.')
      console.log(`📊 Cantidad recibida: ${JSON.parse(resGetOwner.payload).length}`)
    } else {
      console.log('❌ FALLO: El dueño no pudo listar las incidencias.')
    }

    // 6. Test DELETE: Eliminar incidencia como Owner (Debe dar 200)
    if (createdId) {
      console.log(`\n🔍 Probando DELETE de ID ${createdId} como rol: owner (Esperado: 200)...`)
      const resDelete = await app.inject({
        method: 'DELETE',
        url: `/api/incidencias/${createdId}`,
        headers: { authorization: `Bearer ${ownerToken}` }
      })
      console.log(`📡 Status Code: ${resDelete.statusCode}`)
      if (resDelete.statusCode === 200) {
        console.log('✅ ÉXITO 200: El dueño eliminó el reporte.')
      } else {
        console.log('❌ FALLO: No se pudo eliminar el reporte.')
      }
    }

  } catch (err) {
    console.error('\n❌ ERROR CRÍTICO:', err.message)
  } finally {
    console.log('\n🏁 Verificación finalizada.')
    await pool.end()
    process.exit(0)
  }
}

runTest()
