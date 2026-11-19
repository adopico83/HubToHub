/* HubToHub · interfaz (JS sin framework). Rutas con hash: #/ · #/paquete/3 · #/nuevo · #/editar/3 · #/actividad · #/ajustes */
'use strict';

const API = '/paquetes';
const ESTADOS = {
  pendiente:          'Pendiente',
  en_reparto:         'En reparto',
  listo_para_recoger: 'Listo para recoger',
  entregado:          'Entregado',
  incidencia:         'Incidencia',
};
const AVATARES = ['#DCE6FF', '#FFE9A8', '#CDF3E1', '#FFD9D5', '#E9DDFF', '#D2F1F5', '#FFDFC7'];
const $app = document.getElementById('app');
const state = { paquetes: [], q: '', filtro: '' };

/* ---------- utilidades ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const pesoES = (p) => (p == null ? '—' : Number(p).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 3 }));
const iniciales = (n) => n.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
const hora = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const fechaHoraES = (iso) => new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');
const diaClave = (iso) => new Date(iso).toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
function diaTexto(iso) {
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 864e5);
  if (diaClave(iso) === diaClave(hoy)) return 'Hoy';
  if (diaClave(iso) === diaClave(ayer)) return 'Ayer';
  const t = new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const badge = (e) => `<span class="badge e-${e}">${ESTADOS[e] || esc(e)}</span>`;
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  caja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  actividad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  aviso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
};

function toast(msg, error = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (error ? ' err' : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = 'toast'), 3000);
}

/** Llama a la API y devuelve {code, data, message}. Lanza si no hay red. */
async function llamar(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return { code: 204, data: null };
  return res.json();
}
const api = (path = '', options = {}) => llamar(API + path, options);

/* ---------- estructura común ---------- */
const TABS = [
  ['paquetes', '#/', 'Paquetes', ICON.caja],
  ['actividad', '#/actividad', 'Actividad', ICON.actividad],
  ['ajustes', '#/ajustes', 'Ajustes', ICON.ajustes],
];
const tabsHTML = (activa, lugar) => `<nav class="tabs tabs-${lugar}" aria-label="Secciones">${TABS.map(([id, href, nombre, icono]) =>
  `<a href="${href}" ${id === activa ? 'aria-current="page"' : ''}>${icono}<span>${nombre}</span></a>`).join('')}</nav>`;

function layout({ eyebrow, titulo, sub, accion, volver, contenido, tab = 'paquetes', compacto = false }) {
  $app.innerHTML = `
    <header class="hero${compacto ? ' compacto' : ''}"><div class="wrap">
      <div class="top">
        <a class="brand" href="#/" aria-label="HubToHub, inicio"><img src="/img/logo-marca.svg" alt=""><span>Hub<b>To</b>Hub</span></a>
        ${tabsHTML(tab, 'top')}
      </div>
      <div class="hero-row">
        <div>
          ${volver ? `<a class="back" href="${volver[0]}">← ${volver[1]}</a>` : ''}
          <p class="eyebrow">${esc(eyebrow)}</p>
          <h1>${esc(titulo)}</h1>
          ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
        </div>
        ${accion || ''}
      </div>
    </div></header>
    <main>${contenido}</main>
    ${tabsHTML(tab, 'bottom')}`;
  document.title = `${titulo} · HubToHub`;
  window.scrollTo(0, 0);
}

/* ---------- listado ---------- */
async function vistaListado() {
  layout({
    eyebrow: 'Panel de envíos', titulo: 'Paquetes', sub: 'Todo lo que compras, recoges y envías.',
    accion: `<a class="btn" href="#/nuevo">${ICON.plus}Nuevo paquete</a>`, compacto: true,
    contenido: '<p class="empty glass">Cargando…</p>',
  });
  try {
    const r = await api();
    state.paquetes = r.data || [];
  } catch {
    $app.querySelector('main').innerHTML = '<p class="empty glass">No se pudo conectar con la API.</p>';
    return;
  }
  const main = $app.querySelector('main');
  const cuenta = (e) => state.paquetes.filter((p) => p.estado === e).length;
  const stats = [
    ['', 'Total', state.paquetes.length],
    ['en_reparto', 'En reparto', cuenta('en_reparto')],
    ['listo_para_recoger', 'Para recoger', cuenta('listo_para_recoger')],
    ['pendiente', 'Pendientes', cuenta('pendiente')],
    ['entregado', 'Entregados', cuenta('entregado')],
    ['incidencia', 'Incidencias', cuenta('incidencia')],
  ];
  main.innerHTML = `
    <section class="stats" aria-label="Resumen">
      ${stats.map(([e, l, n]) => `<div class="glass stat ${e ? 's-' + e : ''}"><span>${l}</span><b>${n}</b></div>`).join('')}
    </section>
    <div class="search-bar">
      <div class="search">${ICON.search}<input type="search" id="q" aria-label="Buscar paquetes" placeholder="Buscar remitente, destinatario o seguimiento" value="${esc(state.q)}"></div>
      <div class="chips" role="group" aria-label="Filtrar por estado">
        ${[['', 'Todos'], ...Object.entries(CORTO)].map(([k, v]) => `<button type="button" class="chip e-${k}" data-e="${k}" aria-pressed="${state.filtro === k}">${k ? '<i aria-hidden="true"></i>' : ''}${v}<span class="cnt">${k ? cuenta(k) : state.paquetes.length}</span></button>`).join('')}
      </div>
    </div>
    <ul class="list" id="lista"></ul>
    <p class="count" id="count"></p>
    <a class="btn fab" href="#/nuevo" aria-label="Nuevo paquete">${ICON.plus}Nuevo</a>`;

  const pintar = () => {
    const q = state.q.trim().toLowerCase();
    const lista = state.paquetes.filter((p) =>
      (!state.filtro || p.estado === state.filtro) &&
      (!q || [p.remitente, p.destinatario, p.numero_seguimiento].some((v) => (v || '').toLowerCase().includes(q))));
    document.getElementById('lista').innerHTML = lista.length
      ? lista.map(filaHTML).join('')
      : '<li class="empty glass">No hay paquetes que coincidan.</li>';
    document.getElementById('count').textContent = `Mostrando ${lista.length} de ${state.paquetes.length} paquetes`;
    main.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.e === state.filtro)));
  };
  document.getElementById('q').addEventListener('input', (e) => { state.q = e.target.value; pintar(); });
  main.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) { state.filtro = b.dataset.e; pintar(); }
  });
  pintar();
}

function filaHTML(p, i) {
  const contraparte = p.direccion === 'enviado' ? `Para ${p.destinatario}` : `De ${p.remitente}`;
  const nombre = p.direccion === 'enviado' ? p.destinatario : p.remitente;
  return `<li><a class="glass row" href="#/paquete/${p.id}">
    <div class="avatar" style="background:${AVATARES[p.id % AVATARES.length]}" aria-hidden="true">${esc(iniciales(nombre))}</div>
    <div class="who">${esc(nombre)}<small>#${p.id}</small></div>
    ${badge(p.estado)}
    <div class="meta">${p.direccion === 'enviado' ? 'Enviado' : 'Recibido'} · ${fechaES(p.fecha)}${p.paqueteria ? ' · ' + esc(p.paqueteria) : ''}</div>
    <div class="extra peso">${pesoES(p.peso)} kg</div>
    <div class="extra seg">${esc(p.numero_seguimiento || 'Sin seguimiento')}</div>
  </a></li>`;
}

/* ---------- seguimiento: la línea avanza según la etapa de la entrega ---------- */
const CORTO = { pendiente: 'Pendiente', en_reparto: 'En reparto', listo_para_recoger: 'Para recoger', entregado: 'Entregado', incidencia: 'Incidencia' };

/** Etapas del recorrido. "Para recoger" solo aparece si el paquete pasó por ahí. */
function etapasDe(p, eventos) {
  const recogida = p.estado === 'listo_para_recoger' || eventos.some((e) => e.estado === 'listo_para_recoger');
  return ['pendiente', 'en_reparto', ...(recogida ? ['listo_para_recoger'] : []), 'entregado'];
}

/** Índice de la etapa en que está el paquete. Una incidencia se queda en la etapa donde ocurrió. */
function etapaActual(p, eventos, etapas) {
  if (p.estado !== 'incidencia') return etapas.indexOf(p.estado);
  const previo = [...eventos].reverse().find((e) => etapas.includes(e.estado));
  return previo ? etapas.indexOf(previo.estado) : 1;
}

/**
 * Avance dentro de la etapa actual (0 a 1). Hoy es 0: el paquete salta de etapa en etapa.
 * Con el seguimiento automático (fase 2) devolverá, por ejemplo, las paradas que faltan para llegar.
 */
const avanceEnEtapa = () => 0;

function seguimientoHTML(p, eventos) {
  const etapas = etapasDe(p, eventos);
  const idx = etapaActual(p, eventos, etapas);
  const incidencia = p.estado === 'incidencia';
  const fraccion = Math.min(1, (idx + avanceEnEtapa(p)) / (etapas.length - 1));
  const cuando = (e, i) => {
    const ev = eventos.find((x) => x.estado === e);
    if (ev) return fechaHoraES(ev.ocurrido_en);
    return i === 0 ? fechaES(p.fecha) : '';
  };
  const nodos = etapas.map((e, i) => {
    const clase = i < idx ? 'done' : i === idx ? 'now' : 'todo';
    const marca = i < idx || (i === idx && !incidencia && e === 'entregado') ? ICON.check : '';
    return `<li class="n ${clase}" style="--x:${(i / (etapas.length - 1)) * 100}%" ${i === idx ? 'aria-current="step"' : ''}>
      <span class="pt">${marca}</span><b>${CORTO[e]}</b><small>${esc(cuando(e, i)) || '&nbsp;'}</small>
      ${incidencia && i === idx ? '<em class="inc">Incidencia</em>' : ''}</li>`;
  }).join('');
  const resumen = incidencia ? `Incidencia durante: ${CORTO[etapas[idx]]}` : ESTADOS[p.estado];
  return `<div class="track e-${p.estado}" style="--f:${fraccion}" role="group" aria-label="Seguimiento: ${esc(resumen)}, etapa ${idx + 1} de ${etapas.length}">
    <div class="nodes">
      <div class="rail"><i class="fill"></i></div>
      <ol>${nodos}</ol>
      <span class="pawn" aria-hidden="true">${incidencia ? '!' : ICON.caja}</span>
    </div></div>`;
}

const historialHTML = (eventos) => eventos.length
  ? `<ol class="hist">${[...eventos].reverse().map((e) => `<li class="e-${e.estado}">
      <span class="d"></span>
      <div><b>${ESTADOS[e.estado] || esc(e.estado)}</b>${e.detalle ? `<span>${esc(e.detalle)}</span>` : ''}</div>
      <time datetime="${esc(e.ocurrido_en)}">${esc(fechaHoraES(e.ocurrido_en))}</time></li>`).join('')}</ol>`
  : '<p class="muted">Todavía no hay movimientos.</p>';

/* ---------- detalle ---------- */
async function vistaDetalle(id) {
  layout({ eyebrow: 'Detalle', titulo: `Paquete #${id}`, volver: ['#/', 'Listado'], contenido: '<p class="empty glass">Cargando…</p>' });
  let r;
  try { r = await api('/' + id); } catch { return error('No se pudo conectar con la API.'); }
  if (r.code !== 200) return error(r.message);
  const p = r.data;
  const eventos = p.eventos || [];

  layout({
    eyebrow: p.direccion === 'enviado' ? 'Envío' : 'Recepción', titulo: `Paquete #${p.id}`, sub: badgeText(p), volver: ['#/', 'Listado'],
    contenido: `
      <section class="glass card" aria-label="Seguimiento"><h2>Seguimiento</h2>${seguimientoHTML(p, eventos)}</section>
      <div class="grid2">
        <section class="glass card" aria-label="Datos">
          <div class="route">
            <div><small>De</small><strong>${esc(p.remitente)}</strong></div>${ICON.arrow}
            <div><small>Para</small><strong>${esc(p.destinatario)}</strong></div>
          </div>
          <dl class="kv">
            <div><dt>Estado</dt><dd>${badge(p.estado)}</dd></div>
            <div><dt>Peso</dt><dd>${pesoES(p.peso)} kg</dd></div>
            <div><dt>Fecha</dt><dd>${fechaES(p.fecha)}</dd></div>
            <div><dt>Tipo</dt><dd>${p.direccion === 'enviado' ? 'Enviado por mí' : 'Recibido'}</dd></div>
            <div><dt>Paquetería</dt><dd>${esc(p.paqueteria || '—')}</dd></div>
            <div><dt>Nº seguimiento</dt><dd>${esc(p.numero_seguimiento || '—')}</dd></div>
          </dl>
          <div class="field quick"><label for="cambiar">Cambiar estado</label>
            <select id="cambiar">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="actions">
            <a class="btn blue" href="#/editar/${p.id}">Editar</a>
            <button class="btn danger" id="del" type="button">Eliminar</button>
          </div>
        </section>
        <section class="glass card" aria-label="Historial"><h2>Historial</h2>${historialHTML(eventos)}</section>
      </div>`,
  });
  // Anima la línea desde el principio hasta su posición.
  requestAnimationFrame(() => requestAnimationFrame(() => $app.querySelector('.track')?.classList.add('go')));

  document.getElementById('cambiar').addEventListener('change', async (ev) => {
    ev.target.disabled = true;
    try {
      const res = await api('/' + p.id, { method: 'PUT', body: { estado: ev.target.value } });
      if (res.code !== 200) { toast(res.message, true); ev.target.value = p.estado; ev.target.disabled = false; return; }
      toast('Estado actualizado');
      vistaDetalle(id);
    } catch { toast('No se pudo conectar con la API', true); ev.target.value = p.estado; ev.target.disabled = false; }
  });
  document.getElementById('del').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar el paquete #${p.id}?`)) return;
    await api('/' + p.id, { method: 'DELETE' });
    toast('Paquete eliminado');
    location.hash = '#/';
  });
}
const badgeText = (p) => `${ESTADOS[p.estado]} · ${p.remitente} → ${p.destinatario}`;

/* ---------- actividad: últimos cambios de todos los paquetes ---------- */
async function vistaActividad() {
  layout({ eyebrow: 'Movimientos', titulo: 'Actividad', sub: 'Los últimos cambios de tus paquetes.', tab: 'actividad', contenido: '<p class="empty glass">Cargando…</p>' });
  let r;
  try { r = await llamar('/eventos'); } catch { return error('No se pudo conectar con la API.'); }
  const eventos = r.data || [];
  const main = $app.querySelector('main');
  if (!eventos.length) { main.innerHTML = '<p class="empty glass">Aún no hay actividad. Los cambios de estado aparecerán aquí.</p>'; return; }
  const dias = [];
  for (const e of eventos) {
    const k = diaClave(e.ocurrido_en);
    if (!dias.length || dias[dias.length - 1].k !== k) dias.push({ k, titulo: diaTexto(e.ocurrido_en), items: [] });
    dias[dias.length - 1].items.push(e);
  }
  main.innerHTML = dias.map((d) => `<section class="dia"><h2>${esc(d.titulo)}</h2><ul class="feed">${d.items.map((e) => {
    const nombre = e.direccion === 'enviado' ? e.destinatario : e.remitente;
    return `<li><a class="glass act e-${e.estado}" href="#/paquete/${e.paquete_id}">
      <span class="d"></span>
      <div><b>${esc(nombre)}</b><span>${esc(e.detalle || ESTADOS[e.estado] || e.estado)}</span></div>
      ${badge(e.estado)}<time datetime="${esc(e.ocurrido_en)}">${esc(hora(e.ocurrido_en))}</time></a></li>`;
  }).join('')}</ul></section>`).join('');
}

/* ---------- ajustes: notificaciones ---------- */
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function claveAUint8(base64) {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Estado de las notificaciones en este dispositivo. */
async function estadoPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { tipo: esIOS() && !instalada() ? 'ios' : 'no-soportado' };
  }
  const r = await llamar('/push');
  const clave = r.data?.clave;
  if (!clave) return { tipo: 'sin-servidor' };
  if (Notification.permission === 'denied') return { tipo: 'bloqueado' };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return { tipo: sub && Notification.permission === 'granted' ? 'activo' : 'inactivo', clave, reg, sub };
}

const MENSAJES_PUSH = {
  'no-soportado': 'Este navegador no admite notificaciones push.',
  ios: 'En iPhone y iPad hay que instalar la app primero: pulsa Compartir y luego «Añadir a pantalla de inicio». Después ábrela desde el icono y vuelve aquí.',
  'sin-servidor': 'El servidor aún no tiene las claves de notificaciones configuradas.',
  bloqueado: 'Has bloqueado las notificaciones de este sitio. Actívalas en los ajustes del navegador y recarga.',
  inactivo: 'Recibe un aviso cuando un paquete cambie de estado (sale a reparto, está listo para recoger, se entrega o tiene una incidencia).',
  activo: 'Notificaciones activadas en este dispositivo.',
};

async function pintarPush() {
  const caja = document.getElementById('push');
  if (!caja) return;
  let e;
  try { e = await estadoPush(); } catch { caja.innerHTML = '<p class="muted">No se pudo comprobar el estado de las notificaciones.</p>'; return; }
  const activo = e.tipo === 'activo';
  caja.innerHTML = `<p class="${activo ? 'ok' : 'muted'}">${esc(MENSAJES_PUSH[e.tipo])}</p>
    <div class="actions">
      ${e.tipo === 'inactivo' ? '<button class="btn blue" id="push-on" type="button">Activar notificaciones</button>' : ''}
      ${activo ? '<button class="btn blue" id="push-test" type="button">Enviar prueba</button><button class="btn ghost-d" id="push-off" type="button">Desactivar</button>' : ''}
    </div>`;
  const pulsar = (id, fn) => document.getElementById(id)?.addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try { await fn(e); } catch (err) { toast(err.message || 'No se pudo completar la acción', true); }
    pintarPush();
  });
  pulsar('push-on', async (est) => {
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('No has dado permiso para las notificaciones');
    const sub = await est.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAUint8(est.clave) });
    const r = await llamar('/push', { method: 'POST', body: sub.toJSON() });
    if (r.code >= 400) { await sub.unsubscribe(); throw new Error(r.message); }
    toast('Notificaciones activadas');
  });
  pulsar('push-off', async (est) => {
    await llamar('/push', { method: 'DELETE', body: { endpoint: est.sub.endpoint } });
    await est.sub.unsubscribe();
    toast('Notificaciones desactivadas');
  });
  pulsar('push-test', async () => {
    const r = await llamar('/push/prueba', { method: 'POST' });
    if (r.code >= 400) throw new Error(r.message);
    toast(r.data?.enviados ? 'Prueba enviada' : r.message);
  });
}

function vistaAjustes() {
  layout({
    eyebrow: 'Preferencias', titulo: 'Ajustes', sub: 'Avisos e instalación de la app.', tab: 'ajustes',
    contenido: `<div class="grid2 ajustes">
      <section class="glass card" aria-label="Notificaciones"><h2>${ICON.aviso}Notificaciones</h2><div id="push"><p class="muted">Comprobando…</p></div></section>
      <section class="glass card" aria-label="Instalación"><h2>${ICON.caja}Instalar la app</h2>
        <p class="muted">${instalada() ? 'Ya la estás usando como app instalada.' : 'Instálala desde el menú del navegador («Instalar app» o «Añadir a pantalla de inicio») para abrirla como una app y recibir avisos también en el móvil.'}</p>
      </section></div>`,
  });
  pintarPush();
}

/* ---------- alta / edición ---------- */
async function vistaFormulario(id) {
  let p = { remitente: '', destinatario: '', peso: '', estado: 'pendiente', fecha: new Date().toISOString().slice(0, 10), numero_seguimiento: '', paqueteria: '', direccion: 'recibido' };
  if (id) {
    try {
      const r = await api('/' + id);
      if (r.code !== 200) return error(r.message);
      p = r.data;
    } catch { return error('No se pudo conectar con la API.'); }
  }
  const campo = (name, label, type = 'text', extra = '') => `<div class="field" data-f="${name}">
    <label for="f-${name}">${label}</label>
    <input id="f-${name}" name="${name}" type="${type}" value="${esc(name === 'peso' && p.peso != null ? String(p.peso).replace('.', ',') : p[name] ?? '')}" ${extra}><div class="err" role="alert"></div></div>`;
  const select = (name, label, opts) => `<div class="field" data-f="${name}"><label for="f-${name}">${label}</label>
    <select id="f-${name}" name="${name}">${Object.entries(opts).map(([k, v]) => `<option value="${k}" ${p[name] === k ? 'selected' : ''}>${v}</option>`).join('')}</select><div class="err" role="alert"></div></div>`;

  layout({
    eyebrow: id ? 'Editar' : 'Nuevo', titulo: id ? `Editar paquete #${id}` : 'Nuevo paquete',
    volver: [id ? '#/paquete/' + id : '#/', 'Cancelar'],
    contenido: `<section class="glass card narrow"><form class="f" novalidate>
        <div class="two">${campo('remitente', 'Remitente', 'text', 'placeholder="Nombre o tienda" required maxlength="120"')}
        ${campo('destinatario', 'Destinatario', 'text', 'placeholder="Nombre del destinatario" required maxlength="120"')}</div>
        <div class="two">${select('direccion', 'Tipo', { recibido: 'Recibido', enviado: 'Enviado por mí' })}
        ${select('estado', 'Estado', ESTADOS)}</div>
        <div class="two">${campo('peso', 'Peso (kg)', 'text', 'inputmode="decimal" placeholder="0,0"')}
        ${campo('fecha', 'Fecha', 'date')}</div>
        <div class="two">${campo('paqueteria', 'Paquetería (opcional)', 'text', 'placeholder="Correos, GLS, InPost…" maxlength="60"')}
        ${campo('numero_seguimiento', 'Nº de seguimiento (opcional)', 'text', 'maxlength="60"')}</div>
        <div class="actions"><button class="btn blue" type="submit">${id ? 'Guardar cambios' : 'Crear paquete'}</button></div>
      </form></section>`,
  });

  const form = $app.querySelector('form');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('bad'); f.querySelector('.err').textContent = ''; });
    const body = Object.fromEntries(new FormData(form));
    try {
      const r = await api(id ? '/' + id : '', { method: id ? 'PUT' : 'POST', body });
      if (r.code === 422) {
        for (const [k, msg] of Object.entries(r.data)) {
          const f = form.querySelector(`[data-f="${k}"]`);
          if (f) { f.classList.add('bad'); f.querySelector('.err').textContent = msg; }
        }
        return toast('Revisa los campos marcados', true);
      }
      if (r.code >= 400) return toast(r.message, true);
      toast(id ? 'Cambios guardados' : 'Paquete creado');
      location.hash = '#/paquete/' + r.data.id;
    } catch { toast('No se pudo conectar con la API', true); }
  });
}

function error(msg) {
  layout({ eyebrow: 'Vaya', titulo: 'Algo no ha ido bien', tab: '', contenido: `<p class="empty glass">${esc(msg)}</p><p class="count"><a href="#/">Volver al listado</a></p>` });
}

/* ---------- router ---------- */
function router() {
  const [, ruta, id] = location.hash.slice(1).split('/');
  if (ruta === 'paquete' && /^\d+$/.test(id)) return vistaDetalle(id);
  if (ruta === 'actividad') return vistaActividad();
  if (ruta === 'ajustes') return vistaAjustes();
  if (ruta === 'nuevo') return vistaFormulario();
  if (ruta === 'editar' && /^\d+$/.test(id)) return vistaFormulario(id);
  return vistaListado();
}
window.addEventListener('hashchange', router);
router();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
