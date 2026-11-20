// Derechos del usuario sobre sus datos: exportarlos (portabilidad) y borrarlos del todo (supresión).
import { db } from './db.js';

/** Todo lo que HubToHub guarda de esta persona, en un objeto serializable. */
export async function exportar(usuario) {
  const q = (sql) => db().query(sql, [usuario.id]).then((r) => r.rows);
  const paquetes = await q('SELECT id, remitente, destinatario, peso, estado, fecha, numero_seguimiento, paqueteria, direccion, seguimiento_auto, courier, consultado_en, punto_recogida, recoger_hasta FROM paquetes WHERE user_id = $1 ORDER BY id');
  const eventos = await q('SELECT e.paquete_id, e.estado, e.detalle, e.ocurrido_en, e.origen FROM eventos e JOIN paquetes p ON p.id = e.paquete_id WHERE p.user_id = $1 ORDER BY e.paquete_id, e.ocurrido_en');
  const [{ n }] = await q('SELECT count(*)::int AS n FROM push_suscripciones WHERE user_id = $1');
  return { exportado_en: new Date().toISOString(), usuario: { id: usuario.id, email: usuario.email }, paquetes, eventos, dispositivos_con_notificaciones: n };
}

/** Borra paquetes, historial, suscripciones push y la cuenta de acceso, todo o nada. Devuelve cuántos paquetes había. */
export async function eliminar(usuarioId) {
  const c = await db().connect();
  try {
    await c.query('BEGIN');
    const { rowCount } = await c.query('DELETE FROM paquetes WHERE user_id = $1', [usuarioId]); // el historial cae en cascada
    await c.query('DELETE FROM push_suscripciones WHERE user_id = $1', [usuarioId]);
    // En Supabase la cuenta vive en auth.users; borrarla invalida también sus sesiones. En una base local sin ese esquema se omite.
    const { rows } = await c.query("SELECT to_regclass('auth.users') AS t");
    if (rows[0].t) await c.query('DELETE FROM auth.users WHERE id = $1', [usuarioId]);
    await c.query('COMMIT');
    return rowCount;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
