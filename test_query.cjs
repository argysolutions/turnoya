const { Pool } = require('./backend/node_modules/pg');

const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function testQuery() {
  try {
    console.log('🧪 Probando consulta getAppointmentsByBusiness...');
    const businessId = 1; // ID de prueba usual
    const date = '2026-04-18'; 

    const query = `SELECT a.*,
                      s.name as service_name, s.duration, s.price,
                      c.nombre as client_name, c.telefono as client_phone,
                      (SELECT CAST(COUNT(*) AS INTEGER) FROM appointments a2 WHERE a2.client_id = a.client_id AND a2.business_id = a.business_id) as client_history_count
               FROM appointments a
               JOIN services s ON a.service_id = s.id
               JOIN clientes c ON a.client_id = c.id
               WHERE a.business_id = $1 AND a.start_at::date = $2
               ORDER BY a.start_at ASC`;
    
    const res = await pool.query(query, [businessId, date]);
    console.log('✅ Consulta exitosa! Filas encontradas:', res.rowCount);
    console.log('Sample data:', res.rows[0]);
  } catch (err) {
    console.error('❌ Error en la consulta:', err.message);
  } finally {
    await pool.end();
  }
}

testQuery();
