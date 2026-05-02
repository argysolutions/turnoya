---
name: turnoya-dev-setup
description: "Obligatorio y automático al inicio de sesión o cuando se requiera levantar el entorno de desarrollo local. Define los comandos exactos para levantar el frontend y backend expuestos a la red local para pruebas en dispositivos móviles."
---

# Configuración del Entorno de Desarrollo Local (TurnoYa)

**SIEMPRE** que el usuario pida "levantar el servidor" o "empezar a probar", debes ejecutar **AMBOS** comandos en segundo plano usando la herramienta `run_command` y verificar su estado.

## 1. Levantar el Backend (API)
El backend debe estar corriendo para que el login funcione y acepte las credenciales de admin/employee.
- **Ruta:** `c:\Users\nicov\Documents\TurnosYa\backend`
- **Comando:** `npm run dev`
- **Nota:** Esto levanta Node.js (nodemon) en el puerto `3000`.

## 2. Levantar el Frontend (Vite) expuesto a la red local
Para que el usuario pueda probar la versión Mobile desde su celular en la misma red Wi-Fi, Vite **debe** exponer la IP.
- **Ruta:** `c:\Users\nicov\Documents\TurnosYa\frontend`
- **Comando:** `npm run dev -- --host`
- **Nota:** Esto expone la UI en el puerto `5173` y mostrará la IP local (ej. `192.168.0.x`).

## Flujo Automático:
1. Usa `run_command` para el backend.
2. Usa `run_command` para el frontend con `--host`.
3. Informa al usuario que ambos servidores están listos, compartiendo la IP local (`192.168.x.x:5173`) para que pueda acceder desde su celular. No asumas que el backend ya está levantado.
