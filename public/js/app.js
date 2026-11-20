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
const AVATARES = ['#C8501A', '#B7791F', '#2F63B8', '#1F7A74', '#2E7D4F', '#8A4F7D', '#6B6B3A'];
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
  sol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  luna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>',
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

/* ---------- tema (claro/oscuro) y paleta ---------- */
const guardado = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const prefiereOscuro = () => matchMedia('(prefers-color-scheme: dark)').matches;
const esOscuro = () => document.documentElement.dataset.tema === 'oscuro';

function aplicarTema() {
  const modo = guardado('tema', 'auto');
  const root = document.documentElement;
  root.dataset.tema = modo === 'oscuro' || (modo === 'auto' && prefiereOscuro()) ? 'oscuro' : 'claro';
  // La barra de estado del móvil toma el color de la cabecera.
  const color = getComputedStyle(root).getPropertyValue('--head-bg').trim();
  if (color) document.querySelector('meta[name=theme-color]')?.setAttribute('content', color);
  const boton = document.getElementById('tema');
  if (boton) { boton.innerHTML = esOscuro() ? ICON.sol : ICON.luna; boton.setAttribute('aria-label', esOscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); }
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('#tema')) return;
  guardar('tema', esOscuro() ? 'claro' : 'oscuro');
  aplicarTema();
});

/* ---------- Hubi en la cabecera: cada vez que se abre el listado sale una pose distinta (nunca la misma dos veces seguidas) ---------- */
const POSES_HUBI = { tranquilo: [192, 420], senalando: [268, 420], saluda: [261, 420], pulgar: [232, 420], gorra: [322, 420], feliz: [284, 420], sorprendido: [220, 420], enfadado: [215, 420] };
// Pose de Hubi en el detalle de un paquete, según su estado: [nombre del archivo, ancho, alto].
const POSES_ESTADO = {
  pendiente: ['reloj', 211, 420],
  en_reparto: ['bici', 254, 420],
  listo_para_recoger: ['taquilla', 328, 420],
  entregado: ['entregado', 311, 420],
  incidencia: ['incidencia', 296, 420],
};
const ALTO_HUBI_MOVIL = { rotacion: 108, estado: 128 }; // px; deben coincidir con .hubi y .hubi.estado en app.css
/** Archivo, ancho y alto de la pose: «estado:<estado>» para el detalle, o el nombre de una pose de la rotación. */
function medidasHubi(pose) {
  if (pose.startsWith('estado:')) return POSES_ESTADO[pose.slice(7)];
  return [pose, ...POSES_HUBI[pose]];
}
function elegirHubi() {
  const anterior = guardado('hubi', '');
  const candidatas = Object.keys(POSES_HUBI).filter((n) => n !== anterior);
  const nombre = candidatas[Math.floor(Math.random() * candidatas.length)];
  guardar('hubi', nombre);
  return nombre;
}

/** Confeti corto en la cabecera de un paquete entregado. Solo con movimiento permitido; dura unos 3 s y se borra. */
function lanzarConfeti() {
  const caja = document.querySelector('.confeti');
  if (!caja || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colores = ['#E8663A', '#F0B64E', '#F7F0E3', '#C98A4B'];
  caja.innerHTML = Array.from({ length: 26 }, (_, i) => {
    const x = Math.round(Math.random() * 100), r = Math.round(Math.random() * 360);
    const retraso = (Math.random() * 0.9).toFixed(2), dur = (1.8 + Math.random() * 1.4).toFixed(2);
    const ancho = 5 + Math.round(Math.random() * 5);
    return `<i style="left:${x}%;width:${ancho}px;height:${Math.round(ancho * 1.6)}px;background:${colores[i % colores.length]};--r:${r}deg;animation-delay:${retraso}s;animation-duration:${dur}s"></i>`;
  }).join('');
  setTimeout(() => caja.replaceChildren(), 4200);
}

/* ---------- estructura común ---------- */
const MARCA = '<svg viewBox="0 0 1210 1000" aria-hidden="true"><path class="l2" d="M1208 1H924L853 232L1027 212L1036 217L889 487L882 485L859 378L404 670L750 561L615 998H899Z"/><path class="l1" d="M1024 215L737 247L826 316L462 439L595 1H312L60 804L790 340L843 341Z"/><path class="l1" d="M380 687L48 842L0 998H283Z"/></svg>';
const TABS = [
  ['paquetes', '#/', 'Paquetes', ICON.caja],
  ['actividad', '#/actividad', 'Actividad', ICON.actividad],
  ['ajustes', '#/ajustes', 'Ajustes', ICON.ajustes],
];
const tabsHTML = (activa, lugar) => `<nav class="tabs tabs-${lugar}" aria-label="Secciones">${TABS.map(([id, href, nombre, icono]) =>
  `<a href="${href}" ${id === activa ? 'aria-current="page"' : ''}>${icono}<span>${nombre}</span></a>`).join('')}</nav>`;

function layout({ eyebrow, titulo, sub, accion, volver, contenido, tab = 'paquetes', compacto = false, mascota = false }) {
  // mascota: true = una pose de la rotación (listado); 'estado:<estado>' = la pose de ese estado (detalle).
  const hubi = mascota === true ? elegirHubi() : mascota || null;
  const medidas = hubi ? medidasHubi(hubi.startsWith('estado:') ? hubi : hubi) : null;
  const esEstado = Boolean(hubi && hubi.startsWith('estado:'));
  const altoMovil = esEstado ? ALTO_HUBI_MOVIL.estado : ALTO_HUBI_MOVIL.rotacion;
  $app.innerHTML = `
    <header class="hero${compacto ? ' compacto' : ''}${hubi ? ' conhubi' : ''}" ${hubi ? `style="--hubi-w:${Math.round(altoMovil * medidas[1] / medidas[2])}px"` : ''}><div class="wrap">
      <div class="top">
        <a class="brand" href="#/" aria-label="HubToHub, inicio"><span class="marca">${MARCA}</span><span>Hub<b>To</b>Hub</span></a>
        <div class="top-right">${tabsHTML(tab, 'top')}<button class="tema" id="tema" type="button"></button></div>
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
    </div>${hubi ? `<img class="hubi${esEstado ? ' estado' : ''}" src="/img/hubi/hubi-${medidas[0]}.webp" alt="" width="${medidas[1]}" height="${medidas[2]}">` : ''}${hubi === 'estado:entregado' ? '<div class="confeti" aria-hidden="true"></div>' : ''}</header>
    <main>${contenido}</main>
    ${tabsHTML(tab, 'bottom')}`;
  if (hubi === 'estado:entregado') lanzarConfeti();
  document.title = `${titulo} · HubToHub`;
  aplicarTema();
  window.scrollTo(0, 0);
}

/* ---------- listado ---------- */
async function vistaListado() {
  layout({
    eyebrow: 'Panel de envíos', titulo: 'Paquetes', sub: 'Todo lo que compras, recoges y envías.', mascota: true,
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
    ['pendiente', 'Pendientes', cuenta('pendiente')],
    ['en_reparto', 'En reparto', cuenta('en_reparto')],
    ['listo_para_recoger', 'Para recoger', cuenta('listo_para_recoger')],
    ['entregado', 'Entregados', cuenta('entregado')],
    ['incidencia', 'Incidencias', cuenta('incidencia')],
  ];
  main.innerHTML = `
    <section class="stats" aria-label="Resumen">
      ${stats.map(([e, l, n]) => `<button type="button" class="stat ${e ? 'e-' + e : 's-total'}" data-e="${e}" aria-pressed="${state.filtro === e}"><span>${l}</span><b>${n}</b></button>`).join('')}
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
    main.querySelectorAll('.chip, .stat').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.e === state.filtro)));
  };
  document.getElementById('q').addEventListener('input', (e) => { state.q = e.target.value; pintar(); });
  // Las casillas de resumen (escritorio) y los filtros (móvil) hacen lo mismo; pulsar la casilla activa vuelve a mostrar todo.
  main.addEventListener('click', (e) => {
    const b = e.target.closest('.chip, .stat');
    if (!b) return;
    state.filtro = b.classList.contains('stat') && b.dataset.e && b.dataset.e === state.filtro ? '' : b.dataset.e;
    pintar();
  });
  pintar();
}

function filaHTML(p, i) {
  const contraparte = p.direccion === 'enviado' ? `Para ${p.destinatario}` : `De ${p.remitente}`;
  const nombre = p.direccion === 'enviado' ? p.destinatario : p.remitente;
  return `<li><a class="glass row" href="#/paquete/${p.id}">
    <div class="avatar" style="--c:${AVATARES[p.id % AVATARES.length]}" aria-hidden="true">${esc(iniciales(nombre))}</div>
    <div class="who">${esc(nombre)}<small>#${p.id}</small></div>
    ${badge(p.estado)}
    <div class="meta">${p.direccion === 'enviado' ? 'Enviado' : 'Recibido'} · ${fechaES(p.fecha)}${p.paqueteria ? ' · ' + esc(p.paqueteria) : ''}</div>
    <div class="extra peso">${pesoES(p.peso)} kg</div>
    <div class="extra seg">${esc(p.numero_seguimiento || 'Sin seguimiento')}</div>
  </a></li>`;
}

/* ---------- seguimiento: la línea avanza según la etapa de la entrega ---------- */
const CORTO = { pendiente: 'Pendiente', en_reparto: 'En reparto', listo_para_recoger: 'Para recoger', entregado: 'Entregado', incidencia: 'Incidencia' };

/** Etapas del recorrido: son las mismas en todos los paquetes, sea cual sea su estado. */
const ETAPAS = ['pendiente', 'en_reparto', 'listo_para_recoger', 'entregado'];
const etapasDe = () => ETAPAS;

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
    eyebrow: p.direccion === 'enviado' ? 'Envío' : 'Recepción', titulo: `Paquete #${p.id}`, sub: badgeText(p), volver: ['#/', 'Listado'], mascota: `estado:${p.estado}`,
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
      <section class="glass card" aria-label="Apariencia"><h2>${ICON.sol}Apariencia</h2>
        <p class="muted">Elige el tema de la app.</p>
        <div class="seg" data-ajuste="tema">${[['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${guardado('tema', 'auto') === k}">${v}</button>`).join('')}</div>
      </section>
      <section class="glass card" aria-label="Instalación"><h2>${ICON.caja}Instalar la app</h2>
        <p class="muted">${instalada() ? 'Ya la estás usando como app instalada.' : 'Instálala desde el menú del navegador («Instalar app» o «Añadir a pantalla de inicio») para abrirla como una app y recibir avisos también en el móvil.'}</p>
      </section></div>`,
  });
  pintarPush();
  $app.querySelectorAll('.seg').forEach((seg) => seg.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    guardar(seg.dataset.ajuste, b.dataset.v);
    aplicarTema();
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
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
