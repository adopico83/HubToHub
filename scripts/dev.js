// Servidor local sin dependencias: sirve public/ y monta las funciones de api/ como lo haría Vercel.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

// Mismas rutas que `rewrites` en vercel.json. `id` se expone como req.query.id.
const RUTAS = [
  [/^\/paquetes\/?$/, (await import('../api/paquetes/index.js')).default],
  [/^\/paquetes\/([^/]+)\/?$/, (await import('../api/paquetes/[id].js')).default, 'id'],
  [/^\/api\/cron\/seguimiento\/?$/, (await import('../api/cron/seguimiento.js')).default],
  [/^\/cuenta\/?$/, (await import('../api/cuenta.js')).default],
  [/^\/config\/?$/, (await import('../api/config.js')).default],
  [/^\/eventos\/?$/, (await import('../api/eventos.js')).default],
  [/^\/push\/?$/, (await import('../api/push/index.js')).default],
  [/^\/push\/prueba\/?$/, (await import('../api/push/prueba.js')).default],
];

// Mismas cabeceras que `headers` en vercel.json, para probar aquí la CSP. En local el servicio de autenticación puede estar en otro origen.
const CABECERAS = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8')).headers ?? [];
const origenAuth = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : '';
function cabeceras(res, pathname) {
  for (const { source, headers } of CABECERAS) {
    if (!new RegExp('^' + source.replace('(.*)', '.*') + '$').test(pathname)) continue;
    for (const { key, value } of headers) {
      res.setHeader(key, key === 'Content-Security-Policy' && origenAuth ? value.replace("connect-src 'self'", `connect-src 'self' ${origenAuth}`) : value);
    }
  }
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  cabeceras(res, pathname);
  for (const [patron, fn, param] of RUTAS) {
    const m = pathname.match(patron);
    if (m) {
      req.query = param ? { [param]: m[1] } : {};
      return fn(req, res);
    }
  }
  const ruta = normalize(pathname === '/' ? '/index.html' : pathname);
  try {
    const cuerpo = await readFile(join(raiz, 'public', ruta));
    res.setHeader('Content-Type', TIPOS[extname(ruta)] ?? 'application/octet-stream');
    res.end(cuerpo);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'error', code: 404, message: 'Ruta no encontrada', data: null }));
  }
}).listen(process.env.PORT ?? 3000, () => console.log(`HubToHub en http://localhost:${process.env.PORT ?? 3000}`));
