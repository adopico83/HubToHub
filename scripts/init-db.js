// Uso: npm run db:init | db:seed | db:reset   (necesita DATABASE_URL)
import { readFile } from 'node:fs/promises';
import { db } from '../lib/db.js';

const args = process.argv.slice(2);
const leer = (f) => readFile(new URL(`../database/${f}`, import.meta.url), 'utf8');

try {
  const pool = db();
  if (args.includes('--reset')) {
    await pool.query('DROP TABLE IF EXISTS push_suscripciones; DROP TABLE IF EXISTS eventos; DROP TABLE IF EXISTS paquetes;');
    console.log('Tablas eliminadas.');
  }
  await pool.query(await leer('schema.sql'));
  console.log('Esquema creado.');
  if (args.includes('--seed')) {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM paquetes');
    if (rows[0].n > 0) console.log('Ya hay datos; seed omitido (usa db:reset para recargar).');
    else {
      await pool.query(await leer('seed.sql'));
      console.log('Datos de ejemplo cargados.');
      // Los ejemplos nacen sin dueño; con SEED_USER_ID (id de un usuario de Supabase Auth) se asignan a esa cuenta.
      if (process.env.SEED_USER_ID) {
        const r = await pool.query('UPDATE paquetes SET user_id = $1 WHERE user_id IS NULL', [process.env.SEED_USER_ID]);
        console.log(`${r.rowCount} paquetes asignados a ${process.env.SEED_USER_ID}.`);
      }
    }
  }
  await pool.end();
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
