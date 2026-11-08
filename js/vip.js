// Velox Play — página VIP (sin dependencias, compatible con CSP sin inline)
(function () {
  var y = document.getElementById('y');
  if (y) y.textContent = String(new Date().getFullYear());

  // Nav + hamburguesa móvil (misma lógica que app.js)
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  if (navToggle && nav) {
    var cerrarNav = function () { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav__link')) cerrarNav(); });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.target.closest('#nav') || e.target.closest('#nav-toggle')) return;
      cerrarNav();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarNav(); });
  }

  // Mismos precios que la app (android/.../servicios/PreciosVip.kt).
  var PLANES = {
    mes_1: { nombre: 'Mensual', precio: 49 },
    mes_3: { nombre: 'Trimestral', precio: 129 },
    mes_6: { nombre: 'Semestral', precio: 239 },
    ano_1: { nombre: 'Anual', precio: 449 }
  };
  var DIAS = { mes_1: 30, mes_3: 90, mes_6: 180, ano_1: 365 };
  document.querySelectorAll('.vip-elegir').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-plan');
      var p = PLANES[id];
      var texto = 'Hola, quiero el plan VIP ' + p.nombre + ' (' + DIAS[id] + ' días) de Velox Play por $' + p.precio + ' MXN. ¿Cómo pago?';
      window.open('https://wa.me/525616840524?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });
  });
})();
