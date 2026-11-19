// Uso: npm run vapid
// Genera las claves VAPID para las notificaciones push. Cópialas a las variables de entorno
// (Vercel y .env). La clave privada es secreta: no la subas al repositorio ni la pegues en chats.
import { generateVAPIDKeys } from 'web-push';

const { publicKey, privateKey } = generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:tu-correo@ejemplo.com');
