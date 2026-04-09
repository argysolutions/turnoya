const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied'));
`)
  .then(() => console.log('Migración de restricción completada.'))
  .catch(e => console.error(e))
  .finally(() => pool.end());
