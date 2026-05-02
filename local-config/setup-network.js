import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Detectar IP Local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
console.log(`🚀 Configurando entorno para IP: ${localIP}`);

// 2. Actualizar Frontend .env.local
const frontendEnvPath = path.join(rootDir, 'frontend', '.env.local');
const frontendEnvContent = `VITE_API_URL=http://${localIP}:3000/api\n`;
fs.writeFileSync(frontendEnvPath, frontendEnvContent);
console.log(`✅ Frontend actualizado: ${frontendEnvPath}`);

// 3. Actualizar Backend .env
const backendEnvPath = path.join(rootDir, 'backend', '.env');
let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');

const frontendUrl = `http://localhost:5173,http://${localIP}:5173,http://${localIP}:5174`;

if (backendEnvContent.includes('FRONTEND_URL=')) {
  backendEnvContent = backendEnvContent.replace(/FRONTEND_URL=.*/, `FRONTEND_URL=${frontendUrl}`);
} else {
  backendEnvContent += `\nFRONTEND_URL=${frontendUrl}\n`;
}

fs.writeFileSync(backendEnvPath, backendEnvContent);
console.log(`✅ Backend actualizado (CORS): ${backendEnvPath}`);

console.log('\n--- LISTO ---');
console.log(`Frontend: http://${localIP}:5173`);
console.log(`Backend API: http://${localIP}:3000/api`);
console.log('-------------\n');
