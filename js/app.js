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

async function cargarDetallePeli(id) {
  const [row] = await sbGet(`peliculas?id=eq.${encodeURIComponent(id)}&select=*,pelicula_servidores(*)`, { desde: 0, hasta: 0 });
  return row || null;
}

async function cargarDetalleSerie(id) {
  // Pide la serie y sus temporadas/episodios/servidores en un solo request anidado.
  const body = await sbGet(`series?id=eq.${encodeURIComponent(id)}&select=*,temporadas(*,episodios(*,episodio_servidores(*)))`, { desde: 0, hasta: 0 });
  const row = body && body[0];
  if (!row) return null;
  return {
    serie: row,
    temporadas: (row.temporadas || []).sort((a, b) => (a.numero || 0) - (b.numero || 0))
  };
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

function hostDe(url) {
  try { return new URL(url).host.toLowerCase(); } catch { return ''; }
}
function colorPorHost(h) {
  if (!h) return '#E50914';
  if (/earnvid|ryderjet|vidhide|filelions|lulu|morenci|callistanise|dramiyos/.test(h)) return '#2ECC71';
  if (/streamwish|playerwish|awish|strwish|wishembed|premilkyway|hglink/.test(h)) return '#3498DB';
  if (/filemoon|moonplayer|kerapoxy/.test(h)) return '#F1C40F';
  if (/voe|tubelessceliolymph|robaltouphol/.test(h)) return '#9B59B6';
  if (/doodstream|dood\.|ds2play|d0000d/.test(h)) return '#E67E22';
  if (/mixdrop|mxdrop/.test(h)) return '#E91E63';
  if (/streamtape|stape/.test(h)) return '#1ABC9C';
  return '#E50914';
}
function nombreServidor(s, idx) {
  const base = (s.servidor || '')
    .replace(/\[|\]/g, ' ')
    .replace(/latino|castellano|español|subtitulado/gi, '')
    .trim();
  if (base) return `Servidor ${idx + 1} — ${base}`;
  const h = hostDe(s.url);
  const n = /earnvid|vidhide|morenci|callistanise|dramiyos/.test(h) ? 'Vidhide'
          : /streamwish|premilkyway|hglink/.test(h) ? 'Streamwish'
          : /filemoon/.test(h) ? 'Filemoon'
          : /voe/.test(h) ? 'Voe'
          : /doodstream|dood\./.test(h) ? 'Doodstream'
          : /mixdrop/.test(h) ? 'Mixdrop'
          : /streamtape|stape/.test(h) ? 'Streamtape'
          : (h || 'Servidor');
  return `Servidor ${idx + 1} — ${n}`;
}

function anchor(id) { return location.hash = id ? `#${id}` : ''; }

// ─────────────── Tarjeta ───────────────
function tarjetaHTML(item) {
  const title = item.titulo || 'Sin título';
  const poster = item.poster_url || item.backdrop_url || '';
  const anio = item.anio || '';
  const badges = [];
  if (item.es_top) badges.push('<span class="badge badge--top">Top</span>');
  if (item.es_cam) badges.push('<span class="badge badge--cam">Cam</span>');
  if (item.episodio_nuevo || item.temporada_nueva) badges.push('<span class="badge badge--new">Nuevo</span>');
  return `
    <article class="card" data-id="${item.id}" data-serie="${!!item.es_serie}" tabindex="0" role="button" aria-label="${title}">
      <img class="card__poster" loading="lazy" decoding="async" src="${poster}" alt="${title}" onerror="this.style.visibility='hidden'" />
      <div class="card__badges">${badges.join('')}</div>
      <div class="card__fade"></div>
      <div class="card__info">
        <div class="card__title">${title}</div>
        <div class="card__sub">${anio}</div>
      </div>
    </article>
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
      <h2 class="row__title">${titulo}</h2>
      <span class="row__count" aria-live="polite"></span>
    </header>
    <div class="row__scroller" role="list">
      ${Array(6).fill(skeletonHTML()).join('')}
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

  // Click → abrir detalle
  scroller.addEventListener('click', (ev) => {
    const card = ev.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const esSerie = card.dataset.serie === 'true';
    abrirDetalle(id, esSerie);
  });

  pedir();
  return wrap;
}

// ─────────────── Vistas ───────────────
function definirFilas(vista) {
  if (vista === 'series') {
    return [
      { titulo: 'Top', vista: 'series', filtro: 'es_top=eq.true' },
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
      img.onload = () => { bg.style.backgroundImage = `url("${url}")`; bg.classList.add('is-ready'); };
      img.src = url;
    }
    $('#hero-pill').textContent = item.es_top ? 'Top' : 'Destacado';
    $('#hero-title').textContent = item.titulo || 'Velox Play';
    $('#hero-meta').textContent = [item.anio, item.calificacion && `★ ${item.calificacion}`].filter(Boolean).join(' · ');
    $('#hero-text').textContent = item.sinopsis || 'Disfruta del catálogo completo en audio Latino.';
    $('#hero-btn').onclick = () => abrirDetalle(item.id, false);
  } catch (e) {
    console.warn('[hero]', e);
  }
}

// ─────────────── Detalle ───────────────
function cerrarDetalle() { $('#detail').hidden = true; document.body.style.overflow = ''; }
async function abrirDetalle(id, esSerie) {
  const d = $('#detail');
  d.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#detail-servers').hidden = true;
  $('#detail-temporadas').hidden = true;
  $('#srv-grid').innerHTML = '';
  $('#episodios').innerHTML = '';
  $('#tabs').innerHTML = '';
  $('#detail-title').textContent = 'Cargando...';
  $('#detail-meta').textContent = '';
  $('#detail-sinopsis').textContent = '';
  $('#detail-hero').style.backgroundImage = '';

  try {
    if (esSerie) {
      const data = await cargarDetalleSerie(id);
      if (!data || !data.serie) { toast('No se encontró la serie'); cerrarDetalle(); return; }
      const s = data.serie;
      $('#detail-title').textContent = s.titulo;
      $('#detail-meta').innerHTML = [
        s.anio, s.calificacion && `★ ${s.calificacion}`, 'Serie'
      ].filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>');
      $('#detail-sinopsis').textContent = s.sinopsis || '';
      if (s.backdrop_url || s.poster_url) $('#detail-hero').style.backgroundImage = `url("${s.backdrop_url || s.poster_url}")`;

      // Temporadas
      $('#detail-temporadas').hidden = false;
      const temporadas = (data.temporadas || []).sort((a, b) => a.numero - b.numero);
      if (!temporadas.length) { $('#episodios').innerHTML = '<li style="color:var(--text-fade)">Sin episodios</li>'; return; }
      const tabs = $('#tabs');
      temporadas.forEach((t, i) => {
        const b = document.createElement('button');
        b.className = 'tab' + (i === 0 ? ' is-active' : '');
        b.textContent = `T${t.numero}`;
        b.onclick = () => { $$('.tab', tabs).forEach(x => x.classList.remove('is-active')); b.classList.add('is-active'); pintarEpisodios(t); };
        tabs.appendChild(b);
      });
      pintarEpisodios(temporadas[0]);
    } else {
      const row = await cargarDetallePeli(id);
      if (!row) { toast('No se encontró la película'); cerrarDetalle(); return; }
      $('#detail-title').textContent = row.titulo;
      $('#detail-meta').innerHTML = [
        row.anio, row.calificacion && `★ ${row.calificacion}`, 'Película'
      ].filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>');
      $('#detail-sinopsis').textContent = row.sinopsis || '';
      if (row.backdrop_url || row.poster_url) $('#detail-hero').style.backgroundImage = `url("${row.backdrop_url || row.poster_url}")`;
      const srvs = row.pelicula_servidores || [];
      if (srvs.length) {
        $('#detail-servers').hidden = false;
        $('#srv-grid').innerHTML = srvs.map((s, i) => botonServidorHTML(s, i)).join('');
        $('#srv-grid').addEventListener('click', onElegirServidor);
      }
    }
  } catch (e) {
    console.error('[detalle]', e);
    toast('Error cargando detalles');
    cerrarDetalle();
  }
}

function botonServidorHTML(s, i) {
  const col = colorPorHost(hostDe(s.url));
  const nombre = nombreServidor(s, i);
  const idioma = (s.idioma || '').slice(0, 10);
  return `
    <button class="srv" data-url="${s.url}" style="border-color:${col};background:${col}22">
      <span class="srv__dot" style="background:${col}"></span>
      <span class="srv__name">${nombre}</span>
      ${idioma ? `<span class="srv__lang" style="background:${col}44">${idioma}</span>` : ''}
    </button>
  `;
}

function onElegirServidor(ev) {
  const btn = ev.target.closest('.srv');
  if (!btn) return;
  const url = btn.dataset.url;
  if (!url) return;
  abrirPlayer(url);
}

function abrirPlayer(url) {
  const p = document.getElementById('player');
  const iframe = document.getElementById('player-iframe');
  iframe.src = url;
  p.hidden = false;
  document.body.style.overflow = 'hidden';
}
function cerrarPlayer() {
  const p = document.getElementById('player');
  const iframe = document.getElementById('player-iframe');
  iframe.src = 'about:blank';
  p.hidden = true;
  document.body.style.overflow = '';
}

function pintarEpisodios(temp) {
  const ol = $('#episodios');
  ol.innerHTML = '';
  const eps = (temp.episodios || []).sort((a, b) => (a.numero || 0) - (b.numero || 0));
  if (!eps.length) { ol.innerHTML = '<li style="color:var(--text-fade)">Sin episodios</li>'; return; }
  for (const ep of eps) {
    const servidores = ep.episodio_servidores || [];
    const tieneSrv = servidores.length > 0;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="ep-num">T${temp.numero}E${ep.numero}</span>
      <span class="ep-tit">${ep.titulo || `Episodio ${ep.numero}`}</span>
      ${tieneSrv ? `<span class="ep-badge">${servidores.length} srv</span>` : '<span class="ep-badge ep-badge--off">Sin servidor</span>'}
    `;
    if (tieneSrv) {
      li.onclick = () => {
        $('#detail-servers').hidden = false;
        $('#detail-servers').querySelector('h3').textContent = `Servidores — T${temp.numero}E${ep.numero}`;
        $('#srv-grid').innerHTML = servidores.map((s, i) => botonServidorHTML(s, i)).join('');
        $('#srv-grid').onclick = onElegirServidor;
        $('#detail-servers').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    }
    ol.appendChild(li);
  }
}

// ─────────────── Buscar ───────────────
window.VeloxBuscar = function (ev) {
  ev.preventDefault();
  const q = $('#q').value.trim();
  if (!q) return false;
  pintarResultadosBusqueda(q);
  return false;
};

async function pintarResultadosBusqueda(q) {
  const rows = $('#rows');
  rows.innerHTML = `<section class="row"><header class="row__header"><h2 class="row__title">Resultados: "${q}"</h2></header><div class="row__scroller">${Array(5).fill(skeletonHTML()).join('')}</div></section>`;
  const scroller = $('.row__scroller', rows);
  try {
    const safe = encodeURIComponent(q);
    const pelis = await sbGet(`v_pelis_lista?select=*&titulo=ilike.*${safe}*`, { desde: 0, hasta: 24 });
    const series = await sbGet(`v_series_lista?select=*&titulo=ilike.*${safe}*`, { desde: 0, hasta: 24 });
    const todos = [
      ...pelis.map(p => ({ ...p, es_serie: false })),
      ...series.map(s => ({ ...s, es_serie: true }))
    ];
    if (!todos.length) { scroller.innerHTML = '<div style="color:var(--text-fade);font-size:13px;padding:14px">Sin resultados.</div>'; return; }
    scroller.innerHTML = todos.map(tarjetaHTML).join('');
    scroller.addEventListener('click', (ev) => {
      const c = ev.target.closest('.card'); if (!c) return;
      abrirDetalle(c.dataset.id, c.dataset.serie === 'true');
    });
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
  // Año
  $('#y').textContent = new Date().getFullYear();

  // Topbar scroll
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('topbar--scrolled', window.scrollY > 4);
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Nav
  $$('.nav__link').forEach(a => a.addEventListener('click', () => setTimeout(routear, 0)));
  window.addEventListener('hashchange', routear);

  // Detail close
  $('#detail-close').onclick = cerrarDetalle;
  $('#detail-backdrop').onclick = cerrarDetalle;
  // Player close
  $('#player-close').onclick = cerrarPlayer;
  $('#player-backdrop').onclick = cerrarPlayer;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('player').hidden) cerrarPlayer();
    else cerrarDetalle();
  });

  // Formulario de reporte: abre mailto con los datos
  window.VeloxReportar = function (ev) {
    ev.preventDefault();
    const t = document.getElementById('r-titulo').value.trim();
    const m = document.getElementById('r-motivo').value.trim();
    const d = document.getElementById('r-detalle').value.trim();
    if (!t || !m) return false;
    const subject = encodeURIComponent(`[Velox Play] Reporte: ${t}`);
    const body = encodeURIComponent(`Título: ${t}\nMotivo: ${m}\nDetalle: ${d || '(sin detalle)'}\n\nURL: ${location.href}`);
    window.location.href = `mailto:anayabyron2@gmail.com?subject=${subject}&body=${body}`;
    toast('¡Gracias! Abriendo tu cliente de correo…');
    return false;
  };

  // Query buscar via URL (?q=…)
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q) { $('#q').value = q; pintarResultadosBusqueda(q); }

  pintarHero();
  routear();
}
init();
