# HubToHub

Panel único (móvil primero) para seguir todos tus paquetes: comprados, en reparto, pendientes de recoger en locker y enviados por ti. Pensado para España y autoalojado: tus datos en tu servidor.

> Estado: Fase 1 (MVP personal). Ver [docs/PLAN.md](docs/PLAN.md).

## Stack
PHP (MVC, API REST JSON) · SQLite/MySQL · PWA

## Arranque rápido
```bash
cp .env.example .env
php -S localhost:8000 -t public
```

## Estructura
- `public/` front controller (`index.php`)
- `src/` Core (Router), Controllers, Models
- `database/` esquema SQL
- `docs/` plan, paleta, bocetos y logo
