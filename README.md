# HubToHub

Panel único (móvil primero) para seguir todos tus paquetes: comprados, en reparto, pendientes de recoger en locker y enviados por ti. Pensado para España y autoalojado: tus datos en tu servidor.

> Estado: Fase 1 (MVP personal). Ver [docs/PLAN.md](docs/PLAN.md).

## Stack
Node.js (funciones serverless de Vercel) · PostgreSQL (Supabase) · HTML/CSS/JS sin framework · PWA

## Arranque en local
Requisitos: Node 20+ y una base Postgres (la de Supabase o una local).

```bash
cp .env.example .env              # y rellena DATABASE_URL
npm install
npm run db:reset                  # crea tablas y carga datos de ejemplo
npm run dev                       # http://localhost:3000
npm test
```
`npm run db:init` crea las tablas sin tocar datos; `npm run db:seed` añade los ejemplos si la tabla está vacía.

## API
Siempre devuelve `{status, code, message, data}` (salvo `204`, que no lleva cuerpo).

| Método | Ruta | Código |
| --- | --- | --- |
| GET | `/paquetes` (filtros `?estado=&direccion=&q=`) | 200 |
| GET | `/paquetes/{id}` | 200 / 404 |
| POST | `/paquetes` | 201 / 422 |
| PUT | `/paquetes/{id}` (admite cambios parciales) | 200 / 404 / 422 |
| DELETE | `/paquetes/{id}` | 204 / 404 |

Otros: ruta desconocida 404, método no permitido 405, JSON mal formado 400.
Estados: `pendiente`, `en_reparto`, `listo_para_recoger`, `entregado`, `incidencia`.

## Estructura
- `public/` interfaz (`index.html`, `css/`, `js/`, `manifest.json`, `sw.js`)
- `api/paquetes/` endpoints (Vercel) · `lib/` controlador, validación, repositorio y conexión
- `database/` `schema.sql` y `seed.sql` (Postgres) · `scripts/` init de BD y servidor local
- `docs/` plan, paleta, bocetos y logo

## Despliegue (Vercel + Supabase)
1. Ejecuta `database/schema.sql` en el SQL Editor de Supabase.
2. En Vercel, importa el repo y añade la variable `DATABASE_URL` (cadena *pooler* de Supabase).
3. Cada commit a `main` se publica en producción; el resto de ramas generan *previews*.

La app aún **no tiene login**: no abras la URL pública con datos reales hasta añadirlo.
