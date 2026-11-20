# Paleta, tipografía y campos

La interfaz usa la paleta **Cartón**: papel cálido, marrón espresso y terracota. Todos los colores son variables CSS (`public/css/app.css`); el tema oscuro solo las redefine.

## Colores · tema claro
| Uso | Variable | Color |
| --- | --- | --- |
| Fondo | `--bg` | `#F2ECE0` |
| Tarjetas | `--surface` | `#FFFDF8` |
| Tarjetas secundarias | `--surface-2` | `#EAE2D2` |
| Texto | `--ink` | `#2B2118` |
| Texto secundario | `--muted` | `#6F6355` |
| Bordes | `--line` | `#DDD2BE` |
| Cabecera | `--head-bg` | `#2B2118` |
| Acento (botones, enlaces) | `--accent` | `#C8501A` |
| Detalle de marca («To», logo) | `--brand-2` | `#F0B64E` |

## Colores · tema oscuro
Fondo `#17130F`, tarjetas `#211B15`, texto `#F4ECDD`, acento `#E8703E`, cabecera `#0F0C09`.

## Estados
| Estado | Claro | Oscuro |
| --- | --- | --- |
| Pendiente | `#B7791F` | `#E0A63A` |
| En reparto | `#2F63B8` | `#6C9BEA` |
| Listo para recoger | `#1F7A74` | `#4FB8AE` |
| Entregado | `#2E7D4F` | `#5DBB82` |
| Incidencia | `#B3261E` | `#F0786F` |

Los fondos y textos de las etiquetas se derivan de cada color con `color-mix`.

## Tipografía
- Títulos y logotipo: Fraunces (600)
- Texto: Figtree (400–700)

## Logo
La H con flecha. Dos colores: terracota `#E8663A` y mostaza `#F0B64E`. Sobre fondo marrón `#2B2118` en el icono de la app. En la cabecera se dibuja en línea (`MARCA` en `public/js/app.js`) para tomar los colores de las variables `--logo-1` y `--logo-2`.

## Campos de `paquetes`
`id`, `remitente`, `destinatario`, `peso` (kg), `estado`, `fecha`, `numero_seguimiento`, `paqueteria`, `direccion` (recibido / enviado)

## Endpoints
Ver el README.
