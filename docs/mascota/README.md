# Hubi, la mascota

Poses con fondo transparente (WebP), recortadas de las imágenes generadas con la paleta de la app.

## Cabecera del listado (se alternan las ocho)
Cada vez que se abre «Paquetes» sale una pose distinta, nunca la misma dos veces seguidas. Están en `public/img/hubi/` (versión web, 420 px de alto, 20-29 KB) y aquí en alta (900 px de alto).

| Archivo | Pose |
| --- | --- |
| `hubi-tranquilo.webp` | De pie, con la caja en las dos manos y sonrisa suave |
| `hubi-senalando.webp` | Señala hacia la derecha, con la caja bajo el brazo |
| `hubi-saluda.webp` | Saluda con la mano, con la caja bajo el brazo |
| `hubi-pulgar.webp` | Pulgar arriba |
| `hubi-gorra.webp` | Se quita la gorra |
| `hubi-feliz.webp` | Saluda con una caja en alto |
| `hubi-sorprendido.webp` | Sorprendido, con la caja en brazos |
| `hubi-enfadado.webp` | Brazos cruzados |

Las cinco comparten escala y línea de los pies (mismo recorte vertical), así que al cambiar de una a otra no «saltan». Para añadir una pose: recórtala con la misma franja, guárdala en `public/img/hubi/`, añádela a `POSES_HUBI` en `public/js/app.js` (con su ancho y alto) y al `SHELL` de `public/sw.js`.

## Detalle de un paquete: una pose por estado
La cabecera del detalle muestra la pose de su estado (`POSES_ESTADO` en `public/js/app.js`; imágenes en `public/img/hubi/`). Al entrar en un paquete **entregado** cae un confeti corto (unos 3 s, dibujado con CSS; no se muestra si el dispositivo pide «reducir movimiento»).

| Estado | Archivo | Pose |
| --- | --- | --- |
| Pendiente | `hubi-reloj.webp` | Mira su reloj de pulsera, con una caja bajo el brazo |
| En reparto | `hubi-bici.webp` | Pedalea con una caja en la cesta y saluda |
| Para recoger | `hubi-taquilla.webp` | Abre la puerta de una taquilla con la caja en la otra mano |
| Entregado | `hubi-entregado.webp` | Salta de alegría desde dentro de una caja abierta |
| Incidencia | `hubi-incidencia.webp` | Preocupado, con la mano en la cara y una caja arrugada y rota a su lado |

## Paleta
Gorra terracota `#E8663A`, sudadera mostaza `#F0B64E`, pantalón cacao `#8B5A35`, zapatillas crema `#F7F0E3`, cajas cartón `#C98A4B`, detalles `#2B2118`. Fondo de generación: verde croma liso `#00B140`, que se recorta quitando el color de fondo y el reflejo verde de los bordes.
