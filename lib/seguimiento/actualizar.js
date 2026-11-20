// Aplica lo que cuenta el proveedor a los paquetes: guarda los eventos nuevos (sin duplicarlos), cambia el estado
// y avisa al dueño. Una persona siempre puede corregir el estado a mano: su cambio manda hasta que haya un evento más nuevo.
import { createHash } from 'node:crypto';
import { db } from '../db.js';
import { notificar } from '../push.js';
import { avisoDeCambio } from '../estados.js';

const ESTADOS = ['pendiente', 'en_reparto', 'listo_para_recoger', 'entregado', 'incidencia'];
const MAX_TEXTO = 300;

export const claveDeEvento = (fecha, texto) => createHash('sha1').update(`${fecha}|${texto}`).digest('hex').slice(0, 24);

/** Normaliza y ordena los eventos del proveedor; descarta los que no tienen fecha válida. */
export function eventosValidos(eventos = []) {
  return eventos
    .map((e) => ({ fecha: new Date(e.fecha), texto: String(e.texto ?? '').trim().slice(0, MAX_TEXTO), estado: ESTADOS.includes(e.estado) ? e.estado : null }))
    .filter((e) => !Number.isNaN(e.fecha.getTime()) && e.texto)
    .sort((a, b) => a.fecha - b.fecha)
    .map((e) => ({ ...e, fecha: e.fecha.toISOString() }));
}

/**
 * Guarda el resultado de una consulta. Devuelve { paquete, cambio: { de, a } | null, eventosNuevos }.
 * `paquete` es la fila actual; la fila se bloquea dentro de la transacción.
 */
export async function aplicarResultado(paqueteId, resultado) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const { rows: [p] } = await client.query('SELECT * FROM paquetes WHERE id = $1 FOR UPDATE', [paqueteId]);
    if (!p) { await client.query('ROLLBACK'); return null; }

    const eventos = eventosValidos(resultado.eventos);
    let nuevos = 0;
    let estadoDelEvento = p.estado;
    for (const e of eventos) {
      estadoDelEvento = e.estado ?? estadoDelEvento ?? 'en_reparto';
      const r = await client.query(
        `INSERT INTO eventos (paquete_id, estado, detalle, ocurrido_en, origen, clave_externa)
         VALUES ($1, $2, $3, $4, 'auto', $5) ON CONFLICT (paquete_id, clave_externa) WHERE clave_externa IS NOT NULL DO NOTHING`,
        [p.id, estadoDelEvento, e.texto, e.fecha, claveDeEvento(e.fecha, e.texto)],
      );
      nuevos += r.rowCount;
    }

    // ¿Cambia el estado? No si no hay un estado claro, ni si una persona lo corrigió después del último evento del proveedor.
    const ultimaFecha = eventos.length ? new Date(eventos[eventos.length - 1].fecha) : null;
    const manualGana = p.estado_manual_en && ultimaFecha && new Date(p.estado_manual_en) > ultimaFecha;
    const nuevoEstado = ESTADOS.includes(resultado.estado) && !manualGana ? resultado.estado : null;
    const cambia = nuevoEstado && nuevoEstado !== p.estado;

    const { rows: [actualizado] } = await client.query(
      `UPDATE paquetes SET consultado_en = now(), courier = COALESCE($2, courier)${cambia ? ', estado = $3' : ''}${cambia && nuevoEstado === 'entregado' ? ', pin_cifrado = NULL, recoger_hasta = NULL' : ''} WHERE id = $1 RETURNING *`,
      cambia ? [p.id, resultado.courier ?? null, nuevoEstado] : [p.id, resultado.courier ?? null],
    );
    await client.query('COMMIT');
    return { paquete: actualizado, cambio: cambia ? { de: p.estado, a: nuevoEstado } : null, eventosNuevos: nuevos };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Marca la consulta como hecha aunque haya fallado, para no insistir al mismo paquete y dar turno a los demás. */
const marcarConsulta = (id) => db().query('UPDATE paquetes SET consultado_en = now() WHERE id = $1', [id]);

/** Consulta un paquete al proveedor y aplica el resultado. Nunca lanza por un fallo del proveedor. */
export async function actualizarPaquete(paquete, proveedor) {
  let resultado;
  try {
    resultado = await proveedor.consultar({ numero: paquete.numero_seguimiento, courier: paquete.courier });
  } catch (e) {
    console.error(`seguimiento #${paquete.id}:`, e.message);
    await marcarConsulta(paquete.id).catch(() => {});
    return { error: 'El servicio de seguimiento no ha respondido', cambio: null, eventosNuevos: 0 };
  }
  const r = await aplicarResultado(paquete.id, resultado);
  if (r?.cambio) await notificar(r.paquete.user_id, avisoDeCambio(r.paquete));
  return { ...r, encontrado: resultado.encontrado };
}

/**
 * Consulta los paquetes abiertos con número de seguimiento, empezando por los consultados hace más tiempo.
 * Se limita en cantidad y en tiempo para caber en una ejecución de una función serverless.
 */
export async function actualizarPendientes(proveedor, { max = 15, presupuestoMs = 8000, dias = 60 } = {}) {
  const inicio = Date.now();
  const { rows } = await db().query(
    `SELECT * FROM paquetes
      WHERE seguimiento_auto AND numero_seguimiento IS NOT NULL AND estado <> 'entregado' AND fecha >= CURRENT_DATE - $2::int
      ORDER BY consultado_en NULLS FIRST, id LIMIT $1`,
    [max, dias],
  );
  const resumen = { revisados: 0, cambios: 0, eventosNuevos: 0, errores: 0, pendientes: rows.length };
  for (const p of rows) {
    if (Date.now() - inicio > presupuestoMs) break;
    const r = await actualizarPaquete(p, proveedor);
    resumen.revisados++;
    resumen.eventosNuevos += r.eventosNuevos ?? 0;
    if (r.cambio) resumen.cambios++;
    if (r.error) resumen.errores++;
  }
  return resumen;
}
