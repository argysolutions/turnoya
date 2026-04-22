import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

/**
 * Notification Service
 * Encargado de gestionar el envío de confirmaciones y recordatorios.
 * Soporta SMTP real o Ethereal para desarrollo.
 */
export class NotificationService {
  static transporter = null;

  /**
   * Obtiene o inicializa el transportador de correo.
   * Prioriza variables de entorno para SMTP real.
   */
  static async getTransporter() {
    if (this.transporter) return this.transporter;

    // Si existen variables de entorno para SMTP, las usamos
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('📧 Nodemailer: Transportador SMTP configurado.');
    } else {
      // Fallback a Ethereal para desarrollo
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Nodemailer: Ethereal Transporter configurado (Modo Desarrollo).');
    }
    return this.transporter;
  }

  /**
   * Envía un correo de confirmación de reserva.
   */
  static async sendConfirmation(appointment) {
    try {
      const transporter = await this.getTransporter();
      const dateStr = new Date(appointment.start_at).toLocaleString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      });

      const html = this.getTemplate({
        title: '¡Turno Confirmado!',
        message: `Hola <strong>${appointment.client_name}</strong>, tu reserva ha sido realizada con éxito.`,
        service: appointment.service_name,
        date: dateStr,
        buttonText: 'Ver mis turnos',
        buttonUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/mis-turnos`
      });

      const info = await transporter.sendMail({
        from: `"TurnoYa" <${process.env.SMTP_FROM || 'no-reply@turnoya.com'}>`,
        to: appointment.client_email || 'test@example.com',
        subject: `✅ Turno Confirmado: ${appointment.service_name}`,
        html
      });

      if (!process.env.SMTP_HOST) {
        console.log(`[NotificationService] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (err) {
      console.error(`[NotificationService] Error: ${err.message}`);
      return false;
    }
  }

  /**
   * Envía un recordatorio de turno próximo.
   */
  static async sendUpcomingReminder(appointment) {
    try {
      const transporter = await this.getTransporter();
      const dateStr = new Date(appointment.start_at).toLocaleString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      });

      const html = this.getTemplate({
        title: 'Recordatorio de Turno',
        message: `Hola <strong>${appointment.client_name}</strong>, te recordamos que tienes un turno programado para mañana.`,
        service: appointment.service_name,
        date: dateStr,
        buttonText: 'Gestionar Turno',
        buttonUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/mis-turnos`
      });

      const info = await transporter.sendMail({
        from: `"TurnoYa" <${process.env.SMTP_FROM || 'no-reply@turnoya.com'}>`,
        to: appointment.client_email || 'test@example.com',
        subject: `⏰ Recordatorio: Tu turno de mañana`,
        html
      });

      if (!process.env.SMTP_HOST) {
        console.log(`[NotificationService] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (err) {
      console.error(`[NotificationService] Error: ${err.message}`);
      return false;
    }
  }

  /**
   * Template HTML base responsive.
   */
  static getTemplate({ title, message, service, date, buttonText, buttonUrl }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 600px; background: white; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #6366f1; padding: 30px; text-align: center; color: white; }
          .content { padding: 30px; line-height: 1.6; }
          .details { background: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
          .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">TurnoYa</h1>
          </div>
          <div class="content">
            <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
            <p>${message}</p>
            <div class="details">
              <strong>Servicio:</strong> ${service}<br>
              <strong>Fecha:</strong> ${date}
            </div>
            <p>Si necesitas reprogramar o cancelar, puedes hacerlo desde nuestra plataforma.</p>
            <a href="${buttonUrl}" class="button">${buttonText}</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} TurnoYa. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
