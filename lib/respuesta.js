// Respuestas JSON uniformes: {status, code, message, data}. El 204 no lleva cuerpo.
export function responder(res, code, message, data = null) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store'); // datos personales: nunca en cachés compartidas ni del navegador
  if (code === 204) return res.end();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ status: code < 400 ? 'ok' : 'error', code, message, data }));
}

const MAX_CUERPO = 100_000; // 100 KB, de sobra para un paquete

/** Lee el cuerpo JSON. Devuelve un objeto, o null si es inválido. */
export async function leerJson(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_CUERPO) return null; // cuerpos enormes: se rechazan como inválidos
  }
  try {
    const d = JSON.parse(raw.trim() === '' ? '{}' : raw);
    return d && typeof d === 'object' && !Array.isArray(d) ? d : null;
  } catch {
    return null;
  }
}
