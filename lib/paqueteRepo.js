// Acceso a datos de `paquetes` (consultas parametrizadas).
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

export async function crear(d) {
  const marcas = COLUMNAS.map((_, i) => `$${i + 1}`).join(',');
  const r = await db().query(
    `INSERT INTO paquetes (${COLUMNAS.join(',')}) VALUES (${marcas}) RETURNING *`,
    COLUMNAS.map((c) => d[c]),
  );
  return r.rows[0];
}

export async function actualizar(id, d) {
  const set = COLUMNAS.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const r = await db().query(
    `UPDATE paquetes SET ${set} WHERE id = $${COLUMNAS.length + 1} RETURNING *`,
    [...COLUMNAS.map((c) => d[c]), id],
  );
  return r.rows[0] ?? null;
}

export async function borrar(id) {
  return (await db().query('DELETE FROM paquetes WHERE id = $1', [id])).rowCount > 0;
}
