# TurnoYa Backend - Motor de Notificaciones

Este módulo gestiona el envío de confirmaciones y recordatorios automáticos de turnos.

## Arquitectura

### 1. NotificationService (`src/services/notification.service.js`)
Servicio centralizado que utiliza **Nodemailer** para el envío de correos.
- **Modo Desarrollo**: Si no se detectan variables SMTP, utiliza **Ethereal Email** y genera una URL de previsualización en los logs.
- **Modo Producción**: Utiliza un transportador SMTP real configurado mediante variables de entorno.
- **Templates**: Los correos se envían en formato HTML responsive con un diseño premium.

### 2. Reminder Worker (`src/workers/reminder.worker.js`)
Sistema de tareas programadas mediante **node-cron**.
- **Frecuencia**: Se ejecuta una vez por hora (`0 * * * *`).
- **Lógica**: Busca en la base de datos turnos confirmados para las próximas 24 horas que aún no hayan sido notificados (`reminder_sent = false`), envía el correo y marca el registro como enviado.

## Configuración de Producción (Variables de Entorno)

Para activar el envío de correos reales, configura las siguientes variables en tu `.env`:

```env
# Configuración SMTP (Ej: SendGrid, Resend, Gmail)
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=tu_usuario
SMTP_PASS=tu_contraseña
SMTP_SECURE=false
SMTP_FROM="TurnoYa" <no-reply@tu-dominio.com>

# URL del Frontend (para los botones de los correos)
FRONTEND_URL=https://tu-app-frontend.com
```

## Pruebas
Durante el desarrollo, puedes verificar los envíos observando los logs del servidor. Busca líneas que contengan `Preview URL` para ver el diseño del correo generado en Ethereal.
