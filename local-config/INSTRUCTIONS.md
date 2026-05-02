# Configuración de Entorno Local (Network Testing)

Esta carpeta contiene las herramientas necesarias para levantar el entorno de desarrollo y probarlo desde dispositivos móviles en la misma red Wi-Fi sin alterar el código base de producción.

## Cómo usar

1. **Ejecutar el Setup:**
   Abre una terminal en la raíz del proyecto y ejecuta:
   ```bash
   node local-config/setup-network.js
   ```
   Esto detectará automáticamente tu IP local (ej: 192.168.0.38) y actualizará los archivos `.env` del frontend y backend.

2. **Levantar el Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Levantar el Frontend:**
   ```bash
   cd frontend
   npm run dev -- --host
   ```

4. **Acceder desde el móvil:**
   Usa la URL de "Network" que te da Vite (ej: `http://192.168.0.38:5173`).

## Qué hace el script automáticamente

- **Frontend:** Crea/Actualiza `.env.local` con `VITE_API_URL` apuntando a tu IP local.
- **Backend:** Actualiza `.env` agregando la variable `FRONTEND_URL` con tu IP local para habilitar los permisos CORS sin tocar `server.js`.

## Credenciales Admin Local
- **Email:** `admin@turnoya.com`
- **Password:** `admin` (Actualizado mediante script de DB)

## Credenciales Empleado Local
- **Business ID:** `1` (Peluqueria Demo)
- **PIN:** `1111`
