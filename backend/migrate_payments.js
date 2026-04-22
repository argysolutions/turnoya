import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function migrate() {
  console.log('🚀 Iniciando migración de pagos...');
  try {
    // 1. Crear tipo ENUM si no existe
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Agregar columnas a appointments
    await pool.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
    `);

    console.log('✅ Migración completada con éxito.');
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
