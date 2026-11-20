// Uso: npm run pin:clave
// Genera la clave con que se cifran los PIN de recogida (AES-256). Cópiala a la variable de entorno PIN_CLAVE
// (Vercel y .env). Es secreta: no la subas al repositorio ni la pegues en chats. Si la pierdes o la cambias,
// los PIN ya guardados dejan de poder leerse (los paquetes siguen intactos; solo habría que volver a escribir el PIN).
import { randomBytes } from 'node:crypto';

console.log(`PIN_CLAVE=${randomBytes(32).toString('base64')}`);
