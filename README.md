# HubToHub

Panel único (móvil primero) para seguir todos tus paquetes: comprados, en reparto, pendientes de recoger en locker y enviados por ti. Pensado para España y autoalojado: tus datos en tu servidor.

> Estado: Fase 1 (MVP personal). Ver [docs/PLAN.md](docs/PLAN.md).

## Stack
PHP (MVC, API REST JSON) · SQLite/MySQL · PWA

## Arranque rápido
Requisitos: PHP 8.1+ con `pdo_sqlite`. Sin Composer ni dependencias.

```bash
cp .env.example .env
php database/init.php --seed      # crea database/hubtohub.sqlite con datos de ejemplo
php -S localhost:8000 -t public
```
Abre <http://localhost:8000>. `php database/init.php --reset --seed` recarga la base desde cero.

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

```bash
curl -X POST localhost:8000/paquetes -d '{"remitente":"Amazon","destinatario":"Yo","peso":"1,2"}'
```

## Estructura
- `public/` front controller (`index.php`) e interfaz (`index.html`, `css/`, `js/`, `manifest.json`, `sw.js`)
- `src/Core` Router, Response, Env, Database · `src/Controllers` · `src/Models` (DataHandler PDO)
- `database/` `schema.sql`, `init.php`, `seed.php`
- `docs/` plan, paleta, bocetos y logo

## Despliegue
`public/.htaccess` redirige al front controller en Apache. En nginx: `try_files $uri /index.php$is_args$args;`.
La app aún **no tiene login** (Fase 1, pendiente): no la expongas a internet sin protegerla.
