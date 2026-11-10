/* Página de detalles: película o serie con reproductor, episodios y Top 10. */
(function () {
  'use strict';
  const CFG = window.VELOX_CONFIG || {};
  const SB = CFG.SUPABASE_URL, KEY = CFG.SUPABASE_KEY;
  const BASE = 'https://flashanaaya18.github.io/velox-play-studio/';
  const $ = (id) => document.getElementById(id);

  // Escapa texto antes de usarlo en innerHTML
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Solo URLs http(s)
  const safeUrl = (u) => { try { const x = new URL(String(u), location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };

  // Datos de ejemplo si Supabase falla
  const mockData = {
    peliculas: [
      { id: 'demo-p1', titulo: 'Película de ejemplo 1', anio: 2024, sinopsis: 'Sinopsis de ejemplo.', calificacion: '7.8', generos: ['Acción'], es_adulto: false, pelicula_servidores: [{ url: 'https://example.com/embed/1', idioma: 'Latino', calidad: 'HD', servidor: 'Demo' }] },
      { id: 'demo-p2', titulo: 'Película de ejemplo 2', anio: 2023, sinopsis: 'Sinopsis de ejemplo.', calificacion: '6.9', generos: ['Drama'], es_adulto: false, pelicula_servidores: [] },
      { id: 'demo-p3', titulo: 'Película de ejemplo 3', anio: 2022, sinopsis: 'Sinopsis de ejemplo.', calificacion: '', generos: ['Comedia'], es_adulto: false, pelicula_servidores: [] }
    ],
    series: [1, 2, 3].map((n) => ({
      id: 'demo-s' + n, titulo: 'Serie de ejemplo ' + n, anio: 2020 + n, sinopsis: 'Sinopsis de ejemplo.', calificacion: String(7 + n / 10), generos: ['Drama'], es_adulto: false,
      temporadas: [1, 2].map((t) => ({ numero: t, nombre: 'Temporada ' + t, episodios: [1, 2, 3].map((e) => ({ numero: e, titulo: 'Episodio ' + e, episodio_servidores: [{ url: 'https://example.com/embed/' + n + t + e, idioma: 'Latino', calidad: 'HD', servidor: 'Demo' }] })) }))
    }))
  };

  async function sbGet(path, range) {
    if (!SB || !KEY) throw new Error('sin config');
    const h = { apikey: KEY, Authorization: 'Bearer ' + KEY };
    if (range) { h.Range = range; h['Range-Unit'] = 'items'; }
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: h });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  let tipo = params.get('tipo');
  let item = null, temporadas = [], tempIdx = 0, epActual = null;

  async function cargar() {
    if (!id) throw new Error('sin id');
    const pel = () => sbGet(`peliculas?id=eq.${encodeURIComponent(id)}&select=*,pelicula_servidores(*)`, '0-0');
    const ser = () => sbGet(`series?id=eq.${encodeURIComponent(id)}&select=*,temporadas(*,episodios(*,episodio_servidores(*)))`, '0-0');
    if (tipo === 'serie') return (await ser())[0] || null;
    if (tipo === 'pelicula') return (await pel())[0] || null;
    // Sin tipo: probar películas y luego series
    const p = await pel();
    if (p[0]) { tipo = 'pelicula'; return p[0]; }
    const s = await ser();
    if (s[0]) { tipo = 'serie'; return s[0]; }
    return null;
  }

  function desdeMock() {
    $('det-aviso').hidden = false;
    const all = mockData.peliculas.map((x) => ['pelicula', x]).concat(mockData.series.map((x) => ['serie', x]));
    const hit = all.find(([, x]) => x.id === id) || all.find(([t]) => t === (tipo || 'pelicula'));
    tipo = hit[0];
    return hit[1];
  }

  const numRating = (c) => { const n = parseFloat(String(c || '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };

  // ---- Render info ----
  function renderInfo() {
    $('det-titulo').textContent = item.titulo || 'Sin título';
    const meta = [];
    if (item.anio) meta.push(`<li>${esc(item.anio)}</li>`);
    const r = numRating(item.calificacion);
    if (r) meta.push(`<li class="rating" aria-label="Calificación ${r} de 10">★ ${esc(r.toFixed(1))}</li>`);
    meta.push(`<li>${tipo === 'serie' ? 'Serie' : 'Película'}</li>`);
    if (item.es_cam) meta.push('<li>CAM</li>');
    if (item.duracion) meta.push(`<li>${esc(item.duracion)}</li>`);
    if (item.es_adulto) meta.push('<li><span class="badge18">+18</span></li>');
    $('det-meta').innerHTML = meta.join('');
    $('det-generos').innerHTML = (item.generos || []).map((g) => `<li>${esc(g)}</li>`).join('');
    $('det-sinopsis').textContent = item.sinopsis || 'Sin sinopsis disponible.';
    const img = safeUrl(item.poster_url);
    if (img) { const p = $('det-poster'); p.src = img; p.alt = `Póster de ${item.titulo || ''}`; p.hidden = false; }
  }

  // ---- SEO dinámico ----
  function setMeta(sel, attr, val) { const m = document.querySelector(sel); if (m) m.setAttribute(attr, val); }
  function renderSEO() {
    const titulo = `${item.titulo}${item.anio ? ` (${item.anio})` : ''} — Velox Play`;
    const desc = (item.sinopsis || `Mira ${item.titulo} en Velox Play.`).replace(/\s+/g, ' ').trim().slice(0, 160);
    const url = `${BASE}detalles.html?id=${encodeURIComponent(item.id)}&tipo=${tipo}`;
    const img = safeUrl(item.backdrop_url) || safeUrl(item.poster_url);
    document.title = titulo;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', titulo);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:image"]', 'content', img);
    setMeta('meta[property="og:type"]', 'content', tipo === 'serie' ? 'video.tv_show' : 'video.movie');
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('link[rel="canonical"]', 'href', url);
    const ld = { '@context': 'https://schema.org', '@type': tipo === 'serie' ? 'TVSeries' : 'Movie', name: item.titulo, url, description: desc };
    if (img) ld.image = img;
    if (item.anio) ld[tipo === 'serie' ? 'startDate' : 'datePublished'] = String(item.anio);
    if (item.generos && item.generos.length) ld.genre = item.generos;
    const r = numRating(item.calificacion);
    if (r) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: r, bestRating: 10, ratingCount: 1 };
    if (tipo === 'serie') ld.numberOfSeasons = temporadas.length;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld).replace(/</g, '\\u003c');
    document.head.appendChild(s);
  }

  // ---- Reproductor y servidores ----
  let gate18 = null; // promesa del aviso +18
  function confirmar18() {
    if (!item.es_adulto) return Promise.resolve(true);
    if (gate18) return gate18;
    gate18 = new Promise((res) => {
      const o = $('adulto'); o.hidden = false; $('adulto-ok').focus();
      $('adulto-ok').addEventListener('click', () => { o.hidden = true; res(true); }, { once: true });
      $('adulto-no').addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'index.html'; }, { once: true });
    });
    return gate18;
  }

  async function reproducir(srv, btn) {
    await confirmar18();
    const url = safeUrl(srv && srv.url);
    const p = $('player');
    if (!url) { p.innerHTML = '<div class="player__vacio">Servidor no disponible</div>'; $('player-estado').textContent = 'Servidor no disponible'; return; }
    const f = document.createElement('iframe');
    f.src = url;
    f.title = `Reproductor: ${item.titulo || ''}`;
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.referrerPolicy = 'no-referrer';
    p.replaceChildren(f);
    document.querySelectorAll('.srv-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    $('player-estado').textContent = `Reproduciendo en ${srv.servidor || 'servidor'} (${srv.idioma || '—'}${srv.calidad ? ', ' + srv.calidad : ''})`;
  }

  function renderServidores(lista) {
    const cont = $('servidores');
    cont.innerHTML = '';
    if (!lista || !lista.length) { $('player').innerHTML = '<div class="player__vacio">Sin servidores disponibles</div>'; return; }
    // Agrupar por idioma, Latino primero
    const grupos = {};
    lista.forEach((s) => { const k = s.idioma || 'Otro'; (grupos[k] = grupos[k] || []).push(s); });
    const orden = Object.keys(grupos).sort((a, b) => (/latino/i.test(b) - /latino/i.test(a)) || a.localeCompare(b));
    let primero = null;
    orden.forEach((idioma) => {
      const g = document.createElement('div'); g.className = 'srv-grupo';
      const h = document.createElement('h3'); h.textContent = idioma; g.appendChild(h);
      const w = document.createElement('div'); w.className = 'srv-btns';
      grupos[idioma].forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'srv-btn'; b.setAttribute('aria-pressed', 'false');
        b.textContent = `${s.servidor || 'Servidor ' + (i + 1)}${s.calidad ? ' · ' + s.calidad : ''}`;
        b.addEventListener('click', () => reproducir(s, b));
        w.appendChild(b);
        if (!primero) primero = [s, b];
      });
      g.appendChild(w); cont.appendChild(g);
    });
    reproducir(primero[0], primero[1]);
  }

  // ---- Temporadas / episodios ----
  function syncURL() {
    const u = new URL(location.href);
    u.searchParams.set('id', item.id); u.searchParams.set('tipo', tipo);
    if (epActual) { u.searchParams.set('t', temporadas[tempIdx].numero); u.searchParams.set('e', epActual.numero); }
    history.replaceState(null, '', u);
  }

  function renderEpisodios() {
    const t = temporadas[tempIdx];
    $('temp-select').value = String(tempIdx);
    $('temp-prev').disabled = tempIdx === 0;
    $('temp-next').disabled = tempIdx === temporadas.length - 1;
    const ol = $('episodios'); ol.innerHTML = '';
    (t.episodios || []).forEach((ep) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ep-btn';
      b.innerHTML = `<span class="ep-num">E${esc(ep.numero)}</span><span>${esc(ep.titulo || 'Episodio ' + ep.numero)}</span>`;
      if (ep === epActual) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => elegirEpisodio(ep));
      li.appendChild(b); ol.appendChild(li);
    });
  }

  function elegirEpisodio(ep) {
    epActual = ep;
    renderEpisodios();
    renderServidores(ep.episodio_servidores || []);
    syncURL();
  }

  function initSerie() {
    temporadas = (item.temporadas || []).slice().sort((a, b) => a.numero - b.numero);
    temporadas.forEach((t) => (t.episodios || []).sort((a, b) => a.numero - b.numero));
    if (!temporadas.length) { renderServidores([]); return; }
    $('det-eps').hidden = false;
    $('temp-select').innerHTML = temporadas.map((t, i) => `<option value="${i}">${esc(t.nombre || 'Temporada ' + t.numero)}</option>`).join('');
    $('temp-select').addEventListener('change', (e) => { tempIdx = +e.target.value; renderEpisodios(); });
    $('temp-prev').addEventListener('click', () => { if (tempIdx > 0) { tempIdx--; renderEpisodios(); } });
    $('temp-next').addEventListener('click', () => { if (tempIdx < temporadas.length - 1) { tempIdx++; renderEpisodios(); } });
    // Restaurar &t= &e= desde la URL
    const ti = temporadas.findIndex((t) => String(t.numero) === params.get('t'));
    tempIdx = ti >= 0 ? ti : 0;
    const eps = temporadas[tempIdx].episodios || [];
    const ep = eps.find((e) => String(e.numero) === params.get('e')) || eps[0];
    if (ep) elegirEpisodio(ep); else { renderEpisodios(); renderServidores([]); }
  }

  // ---- Top 10 ----
  async function cargarTop10() {
    let lista = [];
    try {
      const q = 'select=id,titulo,anio,poster_url,calificacion,es_adulto&es_adulto=is.false&order=calificacion.desc.nullslast';
      const [p, s] = await Promise.all([sbGet('v_pelis_lista?' + q, '0-9'), sbGet('v_series_lista?' + q, '0-9')]);
      lista = p.map((x) => ({ ...x, tipo: 'pelicula' })).concat(s.map((x) => ({ ...x, tipo: 'serie' })));
    } catch (e) {
      lista = mockData.peliculas.map((x) => ({ ...x, tipo: 'pelicula' })).concat(mockData.series.map((x) => ({ ...x, tipo: 'serie' })));
    }
    lista = lista.filter((x) => !x.es_adulto).sort((a, b) => (numRating(b.calificacion) || 0) - (numRating(a.calificacion) || 0)).slice(0, 10);
    $('top10').innerHTML = lista.map((x, i) => {
      const img = safeUrl(x.poster_url);
      return `<li class="top10__item"><a class="top10__link" href="detalles.html?id=${encodeURIComponent(x.id)}&amp;tipo=${x.tipo}" aria-label="Número ${i + 1}: ${esc(x.titulo)}">
        <span class="top10__rank" aria-hidden="true">${i + 1}</span>
        <img class="top10__img" src="${esc(img)}" alt="Póster de ${esc(x.titulo)}" width="150" height="225" loading="lazy" decoding="async" /></a></li>`;
    }).join('');
  }

  async function init() {
    cargarTop10();
    try { item = await cargar(); } catch (e) { item = desdeMock(); }
    $('det-skeleton').hidden = true;
    if (!item) { $('det-error').hidden = false; return; }
    $('det-contenido').hidden = false;
    renderInfo();
    if (tipo === 'serie') initSerie(); else { syncURL(); renderServidores(item.pelicula_servidores || []); }
    renderSEO();
  }

  init();
})();
