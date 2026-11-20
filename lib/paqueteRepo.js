// Acceso a datos de `paquetes` y de su historial `eventos` (consultas parametrizadas).
// Cada paquete pertenece a un usuario: TODAS las consultas reciben su id y filtran por él.
import { db } from './db.js';

const COLUMNAS = ['remitente', 'destinatario', 'peso', 'estado', 'fecha', 'numero_seguimiento', 'paqueteria', 'direccion', 'seguimiento_auto', 'punto_recogida', 'recoger_hasta', 'pin_cifrado', 'gestion', 'gestion_en'];

/** Filtros opcionales: estado, direccion, q (remitente/destinatario/seguimiento). */
export async function todos(usuarioId, { estado, direccion, q } = {}) {
  const where = ['user_id = $1'];
  const args = [usuarioId];
  if (estado) { args.push(estado); where.push(`estado = $${args.length}`); }
  if (direccion) { args.push(direccion); where.push(`direccion = $${args.length}`); }
  if (q) {
    args.push(`%${q}%`);
    const n = args.length;
    where.push(`(remitente ILIKE $${n} OR destinatario ILIKE $${n} OR numero_seguimiento ILIKE $${n})`);
  }
  const sql = 'SELECT * FROM paquetes WHERE ' + where.join(' AND ') + ' ORDER BY fecha DESC, id DESC';
  return (await db().query(sql, args)).rows;
}

export async function buscar(usuarioId, id) {
  return (await db().query('SELECT * FROM paquetes WHERE id = $1 AND user_id = $2', [id, usuarioId])).rows[0] ?? null;
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

/** Crea el paquete (a nombre del usuario) y su primer evento. */
export function crear(usuarioId, d) {
  return transaccion(async (client) => {
    const columnas = [...COLUMNAS, 'user_id'];
    const marcas = columnas.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await client.query(
      `INSERT INTO paquetes (${columnas.join(',')}) VALUES (${marcas}) RETURNING *`,
      [...COLUMNAS.map((c) => d[c]), usuarioId],
    );
    await registrarEvento(client, rows[0].id, rows[0].estado, 'Paquete registrado');
    return rows[0];
  });
}

/**
 * Actualiza el paquete del usuario. Si cambia el estado, guarda un evento.
 * Devuelve { paquete, estadoAnterior } o null si no existe (o no es suyo).
 */
export function actualizar(usuarioId, id, d) {
  return transaccion(async (client) => {
    const previo = (await client.query('SELECT estado FROM paquetes WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, usuarioId])).rows[0];
    if (!previo) return null;
    const set = COLUMNAS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rows } = await client.query(
      `UPDATE paquetes SET ${set} WHERE id = $${COLUMNAS.length + 1} AND user_id = $${COLUMNAS.length + 2} RETURNING *`,
      [...COLUMNAS.map((c) => d[c]), id, usuarioId],
    );
    if (rows[0].estado !== previo.estado) {
      await registrarEvento(client, rows[0].id, rows[0].estado, null);
      // Un cambio hecho a mano manda sobre el seguimiento automático hasta que la paquetería informe de algo más nuevo.
      await client.query('UPDATE paquetes SET estado_manual_en = now() WHERE id = $1', [rows[0].id]);
    }
    return { paquete: rows[0], estadoAnterior: previo.estado };
  });
}

export async function borrar(usuarioId, id) {
  return (await db().query('DELETE FROM paquetes WHERE id = $1 AND user_id = $2', [id, usuarioId])).rowCount > 0;
}

/** Historial de un paquete del usuario, del más antiguo al más reciente. */
export async function eventosDe(usuarioId, id) {
  return (await db().query(
    `SELECT e.id, e.estado, e.detalle, e.ocurrido_en
       FROM eventos e JOIN paquetes p ON p.id = e.paquete_id
      WHERE e.paquete_id = $1 AND p.user_id = $2 ORDER BY e.ocurrido_en, e.id`, [id, usuarioId],
  )).rows;
}

/** Actividad reciente de los paquetes del usuario, del más nuevo al más antiguo. */
export async function eventosRecientes(usuarioId, limite = 50) {
  return (await db().query(
    `SELECT e.id, e.paquete_id, e.estado, e.detalle, e.ocurrido_en, p.remitente, p.destinatario, p.direccion
       FROM eventos e JOIN paquetes p ON p.id = e.paquete_id
      WHERE p.user_id = $1
      ORDER BY e.ocurrido_en DESC, e.id DESC LIMIT $2`, [usuarioId, limite],
  )).rows;
}
