// Envoltorio común: exige sesión (salvo rutas públicas), despacha por método HTTP y devuelve 401/405/500 uniformes.
import { responder } from './respuesta.js';
import { usuarioDe } from './auth.js';
import { crearLimite, ipDe } from './limite.js';

// Frenos por defecto: peticiones sin sesión válida por IP (fuerza bruta de tokens) y peticiones por usuario.
const LIMITES = { anonimo: crearLimite({ max: 30, ventanaMs: 60_000 }), usuario: crearLimite({ max: 240, ventanaMs: 60_000 }) };

function demasiadas(res, r) {
  res.setHeader('Retry-After', String(r.reintentoS));
  return responder(res, 429, 'Demasiadas peticiones: espera un momento');
}

export function manejador(rutas, { publico = false, verificar = usuarioDe, limites = LIMITES } = {}) {
  return async (req, res) => {
    try {
      const fn = rutas[req.method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(rutas).join(', '));
        return responder(res, 405, 'Método no permitido');
      }
      if (!publico) {
        const usuario = await verificar(req);
        if (!usuario) {
          const r = limites.anonimo.permitir(ipDe(req));
          if (!r.ok) return demasiadas(res, r);
          res.setHeader('WWW-Authenticate', 'Bearer');
          return responder(res, 401, 'Hace falta iniciar sesión');
        }
        const r = limites.usuario.permitir(usuario.id);
        if (!r.ok) return demasiadas(res, r);
        req.usuario = usuario;
      }
      await fn(req, res);
    } catch (e) {
      console.error(e);
      responder(res, 500, 'Error interno del servidor');
    }
  };
}
