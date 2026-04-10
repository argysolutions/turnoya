const { Pool } = require('./backend/node_modules/pg');

const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
  try {
    console.log('⏳ Añadiendo la columna google_refresh_token a la tabla businesses...');
    
    await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
    `);

    console.log('✅ ¡Columna de token creada con éxito!');
  } catch (error) {
    console.error('❌ Hubo un error ejecutando el script:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
