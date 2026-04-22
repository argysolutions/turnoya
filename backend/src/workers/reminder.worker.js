import cron from 'node-cron';
import { getAppointmentsForReminders, markReminderSent } from '../db/appointments.queries.js';
import { NotificationService } from '../services/notification.service.js';

/**
 * Reminder Worker
 * Ejecuta un cron job cada hora para buscar turnos próximos (24h) 
 * y enviar recordatorios automáticos.
 */
export const startReminderCron = (logger) => {
  // Configuración: cada hora (minuto 0) para producción
  cron.schedule('0 * * * *', async () => {
    logger.info('[ReminderWorker] 🔍 Buscando turnos para enviar recordatorios...');
    
    try {
      const pending = await getAppointmentsForReminders();
      
      if (pending.length === 0) {
        logger.info('[ReminderWorker] No hay recordatorios pendientes.');
        return;
      }

      logger.info(`[ReminderWorker] 🚀 Enviando ${pending.length} recordatorios...`);

      for (const appointment of pending) {
        try {
          await NotificationService.sendUpcomingReminder(appointment);
          await markReminderSent(appointment.id);
          logger.info(`[ReminderWorker] ✅ Recordatorio enviado para turno #${appointment.id}`);
        } catch (err) {
          logger.error(`[ReminderWorker] ❌ Error enviando recordatorio para turno #${appointment.id}: ${err.message}`);
        }
      }

    } catch (err) {
      logger.error(`[ReminderWorker] 🚨 Error crítico en el cron job: ${err.message}`);
    }
  });

  logger.info('⏰ Cron Job de Recordatorios configurado (Cada hora).');
};
