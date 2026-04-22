import { MercadoPagoConfig, Preference } from 'mercadopago';
import { ENV } from '../config/env.js';

/**
 * Payment Service (Mercado Pago)
 * Gestión de preferencias de pago y webhooks.
 */
export class PaymentService {
  static client = null;

  static getClient() {
    if (!this.client) {
      if (!process.env.MP_ACCESS_TOKEN) {
        throw new Error('❌ MP_ACCESS_TOKEN no configurado en las variables de entorno.');
      }
      this.client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
        options: { timeout: 5000 }
      });
    }
    return this.client;
  }

  /**
   * Crea una preferencia de pago para un turno específico.
   */
  static async createPreference(appointment) {
    // Modo Mock para desarrollo local sin credenciales
    if (process.env.USE_MOCK_MP === 'true') {
      console.log(`[PaymentService] 🧪 MOCK: Generando link de pago falso para turno #${appointment.id}`);
      return {
        id: `mock_pref_${appointment.id}_${Date.now()}`,
        init_point: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/mock-checkout?id=${appointment.id}`
      };
    }

    try {
      const client = this.getClient();
      const preference = new Preference(client);

      const body = {
        items: [
          {
            id: appointment.id.toString(),
            title: `Seña de Turno: ${appointment.service_name || 'Servicio'}`,
            quantity: 1,
            unit_price: Number(appointment.amount || 0),
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        external_reference: appointment.id.toString(), // ID de nuestro turno
        metadata: {
          appointment_id: appointment.id,
          business_id: appointment.business_id
        }
      };

      const response = await preference.create({ body });
      return {
        id: response.id,
        init_point: response.init_point // URL para redirigir al cliente
      };
    } catch (err) {
      console.error('[PaymentService] Error al crear preferencia:', err);
      throw err;
    }
  }
}
