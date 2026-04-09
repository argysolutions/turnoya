const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  connectionString: 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l',
  ssl: { rejectUnauthorized: false }
});

pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS liberates_at TIMESTAMP NULL;`)
  .then(() => console.log('Columna insertada con éxito.'))
  .catch(e => console.error(e))
  .finally(() => pool.end());
