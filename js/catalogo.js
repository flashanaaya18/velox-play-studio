// Catálogo paginado 20 en 20 para páginas peliculas.html / series.html
// Nada en bloque: Range HTTP + scroll infinito.

const CFG = window.VELOX_CONFIG || {};
const SB = CFG.SUPABASE_URL, KEY = CFG.SUPABASE_KEY;
const PAGE = CFG.PAGE_SIZE || 20;

if (!SB || !KEY) {
  document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#fff">Falta <code>js/config.js</code>.</div>';
  throw new Error('Config missing');
}

async function sbGet(path, desde, hasta) {
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Range-Unit': 'items',
      Range: `${desde}-${hasta}`,
      Accept: 'application/json'
    }
  });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  return r.json();
}

function tarjeta(item, esSerie) {
  const title = (item.titulo || 'Sin título').replace(/"/g, '&quot;');
  const poster = item.poster_url || item.backdrop_url || '';
  const anio = item.anio || '';
  const badges = [];
  if (item.es_adulto) badges.push('<span class="badge badge--adulto">+18</span>');
  if (item.es_cam) badges.push('<span class="badge badge--cam">Cam</span>');
  if (item.episodio_nuevo || item.temporada_nueva) badges.push('<span class="badge badge--new">Nuevo</span>');
  return `
    <article class="card" data-id="${item.id}" data-serie="${esSerie ? 'true' : 'false'}" tabindex="0" role="button" aria-label="${title}">
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

// Inicializa una página de catálogo con filtros.
// opciones:
//   vista: 'peliculas' | 'series'
//   filtros: [{ key, label, query }]  (query: string PostgREST como "es_cam=eq.true" o "order=calificacion.desc.nullslast")
//   gridSel, filtrosSel, estadoSel
window.VeloxCatalogo = function ({ vista, filtros, gridSel, filtrosSel, estadoSel, extraSel }) {
  const tabla = vista === 'series' ? 'v_series_lista' : 'v_pelis_lista';
  const esSerie = vista === 'series';
  const grid = document.querySelector(gridSel);
  const barra = document.querySelector(filtrosSel);
  const estado = document.querySelector(estadoSel);
  const extra = extraSel ? document.querySelector(extraSel) : null;

  let filtroActual = filtros[0];
  let anioSel = '';
  let generoSel = '';
  let pagina = 1;
  let cargando = false;
  let hayMas = true;

  // Dropdowns año + género si hay contenedor extra
  if (extra) {
    const anios = [];
    const annoActual = new Date().getFullYear();
    for (let y = annoActual; y >= 1990; y--) anios.push(String(y));
    const generos = ['Acción','Aventura','Animación','Ciencia ficción','Comedia','Crimen','Documental','Drama','Fantasía','Terror','Misterio','Romance','Suspense','Guerra','Familia'];
    extra.innerHTML = `
      <select id="f-anio" aria-label="Año"><option value="">Año: Todos</option>${anios.map(a => `<option value="${a}">${a}</option>`).join('')}</select>
      <select id="f-gen" aria-label="Género"><option value="">Género: Todos</option>${generos.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
    `;
    extra.querySelector('#f-anio').onchange = (e) => { anioSel = e.target.value; recargar(); };
    extra.querySelector('#f-gen').onchange  = (e) => { generoSel = e.target.value; recargar(); };
  }

  // Botones de filtro
  barra.innerHTML = filtros.map((f, i) =>
    `<button class="chip${i === 0 ? ' is-active' : ''}" data-key="${f.key}">${f.label}</button>`
  ).join('');
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const f = filtros.find(x => x.key === b.dataset.key); if (!f) return;
    barra.querySelectorAll('.chip').forEach(x => x.classList.toggle('is-active', x === b));
    filtroActual = f;
    recargar();
  });

  function recargar() { pagina = 1; hayMas = true; grid.innerHTML = ''; cargar(); }

  async function cargar() {
    if (cargando || !hayMas) return;
    cargando = true;
    estado.textContent = 'Cargando…';
    try {
      const desde = (pagina - 1) * PAGE;
      const hasta = desde + PAGE - 1;
      const partes = [];
      if (filtroActual.query) partes.push(filtroActual.query);
      if (anioSel) partes.push(`anio=eq.${encodeURIComponent(anioSel)}`);
      if (generoSel) partes.push(`generos=cs.{${encodeURIComponent(generoSel)}}`);
      const q = `?select=*${partes.length ? '&' + partes.join('&') : ''}`;
      const items = await sbGet(`${tabla}${q}`, desde, hasta);
      if (pagina === 1 && items.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-fade);padding:20px">Sin títulos todavía.</div>';
        hayMas = false; estado.textContent = ''; return;
      }
      grid.insertAdjacentHTML('beforeend', items.map(it => tarjeta(it, esSerie)).join(''));
      hayMas = items.length >= PAGE;
      estado.textContent = hayMas ? '' : 'Fin del catálogo';
    } catch (e) {
      console.error('[catalogo]', e);
      estado.textContent = 'Error cargando';
    } finally {
      cargando = false;
    }
  }

  // Click → abre detalle inline
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    const id = card.dataset.id;
    const esSerieCard = card.dataset.serie === 'true';
    if (window.VeloxAbrirDetalle) window.VeloxAbrirDetalle(id, esSerieCard);
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card'); if (!card) return;
    e.preventDefault();
    if (window.VeloxAbrirDetalle) window.VeloxAbrirDetalle(card.dataset.id, card.dataset.serie === 'true');
  });

  // Scroll infinito vertical
  window.addEventListener('scroll', () => {
    const cerca = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 600;
    if (cerca && hayMas && !cargando) { pagina += 1; cargar(); }
  }, { passive: true });

  cargar();
};
