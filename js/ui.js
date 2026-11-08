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
  var PROMOS = [
    { t: 'Velox Play VIP', d: 'Sin anuncios, acceso total y máxima calidad.', b: 'Ver planes VIP', h: 'vip.html' },
    { t: 'Velox Play en tu TV y móvil', d: 'Reproductor nativo, canales en vivo y Continuar viendo.', b: 'Conocer la app', h: 'app.html' }
  ];
  document.querySelectorAll('.ad-slot').forEach(function (slot, i) {
    if (ANUNCIO_RED_HTML) { slot.innerHTML = ANUNCIO_RED_HTML; return; }
    var p = PROMOS[i % PROMOS.length];
    var a = document.createElement('a');
    a.className = 'ad-promo';
    a.href = p.h;
    a.innerHTML = '<span class="ad-promo__tag">Publicidad</span><span class="ad-promo__txt"><strong></strong><span></span></span><span class="ad-promo__btn"></span>';
    a.querySelector('strong').textContent = p.t;
    a.querySelector('.ad-promo__txt span').textContent = p.d;
    a.querySelector('.ad-promo__btn').textContent = p.b;
    slot.appendChild(a);
  });

  // Sustituye onsubmit="return window.X(event)": <form data-submit="X">
  document.querySelectorAll('form[data-submit]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      var fn = window[f.getAttribute('data-submit')];
      if (typeof fn === 'function') fn(ev); else ev.preventDefault();
    });
  });
})();
