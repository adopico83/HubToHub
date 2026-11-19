// Servidor local sin dependencias: sirve public/ y monta las funciones de api/ como lo haría Vercel.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png' };

const lista = await import('../api/paquetes/index.js');
const detalle = await import('../api/paquetes/[id].js');

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  const m = pathname.match(/^\/paquetes(?:\/([^/]+))?\/?$/);
  if (m) {
    req.query = m[1] ? { id: m[1] } : {};
    return (m[1] ? detalle : lista).default(req, res);
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
