const { Pool } = require('./backend/node_modules/pg');

// Podés reemplazar este connectionString si tu string externo en Render cambió
const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
  try {
    console.log('⏳ Conectando a la base de datos de Render e iniciando migración...');
    
    await pool.query(`
      -- Modificaciones a la tabla businesses
      ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS min_advance_hours INT DEFAULT 2,
        ADD COLUMN IF NOT EXISTS max_future_days INT DEFAULT 30,
        ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

      -- Modificaciones a la tabla services
      ALTER TABLE services 
        ADD COLUMN IF NOT EXISTS buffer_time INT DEFAULT 0;

      -- Modificaciones a la tabla clients
      -- Si la tabla clients no existe previamente como entidad independiente,
      -- asegúrate de crearla primero. Asumiendo que existe:
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        business_id INT REFERENCES businesses(id),
        phone VARCHAR(255) NOT NULL,
        name VARCHAR(255)
      );

      ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS google_contact_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_frequent BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS internal_notes TEXT;
    `);

    console.log('✅ ¡Migración de tablas completada con éxito!');
  } catch (error) {
    console.error('❌ Hubo un error ejecutando el script:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
