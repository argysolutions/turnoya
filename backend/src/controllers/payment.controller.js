import { PaymentService } from '../services/payment.service.js';
import { pool } from '../config/db.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export const createPaymentPreference = async (req, res) => {
  const { appointmentId, amount } = req.body;
  const businessId = req.user.business_id;

  try {
    // 1. Obtener detalles del turno
    const appRes = await pool.query(
      `SELECT a.*, s.name as service_name 
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       WHERE a.id = $1 AND a.business_id = $2`,
      [appointmentId, businessId]
    );

    if (!appRes.rows[0]) {
      return res.status(404).send({ message: 'Turno no encontrado' });
    }

    const appointment = { ...appRes.rows[0], amount };

    // 2. Crear preferencia en MP
    const preference = await PaymentService.createPreference(appointment);

    // 3. Guardar el monto esperado en la DB (opcional, pero recomendado)
    await pool.query(
      `UPDATE appointments SET payment_amount = $1 WHERE id = $2`,
      [amount, appointmentId]
    );

    res.send(preference);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Webhook de Mercado Pago
 * Recibe notificaciones de cambios en el estado de los pagos.
 */
export const handleWebhook = async (req, res) => {
  const { query, body } = req;
  const topic = query.topic || query.type;

  try {
    // 🧪 Bypass de seguridad para desarrollo local
    if (process.env.USE_MOCK_MP === 'true' && process.env.NODE_ENV === 'development') {
      const mockAppointmentId = body.data?.id || body.id;
      const mockStatus = body.status || 'approved';
      
      if (mockAppointmentId && mockStatus === 'approved') {
        console.log(`[Webhook] 🧪 MOCK BYPASS: Aprobando turno #${mockAppointmentId}`);
        await pool.query(
          `UPDATE appointments SET payment_status = 'paid', payment_id = 'mock_id_999' WHERE id = $1`,
          [mockAppointmentId]
        );
        return res.status(200).send('OK (Mock)');
      }
    }

    if (topic === 'payment') {
      const paymentId = query.id || query['data.id'];
      
      const client = PaymentService.getClient();
      const payment = new Payment(client);
      
      // Obtener el estado del pago desde la API de MP (Seguridad: no confiar en el body del webhook)
      const paymentData = await payment.get({ id: paymentId });
      
      const status = paymentData.status; // 'approved', 'pending', 'rejected', etc.
      const appointmentId = paymentData.external_reference;

      console.log(`[Webhook] Pago ${paymentId} para turno ${appointmentId} con estado: ${status}`);

      if (status === 'approved') {
        await pool.query(
          `UPDATE appointments 
           SET payment_status = 'paid', payment_id = $1 
           WHERE id = $2`,
          [paymentId, appointmentId]
        );
      } else if (status === 'cancelled' || status === 'rejected') {
        // Opcional: manejar rechazos
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook Error]', err.message);
    res.status(500).send('Webhook Error');
  }
};
