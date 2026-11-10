// Velox Play — frontend
// Diseño paginado (prohibido leer todo de golpe): cada fila pide su ventana
// con Range HTTP, carga la siguiente página al acercarte al final del scroll.

const CFG = window.VELOX_CONFIG || {};
const SB = CFG.SUPABASE_URL;
const KEY = CFG.SUPABASE_KEY;
const PAGE_SIZE = CFG.PAGE_SIZE || 20;
const HERO_POOL = CFG.HERO_POOL || 10;

if (!SB || !KEY) {
  document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#fff">Falta <code>js/config.js</code>. Copia <code>config.example.js</code> y rellena las credenciales.</div>';
  throw new Error('Config missing');
}


// ─── Escapado anti-XSS: todo dato que viene de la BD pasa por esc() antes de innerHTML ───
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));
}
// URL segura para style.backgroundImage = `url("...")` (solo http/https).
function cssUrl(u) {
  u = String(u || '');
  if (!/^https?:\/\//i.test(u)) return '';
  return u.replace(/["'()\s\\]/g, c => encodeURIComponent(c));
}

// ─────────────── Supabase REST helper ───────────────
async function sbGet(path, { desde = 0, hasta = PAGE_SIZE - 1 } = {}) {
  const url = `${SB}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Range-Unit': 'items',
      Range: `${desde}-${hasta}`,
      Accept: 'application/json',
      Prefer: 'count=exact'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

async function cargarPagina(vista, { filtro = '', pagina = 1 } = {}) {
  const tabla = vista === 'series' ? 'v_series_lista' : 'v_pelis_lista';
  const q = filtro ? `?select=*&${filtro}` : '?select=*';
  const desde = (pagina - 1) * PAGE_SIZE;
  const hasta = desde + PAGE_SIZE - 1;
  return sbGet(`${tabla}${q}`, { desde, hasta });
}

// ─────────────── Utilidades de UI ───────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const toast = (msg, ms = 2400) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-visible');
  setTimeout(() => t.classList.remove('is-visible'), ms);
};

// ─────────────── Tarjeta ───────────────
// URL de la ficha: detalles.html?id=<id>&tipo=pelicula|serie
function urlDetalle(id, esSerie) {
  return `detalles.html?id=${encodeURIComponent(id)}&tipo=${esSerie ? 'serie' : 'pelicula'}`;
}
function tarjetaHTML(item) {
  const title = item.titulo || 'Sin título';
  const poster = item.poster_url || item.backdrop_url || '';
  const anio = item.anio || '';
  const badges = [];
  if (item.es_cam) badges.push('<span class="badge badge--cam">Cam</span>');
  if (item.episodio_nuevo || item.temporada_nueva) badges.push('<span class="badge badge--new">Nuevo</span>');
  // Enlace real (sin JS y para SEO) hacia la ficha nueva.
  return `
    <a class="card" href="${urlDetalle(item.id, item.es_serie)}" data-id="${esc(item.id)}" data-serie="${!!item.es_serie}" aria-label="${esc(title)}${anio ? ' (' + esc(anio) + ')' : ''}">
      <img class="card__poster" loading="lazy" decoding="async" width="300" height="450" src="${esc(poster)}" alt="Póster de ${esc(title)}" data-hide-on-error />
      <div class="card__badges">${badges.join('')}</div>
      <div class="card__fade"></div>
      <div class="card__info">
        <div class="card__title">${esc(title)}</div>
        <div class="card__sub">${esc(anio)}</div>
      </div>
    </a>
  `;
}
function skeletonHTML() {
  return '<div class="card skeleton"></div>';
}

// ─────────────── Fila paginada ───────────────
function crearFila({ titulo, vista, filtro = '' }) {
  const wrap = document.createElement('section');
  wrap.className = 'row';
  wrap.innerHTML = `
    <header class="row__header">
      <h2 class="row__title">${esc(titulo)}</h2>
      <span class="row__count" aria-live="polite"></span>
    </header>
    <div class="row__scroller" role="list">
      ${Array(PAGE_SIZE).fill(skeletonHTML()).join('')}
    </div>
  `;
  const scroller = $('.row__scroller', wrap);
  const count = $('.row__count', wrap);
  let pagina = 1;
  let cargando = false;
  let hayMas = true;
  let total = 0;

  async function pedir() {
    if (cargando || !hayMas) return;
    cargando = true;
    try {
      const items = await cargarPagina(vista, { filtro, pagina });
      if (pagina === 1) scroller.innerHTML = '';
      if (items.length === 0 && pagina === 1) {
        scroller.innerHTML = '<div style="color:var(--text-fade);font-size:13px;padding:14px">Sin títulos todavía.</div>';
        hayMas = false;
        return;
      }
      for (const it of items) scroller.insertAdjacentHTML('beforeend', tarjetaHTML({ ...it, es_serie: vista === 'series' }));
      total += items.length;
      count.textContent = `(${total})`;
      hayMas = items.length >= PAGE_SIZE;
    } catch (e) {
      console.error('[fila]', titulo, e);
      scroller.innerHTML = '<div style="color:var(--text-fade);font-size:13px;padding:14px">No se pudo cargar.</div>';
      hayMas = false;
    } finally {
      cargando = false;
    }
  }

  // Scroll horizontal → cargar siguiente página cerca del final
  scroller.addEventListener('scroll', () => {
    const cerca = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 600;
    if (cerca && hayMas && !cargando) { pagina += 1; pedir(); }
  }, { passive: true });

  pedir();
  return wrap;
}

// ─────────────── Vistas ───────────────
function definirFilas(vista) {
  if (vista === 'series') {
    return [
      { titulo: 'Nuevas temporadas', vista: 'series', filtro: 'temporada_nueva=eq.true' },
      { titulo: 'Nuevos episodios', vista: 'series', filtro: 'episodio_nuevo=eq.true' },
      { titulo: 'Series', vista: 'series' }
    ];
  }
  if (vista === 'peliculas') {
    return [
      { titulo: 'Estrenos', vista: 'peliculas' },
      { titulo: 'En cines (CAM)', vista: 'peliculas', filtro: 'es_cam=eq.true' }
    ];
  }
  // inicio
  return [
    { titulo: 'Películas recientes', vista: 'peliculas' },
    { titulo: 'Series recientes', vista: 'series' },
    { titulo: 'Nuevos episodios', vista: 'series', filtro: 'episodio_nuevo=eq.true' }
  ];
}

async function pintarVista(vista) {
  const rows = $('#rows');
  rows.innerHTML = '';
  const filas = definirFilas(vista);
  for (const f of filas) rows.appendChild(crearFila(f));
  // marcar nav activo
  $$('.nav__link').forEach(a => a.classList.toggle('is-active', a.dataset.view === vista));
}

// ─────────────── Hero ───────────────
let heroActual = null;
async function pintarHero() {
  try {
    const pool = await cargarPagina('peliculas', { pagina: 1 });
    const candidatos = pool.slice(0, HERO_POOL);
    if (!candidatos.length) return;
    const item = candidatos[Math.floor(Math.random() * candidatos.length)];
    heroActual = item;
    const bg = $('#hero-bg');
    const url = item.backdrop_url || item.poster_url;
    if (url) {
      const img = new Image();
      img.onload = () => { bg.style.backgroundImage = `url("${cssUrl(url)}")`; bg.classList.add('is-ready'); };
      img.src = url;
    }
    $('#hero-pill').textContent = 'Destacado';
    $('#hero-title').textContent = item.titulo || 'Velox Play';
    $('#hero-meta').textContent = [item.anio, item.calificacion && `★ ${item.calificacion}`].filter(Boolean).join(' · ');
    $('#hero-text').textContent = item.sinopsis || 'Disfruta del catálogo completo en audio Latino.';
    $('#hero-btn').href = urlDetalle(item.id, false);
  } catch (e) {
    console.warn('[hero]', e);
  }
}

// ─────────────── Resultados de ?q= (el desplegable lo maneja js/buscador.js) ───────────────
async function pintarResultadosBusqueda(q) {
  const rows = $('#rows');
  rows.innerHTML = `<section class="row"><header class="row__header"><h2 class="row__title">Resultados: "${esc(q)}"</h2></header><div class="row__scroller">${Array(5).fill(skeletonHTML()).join('')}</div></section>`;
  const scroller = $('.row__scroller', rows);
  try {
    // Año de 4 dígitos → anio=eq; si no, título o género (igual que buscador.js)
    const limpio = q.replace(/[(),*{}"]/g, ' ').trim();
    const genero = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
    const filtro = /^\d{4}$/.test(q)
      ? `anio=eq.${q}`
      : `or=${encodeURIComponent(`(titulo.ilike.*${limpio}*,generos.cs.{${genero}})`)}`;
    const [pelis, series] = await Promise.all([
      sbGet(`v_pelis_lista?select=*&${filtro}`, { desde: 0, hasta: 24 }),
      sbGet(`v_series_lista?select=*&${filtro}`, { desde: 0, hasta: 24 })
    ]);
    const todos = [
      ...pelis.map(p => ({ ...p, es_serie: false })),
      ...series.map(s => ({ ...s, es_serie: true }))
    ];
    if (!todos.length) { scroller.innerHTML = '<div style="color:var(--text-fade);font-size:13px;padding:14px">Sin resultados.</div>'; return; }
    scroller.innerHTML = todos.map(tarjetaHTML).join('');
  } catch (e) {
    console.error('[buscar]', e);
    scroller.innerHTML = '<div style="color:var(--text-fade);font-size:13px;padding:14px">Error en la búsqueda.</div>';
  }
}

// ─────────────── Routing simple por hash ───────────────
function routear() {
  const h = (location.hash || '#inicio').replace('#', '');
  const vista = (h === 'peliculas' || h === 'series') ? h : 'inicio';
  pintarVista(vista);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────── Init ───────────────
function init() {
  // Topbar scroll
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('topbar--scrolled', window.scrollY > 4);
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // El menú hamburguesa lo maneja solo js/ui.js.
  $$('.nav__link').forEach(a => a.addEventListener('click', () => setTimeout(routear, 0)));
  window.addEventListener('hashchange', routear);

  // Formulario de reporte: se guarda en la tabla `reportes` de Supabase
  // (anon solo puede INSERT, ver migrations/rls_hardening.sql). Un Database
  // Webhook + Edge Function `reporte-telegram` reenvía al bot desde el
  // servidor: el token de Telegram NUNCA está en el navegador.
  window.VeloxReportar = async function (ev) {
    ev.preventDefault();
    const t = document.getElementById('r-titulo').value.trim().slice(0, 200);
    const m = document.getElementById('r-motivo').value.trim().slice(0, 100);
    const d = document.getElementById('r-detalle').value.trim().slice(0, 2000);
    if (!t || !m) return false;

    const btn = ev.submitter || document.querySelector('.reportar button[type="submit"]');
    if (btn) { btn.disabled = true; }
    try {
      const r = await fetch(`${SB}/rest/v1/reportes`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          titulo: t,
          motivo: m,
          detalle: d || null,
          url: location.href.slice(0, 500)
        })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      toast('¡Gracias! Reporte enviado.');
      try { document.querySelector('.reportar').reset(); } catch {}
    } catch (e) {
      console.error('[reporte]', e);
      toast('No se pudo enviar. Intenta de nuevo.');
    } finally {
      if (btn) btn.disabled = false;
    }
    return false;
  };

  // Query buscar via URL (?q=…): se pintan resultados en lugar de las filas normales
  // (antes routear() borraba los resultados justo después de pedirlos).
  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim();
  pintarHero();
  if (q) { $('#q').value = q; pintarResultadosBusqueda(q); }
  else routear();

  // Enlaces antiguos #det=peli:ID / #det=serie:ID → nueva ficha detalles.html
  function abrirDesdeHash() {
    const m = /det=(peli|serie):(.+)/.exec(location.hash || '');
    if (m) location.replace(urlDetalle(decodeURIComponent(m[2]), m[1] === 'serie'));
  }
  abrirDesdeHash();
  window.addEventListener('hashchange', abrirDesdeHash);
}
init();
