// Canales en vivo: mismas listas que la app (iptv-org + Velox 24/7), paginado de 20 en 20.
(function () {
  const BASE = 'https://iptv-org.github.io/iptv';
  const REGIONES = [
    ['velox', 'Velox 24/7', '⚡', ''],
    ['latam', 'Latinoamérica', '🌎', 'regions/latam'],
    ['spa', 'En Español', '🇲🇽', 'languages/spa'],
    ['movies', 'Películas', '🎬', 'categories/movies'],
    ['series', 'Series', '📺', 'categories/series'],
    ['sports', 'Deportes', '⚽', 'categories/sports'],
    ['kids', 'Infantil', '🧸', 'categories/animation'],
    ['news', 'Noticias', '📰', 'categories/news'],
    ['music', 'Música', '🎵', 'categories/music'],
    ['mx', 'México', '🇲🇽', 'countries/mx'],
    ['ar', 'Argentina', '🇦🇷', 'countries/ar'],
    ['co', 'Colombia', '🇨🇴', 'countries/co'],
    ['cl', 'Chile', '🇨🇱', 'countries/cl'],
    ['pe', 'Perú', '🇵🇪', 'countries/pe'],
    ['ec', 'Ecuador', '🇪🇨', 'countries/ec'],
    ['ve', 'Venezuela', '🇻🇪', 'countries/ve'],
    ['us', 'Estados Unidos', '🇺🇸', 'countries/us'],
    ['es', 'España', '🇪🇸', 'countries/es']
  ];
  const VELOX = [
    { id: 'runtime_cine_es', nombre: 'Runtime Cine & Series', categoria: 'Películas',
      logo: 'https://images.pluto.tv/channels/5f1b1328eaec5600078eb1db/colorLogoPNG.png',
      urls: ['https://runtime-es-rakuten.amagi.tv/playlist.m3u8', 'https://euronews-euronews-spanish-1-es.samsung.wurl.tv/playlist.m3u8'] },
    { id: 'rtve_24h', nombre: 'RTVE 24 Horas Noticias', categoria: 'Noticias',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/24h_tve.svg/1200px-24h_tve.svg.png',
      urls: ['https://ztnr.rtve.es/ztnr/1694255.m3u8', 'https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main_500.m3u8'] }
  ];
  const PAGE = 20;
  const cache = {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const chips = $('#regiones'), grid = $('#grid'), estado = $('#estado'), buscador = $('#buscar-canal');
  let lista = [], filtrada = [], mostrados = 0;

  function attr(linea, nombre) {
    const m = linea.match(new RegExp(nombre + '="([^"]*)"'));
    return m ? m[1] : '';
  }
  function limpiarNombre(n) {
    return n.replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\((\d{3,4}p|SD|HD|FHD|4K)\)/gi, '').replace(/\s+(\d{3,4}p)$/i, '').trim();
  }

  // El navegador bloquea http:// dentro de una página https, así que solo se listan streams https.
  function parsearM3u(texto) {
    const porClave = new Map();
    let info = null;
    for (const raw of texto.split('\n')) {
      const l = raw.trim();
      if (l.startsWith('#EXTINF:')) {
        const coma = l.lastIndexOf(',');
        info = {
          nombre: limpiarNombre(coma >= 0 ? l.slice(coma + 1) : 'Canal TV'),
          logo: attr(l, 'tvg-logo'),
          categoria: (attr(l, 'group-title') || 'General').split(';')[0].trim(),
          id: attr(l, 'tvg-id').split('@')[0]
        };
      } else if (info && l.startsWith('https://')) {
        const clave = (info.id || info.nombre).toLowerCase();
        const ex = porClave.get(clave);
        if (ex) { if (!ex.urls.includes(l)) ex.urls.push(l); }
        else porClave.set(clave, { ...info, urls: [l] });
        info = null;
      } else if (l.startsWith('http://')) {
        info = null;
      }
    }
    return [...porClave.values()];
  }

  async function cargarRegion(r) {
    const [id, , , ruta] = r;
    if (cache[id]) return cache[id];
    if (id === 'velox') return (cache[id] = VELOX);
    const res = await fetch(`${BASE}/${ruta}.m3u`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let canales = parsearM3u(await res.text());
    if (['movies', 'spa', 'latam'].includes(id)) canales = [...VELOX, ...canales];
    return (cache[id] = canales);
  }

  function tarjeta(c, i) {
    const logo = c.logo ? `<img src="${esc(c.logo)}" alt="" loading="lazy" decoding="async" data-hide-on-error>` : '<span class="canal__ph">📺</span>';
    return `<button class="canal" type="button" data-i="${i}" aria-label="Ver ${esc(c.nombre)}">
      <span class="canal__logo">${logo}</span>
      <span class="canal__nombre">${esc(c.nombre)}</span>
      <span class="canal__cat">${esc(c.categoria)}</span>
    </button>`;
  }

  function pintarMas() {
    const trozo = filtrada.slice(mostrados, mostrados + PAGE);
    grid.insertAdjacentHTML('beforeend', trozo.map((c, k) => tarjeta(c, mostrados + k)).join(''));
    mostrados += trozo.length;
    grid.querySelectorAll('img[data-hide-on-error]').forEach((img) => {
      img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'canal__ph', textContent: '📺' })); };
      img.removeAttribute('data-hide-on-error');
    });
    estado.textContent = filtrada.length ? `${mostrados} de ${filtrada.length} canales` : 'No hay canales en esta sección.';
  }

  function aplicarFiltro() {
    const q = buscador.value.trim().toLowerCase();
    filtrada = q ? lista.filter((c) => c.nombre.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q)) : lista;
    grid.innerHTML = ''; mostrados = 0; pintarMas();
  }

  async function seleccionar(r, boton) {
    chips.querySelectorAll('.chip').forEach((b) => b.classList.toggle('is-active', b === boton));
    grid.innerHTML = ''; estado.textContent = 'Cargando canales…';
    try {
      lista = await cargarRegion(r);
      aplicarFiltro();
    } catch (e) {
      lista = []; estado.textContent = 'No se pudo cargar esta lista. Intenta otra sección.';
    }
  }

  chips.innerHTML = REGIONES.map((r, i) => `<button class="chip${i === 0 ? ' is-active' : ''}" type="button" data-r="${i}">${r[2]} ${esc(r[1])}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    seleccionar(REGIONES[+b.dataset.r], b);
  });
  buscador.addEventListener('input', aplicarFiltro);
  window.addEventListener('scroll', () => {
    if (mostrados < filtrada.length && window.innerHeight + window.scrollY > document.body.offsetHeight - 600) pintarMas();
  }, { passive: true });

  // ── Reproductor: prueba cada enlace del canal en orden, igual que la app ──
  const modal = $('#tv-player'), video = $('#tv-video'), titulo = $('#tv-titulo'), aviso = $('#tv-aviso');
  let hls = null, intento = 0, actual = null, timer = null;

  function detener() {
    clearTimeout(timer);
    if (hls) { hls.destroy(); hls = null; }
    video.removeAttribute('src'); video.load();
  }
  function probar() {
    detener();
    if (!actual || intento >= actual.urls.length) {
      aviso.textContent = 'Este canal no está disponible ahora. Prueba otro.';
      return;
    }
    const url = actual.urls[intento];
    aviso.textContent = actual.urls.length > 1 ? `Conectando enlace ${intento + 1} de ${actual.urls.length}…` : 'Conectando…';
    const siguiente = () => { intento += 1; probar(); };
    timer = setTimeout(siguiente, 15000);
    const listo = () => { clearTimeout(timer); aviso.textContent = ''; };
    video.onplaying = listo;
    if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({ maxBufferLength: 30, backBufferLength: 10, manifestLoadingMaxRetry: 2 });
      hls.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) siguiente(); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
      video.onerror = siguiente;
    }
    video.play().catch(() => {});
  }
  function abrir(c) {
    actual = c; intento = 0;
    titulo.textContent = c.nombre;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    probar();
  }
  function cerrar() {
    detener(); actual = null;
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.canal'); if (!b) return;
    abrir(filtrada[+b.dataset.i]);
  });
  $('#tv-cerrar').addEventListener('click', cerrar);
  $('#tv-fondo').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) cerrar(); });

  seleccionar(REGIONES[0], chips.querySelector('.chip'));
})();
