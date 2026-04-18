# TurnosYa - LESSONS LEARNED

Bitácora de fallos críticos, soluciones arquitectónicas y reglas inquebrantables de diseño y seguridad.

## [CRÍTICO - SEGURIDAD]

- **Prevención de Double Booking**: Nunca utilizar lógica de aplicación (SELECT y luego INSERT) para validar solapamientos. Es obligatorio el uso de restricciones físicas en PostgreSQL mediante `EXCLUDE USING gist` con el operador `&&` de rangos (tsrange).
- **RBAC Audit**: Cualquier ruta nueva en el backend debe pasar obligatoriamente por el middleware de auditoría de roles antes de tocar la base de datos.

## [CRÍTICO - BACKEND / DB]

- **Esquema de Tiempos**: Utilizar siempre `TIMESTAMPTZ` (`start_at`, `end_at`) para el manejo de turnos. Evitar la separación legacy en columnas `date` y `time` que dificultan los cálculos de zona horaria y solapamientos.
- **Convención de Idiomas**: La base de datos y la lógica interna del backend deben hablar **Inglés** (ej: `status: 'no_show'`, `'pending'`, `'confirmed'`). La traducción al **Español** es responsabilidad exclusiva de la capa de presentación (UI).

## [UI / FRONTEND]

- **Arquitectura de Interfaz**: El layout estándar para la gestión operativa es **70/30 (Dos Columnas)**: 70% Acordeones interactivos para datos, 30% Calendario y acciones rápidas para control.
- **Integridad del Build**: Antes de pushear, verificar la existencia de todos los componentes UI. Las herramientas de autocompletado pueden sugerir componentes fantasmas (ej: `Textarea` de shadcn si no está instalado) que rompen el despliegue en producción.
- **Cache & Build**: Si un cambio visual no se refleja en producción tras un push exitoso, verificar si el build de Vite falló por importaciones rotas.

## [INFRAESTRUCTURA]

- **Vite Config**: Mantener siempre un `vite.config.js` válido con los alias `@/` sincronizados. Los errores de resolución de módulos son la causa #1 de desincronización entre el código local y el deploy.
- **Gestión de Puertos**: Si el backend falla con `EADDRINUSE`, verificar procesos residuales en el puerto 3000. Si el frontend salta de puerto (5173 -> 5174), es señal de procesos Vite colgados.

## [ESCALABILIDAD Y CONCURRENCIA]

- **Protección de Consistencia**: Se ha implementado un `EXCLUDE USING gist` en la tabla `appointments`. Esta es la ÚNICA forma garantizada de evitar solapamientos en un entorno de alta concurrencia.
- **Validación de Capas**: El backend utiliza **Zod** para fallar rápido ante datos malformados, mientras que el **AppointmentService** coordina la lógica de negocio, dejando los controladores limpios y enfocados en el transporte.

---
*Última actualización: 18 de Abril de 2026 - Rollback de IA y Estabilización de Concurrencia (Fase 1).*
