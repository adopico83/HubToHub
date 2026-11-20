# Seguridad, privacidad y publicación

> No es asesoramiento jurídico. Los textos legales (`public/privacidad.html`, `public/terminos.html`) son una base honesta a partir de lo que la app guarda de verdad; conviene que los lea quien responda del servicio.

## Hecho
| Tema | Qué hay |
| --- | --- |
| Acceso | Cada ruta de la API exige sesión de Supabase Auth; todas las consultas filtran por `user_id`. |
| Cabeceras (`vercel.json`) | CSP estricta (`script-src 'self'`, sin recursos de terceros), `frame-ancestors 'none'`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy` (sin cámara/micrófono/ubicación), COOP/CORP. |
| Terceros | Tipografías alojadas en `/fonts`: el navegador ya no contacta con Google. |
| Datos en tránsito/caché | Las respuestas de la API llevan `Cache-Control: no-store`; el service worker no cachea la API. |
| Abuso | Límite por usuario (240/min) y por IP sin sesión (30/min) en `lib/limite.js`; cuerpo JSON máximo de 100 KB. Es por instancia serverless: frena abusos, no es un límite global exacto. |
| Derechos RGPD | `GET /cuenta` (descargar mis datos, portabilidad) y `DELETE /cuenta` (borrar paquetes, historial, avisos y la cuenta de `auth.users`, en una transacción, confirmando con el correo). |
| Información | Política de privacidad y términos, enlazados desde el registro y desde Ajustes. |
| Región | La base de datos está en `eu-west-1` (Irlanda); las funciones se fijan a `dub1` (Dublín) en `vercel.json`. |

## Pendiente (lo haces tú, en los paneles)
1. ~~Rellenar el titular y el correo de contacto en las páginas legales~~ (hecho: Andrés Dopico, `adopico83@hotmail.com`). Si algún día cambia el correo, hay que actualizarlo en `public/privacidad.html` y `public/terminos.html`.
2. **Probar «Eliminar mi cuenta» contra Supabase** con una cuenta de prueba tras el despliegue: el borrado de `auth.users` solo está probado en local con un esquema simulado.
3. Supabase → Authentication: contraseña mínima de 8 o más y exigir complejidad; activar la protección contra contraseñas filtradas (plan Pro); valorar CAPTCHA en el registro y un SMTP propio (el de pruebas de Supabase tiene un límite bajo de correos).
4. Cerrar los registros cuando solo quieras usuarios invitados; quitar la protección de despliegue de Vercel cuando la app deba ser pública.
5. Revisar la política cuando se active el seguimiento automático (el número de seguimiento irá a un tercero) o el correo (Fase 3).

## Si algún día se publica en tiendas
- **Como PWA no hay permisos de tienda.** El navegador pide el permiso de notificaciones solo cuando el usuario pulsa «Activar notificaciones» (ya es así).
- **Google Play** (empaquetada como TWA o con Capacitor): URL de la política de privacidad, formulario «Seguridad de los datos», y **eliminación de cuenta** accesible dentro de la app y desde una URL web. En Android 13+ el permiso `POST_NOTIFICATIONS`.
- **App Store**: URL de privacidad, etiquetas de privacidad de la app, eliminación de cuenta dentro de la app. Una simple envoltura de la web suele rechazarse por «funcionalidad mínima» (guideline 4.2): hace falta Capacitor con algo nativo (notificaciones push nativas, por ejemplo).
- **RGPD / LOPDGDD**: para uso personal no hace falta registro de actividades, pero sí informar (hecho) y atender derechos (hecho). Si se abre al público y crece, valorar delegado/registro y los contratos de encargado con Supabase y Vercel (sus DPA se aceptan en las condiciones del servicio).
- Edad mínima de consentimiento en España: 14 años (así consta en la política).
