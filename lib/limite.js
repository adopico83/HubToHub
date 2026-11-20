// Limitador de peticiones de ventana fija, en memoria. En serverless cada instancia lleva su propia cuenta, así que frena abusos y
// bucles descontrolados pero no es un límite global exacto (para eso haría falta un almacén compartido).
export function crearLimite({ max, ventanaMs, ahora = Date.now }) {
  const cuentas = new Map(); // clave -> { n, hasta }
  return {
    /** Cuenta una petición de `clave`. Devuelve { ok, reintentoS }. */
    permitir(clave) {
      const t = ahora();
      if (cuentas.size > 5000) for (const [k, v] of cuentas) if (v.hasta <= t) cuentas.delete(k);
      let c = cuentas.get(clave);
      if (!c || c.hasta <= t) { c = { n: 0, hasta: t + ventanaMs }; cuentas.set(clave, c); }
      c.n++;
      return { ok: c.n <= max, reintentoS: Math.max(1, Math.ceil((c.hasta - t) / 1000)) };
    },
  };
}

/** IP del cliente. En Vercel `x-forwarded-for` lo fija la plataforma; el primer valor es el del cliente. */
export function ipDe(req) {
  const xff = req.headers?.['x-forwarded-for'];
  return (typeof xff === 'string' && xff.split(',')[0].trim()) || req.socket?.remoteAddress || 'desconocida';
}
