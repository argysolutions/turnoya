const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'turnoya', user: 'postgres', password: 'admin'
});

const clients = [
  ['Ana García', '1122334455'],
  ['Bruno Díaz', '1133445566'],
  ['Carla Pérez', '1144556677'],
  ['Diego López', '1155667788'],
  ['Elena Martínez', '1166778899'],
  ['Facundo Gómez', '1177889900'],
  ['Gabriela Sosa', '1188990011'],
  ['Hernán Rodríguez', '1199001122'],
  ['Irene Morales', '1100112233'],
  ['Juan Castro', '1111223344']
];

async function seed() {
  try {
    for (const [nombre, telefono] of clients) {
      // Seed for both businesses to be sure
      await pool.query(
        'INSERT INTO clientes (business_id, nombre, telefono) VALUES ($1, $2, $3)',
        [1, nombre, telefono]
      );
      await pool.query(
        'INSERT INTO clientes (business_id, nombre, telefono) VALUES ($1, $2, $3)',
        [2, nombre, telefono]
      );
    }
    console.log('✅ 10 sample clients created successfully in both businesses');
  } catch (err) {
    console.error('❌ Error seeding:', err);
  } finally {
    await pool.end();
  }
}
seed();
