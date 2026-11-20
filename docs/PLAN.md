# HubToHub – plan por fases

Objetivo: un panel único (móvil primero) que sigue por sí solo todos tus paquetes (comprados, en reparto, pendientes de recoger en locker y enviados por ti) y te avisa, hecho para España y con tus datos en tu propio servidor.

> Estado: borrador. Lo que depende de condiciones de terceros (APIs de paqueterías, SMS) está marcado como **por verificar**.

## Fase 0 – TE2 (lo que pide el curso)
- API REST en PHP con MVC, front controller `index.php`, router con rutas dinámicas.
- CRUD de `paquetes` con CSV (7 registros), respuestas JSON y códigos 200/201/204/404.
- Entregable de DWES03. No añadir nada más hasta tenerlo cerrado.

## Fase 1 – MVP personal
- Pasar de CSV a SQLite o MySQL (misma capa DataHandler, solo cambia la persistencia).
- Campos: `id`, `remitente`, `destinatario`, `peso`, `estado`, `fecha`, más `numero_seguimiento`, `paqueteria`, `direccion` (recibido / enviado).
- Interfaz del mockup (escritorio y móvil) consumiendo la API. Instalable como PWA.
- Login con cuentas (Supabase Auth): hecho; cada usuario ve solo sus paquetes. Alta de paquetes a mano.

## Fase 2 – Seguimiento automático
> Estado: **en curso**. Hecho: motor (eventos sin duplicar, estado, avisos, cambios manuales), tarea periódica protegida, botón «Actualizar ahora», casilla por paquete y proveedor simulado. Pendiente: adaptador del proveedor real (TrackingMore, con la clave de API y envíos reales), afinar la lectura de «para recoger» con textos reales y programar la tarea.
> Paqueterías de uso real: Correos Express, Amazon, GLS, MRW, SEUR, DHL Express, Nacex, InPost y CTT (cobertura del proveedor **por verificar**). Volumen: unos 20 paquetes al mes; consulta cada 15 minutos.
- Un **conector por paquetería** con la misma interfaz: `detectar(numero)` y `consultar(numero)` devuelven un estado normalizado: `pendiente`, `en_reparto`, `listo_para_recoger`, `entregado`, `incidencia`.
- Empezar con 2–3 paqueterías que uses de verdad (por ejemplo Correos, GLS, InPost).
- Una tarea programada (cron) consulta cada X minutos los paquetes abiertos y guarda cada cambio en una tabla `eventos`.
- Avisos por correo, notificación web o Telegram.
- **Por verificar:** condiciones de acceso de cada paquetería (API oficial, contrato, scraping permitido o no).

## Resolver una incidencia (pendiente de planificar)
Hoy una incidencia solo se muestra (estado rojo y Hubi preocupado). Falta poder actuar desde la propia ficha del paquete:
- Botón «Resolver incidencia» en el detalle de un paquete con estado `incidencia`, con acceso directo a la mensajería: la página oficial de seguimiento y de atención al cliente de la paquetería, con el número de seguimiento ya copiado o puesto en el enlace.
- Teléfono y formulario de contacto de cada paquetería (Correos, SEUR, GLS, InPost, Amazon Logistics…), guardados en una tabla de datos por paquetería para poder actualizarlos sin tocar el código.
- Mensaje de reclamación prellenado (remitente, fecha, número de seguimiento y motivo) para copiarlo o enviarlo por correo.
- Estado de la gestión (reclamación abierta, respondida, resuelta) y aviso si pasan N días sin respuesta.
- **Por verificar:** las direcciones y teléfonos de atención de cada paquetería, y si admiten enlaces directos con el número de seguimiento. No se darán por buenos hasta comprobarlos en sus webs oficiales.
- Encaja con la Fase 2 (saber la paquetería y el número) y con las alertas de la Fase 5.

## Fase 3 – Correo
- Gmail API con permiso de solo lectura (OAuth).
- Reglas por remitente (Correos, SEUR, GLS, InPost, Amazon…) para sacar número de seguimiento y estado.
- Guardar solo los campos extraídos, nunca el cuerpo del correo.
- **Límite:** un servidor no puede leer tus SMS. Opciones: reenviar los SMS al correo o a Telegram con una app en el móvil, o pegar el aviso a mano.

## Fase 4 – Lockers y puntos de recogida (el hueco diferencial)
> Estado: **hecho a mano**. Cada paquete listo para recoger guarda punto de recogida, fecha límite y PIN (cifrado con AES-256-GCM, clave en `PIN_CLAVE`); el listado destaca «Para recoger» con lo que caduca antes, y «Marcar como recogido» borra el PIN. Pendiente: recordatorio por notificación antes de que caduque (necesita las claves VAPID y una tarea programada) y rellenar punto y fecha desde el seguimiento automático.
- Estado `listo_para_recoger` con ubicación, PIN y fecha límite (por ejemplo, Citypaq da 5 días naturales).
- Recordatorio antes de que caduque y vista "para recoger hoy".
- PIN cifrado en la base de datos y borrado al marcar el paquete como recogido.

## Fase 5 – Agente
- Resumen diario ("hoy llegan 2, 1 caduca mañana").
- Alertas: sin movimiento durante N días, incidencia, caducidad de locker.
- Envíos salientes: seguimiento de lo que mandas a otros.
- Preguntas en lenguaje natural sobre tus paquetes (opcional).

## Fase 6 – Pulido y despliegue
- Docker para autoalojarlo, copias de seguridad, varios usuarios, borrado de datos a petición.

---

## Decisión de arquitectura: reglas, LLM o RAG

| Opción | Para qué sirve aquí | Pros | Contras |
| --- | --- | --- | --- |
| **Reglas / regex** | Leer correos conocidos de cada paquetería | Gratis, rápido, predecible, sin enviar datos fuera | Se rompe si cambian el formato; hay que mantener una por paquetería |
| **LLM como extractor** | Entender correos raros o nuevos y devolver JSON (número, paquetería, estado, fecha límite) | Flexible, sirve para formatos que no has previsto | Coste y privacidad si es una API externa; puede equivocarse, así que hay que validar |
| **LLM con herramientas (agente)** | Responder y actuar usando funciones sobre tu base de datos: `listar_paquetes`, `estado_de(id)`, `caducan_hoy()` | Respuestas exactas porque los datos salen de SQL | Hace falta un modelo (de pago o local) |
| **RAG** | Buscar en mucho texto no estructurado (histórico de correos) para que el LLM conteste | Útil si quieres preguntar "¿qué pedí en octubre?" sobre correos antiguos | Es excesivo aquí: tus datos ya están estructurados |

**Recomendación:**
1. Empezar con reglas (Fase 3).
2. Añadir un LLM solo como respaldo para los correos que las reglas no entiendan, devolviendo siempre JSON que tu código valide.
3. Para el agente, usar un LLM con herramientas sobre tu base de datos, no RAG.
4. RAG solo si más adelante quieres buscar en el histórico de correos.
5. Si no quieres pagar a terceros ni enviar tus correos fuera, probar un modelo local pequeño. **Por verificar:** su calidad en correos en español y el hardware necesario.

## Riesgos y preguntas abiertas
- Condiciones de cada paquetería para consultar el seguimiento.
- Vinted y Wallapop: el número de seguimiento suele estar en su propia app o en correos; no he encontrado una API pública para ellos.
- RGPD: tratar solo tus propios correos, guardar lo mínimo y poder borrarlo todo.
- Mantenimiento: cada cambio de formato de una paquetería obliga a tocar su conector.
