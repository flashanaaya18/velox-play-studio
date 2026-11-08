// Velox Play — comportamiento común de las páginas (antes era <script> inline;
// se movió aquí para poder usar una CSP con script-src 'self' sin 'unsafe-inline').
(function () {
  var y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // Menú hamburguesa
  var nav = document.getElementById('nav'), t = document.getElementById('nav-toggle');
  if (nav && t) {
    t.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      t.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  // Sustituye los antiguos onerror="this.style.visibility='hidden'" de los pósters.
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && el.hasAttribute('data-hide-on-error')) el.style.visibility = 'hidden';
  }, true);

  // Espacios de anuncio: promoción propia (VIP / app). Para una red de anuncios web,
  // pon su código en ANUNCIO_RED_HTML y añade su dominio al CSP de cada página.
  var ANUNCIO_RED_HTML = '';
  var ICONOS = {
    tv: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="9" width="40" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 41h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M20 16l10 6-10 6z" fill="currentColor"/></svg>',
    corona: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 36l4-22 10 10 4-14 4 14 10-10 4 22z" fill="currentColor"/><rect x="6" y="38" width="36" height="4" rx="2" fill="currentColor"/></svg>',
    vivo: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="6" fill="currentColor"/><path d="M14 14a14 14 0 0 0 0 20M34 14a14 14 0 0 1 0 20M8 8a22 22 0 0 0 0 32M40 8a22 22 0 0 1 0 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    balon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 15l8 6-3 9h-10l-3-9z" fill="currentColor"/></svg>',
    reanudar: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 24a14 14 0 1 1-4.1-9.9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M36 6v10H26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 18l9 6-9 6z" fill="currentColor"/></svg>'
  };
  var ANUNCIOS = [
    { tema: 'app', icono: 'tv', ceja: 'App oficial', t: 'Velox Play en tu Smart TV y móvil',
      d: 'Reproductor nativo, sin ventanas emergentes y pensado para el control remoto.',
      chips: ['Android TV', 'TV Box', 'Móvil'], b: 'Conocer la app', h: 'app.html' },
    { tema: 'vip', icono: 'corona', ceja: 'Velox Play VIP', t: 'Cero anuncios. Todo el catálogo.',
      d: 'Películas, series y canales sin interrupciones y en la mejor calidad disponible.',
      chips: ['Sin anuncios', 'Acceso total', 'HD'], b: 'Ver planes VIP', h: 'vip.html' },
    { tema: 'vivo', icono: 'vivo', ceja: 'En vivo', t: 'Canales de TV en vivo, gratis',
      d: 'Latinoamérica, en español, deportes, noticias, infantil y música en un solo lugar.',
      chips: ['Deportes', 'Noticias', 'Infantil'], b: 'Ver canales', h: 'canales.html' },
    { tema: 'gol', icono: 'balon', ceja: 'Velox Gol', t: 'Fútbol en vivo dentro de la app',
      d: 'Partidos del día, ligas y canales deportivos desde tu TV o tu celular.',
      chips: ['Partidos del día', 'Ligas'], b: 'Descubrir la app', h: 'app.html' },
    { tema: 'reanudar', icono: 'reanudar', ceja: 'Continuar viendo', t: 'Sigue justo donde lo dejaste',
      d: 'La app recuerda el minuto exacto y elige sola el servidor más rápido para tu conexión.',
      chips: ['Reanudar al instante', 'Servidor automático'], b: 'Conocer la app', h: 'app.html' }
  ];
  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function disponibles() {
    // No anunciar la misma página en la que ya estás.
    return ANUNCIOS.filter(function (a) { return a.h !== pagina; });
  }
  function crearAnuncio(p, compacto) {
    var a = document.createElement('a');
    a.className = 'ad-velox ad-velox--' + p.tema + (compacto ? ' ad-velox--compacto' : '');
    a.href = p.h;
    a.innerHTML =
      '<span class="ad-velox__icono">' + ICONOS[p.icono] + '</span>' +
      '<span class="ad-velox__cuerpo">' +
        '<span class="ad-velox__ceja"></span><strong class="ad-velox__titulo"></strong>' +
        '<span class="ad-velox__texto"></span><span class="ad-velox__chips"></span>' +
      '</span>' +
      '<span class="ad-velox__cta"></span>';
    a.querySelector('.ad-velox__ceja').textContent = p.ceja;
    a.querySelector('.ad-velox__titulo').textContent = p.t;
    a.querySelector('.ad-velox__texto').textContent = p.d;
    a.querySelector('.ad-velox__cta').textContent = p.b;
    var chips = a.querySelector('.ad-velox__chips');
    p.chips.forEach(function (c) { var s = document.createElement('span'); s.textContent = c; chips.appendChild(s); });
    return a;
  }
  var lista = disponibles();
  var inicio = Math.floor(Math.random() * lista.length);
  document.querySelectorAll('.ad-slot').forEach(function (slot, i) {
    if (ANUNCIO_RED_HTML) { slot.innerHTML = ANUNCIO_RED_HTML; return; }
    slot.appendChild(crearAnuncio(lista[(inicio + i) % lista.length], false));
  });

  // Barra inferior fija (se puede cerrar; se recuerda por 24 h en este navegador).
  var CLAVE = 'velox_barra_cerrada';
  var cerradaHace = 0;
  try { cerradaHace = Date.now() - Number(localStorage.getItem(CLAVE) || 0); } catch (e) { cerradaHace = Infinity; }
  if (pagina !== 'vip.html' && cerradaHace > 24 * 3600 * 1000 && lista.length) {
    var barra = document.createElement('div');
    barra.className = 'ad-barra';
    barra.setAttribute('role', 'complementary');
    barra.setAttribute('aria-label', 'Promoción Velox Play');
    var cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'ad-barra__cerrar';
    cerrar.setAttribute('aria-label', 'Cerrar promoción');
    cerrar.textContent = '×';
    cerrar.addEventListener('click', function () {
      barra.remove();
      document.body.classList.remove('con-ad-barra');
      try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {}
    });
    barra.appendChild(crearAnuncio(lista[(inicio + 2) % lista.length], true));
    barra.appendChild(cerrar);
    setTimeout(function () {
      document.body.appendChild(barra);
      document.body.classList.add('con-ad-barra');
    }, 4000);
  }

  // Sustituye onsubmit="return window.X(event)": <form data-submit="X">
  document.querySelectorAll('form[data-submit]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      var fn = window[f.getAttribute('data-submit')];
      if (typeof fn === 'function') fn(ev); else ev.preventDefault();
    });
  });
})();
