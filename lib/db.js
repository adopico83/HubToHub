// Conexión a Postgres. Una sola Pool por instancia (en serverless se reutiliza entre llamadas).
import pg from 'pg';

// DATE llega como texto 'AAAA-MM-DD' y NUMERIC como número, no como objetos Date/strings.
pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT (id) -> número
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

let pool;

export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta DATABASE_URL');
    const local = /@(localhost|127\.0\.0\.1)/.test(url);
    pool = new pg.Pool({
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false }, // Supabase exige TLS
      max: 3, // pocas conexiones: cada función serverless abre las suyas
    });
  }
  return pool;
}
