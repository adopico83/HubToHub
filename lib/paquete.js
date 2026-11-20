// Reglas del dominio: valores permitidos y validación de entrada.
export const ESTADOS = ['pendiente', 'en_reparto', 'listo_para_recoger', 'entregado', 'incidencia'];
export const DIRECCIONES = ['recibido', 'enviado'];

const texto = (v) => (v !== undefined && v !== null && typeof v !== 'object' ? String(v).trim() : '');

/** Valida y normaliza. Devuelve { datos, errores }. */
export function validar(entrada) {
  const errores = {};
  const datos = {};

  for (const campo of ['remitente', 'destinatario']) {
    const v = texto(entrada[campo]);
    if (!v) errores[campo] = 'Obligatorio.';
    else if (v.length > 120) errores[campo] = 'Máximo 120 caracteres.';
    datos[campo] = v;
  }

  // Peso en kg, opcional. Acepta coma decimal.
  const peso = entrada.peso;
  if (peso === undefined || peso === null || peso === '') {
    datos.peso = null;
  } else {
    const n = typeof peso === 'string' ? Number(peso.trim().replace(',', '.')) : peso;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1000) {
      errores.peso = 'Debe ser un número entre 0 y 1000.';
    } else {
      datos.peso = Math.round(n * 1000) / 1000;
    }
  }

  const estado = entrada.estado ?? 'pendiente';
  if (!ESTADOS.includes(estado)) errores.estado = `Valores permitidos: ${ESTADOS.join(', ')}.`;
  datos.estado = estado;

  const direccion = entrada.direccion ?? 'recibido';
  if (!DIRECCIONES.includes(direccion)) errores.direccion = `Valores permitidos: ${DIRECCIONES.join(', ')}.`;
  datos.direccion = direccion;

  const fecha = entrada.fecha ?? new Date().toISOString().slice(0, 10);
  const f = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(fecha + 'T00:00:00Z') : null;
  if (!f || Number.isNaN(f.getTime()) || f.toISOString().slice(0, 10) !== fecha) errores.fecha = 'Formato AAAA-MM-DD.';
  datos.fecha = fecha;

  // Campos preparados para fases posteriores (seguimiento automático).
  for (const [campo, max] of [['numero_seguimiento', 60], ['paqueteria', 60]]) {
    const v = texto(entrada[campo]);
    if (v.length > max) errores[campo] = `Máximo ${max} caracteres.`;
    datos[campo] = v === '' ? null : v;
  }

  // Seguimiento automático: por defecto sí. Admite true/false, 'true'/'false' y 'on'/'off'.
  const auto = entrada.seguimiento_auto ?? true;
  if (typeof auto === 'boolean') datos.seguimiento_auto = auto;
  else if (['true', 'on', '1'].includes(String(auto).toLowerCase())) datos.seguimiento_auto = true;
  else if (['false', 'off', '0'].includes(String(auto).toLowerCase())) datos.seguimiento_auto = false;
  else { errores.seguimiento_auto = 'Debe ser sí o no.'; datos.seguimiento_auto = true; }

  return { datos, errores };
}
