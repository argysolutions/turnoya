import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'admin321';
const BASE_URL = 'http://localhost:3000/api';

// Mocks para testing
const BUSINESS_A = 1;
const BUSINESS_B = 2; // Negocio ajeno
const STAFF_ID_A = 10;

const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1h' });

const tokens = {
  ownerA: signToken({ id: BUSINESS_A, business_id: BUSINESS_A, role: 'owner', name: 'Owner A' }),
  employeeA: signToken({ id: STAFF_ID_A, business_id: BUSINESS_A, role: 'employee', name: 'Employee A' }),
  ownerB: signToken({ id: BUSINESS_B, business_id: BUSINESS_B, role: 'owner', name: 'Owner B' }),
};

async function runTests() {
  console.log('🚀 Iniciando Auditoría de Seguridad: RBAC & Multi-tenancy\n');

  // --- 1. BATERÍA RBAC (Empleado vs Dueño) ---
  console.log('--- [1] Batería RBAC (Empleados) ---');

  // Caso: Acceso a Finanzas
  try {
    console.log('⏳ Test: Empleado accediendo a resumen financiero...');
    await axios.get(`${BASE_URL}/finances/summary`, {
      headers: { Authorization: `Bearer ${tokens.employeeA}` }
    });
    console.log('❌ FALLO: El empleado pudo acceder a finanzas.');
  } catch (err) {
    if (err.response?.status === 403) console.log('✅ ÉXITO: 403 Forbidden (Acceso Denegado)');
    else console.log(`⚠️ ERROR inesperado: ${err.response?.status || err.message}`);
  }

  // Caso: Desvincular Google
  try {
    console.log('⏳ Test: Empleado intentando desvincular Google Calendar...');
    await axios.delete(`${BASE_URL}/admin/auth/google`, {
      headers: { Authorization: `Bearer ${tokens.employeeA}` }
    });
    console.log('❌ FALLO: El empleado pudo desvincular Google.');
  } catch (err) {
    if (err.response?.status === 403) console.log('✅ ÉXITO: 403 Forbidden (Acceso Denegado)');
    else console.log(`⚠️ ERROR inesperado: ${err.response?.status || err.message}`);
  }

  // Caso: Ver agenda (Permitido)
  try {
    console.log('⏳ Test: Empleado viendo agenda del día...');
    const res = await axios.get(`${BASE_URL}/appointments`, {
      headers: { Authorization: `Bearer ${tokens.employeeA}` }
    });
    if (res.status === 200) console.log('✅ ÉXITO: 200 OK (Acceso Permitido)');
  } catch (err) {
    console.log(`❌ FALLO: El empleado debería poder ver la agenda. Status: ${err.response?.status}`);
  }

  // --- 2. BATERÍA MULTI-TENANT (Aislamiento) ---
  console.log('\n--- [2] Batería Multi-tenant (Aislamiento de Negocios) ---');

  // Nota: Para este test necesitamos un ID que exista pero pertenezca a otro negocio.
  // Intentaremos adivinar un ID bajo o usar uno proporcionado.
  const FOREIGN_APPOINTMENT_ID = 1; // Ajustar según realidad de DB

  try {
    console.log(`⏳ Test: Business A intentando leer turno ID ${FOREIGN_APPOINTMENT_ID} de Business B...`);
    await axios.get(`${BASE_URL}/appointments/${FOREIGN_APPOINTMENT_ID}`, {
      headers: { Authorization: `Bearer ${tokens.ownerA}` }
    });
    console.log('❌ FALLO CRÍTICO: Se pudo leer un turno de otro negocio.');
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 403) {
      console.log(`✅ ÉXITO: ${err.response.status} ${err.response.status === 404 ? 'Not Found (Filtrado)' : 'Forbidden'}`);
    } else {
      console.log(`⚠️ ERROR inesperado: ${err.response?.status || err.message}`);
    }
  }

  // --- 3. TEST DE TRANSICIÓN (Staff Authorization) ---
  console.log('\n--- [3] Test de Autorización (Staff Approval Workflow) ---');
  
  // Buscamos un turno que esté en 'pending_block' para intentar aprobarlo como empleado
  try {
    console.log('⏳ Test: Empleado intentando aprobar un "pending_block"...');
    // 1. Dueño lista pendientes
    const pendingRes = await axios.get(`${BASE_URL}/appointments/pending`, {
      headers: { Authorization: `Bearer ${tokens.ownerA}` }
    });
    
    if (pendingRes.data.length > 0) {
      const targetId = pendingRes.data[0].id;
      // 2. Empleado intenta aprobarlo
      try {
        await axios.patch(`${BASE_URL}/appointments/${targetId}/status`, {
          status: 'blocked'
        }, {
          headers: { Authorization: `Bearer ${tokens.employeeA}` }
        });
        console.log('❌ FALLO: El empleado pudo auto-aprobar su bloqueo.');
      } catch (err) {
        if (err.response?.status === 403 || (err.response?.data?.error?.includes('permisos'))) {
          console.log('✅ ÉXITO: Bloqueado por lógica de negocio (403/Error)');
        } else {
          console.log(`⚠️ ERROR: ${err.response?.data?.error || err.message}`);
        }
      }
    } else {
      console.log('⏩ SALTEADO: No hay bloqueos pendientes en la DB para testear.');
    }
  } catch (err) {
    console.log('⚠️ No se pudo verificar el workflow de aprobación (¿Servidor apagado?)');
  }

  console.log('\n✅ Auditoría Finalizada.');
}

runTests();
