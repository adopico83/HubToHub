// Servidor local sin dependencias: sirve public/ y monta las funciones de api/ como lo haría Vercel.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

// Mismas rutas que `rewrites` en vercel.json. `id` se expone como req.query.id.
const RUTAS = [
  [/^\/paquetes\/?$/, (await import('../api/paquetes/index.js')).default],
  [/^\/paquetes\/([^/]+)\/?$/, (await import('../api/paquetes/[id].js')).default, 'id'],
  [/^\/eventos\/?$/, (await import('../api/eventos.js')).default],
  [/^\/push\/?$/, (await import('../api/push/index.js')).default],
  [/^\/push\/prueba\/?$/, (await import('../api/push/prueba.js')).default],
];

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
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
