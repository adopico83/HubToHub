/* HubToHub · interfaz (JS sin framework). Rutas con hash: #/ · #/paquete/3 · #/nuevo · #/editar/3 */
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
const badge = (e) => `<span class="badge e-${e}">${ESTADOS[e] || esc(e)}</span>`;
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
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
async function api(path = '', options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return { code: 204, data: null };
  return res.json();
}

/* ---------- estructura común ---------- */
function layout({ eyebrow, titulo, sub, accion, volver, contenido }) {
  $app.innerHTML = `
    <header class="hero"><div class="wrap">
      <div class="top">
        <a class="brand" href="#/" aria-label="HubToHub, inicio"><img src="/img/logo-icono.svg" alt=""><span>Hub<b>To</b>Hub</span></a>
        ${volver ? `<a class="back" href="${volver[0]}">← ${volver[1]}</a>` : ''}
      </div>
      <div class="hero-row">
        <div>
          <p class="eyebrow">${esc(eyebrow)}</p>
          <h1>${esc(titulo)}</h1>
          ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
        </div>
        ${accion || ''}
      </div>
    </div></header>
    <main>${contenido}</main>`;
  document.title = `${titulo} · HubToHub`;
  window.scrollTo(0, 0);
}

/* ---------- listado ---------- */
async function vistaListado() {
  layout({
    eyebrow: 'Panel de envíos', titulo: 'Paquetes', sub: 'Todo lo que compras, recoges y envías.',
    accion: `<a class="btn" href="#/nuevo">${ICON.plus}Nuevo paquete</a>`,
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
        ${[['', 'Todos'], ...Object.entries(ESTADOS)].map(([k, v]) => `<button type="button" class="chip" data-e="${k}" aria-pressed="${state.filtro === k}">${v}</button>`).join('')}
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

/* ---------- detalle ---------- */
async function vistaDetalle(id) {
  layout({ eyebrow: 'Detalle', titulo: `Paquete #${id}`, contenido: '<p class="empty glass">Cargando…</p>' });
  let r;
  try { r = await api('/' + id); } catch { return error('No se pudo conectar con la API.'); }
  if (r.code !== 200) return error(r.message);
  const p = r.data;

  // Línea de seguimiento: solo muestra "listo para recoger" si es o fue ese estado.
  const camino = ['pendiente', 'en_reparto', ...(p.estado === 'listo_para_recoger' ? ['listo_para_recoger'] : []), 'entregado'];
  const actual = p.estado === 'incidencia' ? 1 : camino.indexOf(p.estado);
  const pasos = camino.map((e, i) => {
    const hecho = i <= actual && !(p.estado === 'incidencia' && i > 1);
    const ahora = i === actual && p.estado !== 'incidencia';
    return `<li class="step e-${e} ${hecho ? 'done' : ''} ${ahora ? 'now' : ''}" ${ahora ? 'aria-current="step"' : ''}>
      <span class="dot">${hecho ? ICON.check : ''}</span>
      <div><b>${ESTADOS[e]}</b><span>${ahora ? 'Estado actual' : i === 0 ? 'Registrado el ' + fechaES(p.fecha) : hecho ? 'Completado' : 'Pendiente'}</span></div></li>`;
  });
  if (p.estado === 'incidencia') {
    pasos.splice(2, 0, `<li class="step e-incidencia done now" aria-current="step"><span class="dot">!</span>
      <div><b>Incidencia</b><span>Estado actual · revisa el envío</span></div></li>`);
  }

  layout({
    eyebrow: p.direccion === 'enviado' ? 'Envío' : 'Recepción', titulo: `Paquete #${p.id}`, sub: badgeText(p), volver: ['#/', 'Listado'],
    contenido: `
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
          <div class="actions">
            <a class="btn blue" href="#/editar/${p.id}">Editar</a>
            <button class="btn danger" id="del" type="button">Eliminar</button>
          </div>
        </section>
        <section class="glass card" aria-label="Seguimiento"><h2>Seguimiento</h2><ol class="steps">${pasos.join('')}</ol></section>
      </div>`,
  });
  document.getElementById('del').addEventListener('click', async () => {
    if (!confirm(`¿Eliminar el paquete #${p.id}?`)) return;
    await api('/' + p.id, { method: 'DELETE' });
    toast('Paquete eliminado');
    location.hash = '#/';
  });
}
const badgeText = (p) => `${ESTADOS[p.estado]} · ${p.remitente} → ${p.destinatario}`;

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
  layout({ eyebrow: 'Vaya', titulo: 'Algo no ha ido bien', contenido: `<p class="empty glass">${esc(msg)}</p><p class="count"><a href="#/">Volver al listado</a></p>` });
}

/* ---------- router ---------- */
function router() {
  const [, ruta, id] = location.hash.slice(1).split('/');
  if (ruta === 'paquete' && /^\d+$/.test(id)) return vistaDetalle(id);
  if (ruta === 'nuevo') return vistaFormulario();
  if (ruta === 'editar' && /^\d+$/.test(id)) return vistaFormulario(id);
  return vistaListado();
}
window.addEventListener('hashchange', router);
router();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
