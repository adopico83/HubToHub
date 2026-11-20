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

## Cuentas y acceso
Las cuentas las gestiona **Supabase Auth** (correo y contraseña). El navegador inicia sesión directamente con Supabase y envía el token de sesión (`Authorization: Bearer …`) en cada llamada; la API lo comprueba con Supabase (se recuerda 30 s) y **cada usuario solo ve y modifica sus propios paquetes**, su actividad y sus notificaciones. Sin sesión, la API responde `401` y la web lleva a la pantalla de acceso.

- `GET /config` es la única ruta pública: da la URL del proyecto de Supabase y su clave *publishable* (pública por diseño). Se pueden cambiar con `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`.
- Cada paquete tiene `user_id` (el id del usuario en Supabase). Los paquetes creados antes de las cuentas quedan sin dueño y no se ven hasta asignarlos: `UPDATE paquetes SET user_id = '<id del usuario>' WHERE user_id IS NULL;` (el id está en Supabase → Authentication → Users). En local, `SEED_USER_ID=<id> npm run db:reset` asigna los ejemplos a esa cuenta.
- Ajustes de Supabase necesarios: ver «Despliegue».

## Seguimiento automático
La app consulta sola el estado de los paquetes con número de seguimiento a un **servicio de seguimiento** (un proveedor que reúne muchas paqueterías) y actualiza el estado, el historial y las notificaciones.

- **Proveedores** (`lib/seguimiento/`): cada uno es un archivo con `consultar({ numero, courier })`. Hoy solo existe el **simulado** (`SEGUIMIENTO_PROVEEDOR=simulado`, para desarrollar y probar: el número decide la situación, p. ej. `SIM-RECOGER`). El adaptador del proveedor real (TrackingMore) está **pendiente**: hace falta su clave de API para probarlo con envíos reales. Sin proveedor configurado, el seguimiento automático queda apagado y la web no muestra nada de él.
- **Qué hace:** guarda los eventos nuevos sin duplicarlos, cambia el estado (sin «retroceder» nunca por falta de información) y avisa al dueño. «Pickup» de TrackingMore significa a la vez «en reparto» y «listo para recoger»: se separa por el texto del evento (`lib/seguimiento/clasificar.js`, a afinar con envíos reales).
- **Cambios a mano:** si corriges un estado a mano, manda sobre el seguimiento hasta que la paquetería informe de algo más nuevo.
- **Paquetes que se consultan:** con número de seguimiento, abiertos (no entregados), con la casilla «Consultar el seguimiento automáticamente» y de los últimos 60 días; los consultados hace más tiempo, primero.
- **Tarea periódica:** `GET /api/cron/seguimiento` con `Authorization: Bearer <CRON_SECRET>`. Consulta hasta `SEGUIMIENTO_MAX_POR_EJECUCION` paquetes (15 por defecto). **Aún no está programada en `vercel.json`**: se añadirá tras comprobar en una vista previa cada cuánto permite ejecutarla el plan de Vercel.
- **Actualizar ahora:** `POST /paquetes/{id}` consulta un paquete al momento (como mucho una vez por minuto).
- **PIN y punto de recogida:** el seguimiento no da el PIN (lo envía la paquetería por SMS o correo), así que se escribe a mano (ver abajo).

## Recogida en locker o punto (con PIN)
Un paquete `listo_para_recoger` guarda **dónde** recogerlo (`punto_recogida`), **hasta cuándo** (`recoger_hasta`) y el **PIN**. El listado destaca los que hay que recoger (aviso «Para recoger» con lo que caduca antes) y el detalle tiene una tarjeta «Recogida» con el PIN oculto (Mostrar / Copiar) y «Marcar como recogido».
- **El PIN va cifrado** (AES-256-GCM, `lib/pin.js`) con la clave `PIN_CLAVE` (`npm run pin:clave` la genera). Nunca sale en los listados ni en las notificaciones: solo en `GET /paquetes/{id}`, a su dueño. Al marcar el paquete como entregado (a mano o por el seguimiento) se borra el PIN y la fecha límite. Sin `PIN_CLAVE` el servidor responde 503 al intentar guardar un PIN; el resto funciona.
- En la API: `punto_recogida` (texto, hasta 120), `recoger_hasta` (`AAAA-MM-DD`) y `pin` (3 a 24 caracteres: letras, números, espacios o guiones; `""` lo borra; si no se envía, no cambia). Las respuestas llevan `tiene_pin`.

## Resolver una incidencia
Un paquete en estado `incidencia` (o con una reclamación ya iniciada) muestra la tarjeta «Resolver incidencia»: enlaces oficiales de la paquetería, copiar el nº de seguimiento, un mensaje de reclamación listo para copiar (con el motivo editable) y el estado de la gestión: `gestion` = `abierta`, `respondida` o `resuelta` (vacío = sin reclamar). Una reclamación abierta durante 3 días o más se marca «sin respuesta» en el detalle y en el listado. `gestion_en` guarda cuándo cambió por última vez.
- Los datos de contacto están en `public/js/paqueterias.js` y **solo incluyen lo comprobado en la web oficial** de cada paquetería (hoy Correos, MRW y Amazon). Para las demás se avisa de que no están comprobados. Antes de añadir una, verifica sus enlaces en su web.

## API
Siempre devuelve `{status, code, message, data}` (salvo `204`, que no lleva cuerpo). Todas las rutas, salvo `/config`, exigen sesión.

| Método | Ruta | Código |
| --- | --- | --- |
| GET | `/paquetes` (filtros `?estado=&direccion=&q=`) | 200 |
| GET | `/paquetes/{id}` | 200 / 404 |
| POST | `/paquetes` | 201 / 422 |
| PUT | `/paquetes/{id}` (admite cambios parciales) | 200 / 404 / 422 |
| DELETE | `/paquetes/{id}` | 204 / 404 |
| POST | `/paquetes/{id}` (consulta el seguimiento ahora) | 200 / 404 / 422 / 429 / 502 / 503 |
| GET | `/config` (pública) | 200 |
| GET | `/eventos` (actividad reciente, `?limite=50`) | 200 |
| GET | `/push` (clave pública de notificaciones) | 200 |
| POST | `/push` (suscribir este dispositivo) | 201 / 422 / 503 |
| DELETE | `/push` (cancelar la suscripción) | 204 / 422 |
| POST | `/push/prueba` (aviso de prueba) | 200 / 503 |

`GET /paquetes/{id}` incluye `eventos`: el historial de cambios de estado del paquete, del más antiguo al más reciente.
Cada alta y cada cambio de `estado` guarda un evento; los avisos push se envían solo cuando el estado cambia.

Otros: sin sesión 401, ruta desconocida 404, método no permitido 405, JSON mal formado 400. Un paquete de otro usuario responde 404, igual que uno que no existe.
Estados: `pendiente`, `en_reparto`, `listo_para_recoger`, `entregado`, `incidencia`.

## Estructura
- `public/` interfaz (`index.html`, `css/`, `js/`, `manifest.json`, `sw.js`)
- `api/` endpoints (Vercel): `paquetes/`, `eventos.js`, `push/` · `lib/` controlador, validación, repositorio y conexión
- `database/` `schema.sql`, `seed.sql` y `migraciones/` (Postgres) · `scripts/` init de BD y servidor local
- `docs/` plan, paleta, bocetos y logo

## Despliegue (Vercel + Supabase)
1. Ejecuta `database/schema.sql` en el SQL Editor de Supabase. Si la base ya existía de antes, ejecuta en su lugar las migraciones de `database/migraciones/` que falten (`002` historial y push, `003` cuentas, `004` seguimiento automático, `005` recogida, `006` reclamación de incidencias).
2. En Vercel, importa el repo y añade la variable `DATABASE_URL` (cadena *pooler* de Supabase).
2 bis. PIN de recogida: `npm run pin:clave` y añade `PIN_CLAVE` en Vercel (secreta; no la pierdas: los PIN guardados dejarían de leerse).
3. Notificaciones push (opcional): `npm run vapid` genera las claves; añade `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secreta) y `VAPID_SUBJECT` en Vercel y vuelve a desplegar. Después, en la app, ve a Ajustes → Activar notificaciones. En iPhone hay que instalar antes la app en la pantalla de inicio.
4. Cada commit a `main` se publica en producción; el resto de ramas generan *previews*.

5. **Cuentas (Supabase → Authentication):**
   - *URL Configuration*: pon como **Site URL** la dirección de producción (por ejemplo `https://hubtohub-es.vercel.app`) y añádela a **Redirect URLs**. Sin esto, los enlaces del correo (confirmar y recuperar contraseña) llevan a `localhost`.
   - *Sign In / Providers → Email*: decide si exige **confirmar el correo** al registrarse. Con confirmación, el correo de Supabase por defecto tiene un límite de envíos muy bajo y puede caer en spam; para uso personal es más cómodo desactivarla. Si no quieres que se registre cualquiera, desactiva también el registro de usuarios nuevos (*Allow new users to sign up*) tras crear tu cuenta.
6. Cuando el login esté probado en producción, se puede desactivar la protección de Vercel (Settings → Deployment Protection).
