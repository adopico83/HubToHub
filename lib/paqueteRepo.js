// Acceso a datos de `paquetes` y de su historial `eventos` (consultas parametrizadas).
import { db } from './db.js';

const COLUMNAS = ['remitente', 'destinatario', 'peso', 'estado', 'fecha', 'numero_seguimiento', 'paqueteria', 'direccion'];

/** Filtros opcionales: estado, direccion, q (remitente/destinatario/seguimiento). */
export async function todos({ estado, direccion, q } = {}) {
  const where = [];
  const args = [];
  if (estado) { args.push(estado); where.push(`estado = $${args.length}`); }
  if (direccion) { args.push(direccion); where.push(`direccion = $${args.length}`); }
  if (q) {
    args.push(`%${q}%`);
    const n = args.length;
    where.push(`(remitente ILIKE $${n} OR destinatario ILIKE $${n} OR numero_seguimiento ILIKE $${n})`);
  }
  const sql = 'SELECT * FROM paquetes' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY fecha DESC, id DESC';
  return (await db().query(sql, args)).rows;
}

export async function buscar(id) {
  return (await db().query('SELECT * FROM paquetes WHERE id = $1', [id])).rows[0] ?? null;
}

/** Ejecuta `fn(client)` dentro de una transacción. */
async function transaccion(fn) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const registrarEvento = (client, paqueteId, estado, detalle) =>
  client.query('INSERT INTO eventos (paquete_id, estado, detalle) VALUES ($1, $2, $3)', [paqueteId, estado, detalle]);

/** Crea el paquete y su primer evento. */
export function crear(d) {
  return transaccion(async (client) => {
    const marcas = COLUMNAS.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await client.query(
      `INSERT INTO paquetes (${COLUMNAS.join(',')}) VALUES (${marcas}) RETURNING *`,
      COLUMNAS.map((c) => d[c]),
    );
    await registrarEvento(client, rows[0].id, rows[0].estado, 'Paquete registrado');
    return rows[0];
  });
}

/**
 * Actualiza el paquete. Si cambia el estado, guarda un evento.
 * Devuelve { paquete, estadoAnterior } o null si no existe.
 */
export function actualizar(id, d) {
  return transaccion(async (client) => {
    const previo = (await client.query('SELECT estado FROM paquetes WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!previo) return null;
    const set = COLUMNAS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rows } = await client.query(
      `UPDATE paquetes SET ${set} WHERE id = $${COLUMNAS.length + 1} RETURNING *`,
      [...COLUMNAS.map((c) => d[c]), id],
    );
    if (rows[0].estado !== previo.estado) await registrarEvento(client, rows[0].id, rows[0].estado, null);
    return { paquete: rows[0], estadoAnterior: previo.estado };
  });
}

export async function borrar(id) {
  return (await db().query('DELETE FROM paquetes WHERE id = $1', [id])).rowCount > 0;
}

/** Historial de un paquete, del más antiguo al más reciente. */
export async function eventosDe(id) {
  return (await db().query(
    'SELECT id, estado, detalle, ocurrido_en FROM eventos WHERE paquete_id = $1 ORDER BY ocurrido_en, id', [id],
  )).rows;
}

/** Actividad reciente de todos los paquetes, del más nuevo al más antiguo. */
export async function eventosRecientes(limite = 50) {
  return (await db().query(
    `SELECT e.id, e.paquete_id, e.estado, e.detalle, e.ocurrido_en, p.remitente, p.destinatario, p.direccion
       FROM eventos e JOIN paquetes p ON p.id = e.paquete_id
      ORDER BY e.ocurrido_en DESC, e.id DESC LIMIT $1`, [limite],
  )).rows;
}
