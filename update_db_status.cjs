const { Pool } = require('./backend/node_modules/pg');

const connectionString = 'postgresql://turnoya_db_mq9l_user:0oL2En7EDB4Rhlql65kX2aeeKsendRuy@dpg-d7as4pfkijhs73a9ashg-a.virginia-postgres.render.com/turnoya_db_mq9l';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function updateSchema() {
  try {
    console.log('--- Inspecting Constraints ---');
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conrelid = 'appointments'::regclass AND contype = 'c';
    `);
    console.log('Current Constraints:', res.rows);

    const statusConstraint = res.rows.find(c => c.def.includes('status'));
    if (statusConstraint) {
      console.log(`--- Dropping old constraint: ${statusConstraint.conname} ---`);
      await pool.query(`ALTER TABLE appointments DROP CONSTRAINT ${statusConstraint.conname}`);
    }

    console.log('--- Adding new constraint with no_show ---');
    await pool.query(`
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_status_check 
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied', 'completed', 'pending_block', 'cancelled_timeout', 'no_show'))
    `);

    console.log('✅ Migration successful: "no_show" added to status check.');
  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await pool.end();
  }
}

updateSchema();
