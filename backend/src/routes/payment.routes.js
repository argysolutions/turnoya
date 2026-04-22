import { createPaymentPreference, handleWebhook } from '../controllers/payment.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

/**
 * Payment Routes (Fastify Plugin)
 */
export const paymentRoutes = async (app) => {
  // Endpoint para generar el link de pago
  app.post('/payments/create', { preHandler: verifyToken }, createPaymentPreference);

  // Webhook de Mercado Pago (Público)
  app.post('/payments/webhook', handleWebhook);
};
