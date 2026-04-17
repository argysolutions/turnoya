---
name: turnoya-rbac-auditor
description: Obligatorio para cualquier cambio o creación de rutas en el backend de Node.js. Audita y asegura que todos los endpoints de la API implementen el control de roles (RBAC) adecuado antes de ejecutar consultas en PostgreSQL.
---

# Contexto de Seguridad (TurnoYa)
En este SaaS, la prevención de escalada de privilegios es crítica. Un usuario no autorizado o con un rol inferior (ej. cliente) NUNCA debe poder modificar la configuración de la agenda, alterar turnos de otros, o acceder a datos administrativos.

# Reglas Estrictas para el Agente
1. **Validación de Middleware:** Cada vez que se cree o modifique un endpoint en Express/Node.js, DEBES verificar que incluya el middleware de autenticación y validación de roles adecuado (ej. `verifyRole(['admin', 'staff'])`).
2. **Defensa en Profundidad (PostgreSQL):** Las consultas a la base de datos siempre deben construirse asumiendo que el frontend podría haber sido vulnerado. Filtra siempre por el ID del usuario en sesión (`req.user.id`) cuando corresponda.
3. **Cero Suposiciones:** Si el desarrollador solicita crear una nueva ruta (ej. "Crea un endpoint para borrar reportes de incidencias") y NO especifica qué roles tienen acceso, **TIENES PROHIBIDO** escribir el código inmediatamente. Debes detenerte y preguntar: *"¿Qué roles (admin, cliente, staff) deberían tener acceso a esta ruta?"*

# Procedimiento de Auditoría
Antes de entregar el código final de un controlador o ruta, ejecuta mentalmente este checklist:
- [ ] ¿Es la ruta pública o privada?
- [ ] Si es privada, ¿está el middleware de roles inyectado antes del controlador?
- [ ] ¿La consulta SQL asociada respeta los límites del rol?