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
| GET | `/eventos` (actividad reciente, `?limite=50`) | 200 |
| GET | `/push` (clave pública de notificaciones) | 200 |
| POST | `/push` (suscribir este dispositivo) | 201 / 422 / 503 |
| DELETE | `/push` (cancelar la suscripción) | 204 / 422 |
| POST | `/push/prueba` (aviso de prueba) | 200 / 503 |

`GET /paquetes/{id}` incluye `eventos`: el historial de cambios de estado del paquete, del más antiguo al más reciente.
Cada alta y cada cambio de `estado` guarda un evento; los avisos push se envían solo cuando el estado cambia.

Otros: ruta desconocida 404, método no permitido 405, JSON mal formado 400.
Estados: `pendiente`, `en_reparto`, `listo_para_recoger`, `entregado`, `incidencia`.

## Estructura
- `public/` interfaz (`index.html`, `css/`, `js/`, `manifest.json`, `sw.js`)
- `api/` endpoints (Vercel): `paquetes/`, `eventos.js`, `push/` · `lib/` controlador, validación, repositorio y conexión
- `database/` `schema.sql`, `seed.sql` y `migraciones/` (Postgres) · `scripts/` init de BD y servidor local
- `docs/` plan, paleta, bocetos y logo

## Despliegue (Vercel + Supabase)
1. Ejecuta `database/schema.sql` en el SQL Editor de Supabase. Si la base ya existía de antes, ejecuta en su lugar `database/migraciones/002_historial_y_push.sql`.
2. En Vercel, importa el repo y añade la variable `DATABASE_URL` (cadena *pooler* de Supabase).
3. Notificaciones push (opcional): `npm run vapid` genera las claves; añade `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secreta) y `VAPID_SUBJECT` en Vercel y vuelve a desplegar. Después, en la app, ve a Ajustes → Activar notificaciones. En iPhone hay que instalar antes la app en la pantalla de inicio.
4. Cada commit a `main` se publica en producción; el resto de ramas generan *previews*.

La app aún **no tiene login**: no abras la URL pública con datos reales hasta añadirlo.
