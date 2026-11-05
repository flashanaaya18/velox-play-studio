// Modal de detalle + reproductor reutilizable para peliculas.html y series.html.
// Inyecta el markup si no existe y expone window.VeloxAbrirDetalle(id, esSerie).

(function () {
  const CFG = window.VELOX_CONFIG || {};
  const SB = CFG.SUPABASE_URL, KEY = CFG.SUPABASE_KEY;
  if (!SB || !KEY) return;

  async function sbGet(path) {
    const r = await fetch(`${SB}/rest/v1/${path}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Range-Unit': 'items',
        Range: '0-0',
        Accept: 'application/json'
      }
    });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return r.json();
  }

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function toast(msg, ms = 2400) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    setTimeout(() => t.classList.remove('is-visible'), ms);
  }

  function hostDe(url) { try { return new URL(url).host.toLowerCase(); } catch { return ''; } }
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
    const base = (s.servidor || '').replace(/\[|\]/g, ' ').replace(/latino|castellano|español|subtitulado/gi, '').trim();
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

  function asegurarMarkup() {
    if (document.getElementById('detail')) return;
    const frag = document.createElement('div');
    frag.innerHTML = `
      <div class="detail" id="detail" hidden role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div class="detail__backdrop" id="detail-backdrop"></div>
        <article class="detail__card">
          <button class="detail__close" type="button" aria-label="Cerrar" id="detail-close">×</button>
          <div class="detail__hero" id="detail-hero"></div>
          <div class="detail__body">
            <h2 id="detail-title"></h2>
            <div class="detail__meta" id="detail-meta"></div>
            <p id="detail-sinopsis"></p>
            <div class="detail__servers" id="detail-servers" hidden>
              <h3>Servidores</h3>
              <div class="srv-grid" id="srv-grid"></div>
            </div>
            <div class="detail__temporadas" id="detail-temporadas" hidden>
              <h3>Temporadas</h3>
              <div class="tabs" id="tabs"></div>
              <ol class="episodios" id="episodios"></ol>
            </div>
          </div>
        </article>
      </div>
      <div class="player" id="player" hidden role="dialog" aria-modal="true" aria-label="Reproductor">
        <div class="player__backdrop" id="player-backdrop"></div>
        <div class="player__frame">
          <button class="player__close" type="button" id="player-close" aria-label="Cerrar reproductor">×</button>
          <iframe id="player-iframe" src="about:blank" title="Reproductor" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe>
        </div>
      </div>
      ${document.getElementById('toast') ? '' : '<div class="toast" id="toast" role="status" aria-live="polite"></div>'}
    `;
    while (frag.firstChild) document.body.appendChild(frag.firstChild);

    $('#detail-close').onclick = cerrarDetalle;
    $('#detail-backdrop').onclick = cerrarDetalle;
    $('#player-close').onclick = cerrarPlayer;
    $('#player-backdrop').onclick = cerrarPlayer;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('#player').hidden) cerrarPlayer();
      else cerrarDetalle();
    });
  }

  function cerrarDetalle() { $('#detail').hidden = true; document.body.style.overflow = ''; }
  function abrirPlayer(url) {
    $('#player-iframe').src = url;
    $('#player').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function cerrarPlayer() {
    $('#player-iframe').src = 'about:blank';
    $('#player').hidden = true;
    document.body.style.overflow = '';
  }
  function onElegirServidor(ev) {
    const btn = ev.target.closest('.srv'); if (!btn) return;
    const url = btn.dataset.url; if (!url) return;
    abrirPlayer(url);
  }
  function pintarEpisodios(temp) {
    const ol = $('#episodios'); ol.innerHTML = '';
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

  async function cargarDetallePeli(id) {
    const rows = await sbGet(`peliculas?id=eq.${encodeURIComponent(id)}&select=*,pelicula_servidores(*)`);
    return rows[0] || null;
  }
  async function cargarDetalleSerie(id) {
    const rows = await sbGet(`series?id=eq.${encodeURIComponent(id)}&select=*,temporadas(*,episodios(*,episodio_servidores(*)))`);
    const row = rows[0]; if (!row) return null;
    return { serie: row, temporadas: (row.temporadas || []).sort((a, b) => (a.numero || 0) - (b.numero || 0)) };
  }

  async function abrirDetalle(id, esSerie) {
    asegurarMarkup();
    const d = $('#detail');
    d.hidden = false; document.body.style.overflow = 'hidden';
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
        $('#detail-meta').innerHTML = [s.anio, s.calificacion && `★ ${s.calificacion}`, 'Serie']
          .filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>');
        $('#detail-sinopsis').textContent = s.sinopsis || '';
        if (s.backdrop_url || s.poster_url) $('#detail-hero').style.backgroundImage = `url("${s.backdrop_url || s.poster_url}")`;
        $('#detail-temporadas').hidden = false;
        const temporadas = data.temporadas;
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
        $('#detail-meta').innerHTML = [row.anio, row.calificacion && `★ ${row.calificacion}`, 'Película']
          .filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>');
        $('#detail-sinopsis').textContent = row.sinopsis || '';
        if (row.backdrop_url || row.poster_url) $('#detail-hero').style.backgroundImage = `url("${row.backdrop_url || row.poster_url}")`;
        const srvs = row.pelicula_servidores || [];
        if (srvs.length) {
          $('#detail-servers').hidden = false;
          $('#srv-grid').innerHTML = srvs.map((s, i) => botonServidorHTML(s, i)).join('');
          $('#srv-grid').onclick = onElegirServidor;
        }
      }
    } catch (e) {
      console.error('[detalle]', e);
      toast('Error cargando detalles');
      cerrarDetalle();
    }
  }

  window.VeloxAbrirDetalle = abrirDetalle;
})();
