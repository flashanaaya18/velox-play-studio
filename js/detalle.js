// Modal detalle + reproductor reutilizable. Layout mejorado:
//  - Películas: póster/lado izquierdo + sinopsis + servidores por idioma abajo.
//  - Series: episodios en panel lateral + navegación T/E con prev/next + servidores.
//  - +18: aviso antes de abrir si es_adulto.
//  - Similares: 10 títulos relacionados.

(function () {
  const CFG = window.VELOX_CONFIG || {};
  const SB = CFG.SUPABASE_URL, KEY = CFG.SUPABASE_KEY;
  if (!SB || !KEY) return;

  async function sbGet(path, range) {
    const r = await fetch(`${SB}/rest/v1/${path}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Range-Unit': 'items',
        Range: range || '0-0',
        Accept: 'application/json'
      }
    });
    if (!r.ok) throw new Error('Supabase ' + r.status);
    return r.json();
  }

  function $(sel, root = document) { return root.querySelector(sel); }
  function toast(msg, ms = 2400) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-visible');
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
  function normIdioma(s) {
    const raw = (s && (s.idioma || '')).toString().toLowerCase();
    if (!raw) return 'Audio';
    if (/latino|lat\b/.test(raw)) return 'Latino';
    if (/castell|españ|esp\b/.test(raw)) return 'Castellano';
    if (/sub/.test(raw)) return 'Subtitulado';
    if (/ingl|eng/.test(raw)) return 'Inglés';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function botonServidorHTML(s, i) {
    const col = colorPorHost(hostDe(s.url));
    return `
      <button class="srv" data-url="${s.url}" style="border-color:${col};background:${col}22">
        <span class="srv__dot" style="background:${col}"></span>
        <span class="srv__name">${nombreServidor(s, i)}</span>
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
          <div class="detail__body" id="detail-body"></div>
        </article>
      </div>
      <div class="player" id="player" hidden role="dialog" aria-modal="true" aria-label="Reproductor">
        <div class="player__backdrop" id="player-backdrop"></div>
        <div class="player__frame">
          <button class="player__close" type="button" id="player-close" aria-label="Cerrar reproductor">×</button>
          <iframe id="player-iframe" src="about:blank" title="Reproductor" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe>
        </div>
      </div>
      <div class="aviso" id="aviso-18" hidden role="alertdialog" aria-modal="true" aria-labelledby="aviso-18-tit">
        <div class="aviso__card">
          <h3 id="aviso-18-tit">+18 · Contenido para adultos</h3>
          <p>Este contenido está destinado únicamente a mayores de 18 años. Puede incluir escenas explícitas de violencia, lenguaje fuerte o desnudez.</p>
          <p><strong>Al continuar aceptas la responsabilidad de ver este material bajo tu propio criterio.</strong> Velox Play no se hace responsable de los problemas derivados de su visualización.</p>
          <div class="aviso__btns">
            <button class="btn btn--primary" id="aviso-18-ok">Soy mayor, continuar</button>
            <button class="btn btn--ghost"   id="aviso-18-no">Cancelar</button>
          </div>
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
      else if (!$('#aviso-18').hidden) $('#aviso-18').hidden = true;
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

  async function avisarSiAdulto(flag) {
    if (!flag) return true;
    return new Promise((resolve) => {
      const a = $('#aviso-18'); a.hidden = false;
      const ok = $('#aviso-18-ok'), no = $('#aviso-18-no');
      const cerrar = (val) => { a.hidden = true; ok.onclick = null; no.onclick = null; resolve(val); };
      ok.onclick = () => cerrar(true);
      no.onclick = () => cerrar(false);
    });
  }

  // ─── Servidores agrupados por idioma ──────────────────────────────
  function pintarServidores(mount, servidores, tituloBase) {
    mount.innerHTML = '';
    if (!servidores.length) { mount.innerHTML = '<p style="color:var(--text-fade);font-size:13px">Sin servidores disponibles.</p>'; return; }
    const grupos = {};
    servidores.forEach((s) => {
      const k = normIdioma(s);
      (grupos[k] = grupos[k] || []).push(s);
    });
    const idiomas = Object.keys(grupos).sort((a, b) => (a === 'Latino' ? -1 : b === 'Latino' ? 1 : 0));
    const barra = document.createElement('div');
    barra.className = 'langs';
    const cajaSrv = document.createElement('div');
    cajaSrv.className = 'srv-grid srv-stack';
    const pintarGrupo = (lang) => {
      const lista = grupos[lang] || [];
      cajaSrv.innerHTML = lista.map((s, i) => botonServidorHTML(s, i)).join('');
      cajaSrv.onclick = (ev) => {
        const b = ev.target.closest('.srv'); if (!b) return;
        abrirPlayer(b.dataset.url);
      };
    };
    idiomas.forEach((lang, i) => {
      const p = document.createElement('button');
      p.className = 'lang-pill' + (i === 0 ? ' is-active' : '');
      p.textContent = `${lang} (${grupos[lang].length})`;
      p.onclick = () => {
        barra.querySelectorAll('.lang-pill').forEach(x => x.classList.remove('is-active'));
        p.classList.add('is-active');
        pintarGrupo(lang);
      };
      barra.appendChild(p);
    });
    const tit = document.createElement('h3');
    tit.textContent = tituloBase || 'Servidores';
    tit.style.cssText = 'margin:6px 0 8px;font-size:15px';
    mount.appendChild(tit);
    mount.appendChild(barra);
    mount.appendChild(cajaSrv);
    pintarGrupo(idiomas[0]);
  }

  // ─── Similares (mismo año o mismo género principal) ───────────────
  async function cargarSimilares(item, esSerie) {
    const tabla = esSerie ? 'v_series_lista' : 'v_pelis_lista';
    const condiciones = [];
    if (item.anio) condiciones.push(`anio=eq.${encodeURIComponent(item.anio)}`);
    try {
      const q = condiciones.length ? `?select=*&${condiciones.join('&')}&id=neq.${encodeURIComponent(item.id)}` : `?select=*&id=neq.${encodeURIComponent(item.id)}`;
      const rows = await sbGet(`${tabla}${q}`, '0-11');
      return rows.filter(r => !r.es_adulto);
    } catch { return []; }
  }

  function pintarSimilares(mount, items, esSerie) {
    if (!items.length) { mount.innerHTML = ''; return; }
    mount.innerHTML = `
      <h3>Similares</h3>
      <div class="sim-grid">
        ${items.map(it => `
          <a class="sim-card" href="#" data-id="${it.id}">
            <img loading="lazy" src="${it.poster_url || it.backdrop_url || ''}" alt="${(it.titulo || '').replace(/"/g, '&quot;')}"/>
            <span>${it.titulo || ''}</span>
          </a>
        `).join('')}
      </div>
    `;
    mount.onclick = (e) => {
      const a = e.target.closest('.sim-card'); if (!a) return;
      e.preventDefault();
      abrirDetalle(a.dataset.id, esSerie);
    };
  }

  // ─── Películas ─────────────────────────────────────────────────────
  async function cargarPeli(id) {
    const rows = await sbGet(`peliculas?id=eq.${encodeURIComponent(id)}&select=*,pelicula_servidores(*)`);
    return rows[0] || null;
  }
  function pintarPelicula(row) {
    const body = $('#detail-body');
    body.innerHTML = `
      <div class="detail-grid detail-grid--peli">
        <aside class="detail-side">
          <img class="detail-side__poster" src="${row.poster_url || row.backdrop_url || ''}" alt="${(row.titulo||'').replace(/"/g,'&quot;')}" onerror="this.style.visibility='hidden'" />
        </aside>
        <div>
          <h2 id="detail-title">${row.titulo || ''}</h2>
          <div class="detail__meta">${[row.anio, row.calificacion && `★ ${row.calificacion}`, 'Película', row.es_adulto && '<span style="color:#FF5252;font-weight:700">+18</span>']
            .filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>')}</div>
          ${(row.generos && row.generos.length) ? `<div class="langs" style="margin:10px 0">${row.generos.slice(0,6).map(g=>`<span class="lang-pill">${g}</span>`).join('')}</div>` : ''}
          <p>${row.sinopsis || ''}</p>
          <div class="detail__servers" id="srv-mount"></div>
          <div class="similares" id="sim-mount"></div>
        </div>
      </div>
    `;
    if (row.backdrop_url || row.poster_url) $('#detail-hero').style.backgroundImage = `url("${row.backdrop_url || row.poster_url}")`;
    pintarServidores(document.getElementById('srv-mount'), row.pelicula_servidores || []);
    cargarSimilares(row, false).then(sim => pintarSimilares(document.getElementById('sim-mount'), sim, false));
  }

  // ─── Series ────────────────────────────────────────────────────────
  async function cargarSerie(id) {
    const rows = await sbGet(`series?id=eq.${encodeURIComponent(id)}&select=*,temporadas(*,episodios(*,episodio_servidores(*)))`);
    const row = rows[0]; if (!row) return null;
    const temps = (row.temporadas || [])
      .map(t => ({ ...t, episodios: (t.episodios || []).slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)) }))
      .sort((a, b) => (a.numero || 0) - (b.numero || 0));
    return { serie: row, temporadas: temps };
  }

  function pintarSerie(data) {
    const s = data.serie, temps = data.temporadas;
    const body = $('#detail-body');
    body.innerHTML = `
      <div class="detail-grid detail-grid--serie">
        <div class="serie-body">
          <h2 id="detail-title">${s.titulo || ''}</h2>
          <div class="detail__meta">${[s.anio, s.calificacion && `★ ${s.calificacion}`, 'Serie', s.es_adulto && '<span style="color:#FF5252;font-weight:700">+18</span>']
            .filter(Boolean).map(x => `<span>${x}</span>`).join('<span class="dot">·</span>')}</div>
          ${(s.generos && s.generos.length) ? `<div class="langs" style="margin:10px 0">${s.generos.slice(0,6).map(g=>`<span class="lang-pill">${g}</span>`).join('')}</div>` : ''}
          <p>${s.sinopsis || ''}</p>
          <div id="srv-mount"></div>
          <div class="similares" id="sim-mount"></div>
        </div>
        <aside>
          <div class="epi-panel">
            <h4>Capítulos</h4>
            <ol class="epi-list" id="epi-list"></ol>
          </div>
          <div class="ep-nav" style="margin-top:10px">
            <button class="ep-nav__btn" id="ep-prev" aria-label="Temporada anterior">‹ T. anterior</button>
            <select class="ep-nav__sel" id="ep-sel" aria-label="Seleccionar temporada"></select>
            <button class="ep-nav__btn" id="ep-next" aria-label="Temporada siguiente">T. siguiente ›</button>
          </div>
        </aside>
      </div>
    `;
    if (s.backdrop_url || s.poster_url) $('#detail-hero').style.backgroundImage = `url("${s.backdrop_url || s.poster_url}")`;
    cargarSimilares(s, true).then(sim => pintarSimilares(document.getElementById('sim-mount'), sim, true));

    const sel = document.getElementById('ep-sel');
    const prev = document.getElementById('ep-prev');
    const next = document.getElementById('ep-next');
    const olEp = document.getElementById('epi-list');
    const srvMount = document.getElementById('srv-mount');

    if (!temps.length) {
      olEp.innerHTML = '<li style="color:var(--text-fade)">Sin episodios</li>';
      prev.disabled = next.disabled = true; sel.disabled = true;
      return;
    }
    sel.innerHTML = temps.map((t, i) => `<option value="${i}">Temporada ${t.numero}${t.nombre ? ' · ' + t.nombre : ''}</option>`).join('');

    let idxT = 0, idxE = 0;
    function mostrarTemp() {
      const t = temps[idxT];
      sel.value = String(idxT);
      prev.disabled = idxT <= 0;
      next.disabled = idxT >= temps.length - 1;
      const eps = t.episodios || [];
      olEp.innerHTML = eps.length
        ? eps.map((ep, i) => {
            const n = (ep.episodio_servidores || []).length;
            return `<li data-i="${i}"${i === idxE ? ' class="is-active"' : ''}>
              <span class="ep-n">T${t.numero} · E${ep.numero}</span>
              <span class="ep-t">${ep.titulo || `Episodio ${ep.numero}`}</span>
              <span class="ep-b">${n ? n + ' srv' : 'Sin srv'}</span>
            </li>`;
          }).join('')
        : '<li style="color:var(--text-fade)">Sin episodios</li>';
      if (eps.length) mostrarEp();
    }
    function mostrarEp() {
      const t = temps[idxT]; const ep = (t.episodios || [])[idxE]; if (!ep) return;
      olEp.querySelectorAll('li').forEach(li => li.classList.toggle('is-active', +li.dataset.i === idxE));
      pintarServidores(srvMount, ep.episodio_servidores || [], `Servidores — T${t.numero} · E${ep.numero}`);
    }
    sel.onchange = () => { idxT = +sel.value; idxE = 0; mostrarTemp(); };
    prev.onclick = () => { if (idxT > 0) { idxT -= 1; idxE = 0; mostrarTemp(); } };
    next.onclick = () => { if (idxT < temps.length - 1) { idxT += 1; idxE = 0; mostrarTemp(); } };
    olEp.onclick = (e) => {
      const li = e.target.closest('li[data-i]'); if (!li) return;
      idxE = +li.dataset.i; mostrarEp();
    };
    mostrarTemp();
  }

  // ─── Abrir ─────────────────────────────────────────────────────────
  async function abrirDetalle(id, esSerie) {
    asegurarMarkup();
    const d = $('#detail');
    d.hidden = false; document.body.style.overflow = 'hidden';
    $('#detail-hero').style.backgroundImage = '';
    $('#detail-body').innerHTML = '<p style="color:var(--text-fade);padding:14px">Cargando…</p>';

    try {
      if (esSerie) {
        const data = await cargarSerie(id);
        if (!data || !data.serie) { toast('No se encontró la serie'); cerrarDetalle(); return; }
        const seguir = await avisarSiAdulto(!!data.serie.es_adulto);
        if (!seguir) { cerrarDetalle(); return; }
        pintarSerie(data);
      } else {
        const row = await cargarPeli(id);
        if (!row) { toast('No se encontró la película'); cerrarDetalle(); return; }
        const seguir = await avisarSiAdulto(!!row.es_adulto);
        if (!seguir) { cerrarDetalle(); return; }
        pintarPelicula(row);
      }
    } catch (e) {
      console.error('[detalle]', e);
      toast('Error cargando detalles');
      cerrarDetalle();
    }
  }

  window.VeloxAbrirDetalle = abrirDetalle;
})();
