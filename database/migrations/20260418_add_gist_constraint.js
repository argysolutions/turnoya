const { Client } = require('../../backend/node_modules/pg');

const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const migrate = async () => {
  try {
    await client.connect();
    console.log('⏳ Iniciando migración de concurrencia...');

    // 1. Habilitar extensión btree_gist
    console.log('🔹 Habilitando btree_gist...');
    await client.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');

    // 2. Limpiar turnos duplicados previos si existen (opcional pero recomendado para que el constraint no falle al crearse)
    // En este caso, asumimos que la data está limpia o el usuario prefiere fallar.
    
    // 3. Agregar el constraint de exclusión
    console.log('🔹 Agregando EXCLUDE USING gist...');
    await client.query(`
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_overlap_exclusion;
      
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_overlap_exclusion 
      EXCLUDE USING gist (
        business_id WITH =, 
        tstzrange(start_at, end_at) WITH &&
      ) 
      WHERE (status NOT IN ('cancelled', 'cancelled_timeout'));
    `);

    console.log('✅ ¡GIST Constraint aplicado con éxito!');
  } catch (error) {
    console.error('❌ Error de migración:', error.message);
    if (error.message.includes('conflicts with existing key')) {
      console.error('⚠️ Detectados turnos solapados pre-existentes en la base de datos. Debes limpiarlos manualmente antes de aplicar el constraint físico.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
};

migrate();
