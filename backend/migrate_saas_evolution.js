import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'turnoya',
  user: 'postgres',
  password: 'admin',
});

async function migrate() {
  try {
    console.log('⏳ Aplicando migración de permisos granulares...');
    
    // Añadir columna staff_permissions (JSONB)
    await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS staff_permissions JSONB DEFAULT '{
        "view_caja": true,
        "manage_clients": true,
        "manage_services": false,
        "delete_appointments": false,
        "view_analytics": false
      }'::jsonb;
    `);
    
    console.log('✅ Columna staff_permissions añadida con valores por defecto.');
    console.log('✅ Migración completada.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
