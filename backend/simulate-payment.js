// Script de simulación de pago aprobado

const appointmentId = process.argv[2];

if (!appointmentId) {
  console.error('❌ Error: Debes proporcionar un ID de turno. Ejemplo: node simulate-payment.js 123');
  process.exit(1);
}

async function simulate() {
  console.log(`🚀 Simulando pago aprobado para el turno #${appointmentId}...`);

  try {
    const response = await fetch('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: appointmentId,
        status: 'approved',
        data: { id: appointmentId }
      })
    });

    if (response.ok) {
      console.log('✅ Simulación enviada con éxito. Revisa los logs del servidor para confirmar el cambio en la base de datos.');
    } else {
      console.error('❌ Error al enviar la simulación:', response.statusText);
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    console.log('¿Está el servidor corriendo en http://localhost:3000?');
  }
}

simulate();
