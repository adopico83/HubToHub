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
- Login básico. Alta de paquetes a mano.

## Fase 2 – Seguimiento automático
- Un **conector por paquetería** con la misma interfaz: `detectar(numero)` y `consultar(numero)` devuelven un estado normalizado: `pendiente`, `en_reparto`, `listo_para_recoger`, `entregado`, `incidencia`.
- Empezar con 2–3 paqueterías que uses de verdad (por ejemplo Correos, GLS, InPost).
- Una tarea programada (cron) consulta cada X minutos los paquetes abiertos y guarda cada cambio en una tabla `eventos`.
- Avisos por correo, notificación web o Telegram.
- **Por verificar:** condiciones de acceso de cada paquetería (API oficial, contrato, scraping permitido o no).

## Fase 3 – Correo
- Gmail API con permiso de solo lectura (OAuth).
- Reglas por remitente (Correos, SEUR, GLS, InPost, Amazon…) para sacar número de seguimiento y estado.
- Guardar solo los campos extraídos, nunca el cuerpo del correo.
- **Límite:** un servidor no puede leer tus SMS. Opciones: reenviar los SMS al correo o a Telegram con una app en el móvil, o pegar el aviso a mano.

## Fase 4 – Lockers y puntos de recogida (el hueco diferencial)
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
